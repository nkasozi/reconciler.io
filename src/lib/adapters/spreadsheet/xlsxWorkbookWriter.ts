import * as XLSX from 'xlsx';
import type { WorkbookSheet, WorkbookWriter } from '$lib/ports/workbookWriter';

export const writeXlsxWorkbook: WorkbookWriter = (sheets: WorkbookSheet[]): ArrayBuffer => {
	const workbook = XLSX.utils.book_new();
	for (const sheet of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.sheetName);
	console.log(`[xlsxWorkbookWriter] Wrote a workbook with ${sheets.length} sheets`);
	return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};
