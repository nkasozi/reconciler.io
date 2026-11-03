import type { SavedHeadline, SavedReconciliation, SavedStage } from '$lib/ports/reconciliationRepository';
import type { StageState, WorkflowFile } from '../workflow/workflowModel';
import { shortFileName } from '../workflow/workflowModel';

export type { SavedFile, SavedHeadline, SavedReconciliation, SavedStage } from '$lib/ports/reconciliationRepository';

export type WorkflowSnapshot = { files: WorkflowFile[]; stages: StageState[]; reviewedItemKeysByStageId: Record<string, string[]> };

const MAXIMUM_TITLE_PARTS = 2;

export function createReconciliationId(): string {
	return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function buildFileContentKey(reconciliationId: string, tableId: string): string {
	return `${reconciliationId}/${tableId}`;
}

export function buildReconciliationTitle(files: WorkflowFile[]): string {
	const fileNames = files.map((file) => shortFileName(file.overview));
	const extraFileCount = fileNames.length - MAXIMUM_TITLE_PARTS;
	const shownNames = fileNames.slice(0, MAXIMUM_TITLE_PARTS).join(' ↔ ');
	return extraFileCount > 0 ? `${shownNames} + ${extraFileCount} more` : shownNames || 'Untitled reconciliation';
}

export function summarizeHeadline(stages: StageState[]): SavedHeadline | null {
	const ranStages = stages.filter((stage) => stage.runSummary !== null);
	if (ranStages.length === 0) return null;
	const latestRanStage = [...ranStages].sort((first, second) => second.stageNumber - first.stageNumber)[0];
	const latestCounts = latestRanStage.runSummary!.categoryCounts;
	return { matchedCount: latestCounts.matched, attentionCount: latestCounts.needs_review + latestCounts.only_left + latestCounts.only_right, ranStepCount: ranStages.length };
}

function toSavedStage(stage: StageState): SavedStage {
	return {
		stageId: stage.stageId,
		stageNumber: stage.stageNumber,
		leftInput: stage.leftInput,
		rightInput: stage.rightInput,
		plan: stage.plan,
		outputColumns: stage.outputColumns,
		hadRun: stage.runSummary !== null,
		suggestedRuleIds: stage.suggestedRuleIds,
		confidenceLevel: stage.confidenceLevel
	};
}

export function buildSavedReconciliation(previousRecord: SavedReconciliation | null, reconciliationId: string, snapshot: WorkflowSnapshot, currentTime: number): SavedReconciliation {
	const isTitleChosenByPerson = previousRecord?.isTitleChosenByPerson ?? false;
	return {
		reconciliationId,
		title: isTitleChosenByPerson && previousRecord ? previousRecord.title : buildReconciliationTitle(snapshot.files),
		isTitleChosenByPerson,
		createdAt: previousRecord?.createdAt ?? currentTime,
		updatedAt: currentTime,
		files: snapshot.files.map((file) => ({
			tableId: file.tableId,
			fileLetter: file.fileLetter,
			fileName: file.overview.fileName,
			displayName: shortFileName(file.overview),
			rowCount: file.overview.rowCount,
			fileContentKey: buildFileContentKey(reconciliationId, file.tableId)
		})),
		stages: snapshot.stages.map(toSavedStage),
		reviewedItemKeysByStageId: snapshot.reviewedItemKeysByStageId,
		headline: summarizeHeadline(snapshot.stages)
	};
}

export function restoreStageState(savedStage: SavedStage): StageState {
	const { hadRun: _hadRun, ...stageFields } = savedStage;
	return { ...stageFields, leftOverview: null, rightOverview: null, runSummary: null };
}

export function describeTimeAgo(pastTime: number, currentTime: number): string {
	const elapsedMinutes = Math.floor((currentTime - pastTime) / 60000);
	switch (true) {
		case elapsedMinutes < 1:
			return 'Just now';
		case elapsedMinutes < 60:
			return `${elapsedMinutes} min ago`;
		case elapsedMinutes < 60 * 24:
			return `${Math.floor(elapsedMinutes / 60)} h ago`;
		case elapsedMinutes < 60 * 24 * 7:
			return `${Math.floor(elapsedMinutes / (60 * 24))} d ago`;
		default:
			return new Date(pastTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
}
