import { profileColumns } from '$lib/engine/columnRoles';
import { buildWorkflowReportSheets } from '$lib/engine/resultExporter';
import { buildResultGridPage } from '$lib/engine/resultGrid';
import { buildResultPage, selectRowsForCategory, type ResultViewContext } from '$lib/engine/resultViews';
import { countRowsMatchedInEveryStep } from '$lib/engine/stageTables';
import type { DataTable } from '$lib/engine/types';
import { runWorkflowStage, suggestPlanForStageInputs, type StageRunResult } from '$lib/engine/workflowRunner';
import { buildStageOutputTableId, type TableId, type TableLabels, type WorkflowStage } from '$lib/engine/workflowTypes';
import type { EngineRequest, EngineResponse, TableOverview } from '$lib/ports/matchingEngine';
import type { TableFileReader } from '$lib/ports/tableFileReader';
import type { WorkbookWriter } from '$lib/ports/workbookWriter';

export type MatchingEngineServiceDependencies = { readTableFile: TableFileReader; writeWorkbook: WorkbookWriter };

type CompletedStage = { stage: WorkflowStage; runResult: StageRunResult; labels: TableLabels };

export function buildTableOverview(table: DataTable): TableOverview {
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

export function createMatchingEngineService(dependencies: MatchingEngineServiceDependencies) {
	const tablesById = new Map<TableId, DataTable>();
	const completedStagesById = new Map<string, CompletedStage>();

	async function handleRequest(body: EngineRequest): Promise<EngineResponse> {
		switch (body.requestType) {
			case 'add_file': {
				const fileBytes = await body.file.arrayBuffer();
				const loadedTable = dependencies.readTableFile({ fileName: body.file.name, fileBytes }, body.fallbackDateOrder);
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
				return { responseType: 'excel_ready', workbookBytes: dependencies.writeWorkbook(buildWorkflowReportSheets(stageExports)) };
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


	return { handleRequest };
}
