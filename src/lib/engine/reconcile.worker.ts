import { profileColumns } from './columnRoles';
import { readAnyFile } from './fileReaders/readAnyFile';
import { buildWorkflowExcelReport } from './resultExporter';
import { buildResultPage, selectRowsForCategory, type ResultViewContext } from './resultViews';
import { countRowsMatchedInEveryStep } from './stageTables';
import type { DataTable } from './types';
import { runWorkflowStage, suggestPlanForStageInputs, type StageRunResult } from './workflowRunner';
import { buildStageOutputTableId, type TableId, type TableLabels, type WorkflowStage } from './workflowTypes';
import { buildResultGridPage } from './resultGrid';
import type { TableOverview, WorkerRequest, WorkerRequestBody, WorkerResponse, WorkerResponseBody } from './workerProtocol';

type CompletedStage = { stage: WorkflowStage; runResult: StageRunResult; labels: TableLabels };

const tablesById = new Map<TableId, DataTable>();
const completedStagesById = new Map<string, CompletedStage>();

self.onmessage = async (messageEvent: MessageEvent<WorkerRequest>): Promise<void> => {
	const { requestId, body } = messageEvent.data;
	console.log(`[reconcile.worker] Request ${requestId}: ${body.requestType}`);
	try {
		const responseBody = await handleRequest(body);
		const transferables = responseBody.responseType === 'excel_ready' ? [responseBody.workbookBytes] : [];
		postResponse({ requestId, isSuccess: true, body: responseBody }, transferables);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[reconcile.worker] Request ${requestId} failed:`, error);
		postResponse({ requestId, isSuccess: false, errorMessage }, []);
	}
};

function postResponse(response: WorkerResponse, transferables: Transferable[]): boolean {
	(self as unknown as Worker).postMessage(response, transferables);
	return true;
}

async function handleRequest(body: WorkerRequestBody): Promise<WorkerResponseBody> {
	switch (body.requestType) {
		case 'add_file': {
			const fileBytes = await body.file.arrayBuffer();
			const loadedTable = readAnyFile({ fileName: body.file.name, fileBytes }, body.fallbackDateOrder);
			tablesById.set(body.tableId, loadedTable);
			return { responseType: 'file_added', overview: buildTableOverview(loadedTable) };
		}
		case 'remove_table': {
			tablesById.delete(body.tableId);
			return { responseType: 'table_removed' };
		}
		case 'suggest_stage_plan': {
			const { suggestedPlan, effectiveLeftTable, effectiveRightTable } = suggestPlanForStageInputs(tablesById, body.leftInput, body.rightInput);
			return { responseType: 'stage_plan_suggested', suggestedPlan, leftOverview: buildTableOverview(effectiveLeftTable), rightOverview: buildTableOverview(effectiveRightTable) };
		}
		case 'run_stage': {
			const runResult = runWorkflowStage(tablesById, body.stage, body.labels);
			completedStagesById.set(body.stage.stageId, { stage: body.stage, runResult, labels: body.labels });
			const viewContext = buildViewContext(body.stage.stageId);
			return {
				responseType: 'stage_completed',
				summary: runResult.outcome.summary,
				categoryCounts: {
					needs_review: selectRowsForCategory(viewContext, 'needs_review').length,
					only_left: runResult.outcome.onlyInLeft.length,
					only_right: runResult.outcome.onlyInRight.length,
					matched: selectRowsForCategory(viewContext, 'matched').length
				},
				outputOverview: buildTableOverview(runResult.outputTable),
				matchedInEveryStep: countRowsMatchedInEveryStep(runResult.outputTable)
			};
		}
		case 'get_result_grid': {
			const completedStage = completedStagesById.get(body.stageId);
			if (!completedStage) throw new Error('Please run this step first.');
			const gridContext = { ...buildViewContext(body.stageId), labels: completedStage.labels };
			return { responseType: 'result_grid', gridPage: buildResultGridPage(gridContext, body.view, body.pageNumber, body.pageSize, body.searchText) };
		}
		case 'get_result_page':
			return { responseType: 'result_page', page: buildResultPage(buildViewContext(body.stageId), body.category, body.pageNumber, body.pageSize, body.searchText) };
		case 'export_excel': {
			const stageExports = body.stageExports
				.filter((stageExport) => completedStagesById.has(stageExport.stageId))
				.map((stageExport) => ({
					context: buildViewContext(stageExport.stageId),
					labels: stageExport.labels,
					outputTable: tablesById.get(buildStageOutputTableId(stageExport.stageId)) ?? null,
					stageNumber: completedStagesById.get(stageExport.stageId)!.stage.stageNumber
				}));
			if (stageExports.length === 0) throw new Error('Please run a step first.');
			return { responseType: 'excel_ready', workbookBytes: buildWorkflowExcelReport(stageExports) };
		}
	}
}

function buildViewContext(stageId: string): ResultViewContext {
	const completedStage = completedStagesById.get(stageId);
	if (!completedStage) throw new Error('Please run this step first.');
	return {
		leftTable: completedStage.runResult.effectiveLeftTable,
		rightTable: completedStage.runResult.effectiveRightTable,
		plan: completedStage.stage.plan,
		outcome: completedStage.runResult.outcome
	};
}

function buildTableOverview(table: DataTable): TableOverview {
	return {
		fileName: table.fileName,
		sheetName: table.sheetName,
		rowCount: table.rows.length,
		columnNames: table.columnNames,
		columnRoles: profileColumns(table.columnNames, table.rows).map((columnProfile) => columnProfile.effectiveRole),
		previewRows: table.rows.slice(0, 5),
		skippedRowCount: table.skippedRowCount,
		detectedSystemName: table.detectedSystemName,
		dateOrder: table.dateOrder
	};
}
