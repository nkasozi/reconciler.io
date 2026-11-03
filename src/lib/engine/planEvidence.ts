import { evaluateRuleForPair, readComparableDayNumber, readSourceAmount } from './fieldValues';
import { buildCompositeKey } from './matchEngine';
import { normalizeReferenceForMatching } from './textNormalization';
import type { AmountSignMode, ColumnSource, DataTable, FieldRule } from './types';

const MAXIMUM_RIGHT_VALUES_TO_INDEX = 50_000;
const MAXIMUM_LEFT_VALUES_TO_PROBE = 3_000;

export function measureKeyOverlap(leftTable: DataTable, rightTable: DataTable, leftColumnIndex: number, rightColumnIndex: number): number {
	const rightValues = new Set<string>();
	for (const row of rightTable.rows.slice(0, MAXIMUM_RIGHT_VALUES_TO_INDEX)) {
		const normalizedValue = normalizeReferenceForMatching(row[rightColumnIndex] ?? '');
		if (normalizedValue.length > 0) rightValues.add(normalizedValue);
	}
	if (rightValues.size === 0) return 0;
	let probedCount = 0;
	let foundCount = 0;
	for (const row of sampleEvenly(leftTable.rows, MAXIMUM_LEFT_VALUES_TO_PROBE)) {
		const normalizedValue = normalizeReferenceForMatching(row[leftColumnIndex] ?? '');
		if (normalizedValue.length === 0) continue;
		probedCount++;
		if (rightValues.has(normalizedValue)) foundCount++;
	}
	return probedCount === 0 ? 0 : foundCount / probedCount;
}

export function detectAmountSignMode(leftTable: DataTable, rightTable: DataTable, leftSource: ColumnSource, rightSource: ColumnSource): AmountSignMode {
	const rightCentsValues = new Set<number>();
	for (const row of rightTable.rows.slice(0, MAXIMUM_RIGHT_VALUES_TO_INDEX)) {
		const amountValue = readSourceAmount(row, rightSource);
		if (amountValue !== null && amountValue !== 0) rightCentsValues.add(Math.round(amountValue * 100));
	}
	let sameSignHits = 0;
	let oppositeSignHits = 0;
	for (const row of sampleEvenly(leftTable.rows, MAXIMUM_LEFT_VALUES_TO_PROBE)) {
		const amountValue = readSourceAmount(row, leftSource);
		if (amountValue === null || amountValue === 0) continue;
		const amountInCents = Math.round(amountValue * 100);
		if (rightCentsValues.has(amountInCents)) sameSignHits++;
		if (rightCentsValues.has(-amountInCents)) oppositeSignHits++;
	}
	console.log(`[planEvidence] Sign evidence: same=${sameSignHits}, opposite=${oppositeSignHits}`);
	const hasNoNegativesOnOneSide = !hasAnyNegativeAmount(leftTable, leftSource) || !hasAnyNegativeAmount(rightTable, rightSource);
	switch (true) {
		case oppositeSignHits > sameSignHits * 1.5:
			return 'opposite_sign';
		case sameSignHits === 0 && oppositeSignHits === 0 && hasNoNegativesOnOneSide:
			return 'ignore_sign';
		default:
			return 'same_sign';
	}
}

function hasAnyNegativeAmount(table: DataTable, source: ColumnSource): boolean {
	return table.rows.slice(0, 5000).some((row) => (readSourceAmount(row, source) ?? 0) < 0);
}

function sampleEvenly<T>(items: T[], maximumSampleSize: number): T[] {
	if (items.length <= maximumSampleSize) return items;
	const stepSize = items.length / maximumSampleSize;
	return Array.from({ length: maximumSampleSize }, (_, sampleIndex) => items[Math.floor(sampleIndex * stepSize)]);
}

const MAXIMUM_PAIRS_TO_SAMPLE = 400;
const MAXIMUM_AUTO_DATE_TOLERANCE_DAYS = 3;
const MINIMUM_AGREEMENT_SHARE_TO_KEEP_RULE = 0.6;

export type RuleAgreement = { sampledPairCount: number; agreementShare: number; suggestedDateToleranceDays: number; typicalDayGap: number };

export function measureRuleAgreement(leftTable: DataTable, rightTable: DataTable, keyRules: FieldRule[], candidateRule: FieldRule): RuleAgreement {
	const rightRowByKey = new Map<string, string[]>();
	for (const row of rightTable.rows.slice(0, MAXIMUM_RIGHT_VALUES_TO_INDEX)) {
		const rowKey = buildCompositeKey(row, 'right', rightTable, keyRules);
		if (rowKey !== '' && !rightRowByKey.has(rowKey)) rightRowByKey.set(rowKey, row);
	}
	let sampledPairCount = 0;
	let agreeingPairCount = 0;
	const dayGaps: number[] = [];
	for (const leftRow of sampleEvenly(leftTable.rows, MAXIMUM_LEFT_VALUES_TO_PROBE)) {
		if (sampledPairCount >= MAXIMUM_PAIRS_TO_SAMPLE) break;
		const rightRow = rightRowByKey.get(buildCompositeKey(leftRow, 'left', leftTable, keyRules));
		if (!rightRow) continue;
		sampledPairCount++;
		const leftContext = { row: leftRow, side: 'left' as const, dateOrder: leftTable.dateOrder };
		const rightContext = { row: rightRow, side: 'right' as const, dateOrder: rightTable.dateOrder };
		if (candidateRule.fieldKind === 'date') {
			const leftDay = readComparableDayNumber(leftContext, candidateRule);
			const rightDay = readComparableDayNumber(rightContext, candidateRule);
			if (leftDay !== null && rightDay !== null) dayGaps.push(Math.abs(leftDay - rightDay));
		}
		if (evaluateRuleForPair({ ...candidateRule, dateToleranceDays: MAXIMUM_AUTO_DATE_TOLERANCE_DAYS }, leftContext, rightContext).isMatch) agreeingPairCount++;
	}
	const sortedDayGaps = [...dayGaps].sort((first, second) => first - second);
	const eightiethPercentileGap = sortedDayGaps[Math.floor(sortedDayGaps.length * 0.8)] ?? 0;
	return {
		sampledPairCount,
		agreementShare: sampledPairCount === 0 ? 1 : agreeingPairCount / sampledPairCount,
		suggestedDateToleranceDays: Math.min(MAXIMUM_AUTO_DATE_TOLERANCE_DAYS, eightiethPercentileGap),
		typicalDayGap: dayGaps.length === 0 ? Number.POSITIVE_INFINITY : eightiethPercentileGap
	};
}

export function keepRulesThatGenuinelyCorrespond(leftTable: DataTable, rightTable: DataTable, keyRules: FieldRule[], candidateRules: FieldRule[]): FieldRule[] {
	if (keyRules.length === 0) return candidateRules;
	return candidateRules.flatMap((candidateRule) => {
		if (candidateRule.fieldKind === 'amount') return [candidateRule];
		const ruleAgreement = measureRuleAgreement(leftTable, rightTable, keyRules, candidateRule);
		const isTooFewPairsToJudge = ruleAgreement.sampledPairCount < 3;
		console.log(`[planEvidence] Rule ${candidateRule.ruleId} (${candidateRule.fieldKind}) agrees on ${Math.round(ruleAgreement.agreementShare * 100)}% of ${ruleAgreement.sampledPairCount} sampled pairs`);
		if (!isTooFewPairsToJudge && ruleAgreement.agreementShare < MINIMUM_AGREEMENT_SHARE_TO_KEEP_RULE) return [];
		if (candidateRule.fieldKind !== 'date' || isTooFewPairsToJudge) return [candidateRule];
		if (ruleAgreement.typicalDayGap > MAXIMUM_AUTO_DATE_TOLERANCE_DAYS) return [];
		return [{ ...candidateRule, dateToleranceDays: Math.max(candidateRule.dateToleranceDays, ruleAgreement.suggestedDateToleranceDays) }];
	});
}

export function chooseBestCorrespondingDateRule(leftTable: DataTable, rightTable: DataTable, keyRules: FieldRule[], candidateDateRules: FieldRule[]): FieldRule | null {
	if (candidateDateRules.length <= 1 || keyRules.length === 0) return candidateDateRules[0] ?? null;
	const scoredRules = candidateDateRules.map((candidateRule) => ({ candidateRule, ruleAgreement: measureRuleAgreement(leftTable, rightTable, keyRules, candidateRule) }));
	scoredRules.sort((first, second) => first.ruleAgreement.typicalDayGap - second.ruleAgreement.typicalDayGap || second.ruleAgreement.agreementShare - first.ruleAgreement.agreementShare);
	console.log('[planEvidence] Best corresponding date columns', scoredRules[0].candidateRule.leftSource, scoredRules[0].candidateRule.rightSource, scoredRules[0].ruleAgreement.typicalDayGap);
	return scoredRules[0].candidateRule;
}
