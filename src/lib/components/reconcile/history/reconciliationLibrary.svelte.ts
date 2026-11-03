import { deleteStoredValue, FILE_CONTENTS_STORE, getAllStoredValues, getStoredValue, isBrowserStorageAvailable, putStoredValue, RECONCILIATIONS_STORE } from '$lib/storage/browserDatabase';
import type { ReconcileWorkerClient } from '$lib/engine/workerClient';
import { guessDateOrderFromBrowserLanguage } from '../reconcileSession';
import type { WorkflowSession } from '../workflow/workflowSession.svelte';
import { buildSavedReconciliation, createReconciliationId, restoreStageState, type SavedReconciliation } from './savedReconciliation';

type StoredFileContent = { fileName: string; fileBlob: Blob };

const AUTOSAVE_DELAY_IN_MILLISECONDS = 700;

function buildContentSignature(record: SavedReconciliation): string {
	const { createdAt: _createdAt, updatedAt: _updatedAt, ...comparableFields } = record;
	return JSON.stringify(comparableFields);
}

export function createReconciliationLibrary(workflow: WorkflowSession, getWorkerClient: () => ReconcileWorkerClient | null) {
	const { session } = workflow;
	let savedReconciliations = $state<SavedReconciliation[]>([]);
	let isRestoring = $state(false);
	let lastSavedSignature = '';
	const savedFileContentKeys = new Set<string>();

	async function refreshSavedList(): Promise<boolean> {
		if (!isBrowserStorageAvailable()) return false;
		const allRecords = await getAllStoredValues<SavedReconciliation>(RECONCILIATIONS_STORE);
		savedReconciliations = allRecords.sort((first, second) => second.updatedAt - first.updatedAt);
		return true;
	}

	async function saveFileContents(record: SavedReconciliation): Promise<boolean> {
		for (const savedFile of record.files) {
			if (savedFileContentKeys.has(savedFile.fileContentKey)) continue;
			const readableFile = workflow.readableFilesByTableId.get(savedFile.tableId);
			if (!readableFile) continue;
			await putStoredValue<StoredFileContent>(FILE_CONTENTS_STORE, savedFile.fileContentKey, { fileName: readableFile.name, fileBlob: readableFile });
			savedFileContentKeys.add(savedFile.fileContentKey);
		}
		return true;
	}

	async function saveCurrentReconciliation(): Promise<boolean> {
		if (!isBrowserStorageAvailable() || isRestoring || session.files.length < 2 || session.screenState === 'working') return false;
		const reconciliationId = session.reconciliationId ?? createReconciliationId();
		const previousRecord = savedReconciliations.find((record) => record.reconciliationId === reconciliationId) ?? null;
		const snapshot = $state.snapshot({ files: session.files, stages: session.stages, reviewedItemKeysByStageId: session.reviewedItemKeysByStageId });
		const record = buildSavedReconciliation(previousRecord, reconciliationId, snapshot, Date.now());
		const contentSignature = buildContentSignature(record);
		if (contentSignature === lastSavedSignature) return false;
		try {
			await saveFileContents(record);
			await putStoredValue(RECONCILIATIONS_STORE, reconciliationId, record);
			lastSavedSignature = contentSignature;
			session.reconciliationId = reconciliationId;
			console.log(`[reconciliationLibrary] Saved “${record.title}” (${record.files.length} files, ${record.stages.length} steps)`);
			return await refreshSavedList();
		} catch (error) {
			console.error('[reconciliationLibrary] Could not save this reconciliation', error);
			return false;
		}
	}

	function watchAndAutosave(): boolean {
		$effect(() => {
			void $state.snapshot({ files: session.files, stages: session.stages, reviewed: session.reviewedItemKeysByStageId, screenState: session.screenState });
			const autosaveTimer = setTimeout(() => void saveCurrentReconciliation(), AUTOSAVE_DELAY_IN_MILLISECONDS);
			return () => clearTimeout(autosaveTimer);
		});
		void refreshSavedList();
		return true;
	}

	async function loadSavedFiles(record: SavedReconciliation, workerClient: ReconcileWorkerClient): Promise<boolean> {
		for (const savedFile of record.files) {
			const storedContent = await getStoredValue<StoredFileContent>(FILE_CONTENTS_STORE, savedFile.fileContentKey);
			if (!storedContent) throw new Error(`The file “${savedFile.fileName}” is no longer saved in this browser.`);
			const restoredFile = new File([storedContent.fileBlob], storedContent.fileName);
			const response = await workerClient.sendRequest<'file_added'>({ requestType: 'add_file', tableId: savedFile.tableId, file: restoredFile, fallbackDateOrder: guessDateOrderFromBrowserLanguage(navigator.language) });
			workflow.readableFilesByTableId.set(savedFile.tableId, restoredFile);
			savedFileContentKeys.add(savedFile.fileContentKey);
			session.files = [...session.files, { tableId: savedFile.tableId, fileLetter: savedFile.fileLetter, overview: response.overview }];
		}
		return true;
	}

	async function rerunSavedStages(record: SavedReconciliation, workerClient: ReconcileWorkerClient): Promise<boolean> {
		session.stages = [...record.stages].sort((first, second) => first.stageNumber - second.stageNumber).map(restoreStageState);
		for (const savedStage of record.stages) {
			const stage = workflow.findStage(savedStage.stageId);
			if (!stage) continue;
			try {
				const response = await workerClient.sendRequest<'stage_plan_suggested'>({ requestType: 'suggest_stage_plan', leftInput: $state.snapshot(stage.leftInput), rightInput: $state.snapshot(stage.rightInput) });
				stage.leftOverview = response.leftOverview;
				stage.rightOverview = response.rightOverview;
				if (savedStage.hadRun) await workflow.runStageQuietly(savedStage.stageId);
			} catch (error) {
				console.warn(`[reconciliationLibrary] Step ${savedStage.stageNumber} could not be re-run while opening`, error);
			}
		}
		return true;
	}

	async function openSavedReconciliation(reconciliationId: string): Promise<boolean> {
		const workerClient = getWorkerClient();
		const record = isBrowserStorageAvailable() ? await getStoredValue<SavedReconciliation>(RECONCILIATIONS_STORE, reconciliationId) : undefined;
		if (!workerClient || !record) throw new Error('This reconciliation is no longer saved in this browser.');
		console.log(`[reconciliationLibrary] Opening “${record.title}”`);
		isRestoring = true;
		try {
			session.screenState = 'working';
			await workflow.startOver('working');
			Object.assign(session, { reconciliationId, workingPhaseLabels: ['Opening your saved files', 'Re-running your steps', 'Getting your results ready'], workingPhaseIndex: 0, workingDetailMessage: '' });
			await loadSavedFiles(record, workerClient);
			session.workingPhaseIndex = 1;
			await rerunSavedStages(record, workerClient);
			session.reviewedItemKeysByStageId = record.reviewedItemKeysByStageId;
			session.workingPhaseIndex = 2;
			lastSavedSignature = buildContentSignature(record);
			return true;
		} finally {
			isRestoring = false;
		}
	}

	async function renameSavedReconciliation(reconciliationId: string, newTitle: string): Promise<boolean> {
		const record = savedReconciliations.find((savedRecord) => savedRecord.reconciliationId === reconciliationId);
		const trimmedTitle = newTitle.trim();
		if (!record || trimmedTitle === '') return false;
		await putStoredValue(RECONCILIATIONS_STORE, reconciliationId, { ...$state.snapshot(record), title: trimmedTitle, isTitleChosenByPerson: true });
		return await refreshSavedList();
	}

	async function deleteSavedReconciliation(reconciliationId: string): Promise<boolean> {
		const record = savedReconciliations.find((savedRecord) => savedRecord.reconciliationId === reconciliationId);
		if (!record) return false;
		for (const savedFile of record.files) await deleteStoredValue(FILE_CONTENTS_STORE, savedFile.fileContentKey);
		await deleteStoredValue(RECONCILIATIONS_STORE, reconciliationId);
		console.log(`[reconciliationLibrary] Deleted “${record.title}”`);
		return await refreshSavedList();
	}

	return {
		get savedReconciliations() {
			return savedReconciliations;
		},
		get isRestoring() {
			return isRestoring;
		},
		watchAndAutosave,
		openSavedReconciliation,
		renameSavedReconciliation,
		deleteSavedReconciliation
	};
}
