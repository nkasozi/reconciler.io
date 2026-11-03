import { isAccountingAmount } from './amountParser';
import { parseFlexibleDate } from './dateParser';
import { findRoleForHeader } from './columnRoles';

const MAXIMUM_ROWS_TO_SEARCH_FOR_HEADER = 40;
const SUMMARY_ROW_LABEL_PATTERN =
	/^(total|totals|grand total|sub ?total|net total|opening balance|closing balance|balance b\/?f|balance c\/?f|brought forward|carried forward|net change|end of report)\b/i;

export type CleanedGrid = {
	columnNames: string[];
	rows: string[][];
	skippedRowCount: number;
};

export function convertGridToTable(rawGrid: string[][]): CleanedGrid {
	const nonEmptyGrid = rawGrid.map((row) => row.map((cell) => String(cell ?? '').trim()));
	const headerRowIndex = findHeaderRowIndex(nonEmptyGrid);
	const columnNames = buildUniqueColumnNames(nonEmptyGrid[headerRowIndex] ?? []);
	const candidateDataRows = nonEmptyGrid.slice(headerRowIndex + 1);
	const headerSignature = (nonEmptyGrid[headerRowIndex] ?? []).join('|').toLowerCase();
	const keptRows = candidateDataRows
		.filter((row) => row.join('|').toLowerCase() !== headerSignature)
		.filter((row) => isRealDataRow(row, columnNames.length))
		.map((row) => padRowToWidth(row, columnNames.length));
	const skippedRowCount = headerRowIndex + candidateDataRows.length - keptRows.length;
	console.log(`[headerDetection] Header found on row ${headerRowIndex + 1}, kept ${keptRows.length} rows, skipped ${skippedRowCount}`);
	return { columnNames, rows: keptRows, skippedRowCount };
}

export function findHeaderRowIndex(grid: string[][]): number {
	let bestRowIndex = 0;
	let bestHeaderScore = Number.NEGATIVE_INFINITY;
	const rowsToSearch = Math.min(grid.length, MAXIMUM_ROWS_TO_SEARCH_FOR_HEADER);
	for (let rowIndex = 0; rowIndex < rowsToSearch; rowIndex++) {
		const headerScore = scoreRowAsHeader(grid[rowIndex], grid.slice(rowIndex + 1, rowIndex + 6));
		if (headerScore > bestHeaderScore) {
			bestHeaderScore = headerScore;
			bestRowIndex = rowIndex;
		}
	}
	return bestRowIndex;
}

function scoreRowAsHeader(candidateRow: string[], followingRows: string[][]): number {
	const filledCells = candidateRow.filter((cell) => cell !== '');
	if (filledCells.length < 2) return Number.NEGATIVE_INFINITY;
	const labelLikeCellCount = filledCells.filter((cell) => !isAccountingAmount(cell) && !parseFlexibleDate(cell).isValidDate).length;
	const recognisedHeaderCount = filledCells.filter((cell) => findRoleForHeader(cell) !== 'other').length;
	const distinctCellCount = new Set(filledCells.map((cell) => cell.toLowerCase())).size;
	const averageFollowingWidth = followingRows.length === 0 ? 0 :
		followingRows.reduce((runningTotal, row) => runningTotal + row.filter((cell) => cell !== '').length, 0) / followingRows.length;
	const widthAgreementBonus = averageFollowingWidth >= filledCells.length * 0.5 ? 2 : 0;
	const allLabelsBonus = labelLikeCellCount === filledCells.length ? 2 : 0;
	return recognisedHeaderCount * 3 + labelLikeCellCount + distinctCellCount * 0.5 + widthAgreementBonus + allLabelsBonus;
}

function buildUniqueColumnNames(headerRow: string[]): string[] {
	const seenNameCounts = new Map<string, number>();
	return headerRow.map((headerCell, columnIndex) => {
		const baseName = headerCell === '' ? `Column ${columnIndex + 1}` : headerCell;
		const timesSeen = (seenNameCounts.get(baseName) ?? 0) + 1;
		seenNameCounts.set(baseName, timesSeen);
		return timesSeen === 1 ? baseName : `${baseName} (${timesSeen})`;
	});
}

function isRealDataRow(row: string[], columnCount: number): boolean {
	const filledCells = row.filter((cell) => cell !== '');
	if (filledCells.length === 0) return false;
	const isSectionHeadingRow = columnCount >= 4 && filledCells.length === 1 && !isAccountingAmount(filledCells[0]);
	if (isSectionHeadingRow) return false;
	const startsWithSummaryLabel = SUMMARY_ROW_LABEL_PATTERN.test(filledCells[0]);
	const containsDateCell = filledCells.some((cell) => parseFlexibleDate(cell).isValidDate);
	return !(startsWithSummaryLabel && !containsDateCell);
}

function padRowToWidth(row: string[], columnCount: number): string[] {
	if (row.length === columnCount) return row;
	if (row.length > columnCount) return row.slice(0, columnCount);
	return [...row, ...Array.from({ length: columnCount - row.length }, () => '')];
}
