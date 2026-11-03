import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type SpreadsheetGrid = { sheetName: string; grid: string[][] };

export function decodeTextBytes(fileBytes: ArrayBuffer): string {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(fileBytes).replace(/^﻿/, '');
	} catch {
		console.log('[gridReaders] File is not valid UTF-8, decoding as Windows-1252');
		return new TextDecoder('windows-1252').decode(fileBytes);
	}
}

export function readDelimitedTextGrid(fileText: string): string[][] {
	const parseResult = Papa.parse<string[]>(fileText, { skipEmptyLines: 'greedy' });
	if (parseResult.errors.length > 0) {
		console.log(`[gridReaders] CSV parser reported ${parseResult.errors.length} recoverable issues`, parseResult.errors.slice(0, 3));
	}
	return parseResult.data.map((row) => row.map((cell) => String(cell ?? '')));
}

export function readSpreadsheetGrid(fileBytes: ArrayBuffer): SpreadsheetGrid {
	const workbook = XLSX.read(fileBytes, { type: 'array', cellDates: false, cellNF: true });
	const sheetGrids = workbook.SheetNames.map((sheetName) => ({ sheetName, grid: convertWorksheetToGrid(workbook.Sheets[sheetName]) }));
	const largestSheet = sheetGrids.reduce((largestSoFar, candidate) => (candidate.grid.length > largestSoFar.grid.length ? candidate : largestSoFar), sheetGrids[0]);
	console.log(`[gridReaders] Workbook has ${sheetGrids.length} sheets, using "${largestSheet?.sheetName}" with ${largestSheet?.grid.length} rows`);
	return largestSheet ?? { sheetName: '', grid: [] };
}

function convertWorksheetToGrid(worksheet: XLSX.WorkSheet): string[][] {
	if (!worksheet || !worksheet['!ref']) return [];
	const sheetRange = XLSX.utils.decode_range(worksheet['!ref']);
	const grid: string[][] = [];
	for (let rowNumber = sheetRange.s.r; rowNumber <= sheetRange.e.r; rowNumber++) {
		const gridRow: string[] = [];
		for (let columnNumber = sheetRange.s.c; columnNumber <= sheetRange.e.c; columnNumber++) {
			const cell = worksheet[XLSX.utils.encode_cell({ r: rowNumber, c: columnNumber })] as XLSX.CellObject | undefined;
			gridRow.push(convertCellToText(cell));
		}
		grid.push(gridRow);
	}
	return grid;
}

function convertCellToText(cell: XLSX.CellObject | undefined): string {
	if (!cell || cell.v === undefined || cell.v === null) return '';
	switch (cell.t) {
		case 'n': {
			const numberFormat = typeof cell.z === 'string' ? cell.z : '';
			const isDateFormatted = numberFormat !== '' && XLSX.SSF.is_date(numberFormat);
			if (!isDateFormatted) return String(cell.v);
			const dateParts = XLSX.SSF.parse_date_code(cell.v as number);
			return `${dateParts.y}-${String(dateParts.m).padStart(2, '0')}-${String(dateParts.d).padStart(2, '0')}`;
		}
		case 'd': {
			const cellDate = cell.v as Date;
			return `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
		}
		case 'b':
			return cell.v ? 'TRUE' : 'FALSE';
		case 'e':
			return '';
		default:
			return String(cell.w ?? cell.v).trim();
	}
}
