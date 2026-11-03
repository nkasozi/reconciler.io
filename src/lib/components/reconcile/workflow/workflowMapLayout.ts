import { isStageOutputTableId, listInputTableIds, type RowFilter, type StageInput, type TableId } from '$lib/engine/workflowTypes';
import { findProducingStage, type StageState, type WorkflowFile } from './workflowModel';

export type MapNodeId = string;
export type MapEdge = { edgeId: string; fromNodeId: MapNodeId; toNodeId: MapNodeId; edgeLabel: string; sideLabel: 'compare' | 'against' };
export type MapColumn = { columnLevel: number; nodeIds: MapNodeId[] };

const ROW_FILTER_EDGE_LABELS: Record<RowFilter, string> = {
	all_rows: '',
	paired_rows: 'paired rows',
	matched_rows: 'matched rows',
	rows_needing_review: 'rows to review',
	only_left: 'left-only rows',
	only_right: 'right-only rows',
	all_unmatched: 'leftovers'
};

export function nodeIdForTable(tableId: TableId, stages: StageState[]): MapNodeId {
	if (!isStageOutputTableId(tableId)) return `file:${tableId}`;
	const producingStage = findProducingStage(stages, tableId);
	return producingStage ? `stage:${producingStage.stageId}` : `missing:${tableId}`;
}

export function computeStageLevels(stages: StageState[]): Map<string, number> {
	const levelByStageId = new Map<string, number>();
	const sortedStages = [...stages].sort((first, second) => first.stageNumber - second.stageNumber);
	for (const stage of sortedStages) {
		const inputLevels = [...listInputTableIds(stage.leftInput), ...listInputTableIds(stage.rightInput)].map((tableId) => {
			const producingStage = findProducingStage(stages, tableId);
			return producingStage ? (levelByStageId.get(producingStage.stageId) ?? 1) : 0;
		});
		levelByStageId.set(stage.stageId, Math.max(0, ...inputLevels) + 1);
	}
	return levelByStageId;
}

export function buildMapColumns(files: WorkflowFile[], stages: StageState[]): MapColumn[] {
	const levelByStageId = computeStageLevels(stages);
	const highestLevel = Math.max(0, ...levelByStageId.values());
	const fileColumn: MapColumn = { columnLevel: 0, nodeIds: files.map((file) => `file:${file.tableId}`) };
	const stageColumns: MapColumn[] = Array.from({ length: highestLevel }, (_, levelOffset) => ({
		columnLevel: levelOffset + 1,
		nodeIds: [...stages].sort((first, second) => first.stageNumber - second.stageNumber).filter((stage) => levelByStageId.get(stage.stageId) === levelOffset + 1).map((stage) => `stage:${stage.stageId}`)
	}));
	return [fileColumn, ...stageColumns];
}

export function buildMapEdges(stages: StageState[]): MapEdge[] {
	const describeInput = (stageInput: StageInput): string =>
		[ROW_FILTER_EDGE_LABELS[stageInput.rowFilter], stageInput.summarize ? 'added up' : ''].filter((labelPart) => labelPart !== '').join(', ');
	return stages.flatMap((stage) => {
		const toNodeId = `stage:${stage.stageId}`;
		const edgesForInput = (stageInput: StageInput, sideLabel: 'compare' | 'against'): MapEdge[] =>
			listInputTableIds(stageInput).map((tableId, stackPosition) => ({
				edgeId: `${stage.stageId}-${sideLabel}-${stackPosition}`,
				fromNodeId: nodeIdForTable(tableId, stages),
				toNodeId,
				edgeLabel: isStageOutputTableId(tableId) ? describeInput(stageInput) : stageInput.summarize ? 'added up' : '',
				sideLabel
			}));
		return [...edgesForInput(stage.leftInput, 'compare'), ...edgesForInput(stage.rightInput, 'against')];
	});
}
