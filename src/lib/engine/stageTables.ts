import { formatAmountForDisplay, parseAccountingAmount, roundToCents } from './amountParser';
import { readRawSourceText } from './fieldValues';
import type { DataTable, PairedRow, ReconciliationOutcome } from './types';
import type { OutputColumn, RowFilter, StageRowStatus, SummarizeSpec, TableLabels } from './workflowTypes';
import { STAGE_ROW_STATUS_LABELS } from './workflowTypes';

export const STEP_STATUS_COLUMN_PATTERN = /^Step \d+ status$/;

export function buildDefaultOutputColumns(leftTable: DataTable, rightTable: DataTable, labels: TableLabels, stageNumber: number): OutputColumn[] {
	const columnFromSide = (side: 'left' | 'right', table: DataTable, label: string): OutputColumn[] =>
		table.columnNames.map((columnName, columnIndex) => ({
			outputName: isCarriedForwardColumnName(columnName) ? columnName : `${label}: ${columnName}`,
			sourceSide: side,
			columnSource: { sourceKind: 'column', columnIndex }
		}));
	const outputColumns: OutputColumn[] = [
		{ outputName: `Step ${stageNumber} status`, sourceSide: 'result', resultField: 'status' },
		{ outputName: `Step ${stageNumber} differences`, sourceSide: 'result', resultField: 'differences' },
		...columnFromSide('left', leftTable, labels.leftLabel),
		...columnFromSide('right', rightTable, labels.rightLabel)
	];
	return makeOutputNamesUnique(outputColumns);
}

export function makeOutputNamesUnique(outputColumns: OutputColumn[]): OutputColumn[] {
	const timesSeenByName = new Map<string, number>();
	return outputColumns.map((outputColumn) => {
		const timesSeen = (timesSeenByName.get(outputColumn.outputName) ?? 0) + 1;
		timesSeenByName.set(outputColumn.outputName, timesSeen);
		return timesSeen === 1 ? outputColumn : { ...outputColumn, outputName: `${outputColumn.outputName} (${timesSeen})` };
	});
}

function isCarriedForwardColumnName(columnName: string): boolean {
	return /^Step \d+ /.test(columnName) || /^[^:]{1,30}: /.test(columnName);
}

export function buildStageOutputTable(leftTable: DataTable, rightTable: DataTable, outcome: ReconciliationOutcome, outputColumns: OutputColumn[], outputName: string): DataTable {
	const rows: string[][] = [];
	const rowStatuses: StageRowStatus[] = [];
	const emitRow = (leftRow: string[] | null, rightRow: string[] | null, rowStatus: StageRowStatus, differencesText: string): boolean => {
		rows.push(outputColumns.map((outputColumn) => readOutputCell(outputColumn, leftRow, rightRow, rowStatus, differencesText)));
		rowStatuses.push(rowStatus);
		return true;
	};
	for (const pairedRow of outcome.pairedRows) {
		emitRow(leftTable.rows[pairedRow.leftRowIndex], rightTable.rows[pairedRow.rightRowIndex], decidePairedRowStatus(pairedRow), describePairDifferences(pairedRow));
	}
	for (const unpairedRow of outcome.onlyInLeft) emitRow(leftTable.rows[unpairedRow.rowIndex], null, 'only_left', '');
	for (const unpairedRow of outcome.onlyInRight) emitRow(null, rightTable.rows[unpairedRow.rowIndex], 'only_right', '');
	console.log(`[stageTables] Built "${outputName}" with ${rows.length} rows and ${outputColumns.length} columns`);
	return {
		fileName: outputName,
		sheetName: null,
		columnNames: outputColumns.map((outputColumn) => outputColumn.outputName),
		rows,
		skippedRowCount: 0,
		detectedSystemName: null,
		dateOrder: leftTable.dateOrder,
		rowStatuses
	};
}

function decidePairedRowStatus(pairedRow: PairedRow): StageRowStatus {
	if (pairedRow.matchMethod === 'amount_and_date') return 'paired_by_amount_and_date';
	return pairedRow.pairStatus === 'matched' ? 'matched' : 'different';
}

function describePairDifferences(pairedRow: PairedRow): string {
	return pairedRow.ruleOutcomes.filter((ruleOutcome) => !ruleOutcome.isMatch).map((ruleOutcome) => `${ruleOutcome.leftDisplayValue} vs ${ruleOutcome.rightDisplayValue}${ruleOutcome.differenceDescription ? ` (${ruleOutcome.differenceDescription})` : ''}`).join('; ');
}

function readOutputCell(outputColumn: OutputColumn, leftRow: string[] | null, rightRow: string[] | null, rowStatus: StageRowStatus, differencesText: string): string {
	switch (outputColumn.sourceSide) {
		case 'result':
			return outputColumn.resultField === 'status' ? STAGE_ROW_STATUS_LABELS[rowStatus] : differencesText;
		case 'left':
			return leftRow ? readRawSourceText(leftRow, outputColumn.columnSource) : '';
		case 'right':
			return rightRow ? readRawSourceText(rightRow, outputColumn.columnSource) : '';
	}
}

export function doesStatusPassFilter(rowStatus: StageRowStatus | undefined, rowFilter: RowFilter): boolean {
	if (rowStatus === undefined) return true;
	switch (rowFilter) {
		case 'all_rows':
			return true;
		case 'paired_rows':
			return rowStatus === 'matched' || rowStatus === 'different' || rowStatus === 'paired_by_amount_and_date';
		case 'matched_rows':
			return rowStatus === 'matched';
		case 'rows_needing_review':
			return rowStatus === 'different' || rowStatus === 'paired_by_amount_and_date';
		case 'only_left':
			return rowStatus === 'only_left';
		case 'only_right':
			return rowStatus === 'only_right';
		case 'all_unmatched':
			return rowStatus === 'only_left' || rowStatus === 'only_right';
	}
}

export function applyRowFilter(table: DataTable, rowFilter: RowFilter): DataTable {
	if (!table.rowStatuses || rowFilter === 'all_rows') return table;
	const keptRowIndexes = table.rows.map((_, rowIndex) => rowIndex).filter((rowIndex) => doesStatusPassFilter(table.rowStatuses?.[rowIndex], rowFilter));
	return { ...table, rows: keptRowIndexes.map((rowIndex) => table.rows[rowIndex]), rowStatuses: keptRowIndexes.map((rowIndex) => table.rowStatuses![rowIndex]) };
}

export function summarizeTable(table: DataTable, summarizeSpec: SummarizeSpec): DataTable {
	const groupTotalsByKey = new Map<string, { groupValues: string[]; sumsInCents: number[]; rowCount: number }>();
	for (const row of table.rows) {
		const groupValues = summarizeSpec.groupByColumnIndexes.map((columnIndex) => (row[columnIndex] ?? '').trim());
		const groupKey = groupValues.map((groupValue) => groupValue.toLowerCase()).join('\u001f');
		const groupTotals = groupTotalsByKey.get(groupKey) ?? { groupValues, sumsInCents: summarizeSpec.sumColumnIndexes.map(() => 0), rowCount: 0 };
		summarizeSpec.sumColumnIndexes.forEach((columnIndex, sumPosition) => {
			const parsedAmount = parseAccountingAmount(row[columnIndex]);
			if (parsedAmount.isValidAmount) groupTotals.sumsInCents[sumPosition] += Math.round(parsedAmount.amountValue * 100);
		});
		groupTotals.rowCount++;
		groupTotalsByKey.set(groupKey, groupTotals);
	}
	const summarizedRows = [...groupTotalsByKey.values()].map((groupTotals) => [
		...groupTotals.groupValues,
		...groupTotals.sumsInCents.map((sumInCents) => formatAmountForDisplay(roundToCents(sumInCents / 100)).replace(/,/g, '')),
		String(groupTotals.rowCount)
	]);
	console.log(`[stageTables] Added up ${table.rows.length} rows into ${summarizedRows.length} groups`);
	return {
		...table,
		fileName: `${table.fileName} (added up)`,
		columnNames: [
			...summarizeSpec.groupByColumnIndexes.map((columnIndex) => table.columnNames[columnIndex]),
			...summarizeSpec.sumColumnIndexes.map((columnIndex) => `Total ${table.columnNames[columnIndex]}`),
			'Number of rows'
		],
		rows: summarizedRows,
		rowStatuses: undefined
	};
}

export function countRowsMatchedInEveryStep(table: DataTable): { stepCount: number; matchedEverywhereCount: number } {
	const stepStatusColumnIndexes = table.columnNames.map((columnName, columnIndex) => (STEP_STATUS_COLUMN_PATTERN.test(columnName) ? columnIndex : -1)).filter((columnIndex) => columnIndex !== -1);
	const matchedLabel = STAGE_ROW_STATUS_LABELS.matched;
	const matchedEverywhereCount = table.rows.filter((row) => stepStatusColumnIndexes.length > 0 && stepStatusColumnIndexes.every((columnIndex) => row[columnIndex] === matchedLabel)).length;
	return { stepCount: stepStatusColumnIndexes.length, matchedEverywhereCount };
}

export const STACKED_SOURCE_COLUMN_NAME = 'Source';

export function stackTables(tablesWithLabels: { table: DataTable; sourceLabel: string }[]): DataTable {
	if (tablesWithLabels.length === 1) return tablesWithLabels[0].table;
	const normalizedName = (columnName: string): string => columnName.trim().toLowerCase();
	const stackedColumnNames: string[] = [];
	for (const { table } of tablesWithLabels) {
		for (const columnName of table.columnNames) {
			if (!stackedColumnNames.some((existingName) => normalizedName(existingName) === normalizedName(columnName))) stackedColumnNames.push(columnName);
		}
	}
	const rows: string[][] = [];
	const rowStatuses: StageRowStatus[] = [];
	for (const { table, sourceLabel } of tablesWithLabels) {
		const columnPositionByName = new Map(table.columnNames.map((columnName, columnIndex) => [normalizedName(columnName), columnIndex]));
		table.rows.forEach((row, rowIndex) => {
			rows.push([...stackedColumnNames.map((columnName) => row[columnPositionByName.get(normalizedName(columnName)) ?? -1] ?? ''), sourceLabel]);
			if (table.rowStatuses) rowStatuses.push(table.rowStatuses[rowIndex]);
		});
	}
	console.log(`[stageTables] Stacked ${tablesWithLabels.length} sources into ${rows.length} rows`);
	const firstTable = tablesWithLabels[0].table;
	return {
		...firstTable,
		fileName: tablesWithLabels.map(({ sourceLabel }) => sourceLabel).join(' + '),
		columnNames: [...stackedColumnNames, STACKED_SOURCE_COLUMN_NAME],
		rows,
		detectedSystemName: tablesWithLabels.every(({ table }) => table.detectedSystemName === firstTable.detectedSystemName) ? firstTable.detectedSystemName : null,
		rowStatuses: rowStatuses.length === rows.length ? rowStatuses : undefined
	};
}
