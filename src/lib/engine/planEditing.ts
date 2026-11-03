import { buildRule } from './planSuggester';
import type { ColumnSource, FieldKind, FieldRule, MatchPlan } from './types';
import type { TableOverview } from './workerProtocol';

export type ColumnOption = { optionValue: string; optionLabel: string };

export const FIELD_KIND_LABELS: Record<FieldKind, string> = {
	reference: 'Reference / ID',
	text: 'Text',
	amount: 'Amount / number',
	date: 'Date'
};

export function encodeColumnSource(source: ColumnSource): string {
	switch (source.sourceKind) {
		case 'column':
			return `column:${source.columnIndex}`;
		case 'debit_minus_credit':
			return `net:${source.debitColumnIndex}:${source.creditColumnIndex}`;
	}
}

export function decodeColumnSource(encodedSource: string): ColumnSource {
	const [sourceKind, firstIndex, secondIndex] = encodedSource.split(':');
	return sourceKind === 'net'
		? { sourceKind: 'debit_minus_credit', debitColumnIndex: Number(firstIndex), creditColumnIndex: Number(secondIndex) }
		: { sourceKind: 'column', columnIndex: Number(firstIndex) };
}

export function buildColumnOptions(tableOverview: TableOverview): ColumnOption[] {
	const plainColumnOptions = tableOverview.columnNames.map((columnName, columnIndex) => ({ optionValue: `column:${columnIndex}`, optionLabel: columnName }));
	const debitColumnIndex = tableOverview.columnRoles.indexOf('debit');
	const creditColumnIndex = tableOverview.columnRoles.indexOf('credit');
	if (debitColumnIndex === -1 || creditColumnIndex === -1) return plainColumnOptions;
	const netOption = {
		optionValue: `net:${debitColumnIndex}:${creditColumnIndex}`,
		optionLabel: `${tableOverview.columnNames[debitColumnIndex]} − ${tableOverview.columnNames[creditColumnIndex]} (combined)`
	};
	return [netOption, ...plainColumnOptions];
}

export function guessFieldKindForColumn(tableOverview: TableOverview, source: ColumnSource): FieldKind {
	if (source.sourceKind === 'debit_minus_credit') return 'amount';
	switch (tableOverview.columnRoles[source.columnIndex]) {
		case 'date':
			return 'date';
		case 'amount':
		case 'debit':
		case 'credit':
		case 'balance':
		case 'quantity':
			return 'amount';
		case 'reference':
			return 'reference';
		default:
			return 'text';
	}
}

export function createNewRule(listName: 'keyRules' | 'compareRules', plan: MatchPlan, leftOverview: TableOverview, rightOverview: TableOverview): FieldRule {
	const existingRuleIds = new Set([...plan.keyRules, ...plan.compareRules].map((rule) => rule.ruleId));
	let ruleNumber = 1;
	while (existingRuleIds.has(`${listName}-${ruleNumber}`)) ruleNumber++;
	const leftSource: ColumnSource = { sourceKind: 'column', columnIndex: 0 };
	const rightSource: ColumnSource = { sourceKind: 'column', columnIndex: 0 };
	const fieldKind = listName === 'keyRules' ? 'reference' : guessFieldKindForColumn(leftOverview, leftSource);
	console.log(`[planEditing] Adding ${fieldKind} rule to ${listName} (right file has ${rightOverview.columnNames.length} columns)`);
	return buildRule(`${listName}-${ruleNumber}`, fieldKind, leftSource, rightSource);
}

export function removeRuleFromPlan(plan: MatchPlan, ruleId: string): MatchPlan {
	const remainingRuleIds = new Set([...plan.keyRules, ...plan.compareRules].map((rule) => rule.ruleId).filter((existingRuleId) => existingRuleId !== ruleId));
	return {
		keyRules: plan.keyRules.filter((rule) => rule.ruleId !== ruleId),
		compareRules: plan.compareRules.filter((rule) => rule.ruleId !== ruleId),
		fallbackMatching: {
			...plan.fallbackMatching,
			amountRuleId: plan.fallbackMatching.amountRuleId && remainingRuleIds.has(plan.fallbackMatching.amountRuleId) ? plan.fallbackMatching.amountRuleId : null,
			dateRuleId: plan.fallbackMatching.dateRuleId && remainingRuleIds.has(plan.fallbackMatching.dateRuleId) ? plan.fallbackMatching.dateRuleId : null
		}
	};
}

export function reconnectFallbackRules(plan: MatchPlan): MatchPlan {
	const allRules = [...plan.keyRules, ...plan.compareRules];
	const amountRuleId = plan.fallbackMatching.amountRuleId ?? allRules.find((rule) => rule.fieldKind === 'amount')?.ruleId ?? null;
	const dateRuleId = plan.fallbackMatching.dateRuleId ?? allRules.find((rule) => rule.fieldKind === 'date')?.ruleId ?? null;
	return { ...plan, fallbackMatching: { ...plan.fallbackMatching, amountRuleId, dateRuleId } };
}

export function isPlanRunnable(plan: MatchPlan): { isRunnable: boolean; problemDescription: string } {
	if (plan.keyRules.length === 0) return { isRunnable: false, problemDescription: 'Choose at least one column to pair rows by.' };
	return { isRunnable: true, problemDescription: '' };
}
