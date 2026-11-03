import type { ReconciliationRepository } from '$lib/ports/reconciliationRepository';
import type { MatchingEngineGateway } from '$lib/ports/matchingEngine';
import { guessDateOrderFromBrowserLanguage } from '../reconcileSession';
import type { WorkflowSession } from '../workflow/workflowSession.svelte';
import { buildSavedReconciliation, createReconciliationId, restoreStageState, type SavedReconciliation } from './savedReconciliation';

const AUTOSAVE_DELAY_IN_MILLISECONDS = 700;

function buildContentSignature(record: SavedReconciliation): string {
	const { createdAt: _createdAt, updatedAt: _updatedAt, ...comparableFields } = record;
	return JSON.stringify(comparableFields);
}

export type ReconciliationLibraryDependencies = { workflow: WorkflowSession; repository: ReconciliationRepository; getMatchingEngine: () => MatchingEngineGateway | null };

export function createReconciliationLibrary({ workflow, repository, getMatchingEngine }: ReconciliationLibraryDependencies) {
	const { session } = workflow;
	let savedReconciliations = $state<SavedReconciliation[]>([]);
	let isRestoring = $state(false);
	let lastSavedSignature = '';
	const savedFileContentKeys = new Set<string>();

	async function refreshSavedList(): Promise<boolean> {
		if (!repository.isAvailable()) return false;
		savedReconciliations = await repository.listReconciliationsNewestFirst();
		return true;
	}

	async function saveFileContents(record: SavedReconciliation): Promise<boolean> {
		for (const savedFile of record.files) {
			if (savedFileContentKeys.has(savedFile.fileContentKey)) continue;
			const readableFile = workflow.readableFilesByTableId.get(savedFile.tableId);
			if (!readableFile) continue;
			await repository.saveFileContent({ fileContentKey: savedFile.fileContentKey, fileName: readableFile.name, fileBlob: readableFile });
			savedFileContentKeys.add(savedFile.fileContentKey);
		}
		return true;
	}

	async function saveCurrentReconciliation(): Promise<boolean> {
		if (!repository.isAvailable() || isRestoring || session.files.length < 2 || session.screenState === 'working') return false;
		const reconciliationId = session.reconciliationId ?? createReconciliationId();
		const previousRecord = savedReconciliations.find((record) => record.reconciliationId === reconciliationId) ?? null;
		const snapshot = $state.snapshot({ files: session.files, stages: session.stages, reviewedItemKeysByStageId: session.reviewedItemKeysByStageId });
		const record = buildSavedReconciliation(previousRecord, reconciliationId, snapshot, Date.now());
		const contentSignature = buildContentSignature(record);
		if (contentSignature === lastSavedSignature) return false;
		try {
			await saveFileContents(record);
			await repository.saveReconciliation(record);
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

	async function loadSavedFiles(record: SavedReconciliation, matchingEngine: MatchingEngineGateway): Promise<boolean> {
		for (const savedFile of record.files) {
			const storedContent = await repository.findFileContent(savedFile.fileContentKey);
			if (!storedContent) throw new Error(`The file “${savedFile.fileName}” is no longer saved in this browser.`);
			const restoredFile = new File([storedContent.fileBlob], storedContent.fileName);
			const response = await matchingEngine.sendRequest<'file_added'>({ requestType: 'add_file', tableId: savedFile.tableId, file: restoredFile, fallbackDateOrder: guessDateOrderFromBrowserLanguage(navigator.language) });
			workflow.readableFilesByTableId.set(savedFile.tableId, restoredFile);
			savedFileContentKeys.add(savedFile.fileContentKey);
			session.files = [...session.files, { tableId: savedFile.tableId, fileLetter: savedFile.fileLetter, overview: response.overview }];
		}
		return true;
	}

	async function rerunSavedStages(record: SavedReconciliation, matchingEngine: MatchingEngineGateway): Promise<boolean> {
		session.stages = [...record.stages].sort((first, second) => first.stageNumber - second.stageNumber).map(restoreStageState);
		for (const savedStage of record.stages) {
			const stage = workflow.findStage(savedStage.stageId);
			if (!stage) continue;
			try {
				const response = await matchingEngine.sendRequest<'stage_plan_suggested'>({ requestType: 'suggest_stage_plan', leftInput: $state.snapshot(stage.leftInput), rightInput: $state.snapshot(stage.rightInput) });
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
		const matchingEngine = getMatchingEngine();
		const record = repository.isAvailable() ? await repository.findReconciliation(reconciliationId) : null;
		if (!matchingEngine || !record) throw new Error('This reconciliation is no longer saved in this browser.');
		console.log(`[reconciliationLibrary] Opening “${record.title}”`);
		isRestoring = true;
		try {
			session.screenState = 'working';
			await workflow.startOver('working');
			Object.assign(session, { reconciliationId, workingPhaseLabels: ['Opening your saved files', 'Re-running your steps', 'Getting your results ready'], workingPhaseIndex: 0, workingDetailMessage: '' });
			await loadSavedFiles(record, matchingEngine);
			session.workingPhaseIndex = 1;
			await rerunSavedStages(record, matchingEngine);
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
		await repository.saveReconciliation({ ...$state.snapshot(record), title: trimmedTitle, isTitleChosenByPerson: true });
		return await refreshSavedList();
	}

	async function deleteSavedReconciliation(reconciliationId: string): Promise<boolean> {
		const record = savedReconciliations.find((savedRecord) => savedRecord.reconciliationId === reconciliationId);
		if (!record) return false;
		await repository.deleteReconciliationWithFiles(reconciliationId);
		for (const savedFile of record.files) savedFileContentKeys.delete(savedFile.fileContentKey);
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
