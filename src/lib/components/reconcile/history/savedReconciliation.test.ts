import { describe, expect, it } from 'vitest';
import type { TableOverview } from '$lib/engine/workerProtocol';
import type { StageState, WorkflowFile } from '../workflow/workflowModel';
import { buildEmptyPlan } from '../workflow/workflowModel';
import { buildReconciliationTitle, buildSavedReconciliation, describeTimeAgo, restoreStageState } from './savedReconciliation';

function buildFile(fileLetter: string, fileName: string): WorkflowFile {
	const overview: TableOverview = { fileName, sheetName: null, rowCount: 4, columnNames: ['Ref'], columnRoles: ['reference'], previewRows: [], skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first' };
	return { tableId: `file-${fileLetter}`, fileLetter, overview };
}

function buildStage(stageNumber: number, hasRun: boolean): StageState {
	return {
		stageId: `stage-${stageNumber}`, stageNumber, plan: buildEmptyPlan(), outputColumns: null, leftOverview: null, rightOverview: null, suggestedRuleIds: [], confidenceLevel: 'high',
		leftInput: { tableId: 'file-A', rowFilter: 'all_rows', summarize: null }, rightInput: { tableId: 'file-B', rowFilter: 'all_rows', summarize: null },
		runSummary: hasRun ? ({ categoryCounts: { matched: 6, needs_review: 2, only_left: 1, only_right: 3 } } as StageState['runSummary']) : null
	};
}

describe('saved reconciliations', () => {
	it('names a reconciliation after its files', () => {
		expect(buildReconciliationTitle([buildFile('A', 'Ledger.csv'), buildFile('B', 'Bank.xlsx')])).toBe('Ledger ↔ Bank');
		expect(buildReconciliationTitle([buildFile('A', 'PO.csv'), buildFile('B', 'Invoices.csv'), buildFile('C', 'GRN.csv'), buildFile('D', 'Pay.csv')])).toBe('PO ↔ Invoices + 2 more');
	});

	it('remembers files, steps, which steps ran and a headline of the latest results', () => {
		const record = buildSavedReconciliation(null, 'r1', { files: [buildFile('A', 'Ledger.csv'), buildFile('B', 'Bank.csv')], stages: [buildStage(1, true), buildStage(2, false)], reviewedItemKeysByStageId: { 'stage-1': ['x'] } }, 1000);
		expect(record.files.map((savedFile) => savedFile.fileContentKey)).toEqual(['r1/file-A', 'r1/file-B']);
		expect(record.stages.map((savedStage) => savedStage.hadRun)).toEqual([true, false]);
		expect(record.headline).toEqual({ matchedCount: 6, attentionCount: 6, ranStepCount: 1 });
		expect(restoreStageState(record.stages[0]).runSummary).toBeNull();
	});

	it('keeps a name the person chose and the original creation time when saving again', () => {
		const firstSave = { ...buildSavedReconciliation(null, 'r1', { files: [buildFile('A', 'Ledger.csv'), buildFile('B', 'Bank.csv')], stages: [], reviewedItemKeysByStageId: {} }, 1000), title: 'March close', isTitleChosenByPerson: true };
		const secondSave = buildSavedReconciliation(firstSave, 'r1', { files: [buildFile('A', 'Ledger.csv'), buildFile('B', 'Bank.csv')], stages: [], reviewedItemKeysByStageId: {} }, 5000);
		expect(secondSave).toMatchObject({ title: 'March close', createdAt: 1000, updatedAt: 5000 });
	});

	it('describes how long ago something was saved', () => {
		expect(describeTimeAgo(0, 30 * 1000)).toBe('Just now');
		expect(describeTimeAgo(0, 5 * 60 * 1000)).toBe('5 min ago');
		expect(describeTimeAgo(0, 3 * 60 * 60 * 1000)).toBe('3 h ago');
	});
});
