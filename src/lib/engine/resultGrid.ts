import { explainPairing, explainRuleOutcome, explainUnpairedRow, listColumnIndexesForSource, type ExplanationContext } from './resultExplanations';
import type { ResultCategory } from './resultViews';
import type { FieldRule, PairedRow, ReconciliationOutcome, UnpairedRow } from './types';

export type GridCellState = 'plain' | 'agrees' | 'differs' | 'unpaired_key';
export type GridCell = { cellText: string; cellState: GridCellState; explanation: string };
export type GridRow = { rowKey: string; rowStatus: ResultCategory; leftRowNumber: number | null; rightRowNumber: number | null; leftCells: GridCell[] | null; rightCells: GridCell[] | null; reasons: string[] };
export type GridView = { viewKind: 'pairs'; category: ResultCategory | 'all' } | { viewKind: 'file'; side: 'left' | 'right' };
export type ResultGridPage = { view: GridView; leftColumnNames: string[]; rightColumnNames: string[]; rows: GridRow[]; totalRowCount: number; pageNumber: number };
export type GridContext = ExplanationContext & { outcome: ReconciliationOutcome };

type RowReference = { pairedRow: PairedRow } | { unpairedRow: UnpairedRow; side: 'left' | 'right' };

const CATEGORY_ORDER_FOR_ALL: ResultCategory[] = ['needs_review', 'only_left', 'only_right', 'matched'];

export function categorizePairedRow(pairedRow: PairedRow): ResultCategory {
	return pairedRow.pairStatus === 'matched_with_differences' || pairedRow.matchMethod === 'amount_and_date' ? 'needs_review' : 'matched';
}

function listReferencesForCategory(outcome: ReconciliationOutcome, category: ResultCategory): RowReference[] {
	switch (category) {
		case 'only_left':
			return outcome.onlyInLeft.map((unpairedRow) => ({ unpairedRow, side: 'left' as const }));
		case 'only_right':
			return outcome.onlyInRight.map((unpairedRow) => ({ unpairedRow, side: 'right' as const }));
		default:
			return outcome.pairedRows.filter((pairedRow) => categorizePairedRow(pairedRow) === category).map((pairedRow) => ({ pairedRow }));
	}
}

function listReferencesInFileOrder(outcome: ReconciliationOutcome, side: 'left' | 'right', fileRowCount: number): RowReference[] {
	const referenceByRowIndex = new Map<number, RowReference>();
	for (const pairedRow of outcome.pairedRows) referenceByRowIndex.set(side === 'left' ? pairedRow.leftRowIndex : pairedRow.rightRowIndex, { pairedRow });
	for (const unpairedRow of side === 'left' ? outcome.onlyInLeft : outcome.onlyInRight) referenceByRowIndex.set(unpairedRow.rowIndex, { unpairedRow, side });
	return Array.from({ length: fileRowCount }, (_, rowIndex) => referenceByRowIndex.get(rowIndex)).filter((reference): reference is RowReference => reference !== undefined);
}

function listReferencesForView(context: GridContext, view: GridView): RowReference[] {
	switch (view.viewKind) {
		case 'file':
			return listReferencesInFileOrder(context.outcome, view.side, (view.side === 'left' ? context.leftTable : context.rightTable).rows.length);
		case 'pairs':
			return view.category === 'all' ? CATEGORY_ORDER_FOR_ALL.flatMap((category) => listReferencesForCategory(context.outcome, category)) : listReferencesForCategory(context.outcome, view.category);
	}
}

function buildPlainCells(row: string[], columnCount: number): GridCell[] {
	return Array.from({ length: columnCount }, (_, columnIndex) => ({ cellText: row[columnIndex] ?? '', cellState: 'plain' as GridCellState, explanation: '' }));
}

function markCells(cells: GridCell[], columnIndexes: number[], cellState: GridCellState, explanation: string): boolean {
	for (const columnIndex of columnIndexes) {
		const cell = cells[columnIndex];
		if (!cell || cell.cellState === 'differs') continue;
		cells[columnIndex] = { ...cell, cellState, explanation: cell.explanation && cellState === cell.cellState ? `${cell.explanation} ${explanation}` : explanation };
	}
	return true;
}

function buildPairedGridRow(context: GridContext, pairedRow: PairedRow): GridRow {
	const allRules: FieldRule[] = [...context.plan.keyRules, ...context.plan.compareRules];
	const leftCells = buildPlainCells(context.leftTable.rows[pairedRow.leftRowIndex], context.leftTable.columnNames.length);
	const rightCells = buildPlainCells(context.rightTable.rows[pairedRow.rightRowIndex], context.rightTable.columnNames.length);
	const differenceReasons: string[] = [];
	for (const ruleOutcome of pairedRow.ruleOutcomes) {
		const rule = allRules.find((candidateRule) => candidateRule.ruleId === ruleOutcome.ruleId);
		if (!rule) continue;
		const explanation = explainRuleOutcome(context, rule, ruleOutcome);
		const cellState: GridCellState = ruleOutcome.isMatch ? 'agrees' : 'differs';
		markCells(leftCells, listColumnIndexesForSource(rule.leftSource), cellState, explanation);
		markCells(rightCells, listColumnIndexesForSource(rule.rightSource), cellState, explanation);
		if (!ruleOutcome.isMatch) differenceReasons.push(explanation);
	}
	return {
		rowKey: `pair-${pairedRow.leftRowIndex}-${pairedRow.rightRowIndex}`,
		rowStatus: categorizePairedRow(pairedRow),
		leftRowNumber: pairedRow.leftRowIndex + 1,
		rightRowNumber: pairedRow.rightRowIndex + 1,
		leftCells,
		rightCells,
		reasons: [...differenceReasons, explainPairing(context, pairedRow)]
	};
}

function buildUnpairedGridRow(context: GridContext, unpairedRow: UnpairedRow, side: 'left' | 'right'): GridRow {
	const table = side === 'left' ? context.leftTable : context.rightTable;
	const cells = buildPlainCells(table.rows[unpairedRow.rowIndex], table.columnNames.length);
	const explanation = explainUnpairedRow(context, unpairedRow, side);
	for (const keyRule of context.plan.keyRules) markCells(cells, listColumnIndexesForSource(side === 'left' ? keyRule.leftSource : keyRule.rightSource), 'unpaired_key', explanation);
	return {
		rowKey: `${side}-${unpairedRow.rowIndex}`,
		rowStatus: side === 'left' ? 'only_left' : 'only_right',
		leftRowNumber: side === 'left' ? unpairedRow.rowIndex + 1 : null,
		rightRowNumber: side === 'right' ? unpairedRow.rowIndex + 1 : null,
		leftCells: side === 'left' ? cells : null,
		rightCells: side === 'right' ? cells : null,
		reasons: [explanation]
	};
}

function referenceContainsText(context: GridContext, reference: RowReference, loweredSearchText: string): boolean {
	const rowsToSearch = 'pairedRow' in reference
		? [context.leftTable.rows[reference.pairedRow.leftRowIndex], context.rightTable.rows[reference.pairedRow.rightRowIndex]]
		: [(reference.side === 'left' ? context.leftTable : context.rightTable).rows[reference.unpairedRow.rowIndex]];
	return rowsToSearch.some((row) => (row ?? []).some((cellText) => cellText.toLowerCase().includes(loweredSearchText)));
}

export function buildResultGridPage(context: GridContext, view: GridView, pageNumber: number, pageSize: number, searchText: string): ResultGridPage {
	const loweredSearchText = searchText.trim().toLowerCase();
	const allReferences = listReferencesForView(context, view);
	const matchingReferences = loweredSearchText === '' ? allReferences : allReferences.filter((reference) => referenceContainsText(context, reference, loweredSearchText));
	const pageReferences = matchingReferences.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
	const rows = pageReferences.map((reference) => ('pairedRow' in reference ? buildPairedGridRow(context, reference.pairedRow) : buildUnpairedGridRow(context, reference.unpairedRow, reference.side)));
	console.log(`[resultGrid] Built ${rows.length} of ${matchingReferences.length} rows for ${view.viewKind} view`);
	return { view, leftColumnNames: context.leftTable.columnNames, rightColumnNames: context.rightTable.columnNames, rows, totalRowCount: matchingReferences.length, pageNumber };
}
