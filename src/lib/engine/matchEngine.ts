import { buildNormalizedKeyPart, evaluateRuleForPair, readComparableAmount, readComparableDayNumber, type RowReadContext } from './fieldValues';
import { buildReconciliationSummary, findPrimaryAmountRule } from './matchSummary';
import type { DataTable, FieldRule, MatchMethod, MatchPlan, PairedRow, ReconciliationOutcome, UnpairedRow } from './types';

const MAXIMUM_CANDIDATES_TO_SCORE = 64;
const KEY_PART_SEPARATOR = '\u001f';

type MatchingState = {
	leftTable: DataTable;
	rightTable: DataTable;
	plan: MatchPlan;
	pairedRows: PairedRow[];
	isLeftRowPaired: Uint8Array;
	isRightRowPaired: Uint8Array;
};

export function runReconciliation(leftTable: DataTable, rightTable: DataTable, plan: MatchPlan): ReconciliationOutcome {
	const startedAtMilliseconds = Date.now();
	console.log(`[matchEngine] Reconciling ${leftTable.rows.length} rows against ${rightTable.rows.length} rows`);
	const matchingState: MatchingState = {
		leftTable,
		rightTable,
		plan,
		pairedRows: [],
		isLeftRowPaired: new Uint8Array(leftTable.rows.length),
		isRightRowPaired: new Uint8Array(rightTable.rows.length)
	};

	const leftKeys = leftTable.rows.map((row) => buildCompositeKey(row, 'left', leftTable, plan.keyRules));
	const rightKeys = rightTable.rows.map((row) => buildCompositeKey(row, 'right', rightTable, plan.keyRules));
	const rightRowIndexesByKey = groupRowIndexesByKey(rightKeys);

	const exactPairCount = pairRowsWithIdenticalKeys(matchingState, leftKeys, rightRowIndexesByKey);
	console.log(`[matchEngine] Exact key pass paired ${exactPairCount} rows`);
	const fallbackPairCount = pairRemainingRowsByAmountAndDate(matchingState);
	console.log(`[matchEngine] Amount and date pass paired ${fallbackPairCount} more rows`);

	const onlyInLeft = collectUnpairedRows(matchingState.isLeftRowPaired, leftKeys, new Set(rightKeys));
	const onlyInRight = collectUnpairedRows(matchingState.isRightRowPaired, rightKeys, new Set(leftKeys));
	const summary = buildReconciliationSummary({
		leftTable, rightTable, plan, pairedRows: matchingState.pairedRows, onlyInLeft, onlyInRight,
		duplicateKeyCountLeft: countDuplicateKeys(leftKeys),
		duplicateKeyCountRight: countDuplicateKeys(rightKeys),
		durationInMilliseconds: Date.now() - startedAtMilliseconds
	});
	console.log('[matchEngine] Finished', summary);
	return { pairedRows: matchingState.pairedRows, onlyInLeft, onlyInRight, summary };
}

export function buildCompositeKey(row: string[], side: 'left' | 'right', table: DataTable, keyRules: FieldRule[]): string {
	const readContext: RowReadContext = { row, side, dateOrder: table.dateOrder };
	const keyParts = keyRules.map((keyRule) => buildNormalizedKeyPart(readContext, keyRule));
	const hasBlankKeyPart = keyParts.length === 0 || keyParts.some((keyPart) => keyPart === '');
	return hasBlankKeyPart ? '' : keyParts.join(KEY_PART_SEPARATOR);
}

function groupRowIndexesByKey(rowKeys: string[]): Map<string, number[]> {
	const rowIndexesByKey = new Map<string, number[]>();
	rowKeys.forEach((rowKey, rowIndex) => {
		if (rowKey === '') return;
		const existingRowIndexes = rowIndexesByKey.get(rowKey);
		if (existingRowIndexes) existingRowIndexes.push(rowIndex);
		else rowIndexesByKey.set(rowKey, [rowIndex]);
	});
	return rowIndexesByKey;
}

function pairRowsWithIdenticalKeys(state: MatchingState, leftKeys: string[], rightRowIndexesByKey: Map<string, number[]>): number {
	let pairedCount = 0;
	leftKeys.forEach((leftKey, leftRowIndex) => {
		if (leftKey === '') return;
		const candidateRightRowIndexes = rightRowIndexesByKey.get(leftKey);
		if (!candidateRightRowIndexes || candidateRightRowIndexes.length === 0) return;
		const bestCandidatePosition = choosePositionOfBestCandidate(state, leftRowIndex, candidateRightRowIndexes);
		const [chosenRightRowIndex] = candidateRightRowIndexes.splice(bestCandidatePosition, 1);
		recordPair(state, leftRowIndex, chosenRightRowIndex, 'exact_key');
		pairedCount++;
	});
	return pairedCount;
}

function choosePositionOfBestCandidate(state: MatchingState, leftRowIndex: number, candidateRightRowIndexes: number[]): number {
	if (candidateRightRowIndexes.length === 1 || state.plan.compareRules.length === 0) return 0;
	let bestPosition = 0;
	let bestMatchingRuleCount = -1;
	const candidatesToScore = Math.min(candidateRightRowIndexes.length, MAXIMUM_CANDIDATES_TO_SCORE);
	for (let candidatePosition = 0; candidatePosition < candidatesToScore; candidatePosition++) {
		const ruleOutcomes = evaluateCompareRules(state, leftRowIndex, candidateRightRowIndexes[candidatePosition]);
		const matchingRuleCount = ruleOutcomes.filter((ruleOutcome) => ruleOutcome.isMatch).length;
		if (matchingRuleCount > bestMatchingRuleCount) {
			bestMatchingRuleCount = matchingRuleCount;
			bestPosition = candidatePosition;
		}
		if (matchingRuleCount === state.plan.compareRules.length) break;
	}
	return bestPosition;
}

function pairRemainingRowsByAmountAndDate(state: MatchingState): number {
	const { fallbackMatching } = state.plan;
	const allRules = [...state.plan.keyRules, ...state.plan.compareRules];
	const amountRule = allRules.find((rule) => rule.ruleId === fallbackMatching.amountRuleId);
	const dateRule = allRules.find((rule) => rule.ruleId === fallbackMatching.dateRuleId);
	if (!fallbackMatching.isEnabled || !amountRule || !dateRule) return 0;

	const unpairedRightRowsByCents = new Map<number, { rowIndex: number; dayNumber: number | null }[]>();
	state.rightTable.rows.forEach((row, rowIndex) => {
		if (state.isRightRowPaired[rowIndex]) return;
		const readContext: RowReadContext = { row, side: 'right', dateOrder: state.rightTable.dateOrder };
		const comparableAmount = readComparableAmount(readContext, amountRule);
		if (comparableAmount === null) return;
		const amountInCents = Math.round(comparableAmount * 100);
		const dayNumber = dateRule ? readComparableDayNumber(readContext, dateRule) : null;
		const bucket = unpairedRightRowsByCents.get(amountInCents) ?? [];
		bucket.push({ rowIndex, dayNumber });
		unpairedRightRowsByCents.set(amountInCents, bucket);
	});

	let pairedCount = 0;
	state.leftTable.rows.forEach((row, leftRowIndex) => {
		if (state.isLeftRowPaired[leftRowIndex]) return;
		const readContext: RowReadContext = { row, side: 'left', dateOrder: state.leftTable.dateOrder };
		const comparableAmount = readComparableAmount(readContext, amountRule);
		if (comparableAmount === null) return;
		const bucket = unpairedRightRowsByCents.get(Math.round(comparableAmount * 100));
		if (!bucket || bucket.length === 0) return;
		const leftDayNumber = dateRule ? readComparableDayNumber(readContext, dateRule) : null;
		const closestPosition = findClosestDatePosition(bucket, leftDayNumber, dateRule ? fallbackMatching.dateWindowDays : null);
		if (closestPosition === -1) return;
		const [chosenCandidate] = bucket.splice(closestPosition, 1);
		recordPair(state, leftRowIndex, chosenCandidate.rowIndex, 'amount_and_date');
		pairedCount++;
	});
	return pairedCount;
}

function findClosestDatePosition(bucket: { dayNumber: number | null }[], leftDayNumber: number | null, dateWindowDays: number | null): number {
	if (dateWindowDays === null) return 0;
	if (leftDayNumber === null) return -1;
	let closestPosition = -1;
	let closestDayGap = Number.POSITIVE_INFINITY;
	bucket.forEach((candidate, candidatePosition) => {
		if (candidate.dayNumber === null) return;
		const dayGap = Math.abs(candidate.dayNumber - leftDayNumber);
		if (dayGap <= dateWindowDays && dayGap < closestDayGap) {
			closestDayGap = dayGap;
			closestPosition = candidatePosition;
		}
	});
	return closestPosition;
}

function evaluateCompareRules(state: MatchingState, leftRowIndex: number, rightRowIndex: number, rules: FieldRule[] = state.plan.compareRules) {
	const leftContext: RowReadContext = { row: state.leftTable.rows[leftRowIndex], side: 'left', dateOrder: state.leftTable.dateOrder };
	const rightContext: RowReadContext = { row: state.rightTable.rows[rightRowIndex], side: 'right', dateOrder: state.rightTable.dateOrder };
	return rules.map((rule) => evaluateRuleForPair(rule, leftContext, rightContext));
}

function recordPair(state: MatchingState, leftRowIndex: number, rightRowIndex: number, matchMethod: MatchMethod): boolean {
	const compareOutcomes = evaluateCompareRules(state, leftRowIndex, rightRowIndex);
	const keyOutcomes = matchMethod === 'amount_and_date' ? evaluateCompareRules(state, leftRowIndex, rightRowIndex, state.plan.keyRules) : [];
	const hasDifferences = compareOutcomes.some((ruleOutcome) => !ruleOutcome.isMatch);
	state.isLeftRowPaired[leftRowIndex] = 1;
	state.isRightRowPaired[rightRowIndex] = 1;
	state.pairedRows.push({
		leftRowIndex,
		rightRowIndex,
		pairStatus: hasDifferences ? 'matched_with_differences' : 'matched',
		matchMethod,
		ruleOutcomes: [...keyOutcomes, ...compareOutcomes],
		amountDifference: calculatePairAmountDifference(state, leftRowIndex, rightRowIndex)
	});
	return true;
}

function calculatePairAmountDifference(state: MatchingState, leftRowIndex: number, rightRowIndex: number): number {
	const amountRule = findPrimaryAmountRule(state.plan);
	if (!amountRule) return 0;
	const leftAmount = readComparableAmount({ row: state.leftTable.rows[leftRowIndex], side: 'left', dateOrder: state.leftTable.dateOrder }, amountRule) ?? 0;
	const rightAmount = readComparableAmount({ row: state.rightTable.rows[rightRowIndex], side: 'right', dateOrder: state.rightTable.dateOrder }, amountRule) ?? 0;
	return Math.round((leftAmount - rightAmount) * 100) / 100;
}

function collectUnpairedRows(isRowPaired: Uint8Array, ownKeys: string[], otherSideKeys: Set<string>): UnpairedRow[] {
	const unpairedRows: UnpairedRow[] = [];
	isRowPaired.forEach((pairedFlag, rowIndex) => {
		if (pairedFlag) return;
		const rowKey = ownKeys[rowIndex];
		const unpairedReason = rowKey === '' ? 'key_is_blank' : otherSideKeys.has(rowKey) ? 'extra_duplicate' : 'key_not_found';
		unpairedRows.push({ rowIndex, unpairedReason });
	});
	return unpairedRows;
}

function countDuplicateKeys(rowKeys: string[]): number {
	const occurrencesByKey = new Map<string, number>();
	for (const rowKey of rowKeys) if (rowKey !== '') occurrencesByKey.set(rowKey, (occurrencesByKey.get(rowKey) ?? 0) + 1);
	let duplicateKeyCount = 0;
	for (const occurrenceCount of occurrencesByKey.values()) if (occurrenceCount > 1) duplicateKeyCount++;
	return duplicateKeyCount;
}
