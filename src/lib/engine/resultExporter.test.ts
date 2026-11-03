import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readAnyFile } from './fileReaders/readAnyFile';
import { runReconciliation } from './matchEngine';
import { suggestMatchPlan } from './planSuggester';
import { buildExcelReport } from './resultExporter';
import { buildResultPage } from './resultViews';
import { buildSampleFiles } from './sampleFiles';

async function loadSampleContext() {
	const { leftFile, rightFile } = buildSampleFiles();
	const leftTable = readAnyFile({ fileName: leftFile.name, fileBytes: await leftFile.arrayBuffer() }, 'day_first');
	const rightTable = readAnyFile({ fileName: rightFile.name, fileBytes: await rightFile.arrayBuffer() }, 'day_first');
	const { plan } = suggestMatchPlan(leftTable, rightTable);
	return { leftTable, rightTable, plan, outcome: runReconciliation(leftTable, rightTable, plan) };
}

describe('sample reconciliation and Excel report', () => {
	it('finds the planted problems in the sample files', async () => {
		const viewContext = await loadSampleContext();
		const reviewPage = buildResultPage(viewContext, 'needs_review', 0, 25, '');
		expect(reviewPage.items.map((resultItem) => resultItem.itemTitle).sort()).toEqual(['DEP-1002', 'EXP-3310']);
		expect(buildResultPage(viewContext, 'only_left', 0, 25, '').totalItemCount).toBe(2);
		expect(buildResultPage(viewContext, 'only_right', 0, 25, '').totalItemCount).toBe(2);
		expect(viewContext.outcome.summary.unexplainedDifference).toBe(0);
	});

	it('writes a workbook with summary and detail sheets', async () => {
		const viewContext = await loadSampleContext();
		const workbookBytes = buildExcelReport(viewContext, { leftLabel: 'QuickBooks', rightLabel: 'Bank statement' });
		const workbook = XLSX.read(workbookBytes, { type: 'array' });
		expect(workbook.SheetNames).toEqual(['Summary', 'Needs review', 'Only in QuickBooks', 'Only in Bank statement', 'Matched']);
		const needsReviewRows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['Needs review'], { header: 1 });
		expect(needsReviewRows).toHaveLength(3);
	});
});
