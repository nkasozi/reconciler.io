import { roundToCents } from './amountParser';
import { readComparableAmount } from './fieldValues';
import type { DataTable, FieldRule, FileSide, MatchPlan, PairedRow, ReconciliationSummary, UnpairedRow } from './types';

export type SummaryInputs = {
	leftTable: DataTable;
	rightTable: DataTable;
	plan: MatchPlan;
	pairedRows: PairedRow[];
	onlyInLeft: UnpairedRow[];
	onlyInRight: UnpairedRow[];
	duplicateKeyCountLeft: number;
	duplicateKeyCountRight: number;
	durationInMilliseconds: number;
};

export function findPrimaryAmountRule(plan: MatchPlan): FieldRule | null {
	const allRules = [...plan.keyRules, ...plan.compareRules];
	const fallbackAmountRule = allRules.find((rule) => rule.ruleId === plan.fallbackMatching.amountRuleId);
	return fallbackAmountRule ?? allRules.find((rule) => rule.fieldKind === 'amount') ?? null;
}

export function buildReconciliationSummary(inputs: SummaryInputs): ReconciliationSummary {
	const amountRule = findPrimaryAmountRule(inputs.plan);
	const sumAmountsForRows = (table: DataTable, side: FileSide, rowIndexes: number[]): number =>
		amountRule ? sumComparableAmounts(table, side, rowIndexes, amountRule) : 0;

	const allLeftRowIndexes = inputs.leftTable.rows.map((_, rowIndex) => rowIndex);
	const allRightRowIndexes = inputs.rightTable.rows.map((_, rowIndex) => rowIndex);
	const leftAmountTotal = sumAmountsForRows(inputs.leftTable, 'left', allLeftRowIndexes);
	const rightAmountTotal = sumAmountsForRows(inputs.rightTable, 'right', allRightRowIndexes);
	const onlyInLeftAmountTotal = sumAmountsForRows(inputs.leftTable, 'left', inputs.onlyInLeft.map((unpaired) => unpaired.rowIndex));
	const onlyInRightAmountTotal = sumAmountsForRows(inputs.rightTable, 'right', inputs.onlyInRight.map((unpaired) => unpaired.rowIndex));
	const pairedAmountDifferenceTotal = roundToCents(inputs.pairedRows.reduce((runningTotal, pairedRow) => runningTotal + pairedRow.amountDifference, 0));
	const unexplainedDifference = roundToCents(
		leftAmountTotal - rightAmountTotal - (onlyInLeftAmountTotal - onlyInRightAmountTotal) - pairedAmountDifferenceTotal
	);

	return {
		leftTotals: { rowCount: inputs.leftTable.rows.length, amountTotal: leftAmountTotal },
		rightTotals: { rowCount: inputs.rightTable.rows.length, amountTotal: rightAmountTotal },
		matchedCount: inputs.pairedRows.filter((pairedRow) => pairedRow.pairStatus === 'matched').length,
		matchedWithDifferencesCount: inputs.pairedRows.filter((pairedRow) => pairedRow.pairStatus === 'matched_with_differences').length,
		matchedByFallbackCount: inputs.pairedRows.filter((pairedRow) => pairedRow.matchMethod === 'amount_and_date').length,
		onlyInLeftCount: inputs.onlyInLeft.length,
		onlyInRightCount: inputs.onlyInRight.length,
		onlyInLeftAmountTotal,
		onlyInRightAmountTotal,
		pairedAmountDifferenceTotal,
		unexplainedDifference,
		duplicateKeyCountLeft: inputs.duplicateKeyCountLeft,
		duplicateKeyCountRight: inputs.duplicateKeyCountRight,
		hasAmountRule: amountRule !== null,
		durationInMilliseconds: inputs.durationInMilliseconds
	};
}

function sumComparableAmounts(table: DataTable, side: FileSide, rowIndexes: number[], amountRule: FieldRule): number {
	let runningTotalInCents = 0;
	for (const rowIndex of rowIndexes) {
		const comparableAmount = readComparableAmount({ row: table.rows[rowIndex], side, dateOrder: table.dateOrder }, amountRule);
		if (comparableAmount !== null) runningTotalInCents += Math.round(comparableAmount * 100);
	}
	return runningTotalInCents / 100;
}
