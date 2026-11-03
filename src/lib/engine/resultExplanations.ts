import { formatAmountForDisplay } from './amountParser';
import { readRawSourceText } from './fieldValues';
import { describeColumnSource } from './planDescriber';
import type { ColumnSource, DataTable, FieldRule, MatchPlan, PairedRow, RuleOutcome, UnpairedRow } from './types';
import type { TableLabels } from './workflowTypes';

export type ExplanationContext = { leftTable: DataTable; rightTable: DataTable; plan: MatchPlan; labels: TableLabels };

export function listColumnIndexesForSource(source: ColumnSource): number[] {
	switch (source.sourceKind) {
		case 'column':
			return [source.columnIndex];
		case 'debit_minus_credit':
			return [source.debitColumnIndex, source.creditColumnIndex];
	}
}

function quoteValue(valueText: string): string {
	return valueText.trim() === '' ? '(empty)' : `“${valueText}”`;
}

function describeWhereFound(context: ExplanationContext, rule: FieldRule): { leftPlace: string; rightPlace: string } {
	return {
		leftPlace: `${context.labels.leftLabel} · ${describeColumnSource(context.leftTable, rule.leftSource)}`,
		rightPlace: `${context.labels.rightLabel} · ${describeColumnSource(context.rightTable, rule.rightSource)}`
	};
}

function describeAllowance(rule: FieldRule): string {
	switch (rule.fieldKind) {
		case 'amount': {
			const signNote = rule.amountSignMode === 'opposite_sign' ? ' (signs flipped, because one file records money in and the other money out)' : rule.amountSignMode === 'ignore_sign' ? ' (ignoring + / − signs)' : '';
			return `Allowed difference ±${formatAmountForDisplay(rule.amountTolerance)}${signNote}`;
		}
		case 'date':
			return rule.dateToleranceDays === 0 ? 'Dates must be the same day' : `Allowed gap ${rule.dateToleranceDays} day${rule.dateToleranceDays === 1 ? '' : 's'}`;
		case 'reference':
			return 'References must be identical (ignoring spaces, capital letters, punctuation and leading zeros)';
		case 'text':
			return `Must be at least ${rule.textSimilarityPercent}% similar`;
	}
}

export function explainRuleOutcome(context: ExplanationContext, rule: FieldRule, ruleOutcome: RuleOutcome): string {
	const { leftPlace, rightPlace } = describeWhereFound(context, rule);
	const allowance = describeAllowance(rule);
	if (ruleOutcome.isMatch) return `${quoteValue(ruleOutcome.rightDisplayValue)} in ${rightPlace} agrees with ${quoteValue(ruleOutcome.leftDisplayValue)} in ${leftPlace}. ${allowance}.`;
	const isRightMissing = ruleOutcome.rightDisplayValue.trim() === '';
	const isLeftMissing = ruleOutcome.leftDisplayValue.trim() === '';
	switch (true) {
		case isLeftMissing && !isRightMissing:
			return `${leftPlace} is empty, but ${rightPlace} has ${quoteValue(ruleOutcome.rightDisplayValue)}.`;
		case isRightMissing && !isLeftMissing:
			return `${rightPlace} is empty, but ${leftPlace} has ${quoteValue(ruleOutcome.leftDisplayValue)}.`;
		default:
			return `Found ${quoteValue(ruleOutcome.rightDisplayValue)} in ${rightPlace}, but expected ${quoteValue(ruleOutcome.leftDisplayValue)} from ${leftPlace}. ${allowance} — ${ruleOutcome.differenceDescription.toLowerCase()}.`;
	}
}

function describeKeyValues(context: ExplanationContext, side: 'left' | 'right', rowIndex: number): string {
	const table = side === 'left' ? context.leftTable : context.rightTable;
	return context.plan.keyRules
		.map((keyRule) => {
			const source = side === 'left' ? keyRule.leftSource : keyRule.rightSource;
			return `${describeColumnSource(table, source)} = ${quoteValue(readRawSourceText(table.rows[rowIndex] ?? [], source))}`;
		})
		.join(' and ');
}

function describeOtherSideKeyColumns(context: ExplanationContext, otherSide: 'left' | 'right'): string {
	const otherTable = otherSide === 'left' ? context.leftTable : context.rightTable;
	return context.plan.keyRules.map((keyRule) => describeColumnSource(otherTable, otherSide === 'left' ? keyRule.leftSource : keyRule.rightSource)).join(' + ');
}

export function explainUnpairedRow(context: ExplanationContext, unpairedRow: UnpairedRow, side: 'left' | 'right'): string {
	const otherSide = side === 'left' ? 'right' : 'left';
	const otherLabel = otherSide === 'left' ? context.labels.leftLabel : context.labels.rightLabel;
	const keyValues = describeKeyValues(context, side, unpairedRow.rowIndex);
	const fallbackNote = context.plan.fallbackMatching.isEnabled ? ' No row with the same amount on a nearby date was found either.' : '';
	switch (unpairedRow.unpairedReason) {
		case 'key_not_found':
			return `This row has ${keyValues}, but no row in ${otherLabel} has that ${describeOtherSideKeyColumns(context, otherSide)}.${fallbackNote}`;
		case 'key_is_blank':
			return `The column used to pair rows is blank here (${keyValues}), so it could not be paired.${fallbackNote}`;
		case 'extra_duplicate':
			return `Another row with ${keyValues} was already paired with ${otherLabel}. This is an extra copy with nothing left to pair with.`;
	}
}

export function explainPairing(context: ExplanationContext, pairedRow: PairedRow): string {
	const keyValues = describeKeyValues(context, 'left', pairedRow.leftRowIndex);
	switch (pairedRow.matchMethod) {
		case 'exact_key':
			return `Paired because both rows have ${keyValues}.`;
		case 'amount_and_date':
			return `No row shared ${keyValues}, so these were paired because they have the same amount on nearby dates. Please check they really belong together.`;
	}
}
