import type { GridView, ResultGridPage } from './resultGrid';
import type { ColumnRole } from './columnRoles';
import type { DateOrder } from './dateParser';
import type { SuggestedPlan } from './planSuggester';
import type { ResultCategory, ResultPage } from './resultViews';
import type { ReconciliationSummary } from './types';
import type { StageInput, TableId, TableLabels, WorkflowStage } from './workflowTypes';

export type TableOverview = {
	fileName: string;
	sheetName: string | null;
	rowCount: number;
	columnNames: string[];
	columnRoles: ColumnRole[];
	previewRows: string[][];
	skippedRowCount: number;
	detectedSystemName: string | null;
	dateOrder: DateOrder;
};

export type CategoryCounts = Record<ResultCategory, number>;

export type StageRunSummary = {
	summary: ReconciliationSummary;
	categoryCounts: CategoryCounts;
	outputOverview: TableOverview;
	matchedInEveryStep: { stepCount: number; matchedEverywhereCount: number };
};

export type WorkerRequestBody =
	| { requestType: 'add_file'; tableId: TableId; file: File; fallbackDateOrder: DateOrder }
	| { requestType: 'remove_table'; tableId: TableId }
	| { requestType: 'suggest_stage_plan'; leftInput: StageInput; rightInput: StageInput }
	| { requestType: 'run_stage'; stage: WorkflowStage; labels: TableLabels }
	| { requestType: 'get_result_page'; stageId: string; category: ResultCategory; pageNumber: number; pageSize: number; searchText: string }
	| { requestType: 'export_excel'; stageExports: { stageId: string; labels: TableLabels }[] }
	| { requestType: 'get_result_grid'; stageId: string; view: GridView; pageNumber: number; pageSize: number; searchText: string };

export type WorkerResponseBody =
	| { responseType: 'file_added'; overview: TableOverview }
	| { responseType: 'table_removed' }
	| { responseType: 'stage_plan_suggested'; suggestedPlan: SuggestedPlan; leftOverview: TableOverview; rightOverview: TableOverview }
	| ({ responseType: 'stage_completed' } & StageRunSummary)
	| { responseType: 'result_page'; page: ResultPage }
	| { responseType: 'excel_ready'; workbookBytes: ArrayBuffer }
	| { responseType: 'result_grid'; gridPage: ResultGridPage };

export type WorkerRequest = { requestId: number; body: WorkerRequestBody };
export type WorkerResponse = { requestId: number; isSuccess: true; body: WorkerResponseBody } | { requestId: number; isSuccess: false; errorMessage: string };
