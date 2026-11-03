import { describe, expect, it } from 'vitest';
import { runReconciliation } from './matchEngine';
import { buildRule } from './planSuggester';
import { buildResultGridPage, type GridContext } from './resultGrid';
import type { DataTable, MatchPlan } from './types';

function buildTable(fileName: string, columnNames: string[], rows: string[][]): DataTable {
	return { fileName, sheetName: null, columnNames, rows, skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first' };
}

function buildGridContext(): GridContext {
	const column = (columnIndex: number) => ({ sourceKind: 'column' as const, columnIndex });
	const leftTable = buildTable('ledger.csv', ['Ref', 'Amount', 'Memo'], [['INV-1', '100.00', 'Rent'], ['INV-2', '50.00', 'Fuel'], ['INV-3', '75.00', 'Water']]);
	const rightTable = buildTable('bank.csv', ['Reference', 'Paid'], [['INV-1', '100'], ['INV-2', '55'], ['INV-9', '10']]);
	const plan: MatchPlan = {
		keyRules: [buildRule('reference', 'reference', column(0), column(0))],
		compareRules: [buildRule('amount', 'amount', column(1), column(1), { amountTolerance: 1 })],
		fallbackMatching: { isEnabled: false, amountRuleId: 'amount', dateRuleId: null, dateWindowDays: 3 }
	};
	return { leftTable, rightTable, plan, labels: { leftLabel: 'Ledger', rightLabel: 'Bank' }, outcome: runReconciliation(leftTable, rightTable, plan) };
}

describe('result table rows', () => {
	it('explains exactly which value differed, what was expected and the allowed difference', () => {
		const gridPage = buildResultGridPage(buildGridContext(), { viewKind: 'pairs', category: 'needs_review' }, 0, 50, '');
		const differingRow = gridPage.rows[0];
		expect(differingRow.rightCells?.[1]).toMatchObject({ cellText: '55', cellState: 'differs' });
		expect(differingRow.leftCells?.[2].cellState).toBe('plain');
		expect(differingRow.reasons[0]).toBe('Found “55.00” in Bank · Paid, but expected “50.00” from Ledger · Amount. Allowed difference ±1.00 — off by -5.00.');
	});

	it('marks the pairing column of an unpaired row and says why it found no partner', () => {
		const gridPage = buildResultGridPage(buildGridContext(), { viewKind: 'pairs', category: 'only_left' }, 0, 50, '');
		expect(gridPage.rows[0].leftCells?.[0]).toMatchObject({ cellText: 'INV-3', cellState: 'unpaired_key' });
		expect(gridPage.rows[0].rightCells).toBeNull();
		expect(gridPage.rows[0].reasons[0]).toContain('no row in Bank has that Reference');
	});

	it('shows a whole file in its original order with each row’s partner beside it', () => {
		const gridPage = buildResultGridPage(buildGridContext(), { viewKind: 'file', side: 'right' }, 0, 50, '');
		expect(gridPage.rows.map((gridRow) => gridRow.rightRowNumber)).toEqual([1, 2, 3]);
		expect(gridPage.rows.map((gridRow) => gridRow.rowStatus)).toEqual(['matched', 'needs_review', 'only_right']);
		expect(gridPage.rows[0].leftCells?.[2].cellText).toBe('Rent');
	});

	it('lists every row with problems first when showing everything, and supports search and paging', () => {
		const context = buildGridContext();
		const everythingPage = buildResultGridPage(context, { viewKind: 'pairs', category: 'all' }, 0, 50, '');
		expect(everythingPage.rows.map((gridRow) => gridRow.rowStatus)).toEqual(['needs_review', 'only_left', 'only_right', 'matched']);
		expect(buildResultGridPage(context, { viewKind: 'pairs', category: 'all' }, 0, 50, 'water').totalRowCount).toBe(1);
		expect(buildResultGridPage(context, { viewKind: 'pairs', category: 'all' }, 1, 3, '').rows).toHaveLength(1);
	});
});
