import { detectAccountingSystem } from '$lib/engine/accountingSystems';
import { profileColumns } from '$lib/engine/columnRoles';
import { detectDateOrderFromSamples, type DateOrder } from '$lib/engine/dateParser';
import { convertGridToTable } from '$lib/engine/headerDetection';
import type { DataTable } from '$lib/engine/types';
import type { FileInput, TableFileReader } from '$lib/ports/tableFileReader';
import { decodeTextBytes, readDelimitedTextGrid, readSpreadsheetGrid } from './gridReaders';
import { looksLikeOfxText, looksLikeQifText, readOfxStatement, readQifStatement, type HeaderAndRows } from './statementFormatReaders';

export type FileFormat = 'spreadsheet' | 'delimited_text' | 'ofx' | 'qif';

export { SUPPORTED_FILE_EXTENSIONS } from '$lib/ports/tableFileReader';

export const readAnyFile: TableFileReader = (fileInput: FileInput, fallbackDateOrder: DateOrder): DataTable => {
	const fileFormat = detectFileFormat(fileInput);
	console.log(`[readAnyFile] Reading "${fileInput.fileName}" as ${fileFormat}`);
	const { headerAndRows, sheetName, skippedRowCount } = readHeaderAndRows(fileInput, fileFormat);
	if (headerAndRows.rows.length === 0) {
		throw new Error(`We couldn't find any rows of data in "${fileInput.fileName}". Is it the right file?`);
	}
	const detectedSystem = detectAccountingSystem(headerAndRows.columnNames);
	const dateOrder = decideDateOrder(headerAndRows, detectedSystem?.preferredDateOrder ?? null, fallbackDateOrder);
	return {
		fileName: fileInput.fileName,
		sheetName,
		columnNames: headerAndRows.columnNames,
		rows: headerAndRows.rows,
		skippedRowCount,
		detectedSystemName: fileFormat === 'ofx' || fileFormat === 'qif' ? 'Bank statement' : (detectedSystem?.systemName ?? null),
		dateOrder
	};
}

export function detectFileFormat(fileInput: FileInput): FileFormat {
	const lowerCaseName = fileInput.fileName.toLowerCase();
	const fileExtension = lowerCaseName.slice(lowerCaseName.lastIndexOf('.'));
	switch (fileExtension) {
		case '.xlsx':
		case '.xls':
		case '.xlsm':
		case '.xlsb':
		case '.ods':
			return 'spreadsheet';
		case '.ofx':
		case '.qfx':
		case '.qbo':
			return 'ofx';
		case '.qif':
			return 'qif';
		default: {
			const leadingText = decodeTextBytes(fileInput.fileBytes.slice(0, 4096));
			if (looksLikeOfxText(leadingText)) return 'ofx';
			if (looksLikeQifText(leadingText)) return 'qif';
			return 'delimited_text';
		}
	}
}

function readHeaderAndRows(fileInput: FileInput, fileFormat: FileFormat): { headerAndRows: HeaderAndRows; sheetName: string | null; skippedRowCount: number } {
	switch (fileFormat) {
		case 'ofx':
			return { headerAndRows: readOfxStatement(decodeTextBytes(fileInput.fileBytes)), sheetName: null, skippedRowCount: 0 };
		case 'qif':
			return { headerAndRows: readQifStatement(decodeTextBytes(fileInput.fileBytes)), sheetName: null, skippedRowCount: 0 };
		case 'spreadsheet': {
			const spreadsheetGrid = readSpreadsheetGrid(fileInput.fileBytes);
			const cleanedGrid = convertGridToTable(spreadsheetGrid.grid);
			return { headerAndRows: cleanedGrid, sheetName: spreadsheetGrid.sheetName, skippedRowCount: cleanedGrid.skippedRowCount };
		}
		case 'delimited_text': {
			const cleanedGrid = convertGridToTable(readDelimitedTextGrid(decodeTextBytes(fileInput.fileBytes)));
			return { headerAndRows: cleanedGrid, sheetName: null, skippedRowCount: cleanedGrid.skippedRowCount };
		}
	}
}

function decideDateOrder(headerAndRows: HeaderAndRows, systemPreferredDateOrder: DateOrder | null, fallbackDateOrder: DateOrder): DateOrder {
	const dateColumnIndexes = profileColumns(headerAndRows.columnNames, headerAndRows.rows, 500)
		.filter((columnProfile) => columnProfile.effectiveRole === 'date')
		.map((columnProfile) => columnProfile.columnIndex);
	const dateSamples = headerAndRows.rows.slice(0, 5000).flatMap((row) => dateColumnIndexes.map((columnIndex) => row[columnIndex] ?? ''));
	const detectedDateOrder = detectDateOrderFromSamples(dateSamples);
	console.log(`[readAnyFile] Date order from data: ${detectedDateOrder}, system preference: ${systemPreferredDateOrder}, fallback: ${fallbackDateOrder}`);
	return detectedDateOrder === 'ambiguous' ? (systemPreferredDateOrder ?? fallbackDateOrder) : detectedDateOrder;
}
