import type { MatchPlan } from '$lib/engine/types';
import type { StageRunSummary, TableOverview } from '$lib/ports/matchingEngine';
import { buildStageOutputTableId, isStageOutputTableId, listInputTableIds, type RowFilter, type StageInput, type TableId, type TableLabels, type WorkflowStage } from '$lib/engine/workflowTypes';

export type WorkflowFile = { tableId: TableId; fileLetter: string; overview: TableOverview };

export type StageState = WorkflowStage & {
	leftOverview: TableOverview | null;
	rightOverview: TableOverview | null;
	suggestedRuleIds: string[];
	confidenceLevel: 'high' | 'medium' | 'low';
	runSummary: StageRunSummary | null;
};

export type InputSourceOption = { tableId: TableId; optionLabel: string; isStepResult: boolean; overview: TableOverview | null };

const FILE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAXIMUM_LABEL_LENGTH = 22;

export const FILE_LETTER_COLORS = ['bg-blue-500', 'bg-red-400', 'bg-green-500', 'bg-orange-400', 'bg-sky-500', 'bg-fuchsia-500', 'bg-teal-500', 'bg-indigo-500'];

export function nextFileLetter(files: WorkflowFile[]): string {
	return FILE_LETTERS[files.length % FILE_LETTERS.length];
}

export function fileLetterColor(fileLetter: string): string {
	return FILE_LETTER_COLORS[FILE_LETTERS.indexOf(fileLetter) % FILE_LETTER_COLORS.length];
}

export function shortFileName(overview: TableOverview): string {
	const preferredName = overview.detectedSystemName ?? overview.fileName.replace(/\.[^.]+$/, '');
	return preferredName.length > MAXIMUM_LABEL_LENGTH ? `${preferredName.slice(0, MAXIMUM_LABEL_LENGTH - 1)}…` : preferredName;
}

export function labelForTable(tableId: TableId, files: WorkflowFile[], stages: StageState[]): string {
	if (isStageOutputTableId(tableId)) {
		const producingStage = stages.find((stage) => buildStageOutputTableId(stage.stageId) === tableId);
		return producingStage ? `Step ${producingStage.stageNumber}` : 'Earlier step';
	}
	const matchingFile = files.find((file) => file.tableId === tableId);
	if (!matchingFile) return 'File';
	const baseName = shortFileName(matchingFile.overview);
	const isNameShared = files.filter((file) => shortFileName(file.overview) === baseName).length > 1;
	return isNameShared ? `${baseName} (${matchingFile.fileLetter})` : baseName;
}

export function labelForInput(stageInput: StageInput, files: WorkflowFile[], stages: StageState[]): string {
	const tableLabel = listInputTableIds(stageInput).map((tableId) => labelForTable(tableId, files, stages)).join(' + ');
	const filterSuffix: Record<RowFilter, string> = { all_rows: '', paired_rows: ' (paired)', matched_rows: ' (matched)', rows_needing_review: ' (to review)', only_left: ' (left-only)', only_right: ' (right-only)', all_unmatched: ' (leftovers)' };
	return `${tableLabel}${isStageOutputTableId(stageInput.tableId) ? filterSuffix[stageInput.rowFilter] : ''}${stageInput.summarize ? ' (added up)' : ''}`;
}

export function labelsForStage(stage: StageState, files: WorkflowFile[], stages: StageState[]): TableLabels {
	const leftLabel = labelForInput(stage.leftInput, files, stages);
	const rightLabel = labelForInput(stage.rightInput, files, stages);
	return leftLabel === rightLabel ? { leftLabel: `${leftLabel} (1)`, rightLabel: `${rightLabel} (2)` } : { leftLabel, rightLabel };
}

export function listInputSources(files: WorkflowFile[], stages: StageState[], beforeStageNumber: number): InputSourceOption[] {
	const fileOptions = files.map((file) => ({ tableId: file.tableId, optionLabel: `${file.fileLetter} · ${labelForTable(file.tableId, files, stages)}`, isStepResult: false, overview: file.overview }));
	const stepOptions = stages
		.filter((stage) => stage.stageNumber < beforeStageNumber)
		.sort((first, second) => first.stageNumber - second.stageNumber)
		.map((stage) => ({ tableId: buildStageOutputTableId(stage.stageId), optionLabel: `Result of step ${stage.stageNumber}${stage.runSummary ? '' : ' (runs automatically)'}`, isStepResult: true, overview: stage.runSummary?.outputOverview ?? null }));
	return [...fileOptions, ...stepOptions];
}

export function buildEmptyPlan(): MatchPlan {
	return { keyRules: [], compareRules: [], fallbackMatching: { isEnabled: false, amountRuleId: null, dateRuleId: null, dateWindowDays: 3 } };
}

export function createStageState(stages: StageState[], leftInput: StageInput, rightInput: StageInput): StageState {
	const stageNumber = stages.reduce((highestNumber, stage) => Math.max(highestNumber, stage.stageNumber), 0) + 1;
	return { stageId: `stage-${stageNumber}-${Date.now().toString(36)}`, stageNumber, leftInput, rightInput, plan: buildEmptyPlan(), outputColumns: null, leftOverview: null, rightOverview: null, suggestedRuleIds: [], confidenceLevel: 'high', runSummary: null };
}

export function findStagesDependingOn(stages: StageState[], stageId: string): StageState[] {
	const dependentStages: StageState[] = [];
	const producedTableIds = new Set([buildStageOutputTableId(stageId)]);
	for (const stage of [...stages].sort((first, second) => first.stageNumber - second.stageNumber)) {
		const dependsOnProducedTable = [...listInputTableIds(stage.leftInput), ...listInputTableIds(stage.rightInput)].some((tableId) => producedTableIds.has(tableId));
		if (!dependsOnProducedTable || stage.stageId === stageId) continue;
		dependentStages.push(stage);
		producedTableIds.add(buildStageOutputTableId(stage.stageId));
	}
	return dependentStages;
}

export function suggestNextStepInputs(files: WorkflowFile[], stages: StageState[]): { leftInput: StageInput; rightInput: StageInput } {
	const latestRunStage = [...stages].filter((stage) => stage.runSummary).sort((first, second) => second.stageNumber - first.stageNumber)[0];
	const usedTableIds = new Set(stages.flatMap((stage) => [stage.leftInput.tableId, stage.rightInput.tableId]));
	const unusedFile = files.find((file) => !usedTableIds.has(file.tableId)) ?? files[files.length - 1];
	const leftTableId = latestRunStage ? buildStageOutputTableId(latestRunStage.stageId) : files[0].tableId;
	return { leftInput: { tableId: leftTableId, rowFilter: 'all_rows', summarize: null }, rightInput: { tableId: unusedFile.tableId, rowFilter: 'all_rows', summarize: null } };
}

export function findProducingStage(stages: StageState[], tableId: TableId): StageState | undefined {
	return stages.find((stage) => buildStageOutputTableId(stage.stageId) === tableId);
}

export function listUpstreamStagesInRunOrder(stages: StageState[], stage: StageState): StageState[] {
	const upstreamStages = new Map<string, StageState>();
	const visitInputs = (currentStage: StageState): boolean => {
		for (const tableId of [...listInputTableIds(currentStage.leftInput), ...listInputTableIds(currentStage.rightInput)]) {
			const producingStage = findProducingStage(stages, tableId);
			if (!producingStage || upstreamStages.has(producingStage.stageId)) continue;
			visitInputs(producingStage);
			upstreamStages.set(producingStage.stageId, producingStage);
		}
		return true;
	};
	visitInputs(stage);
	return [...upstreamStages.values()].sort((first, second) => first.stageNumber - second.stageNumber);
}
