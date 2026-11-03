import { describe, expect, it } from 'vitest';
import { runReconciliation } from './matchEngine';
import type { ColumnSource, DataTable, FieldKind, FieldRule, MatchPlan } from './types';

function buildTable(columnNames: string[], rows: string[][]): DataTable {
	return { fileName: 'test.csv', sheetName: null, columnNames, rows, skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first' };
}

function column(columnIndex: number): ColumnSource {
	return { sourceKind: 'column', columnIndex };
}

function buildRule(ruleId: string, fieldKind: FieldKind, leftSource: ColumnSource, rightSource: ColumnSource, overrides: Partial<FieldRule> = {}): FieldRule {
	return { ruleId, fieldKind, leftSource, rightSource, amountTolerance: 0, dateToleranceDays: 0, textSimilarityPercent: 100, amountSignMode: 'same_sign', ...overrides };
}

function buildPlan(keyRules: FieldRule[], compareRules: FieldRule[], fallbackEnabled = false): MatchPlan {
	return {
		keyRules,
		compareRules,
		fallbackMatching: { isEnabled: fallbackEnabled, amountRuleId: 'amount', dateRuleId: 'date', dateWindowDays: 3 }
	};
}

describe('runReconciliation', () => {
	const referenceRule = buildRule('reference', 'reference', column(0), column(0));
	const amountRule = buildRule('amount', 'amount', column(1), column(1));

	it('pairs rows by reference and flags amount differences', () => {
		const leftTable = buildTable(['Ref', 'Amount'], [['INV-001', '1,000.00'], ['INV-002', '50'], ['INV-003', '75']]);
		const rightTable = buildTable(['Ref', 'Amount'], [['inv001', '1000'], ['INV-002', '55'], ['INV-004', '10']]);
		const outcome = runReconciliation(leftTable, rightTable, buildPlan([referenceRule], [amountRule]));

		expect(outcome.summary.matchedCount).toBe(1);
		expect(outcome.summary.matchedWithDifferencesCount).toBe(1);
		expect(outcome.onlyInLeft.map((unpaired) => unpaired.rowIndex)).toEqual([2]);
		expect(outcome.onlyInRight.map((unpaired) => unpaired.rowIndex)).toEqual([2]);
		expect(outcome.summary.pairedAmountDifferenceTotal).toBe(-5);
		expect(outcome.summary.unexplainedDifference).toBe(0);
	});

	it('keeps duplicate references one-to-one instead of silently dropping them', () => {
		const leftTable = buildTable(['Ref', 'Amount'], [['A1', '10'], ['A1', '20'], ['A1', '30']]);
		const rightTable = buildTable(['Ref', 'Amount'], [['A1', '20'], ['A1', '10']]);
		const outcome = runReconciliation(leftTable, rightTable, buildPlan([referenceRule], [amountRule]));

		expect(outcome.summary.matchedCount).toBe(2);
		expect(outcome.onlyInLeft).toEqual([{ rowIndex: 2, unpairedReason: 'extra_duplicate' }]);
		expect(outcome.summary.duplicateKeyCountLeft).toBe(1);
	});

	it('supports composite keys across several columns', () => {
		const leftTable = buildTable(['Store', 'SKU', 'Qty'], [['Kampala', 'SKU1', '5'], ['Entebbe', 'SKU1', '7']]);
		const rightTable = buildTable(['Branch', 'Item', 'Count'], [['entebbe', 'sku1', '7'], ['Kampala', 'SKU1', '4']]);
		const plan = buildPlan(
			[buildRule('store', 'text', column(0), column(0)), buildRule('sku', 'reference', column(1), column(1))],
			[buildRule('qty', 'amount', column(2), column(2))]
		);
		const outcome = runReconciliation(leftTable, rightTable, plan);

		expect(outcome.summary.matchedCount).toBe(1);
		expect(outcome.summary.matchedWithDifferencesCount).toBe(1);
		const kampalaPair = outcome.pairedRows.find((pairedRow) => pairedRow.leftRowIndex === 0);
		expect(kampalaPair?.rightRowIndex).toBe(1);
		expect(kampalaPair?.ruleOutcomes[0].differenceDescription).toBe('Off by 1.00');
	});

	it('reports rows with blank keys instead of hiding them', () => {
		const leftTable = buildTable(['Ref', 'Amount'], [['', '10']]);
		const rightTable = buildTable(['Ref', 'Amount'], [['X', '10']]);
		const outcome = runReconciliation(leftTable, rightTable, buildPlan([referenceRule], [amountRule]));
		expect(outcome.onlyInLeft).toEqual([{ rowIndex: 0, unpairedReason: 'key_is_blank' }]);
	});

	it('falls back to amount and nearest date within the window for bank style matching', () => {
		const dateRule = buildRule('date', 'date', column(2), column(1));
		const bankAmountRule = buildRule('amount', 'amount', column(1), { sourceKind: 'debit_minus_credit', debitColumnIndex: 2, creditColumnIndex: 3 });
		const leftTable = buildTable(['Ref', 'Amount', 'Date'], [['CHQ-9', '-500', '01/03/2024'], ['DEP-1', '1200', '05/03/2024'], ['X', '-500', '20/03/2024']]);
		const rightTable = buildTable(['Narration', 'Date', 'Deposits', 'Withdrawals'], [
			['Cheque 9', '03/03/2024', '', '500.00'],
			['Cash deposit', '05/03/2024', '1,200.00', '']
		]);
		const plan = buildPlan([buildRule('reference', 'reference', column(0), column(0))], [bankAmountRule, dateRule], true);
		const outcome = runReconciliation(leftTable, rightTable, plan);

		expect(outcome.summary.matchedByFallbackCount).toBe(2);
		expect(outcome.onlyInLeft.map((unpaired) => unpaired.rowIndex)).toEqual([2]);
		const chequePair = outcome.pairedRows.find((pairedRow) => pairedRow.leftRowIndex === 0);
		expect(chequePair?.pairStatus).toBe('matched_with_differences');
		expect(outcome.summary.unexplainedDifference).toBe(0);
	});

	it('handles opposite sign conventions between files', () => {
		const leftTable = buildTable(['Ref', 'Amount'], [['A', '100']]);
		const rightTable = buildTable(['Ref', 'Amount'], [['A', '(100)']]);
		const flippedAmountRule = buildRule('amount', 'amount', column(1), column(1), { amountSignMode: 'opposite_sign' });
		const outcome = runReconciliation(leftTable, rightTable, buildPlan([referenceRule], [flippedAmountRule]));
		expect(outcome.summary.matchedCount).toBe(1);
	});

	it('applies amount and date tolerances', () => {
		const leftTable = buildTable(['Ref', 'Amount', 'Date'], [['A', '100.00', '2024-01-01']]);
		const rightTable = buildTable(['Ref', 'Amount', 'Date'], [['A', '100.40', '2024-01-03']]);
		const plan = buildPlan([referenceRule], [
			buildRule('amount', 'amount', column(1), column(1), { amountTolerance: 0.5 }),
			buildRule('date', 'date', column(2), column(2), { dateToleranceDays: 2 })
		]);
		expect(runReconciliation(leftTable, rightTable, plan).summary.matchedCount).toBe(1);
	});

	it('reconciles 100k rows quickly', () => {
		const rowCount = 100_000;
		const leftRows = Array.from({ length: rowCount }, (_, rowIndex) => [`REF${rowIndex}`, String(rowIndex * 1.5)]);
		const rightRows = [...leftRows].reverse().map((row) => [...row]);
		const outcome = runReconciliation(buildTable(['Ref', 'Amount'], leftRows), buildTable(['Ref', 'Amount'], rightRows), buildPlan([referenceRule], [amountRule]));
		expect(outcome.summary.matchedCount).toBe(rowCount);
		expect(outcome.summary.durationInMilliseconds).toBeLessThan(5000);
	});
});
