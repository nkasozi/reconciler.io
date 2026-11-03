import { profileColumns, type ColumnProfile } from './columnRoles';
import { chooseBestCorrespondingDateRule, detectAmountSignMode, keepRulesThatGenuinelyCorrespond, measureKeyOverlap } from './planEvidence';
import { normalizeHeaderName } from './textNormalization';
import type { AmountSignMode, ColumnSource, DataTable, FieldKind, FieldRule, MatchPlan } from './types';

export type SuggestedPlan = {
	plan: MatchPlan;
	keyOverlapPercent: number;
	confidenceLevel: 'high' | 'medium' | 'low';
};

const KEY_CANDIDATE_ROLES = new Set(['reference', 'other', 'party', 'description', 'account']);
const MINIMUM_USEFUL_KEY_OVERLAP = 0.2;
const DEFAULT_FALLBACK_WINDOW_DAYS = 3;

export function suggestMatchPlan(leftTable: DataTable, rightTable: DataTable): SuggestedPlan {
	const leftProfiles = profileColumns(leftTable.columnNames, leftTable.rows);
	const rightProfiles = profileColumns(rightTable.columnNames, rightTable.rows);
	const leftAmountSource = findAmountSource(leftProfiles);
	const rightAmountSource = findAmountSource(rightProfiles);
	const leftDateProfile = leftProfiles.find((profile) => profile.effectiveRole === 'date');
	const rightDateProfile = rightProfiles.find((profile) => profile.effectiveRole === 'date');
	const bestKeyPair = findBestKeyColumnPair(leftTable, rightTable, leftProfiles, rightProfiles);
	console.log('[planSuggester] Best key pair', bestKeyPair);

	const amountSignMode: AmountSignMode = leftAmountSource && rightAmountSource
		? detectAmountSignMode(leftTable, rightTable, leftAmountSource, rightAmountSource)
		: 'same_sign';
	const amountRule = leftAmountSource && rightAmountSource ? buildRule('amount', 'amount', leftAmountSource, rightAmountSource, { amountSignMode }) : null;
	const eitherFileIsStatement = [leftTable, rightTable].some((table) => /statement|m-pesa|mobile money/i.test(table.detectedSystemName ?? ''));
	const dateToleranceDays = eitherFileIsStatement ? DEFAULT_FALLBACK_WINDOW_DAYS : 0;
	const firstDateRule = leftDateProfile && rightDateProfile ? buildRule('date', 'date', columnSource(leftDateProfile), columnSource(rightDateProfile), { dateToleranceDays }) : null;
	const hasUsefulKey = bestKeyPair !== null && bestKeyPair.overlapShare >= MINIMUM_USEFUL_KEY_OVERLAP;

	const candidateDateRules = leftProfiles.filter((profile) => profile.effectiveRole === 'date').slice(0, 4).flatMap((leftProfile) =>
		rightProfiles.filter((profile) => profile.effectiveRole === 'date').slice(0, 4).map((rightProfile) => buildRule('date', 'date', columnSource(leftProfile), columnSource(rightProfile), { dateToleranceDays })));
	const referenceKeyRulesForEvidence = hasUsefulKey ? [buildRule('key-1', 'reference', columnSource(bestKeyPair.leftProfile), columnSource(bestKeyPair.rightProfile))] : [];
	const dateRule = candidateDateRules.length > 0 ? chooseBestCorrespondingDateRule(leftTable, rightTable, referenceKeyRulesForEvidence, candidateDateRules) : firstDateRule;
	const datesAreUniqueOnBothSides = (leftDateProfile?.distinctRatio ?? 0) >= 0.95 && (rightDateProfile?.distinctRatio ?? 0) >= 0.95;
	const keyStrategy = hasUsefulKey ? 'reference' : datesAreUniqueOnBothSides && dateRule ? 'unique_date' : 'amount_and_date';
	console.log(`[planSuggester] Key strategy: ${keyStrategy}`);
	const keyRules: FieldRule[] = buildKeyRules(keyStrategy, bestKeyPair, amountRule, dateRule);
	const usedColumnNames = collectUsedColumnNames(keyRules, amountRule, dateRule, leftTable, rightTable);
	const extraSameNameRules = buildSameNameColumnRules(leftProfiles, rightProfiles, usedColumnNames);
	const keyRuleIds = new Set(keyRules.map((keyRule) => keyRule.ruleId));
	const candidateCompareRules: FieldRule[] = [...[amountRule, dateRule].filter((rule): rule is FieldRule => rule !== null && !keyRuleIds.has(rule.ruleId)), ...extraSameNameRules];
	const compareRules = keyStrategy === 'reference' ? keepRulesThatGenuinelyCorrespond(leftTable, rightTable, keyRules, candidateCompareRules) : candidateCompareRules;
	const survivingDateRule = [...keyRules, ...compareRules].find((rule) => rule.fieldKind === 'date');

	if (keyRules.length === 0 && bestKeyPair) {
		keyRules.push(buildRule('key-1', 'reference', columnSource(bestKeyPair.leftProfile), columnSource(bestKeyPair.rightProfile)));
	}

	const keyOverlapPercent = Math.round((bestKeyPair?.overlapShare ?? 0) * 100);
	return {
		plan: {
			keyRules,
			compareRules,
			fallbackMatching: { isEnabled: amountRule !== null && survivingDateRule !== undefined, amountRuleId: amountRule?.ruleId ?? null, dateRuleId: survivingDateRule?.ruleId ?? null, dateWindowDays: DEFAULT_FALLBACK_WINDOW_DAYS }
		},
		keyOverlapPercent,
		confidenceLevel: keyOverlapPercent >= 60 || (!hasUsefulKey && amountRule && dateRule) ? 'high' : keyOverlapPercent >= 20 ? 'medium' : 'low'
	};
}

function buildKeyRules(keyStrategy: 'reference' | 'unique_date' | 'amount_and_date', bestKeyPair: ReturnType<typeof findBestKeyColumnPair>, amountRule: FieldRule | null, dateRule: FieldRule | null): FieldRule[] {
	switch (keyStrategy) {
		case 'reference':
			return bestKeyPair ? [buildRule('key-1', 'reference', columnSource(bestKeyPair.leftProfile), columnSource(bestKeyPair.rightProfile))] : [];
		case 'unique_date':
			return dateRule ? [{ ...dateRule, dateToleranceDays: 0 }] : [];
		case 'amount_and_date':
			return [amountRule, dateRule].filter((rule): rule is FieldRule => rule !== null);
	}
}

export function buildRule(ruleId: string, fieldKind: FieldKind, leftSource: ColumnSource, rightSource: ColumnSource, overrides: Partial<FieldRule> = {}): FieldRule {
	return { ruleId, fieldKind, leftSource, rightSource, amountTolerance: 0, dateToleranceDays: 0, textSimilarityPercent: 100, amountSignMode: 'same_sign', ...overrides };
}

function columnSource(profile: ColumnProfile): ColumnSource {
	return { sourceKind: 'column', columnIndex: profile.columnIndex };
}

function findAmountSource(profiles: ColumnProfile[]): ColumnSource | null {
	const amountProfile = profiles.find((profile) => profile.effectiveRole === 'amount' && /^(amount|net amount|transaction amount|trnamt)/.test(normalizeHeaderName(profile.columnName)))
		?? profiles.find((profile) => profile.effectiveRole === 'amount');
	const debitProfile = profiles.find((profile) => profile.effectiveRole === 'debit');
	const creditProfile = profiles.find((profile) => profile.effectiveRole === 'credit');
	if (debitProfile && creditProfile) {
		return { sourceKind: 'debit_minus_credit', debitColumnIndex: debitProfile.columnIndex, creditColumnIndex: creditProfile.columnIndex };
	}
	if (amountProfile) return columnSource(amountProfile);
	const loneDebitOrCreditProfile = debitProfile ?? creditProfile;
	if (loneDebitOrCreditProfile) return columnSource(loneDebitOrCreditProfile);
	const quantityProfile = profiles.find((profile) => profile.effectiveRole === 'quantity');
	return quantityProfile ? columnSource(quantityProfile) : null;
}

function findBestKeyColumnPair(leftTable: DataTable, rightTable: DataTable, leftProfiles: ColumnProfile[], rightProfiles: ColumnProfile[]) {
	const isKeyCandidate = (profile: ColumnProfile): boolean =>
		profile.filledRatio >= 0.3 && profile.distinctRatio > 0.3 && KEY_CANDIDATE_ROLES.has(profile.effectiveRole) && profile.dateRatio < 0.5;
	const leftCandidates = leftProfiles.filter(isKeyCandidate).slice(0, 25);
	const rightCandidates = rightProfiles.filter(isKeyCandidate).slice(0, 25);
	let bestPair: { leftProfile: ColumnProfile; rightProfile: ColumnProfile; overlapShare: number; pairScore: number } | null = null;
	for (const leftProfile of leftCandidates) {
		for (const rightProfile of rightCandidates) {
			const overlapShare = measureKeyOverlap(leftTable, rightTable, leftProfile.columnIndex, rightProfile.columnIndex);
			const referenceBonus = (leftProfile.headerRole === 'reference' ? 0.05 : 0) + (rightProfile.headerRole === 'reference' ? 0.05 : 0);
			const uniquenessBonus = Math.min(leftProfile.distinctRatio, rightProfile.distinctRatio) * 0.1;
			const pairScore = overlapShare + referenceBonus + uniquenessBonus;
			if (overlapShare > 0 && (!bestPair || pairScore > bestPair.pairScore)) {
				bestPair = { leftProfile, rightProfile, overlapShare, pairScore };
			}
		}
	}
	return bestPair;
}

function collectUsedColumnNames(keyRules: FieldRule[], amountRule: FieldRule | null, dateRule: FieldRule | null, leftTable: DataTable, rightTable: DataTable): Set<string> {
	const usedColumnNames = new Set<string>();
	const rememberSource = (table: DataTable, source: ColumnSource): void => {
		const columnIndexes = source.sourceKind === 'column' ? [source.columnIndex] : [source.debitColumnIndex, source.creditColumnIndex];
		for (const columnIndex of columnIndexes) usedColumnNames.add(normalizeHeaderName(table.columnNames[columnIndex]));
	};
	for (const rule of [...keyRules, amountRule, dateRule]) {
		if (!rule) continue;
		rememberSource(leftTable, rule.leftSource);
		rememberSource(rightTable, rule.rightSource);
	}
	return usedColumnNames;
}

function buildSameNameColumnRules(leftProfiles: ColumnProfile[], rightProfiles: ColumnProfile[], usedColumnNames: Set<string>): FieldRule[] {
	const rightProfileByName = new Map(rightProfiles.map((profile) => [normalizeHeaderName(profile.columnName), profile]));
	const sameNameRules: FieldRule[] = [];
	for (const leftProfile of leftProfiles) {
		const normalizedName = normalizeHeaderName(leftProfile.columnName);
		const rightProfile = rightProfileByName.get(normalizedName);
		const isWorthComparing = rightProfile && !usedColumnNames.has(normalizedName) && leftProfile.effectiveRole !== 'balance' && leftProfile.filledRatio > 0;
		if (!isWorthComparing) continue;
		const fieldKind: FieldKind = leftProfile.amountRatio >= 0.8 && rightProfile.amountRatio >= 0.8 ? 'amount' : leftProfile.effectiveRole === 'date' ? 'date' : 'text';
		sameNameRules.push(buildRule(`extra-${sameNameRules.length + 1}`, fieldKind, columnSource(leftProfile), columnSource(rightProfile)));
	}
	return sameNameRules.slice(0, 8);
}
