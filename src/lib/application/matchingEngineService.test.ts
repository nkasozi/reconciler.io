import { describe, expect, it } from 'vitest';
import type { DataTable } from '$lib/engine/types';
import type { WorkbookSheet } from '$lib/ports/workbookWriter';
import { createMatchingEngineService } from './matchingEngineService';

const TABLES_BY_FILE_NAME: Record<string, DataTable> = {
	'ledger.csv': { fileName: 'ledger.csv', sheetName: null, columnNames: ['Ref', 'Amount'], rows: [['INV-1', '100'], ['INV-2', '50']], skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first' },
	'bank.csv': { fileName: 'bank.csv', sheetName: null, columnNames: ['Reference', 'Paid'], rows: [['INV-1', '100'], ['INV-2', '55']], skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first' }
};

function createServiceWithFakeAdapters() {
	const writtenWorkbooks: WorkbookSheet[][] = [];
	const service = createMatchingEngineService({
		readTableFile: (fileInput) => TABLES_BY_FILE_NAME[fileInput.fileName],
		writeWorkbook: (sheets) => {
			writtenWorkbooks.push(sheets);
			return new ArrayBuffer(8);
		}
	});
	return { service, writtenWorkbooks };
}

describe('matching engine service behind its ports', () => {
	it('adds files, suggests links, runs a step and exports through the workbook port', async () => {
		const { service, writtenWorkbooks } = createServiceWithFakeAdapters();
		for (const [tableId, fileName] of [['file-A', 'ledger.csv'], ['file-B', 'bank.csv']]) {
			const added = await service.handleRequest({ requestType: 'add_file', tableId, file: new File(['x'], fileName), fallbackDateOrder: 'day_first' });
			expect(added).toMatchObject({ responseType: 'file_added', overview: { fileName, rowCount: 2 } });
		}
		const leftInput = { tableId: 'file-A', rowFilter: 'all_rows' as const, summarize: null };
		const rightInput = { tableId: 'file-B', rowFilter: 'all_rows' as const, summarize: null };
		const suggestion = await service.handleRequest({ requestType: 'suggest_stage_plan', leftInput, rightInput });
		if (suggestion.responseType !== 'stage_plan_suggested') throw new Error('expected a suggestion');
		const stage = { stageId: 'stage-1', stageNumber: 1, leftInput, rightInput, plan: suggestion.suggestedPlan.plan, outputColumns: null };
		const completed = await service.handleRequest({ requestType: 'run_stage', stage, labels: { leftLabel: 'Ledger', rightLabel: 'Bank' } });
		expect(completed).toMatchObject({ responseType: 'stage_completed', categoryCounts: { matched: 1, needs_review: 1 } });
		const exported = await service.handleRequest({ requestType: 'export_excel', stageExports: [{ stageId: 'stage-1', labels: { leftLabel: 'Ledger', rightLabel: 'Bank' } }] });
		expect(exported.responseType).toBe('excel_ready');
		expect(writtenWorkbooks[0].map((sheet) => sheet.sheetName)).toEqual(['Summary', 'Needs review', 'Only in Ledger', 'Only in Bank', 'Matched', 'Result table']);
	});

	it('explains that a step must run before its results can be read', async () => {
		const { service } = createServiceWithFakeAdapters();
		await expect(service.handleRequest({ requestType: 'get_result_grid', stageId: 'nope', view: { viewKind: 'pairs', category: 'all' }, pageNumber: 0, pageSize: 10, searchText: '' })).rejects.toThrow('Please run this step first.');
	});
});
