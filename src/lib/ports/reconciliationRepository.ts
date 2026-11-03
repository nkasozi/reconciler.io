import type { WorkflowStage } from '$lib/engine/workflowTypes';

export type SavedFile = { tableId: string; fileLetter: string; fileName: string; displayName: string; rowCount: number; fileContentKey: string };

export type SavedStage = WorkflowStage & { hadRun: boolean; suggestedRuleIds: string[]; confidenceLevel: 'high' | 'medium' | 'low' };

export type SavedHeadline = { matchedCount: number; attentionCount: number; ranStepCount: number };

export type SavedReconciliation = {
	reconciliationId: string;
	title: string;
	isTitleChosenByPerson: boolean;
	createdAt: number;
	updatedAt: number;
	files: SavedFile[];
	stages: SavedStage[];
	reviewedItemKeysByStageId: Record<string, string[]>;
	headline: SavedHeadline | null;
};

export type StoredFileContent = { fileContentKey: string; fileName: string; fileBlob: Blob };

export type ReconciliationRepository = {
	isAvailable: () => boolean;
	saveReconciliation: (record: SavedReconciliation) => Promise<boolean>;
	findReconciliation: (reconciliationId: string) => Promise<SavedReconciliation | null>;
	listReconciliationsNewestFirst: () => Promise<SavedReconciliation[]>;
	deleteReconciliationWithFiles: (reconciliationId: string) => Promise<boolean>;
	saveFileContent: (fileContent: StoredFileContent) => Promise<boolean>;
	findFileContent: (fileContentKey: string) => Promise<StoredFileContent | null>;
};
