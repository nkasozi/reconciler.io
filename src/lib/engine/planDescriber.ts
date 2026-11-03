import { formatAmountForDisplay } from './amountParser';
import type { ColumnSource, DataTable, FieldRule, MatchPlan } from './types';

export function describeColumnSource(table: DataTable, source: ColumnSource): string {
	switch (source.sourceKind) {
		case 'column':
			return table.columnNames[source.columnIndex] ?? `Column ${source.columnIndex + 1}`;
		case 'debit_minus_credit':
			return `${table.columnNames[source.debitColumnIndex]} − ${table.columnNames[source.creditColumnIndex]}`;
	}
}

export function describeRuleLabel(rule: FieldRule, leftTable: DataTable, rightTable: DataTable): string {
	const leftName = describeColumnSource(leftTable, rule.leftSource);
	const rightName = describeColumnSource(rightTable, rule.rightSource);
	return leftName.toLowerCase() === rightName.toLowerCase() ? leftName : `${leftName} ↔ ${rightName}`;
}

export function describeRuleTolerance(rule: FieldRule): string {
	switch (rule.fieldKind) {
		case 'amount': {
			const signNote = rule.amountSignMode === 'opposite_sign' ? ' (signs are flipped between files)' : rule.amountSignMode === 'ignore_sign' ? ' (ignoring + / − signs)' : '';
			const toleranceNote = rule.amountTolerance > 0 ? `within ${formatAmountForDisplay(rule.amountTolerance)}` : 'exactly the same';
			return `${toleranceNote}${signNote}`;
		}
		case 'date':
			return rule.dateToleranceDays > 0 ? `within ${rule.dateToleranceDays} day${rule.dateToleranceDays === 1 ? '' : 's'}` : 'the same day';
		case 'reference':
			return 'the same (ignoring spaces, dashes and capitals)';
		case 'text':
			return rule.textSimilarityPercent >= 100 ? 'the same (ignoring capitals)' : `at least ${rule.textSimilarityPercent}% similar`;
	}
}

export function describePlanInPlainEnglish(plan: MatchPlan, leftTable: DataTable, rightTable: DataTable): string[] {
	const keyLabels = plan.keyRules.map((rule) => `“${describeRuleLabel(rule, leftTable, rightTable)}”`);
	const planSentences: string[] = [];
	if (keyLabels.length > 0) {
		planSentences.push(`Pair up rows where ${joinWithAnd(keyLabels)} ${keyLabels.length === 1 ? 'is' : 'are'} the same in both files.`);
	}
	for (const rule of plan.compareRules) {
		planSentences.push(`Check “${describeRuleLabel(rule, leftTable, rightTable)}” is ${describeRuleTolerance(rule)}.`);
	}
	if (plan.fallbackMatching.isEnabled) {
		const windowNote = plan.fallbackMatching.dateRuleId ? ` within ${plan.fallbackMatching.dateWindowDays} days` : '';
		planSentences.push(`Anything left over: pair rows with the same amount${windowNote}, and mark them for review.`);
	}
	return planSentences;
}

function joinWithAnd(phrases: string[]): string {
	if (phrases.length <= 1) return phrases.join('');
	return `${phrases.slice(0, -1).join(', ')} and ${phrases[phrases.length - 1]}`;
}
