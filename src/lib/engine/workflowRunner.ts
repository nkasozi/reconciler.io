import { runReconciliation } from './matchEngine';
import { suggestMatchPlan, type SuggestedPlan } from './planSuggester';
import { applyRowFilter, buildDefaultOutputColumns, buildStageOutputTable, stackTables, summarizeTable } from './stageTables';
import type { DataTable, ReconciliationOutcome } from './types';
import { buildStageOutputTableId, listInputTableIds, type StageInput, type TableId, type TableLabels, type WorkflowStage } from './workflowTypes';

export type StageRunResult = {
	effectiveLeftTable: DataTable;
	effectiveRightTable: DataTable;
	outcome: ReconciliationOutcome;
	outputTable: DataTable;
};

export function resolveStageInput(tablesById: Map<TableId, DataTable>, stageInput: StageInput): DataTable {
	const filteredTables = listInputTableIds(stageInput).map((tableId) => {
		const sourceTable = tablesById.get(tableId);
		if (!sourceTable) throw new Error('One of the inputs for this step is missing. Please run the earlier step first.');
		return { table: applyRowFilter(sourceTable, stageInput.rowFilter), sourceLabel: sourceTable.fileName.replace(/\.[^.]+$/, '') };
	});
	const filteredTable = stackTables(filteredTables);
	return stageInput.summarize && stageInput.summarize.groupByColumnIndexes.length > 0 ? summarizeTable(filteredTable, stageInput.summarize) : filteredTable;
}

export function suggestPlanForStageInputs(tablesById: Map<TableId, DataTable>, leftInput: StageInput, rightInput: StageInput): { suggestedPlan: SuggestedPlan; effectiveLeftTable: DataTable; effectiveRightTable: DataTable } {
	const effectiveLeftTable = resolveStageInput(tablesById, leftInput);
	const effectiveRightTable = resolveStageInput(tablesById, rightInput);
	return { suggestedPlan: suggestMatchPlan(effectiveLeftTable, effectiveRightTable), effectiveLeftTable, effectiveRightTable };
}

export function runWorkflowStage(tablesById: Map<TableId, DataTable>, stage: WorkflowStage, labels: TableLabels): StageRunResult {
	console.log(`[workflowRunner] Running step ${stage.stageNumber}: ${labels.leftLabel} ↔ ${labels.rightLabel}`);
	const effectiveLeftTable = resolveStageInput(tablesById, stage.leftInput);
	const effectiveRightTable = resolveStageInput(tablesById, stage.rightInput);
	const outcome = runReconciliation(effectiveLeftTable, effectiveRightTable, stage.plan);
	const outputColumns = stage.outputColumns ?? buildDefaultOutputColumns(effectiveLeftTable, effectiveRightTable, labels, stage.stageNumber);
	const outputTable = buildStageOutputTable(effectiveLeftTable, effectiveRightTable, outcome, outputColumns, `Step ${stage.stageNumber} result`);
	tablesById.set(buildStageOutputTableId(stage.stageId), outputTable);
	return { effectiveLeftTable, effectiveRightTable, outcome, outputTable };
}

export function buildChainStageInputs(fileTableIds: TableId[], firstStageNumber: number): { stageId: string; stageNumber: number; leftInput: StageInput; rightInput: StageInput }[] {
	const chainedStages: { stageId: string; stageNumber: number; leftInput: StageInput; rightInput: StageInput }[] = [];
	for (let fileIndex = 1; fileIndex < fileTableIds.length; fileIndex++) {
		const stageNumber = firstStageNumber + fileIndex - 1;
		const stageId = `stage-${stageNumber}`;
		const previousStage = chainedStages[chainedStages.length - 1];
		const leftTableId = previousStage ? buildStageOutputTableId(previousStage.stageId) : fileTableIds[0];
		chainedStages.push({
			stageId,
			stageNumber,
			leftInput: { tableId: leftTableId, rowFilter: 'all_rows', summarize: null },
			rightInput: { tableId: fileTableIds[fileIndex], rowFilter: 'all_rows', summarize: null }
		});
	}
	return chainedStages;
}
