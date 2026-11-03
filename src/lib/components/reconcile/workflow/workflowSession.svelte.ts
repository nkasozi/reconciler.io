import { isScannedDocumentFile, prepareFileForReading } from '$lib/engine/fileReaders/scannedDocumentConverter';
import type { StartMode } from '../start/startModes';
import type { ResultCategory, ResultPage } from '$lib/engine/resultViews';
import type { MatchPlan } from '$lib/engine/types';
import type { ReconcileWorkerClient } from '$lib/engine/workerClient';
import { buildChainStageInputs } from '$lib/engine/workflowRunner';
import type { OutputColumn, StageInput } from '$lib/engine/workflowTypes';
import { chooseFirstInterestingCategory, guessDateOrderFromBrowserLanguage, waitAtLeast } from '../reconcileSession';
import { createStageState, findStagesDependingOn, labelsForStage, listUpstreamStagesInRunOrder, nextFileLetter, suggestNextStepInputs, type StageState, type WorkflowFile } from './workflowModel';
import { buildStageOutputTableId } from '$lib/engine/workflowTypes';

export type ScreenState = 'choosing_files' | 'working' | 'linking' | 'showing_results' | 'workflow_map';

const MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS = 260;
const RESULT_PAGE_SIZE = 25;

export function describeErrorForPeople(error: unknown): string {
	const technicalMessage = error instanceof Error ? error.message : String(error);
	switch (true) {
		case /dynamically imported module|Failed to fetch|NetworkError|Load failed/i.test(technicalMessage):
			return 'We could not load the part of the app that reads PDFs and photos. Check your internet connection (the text reader downloads once) and press Try again.';
		case /password|encrypted/i.test(technicalMessage):
			return 'This PDF is password-protected. Please remove the password and try again.';
		case /Invalid PDF|corrupt/i.test(technicalMessage):
			return 'This PDF looks damaged or unreadable. Try downloading it again.';
		default:
			return technicalMessage || 'Something went wrong. Please try again.';
	}
}

export function createWorkflowSession(getWorkerClient: () => ReconcileWorkerClient | null) {
	const session = $state({
		screenState: 'choosing_files' as ScreenState,
		files: [] as WorkflowFile[],
		stages: [] as StageState[],
		activeStageId: null as string | null,
		isSuggesting: false,
		workingPhaseLabels: [] as string[],
		workingPhaseIndex: 0,
		workingDetailMessage: '',
		friendlyErrorMessage: '',
		activeCategory: 'needs_review' as ResultCategory,
		resultPage: null as ResultPage | null,
		activeSearchText: '',
		isLoadingPage: false,
		reviewedItemKeysByStageId: {} as Record<string, string[]>,
		reconciliationId: null as string | null
	});
	const readableFilesByTableId = new Map<string, File>();

	const findStage = (stageId: string | null): StageState | undefined => session.stages.find((stage) => stage.stageId === stageId);
	const updateStage = (stageId: string, stageChanges: Partial<StageState>): boolean => {
		session.stages = session.stages.map((stage) => (stage.stageId === stageId ? { ...stage, ...stageChanges } : stage));
		return true;
	};
	const requireWorker = (): ReconcileWorkerClient => {
		const workerClient = getWorkerClient();
		if (!workerClient) throw new Error('The matching engine is still starting. Please try again in a moment.');
		return workerClient;
	};
	const showFriendlyError = (error: unknown, nextScreenState: ScreenState): boolean => {
		console.error('[workflowSession] Error', error);
		session.friendlyErrorMessage = describeErrorForPeople(error);
		session.screenState = nextScreenState;
		return false;
	};

	async function startFirstWorkflow(startMode: StartMode): Promise<boolean> {
		console.log(`[workflowSession] Starting with ${session.files.length} files in ${startMode} mode`);
		switch (startMode) {
			case 'all_together':
				return session.files.length >= 3 ? await matchAllFilesInChain() : await createFirstStage();
			case 'step_by_step':
				await createFirstStage();
				session.screenState = 'workflow_map';
				return true;
			default:
				return await createFirstStage();
		}
	}

	async function addFiles(addedFiles: File[], startMode: StartMode = 'two_files'): Promise<boolean> {
		session.friendlyErrorMessage = '';
		const wasChoosingFiles = session.screenState === 'choosing_files';
		const screenToReturnTo = session.screenState;
		const hasScannedDocument = addedFiles.some(isScannedDocumentFile);
		if (wasChoosingFiles || hasScannedDocument) {
			session.screenState = 'working';
			session.workingPhaseLabels = hasScannedDocument ? ['Reading tables from your PDFs or photos', 'Reading your files', 'Finding how they connect'] : ['Reading your files', 'Finding how they connect'];
			session.workingPhaseIndex = 0;
		}
		const reportProgress = (progressMessage: string): boolean => {
			session.workingDetailMessage = progressMessage;
			return true;
		};
		try {
			const readableFiles: File[] = [];
			for (const addedFile of addedFiles) readableFiles.push(await prepareFileForReading(addedFile, reportProgress));
			session.workingDetailMessage = '';
			if (hasScannedDocument) session.workingPhaseIndex = 1;
			for (const readableFile of readableFiles) {
				const fileLetter = nextFileLetter(session.files);
				const tableId = `file-${fileLetter}`;
				readableFilesByTableId.set(tableId, readableFile);
				const response = await waitAtLeast(requireWorker().sendRequest<'file_added'>({ requestType: 'add_file', tableId, file: readableFile, fallbackDateOrder: guessDateOrderFromBrowserLanguage(navigator.language) }), wasChoosingFiles ? MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS : 0);
				session.files = [...session.files, { tableId, fileLetter, overview: response.overview }];
			}
			if (session.stages.length === 0 && session.files.length >= 2) return await startFirstWorkflow(startMode);
			if (!wasChoosingFiles) session.screenState = screenToReturnTo;
			return true;
		} catch (error) {
			return showFriendlyError(error, session.stages.length > 0 ? 'linking' : 'choosing_files');
		}
	}

	async function createFirstStage(): Promise<boolean> {
		session.workingPhaseIndex = session.workingPhaseLabels.length - 1;
		const firstStage = createStageState(session.stages, { tableId: session.files[0].tableId, rowFilter: 'all_rows', summarize: null }, { tableId: session.files[1].tableId, rowFilter: 'all_rows', summarize: null });
		session.stages = [firstStage];
		session.activeStageId = firstStage.stageId;
		await waitAtLeast(suggestPlanForStage(firstStage.stageId), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
		session.screenState = 'linking';
		return true;
	}

	async function ensureUpstreamStagesHaveRun(stageId: string): Promise<boolean> {
		const stage = findStage(stageId);
		if (!stage) return false;
		for (const upstreamStage of listUpstreamStagesInRunOrder(session.stages, stage)) {
			const currentUpstreamStage = findStage(upstreamStage.stageId)!;
			if (currentUpstreamStage.runSummary) continue;
			console.log(`[workflowSession] Running step ${currentUpstreamStage.stageNumber} first because step ${stage.stageNumber} uses its result`);
			if (currentUpstreamStage.plan.keyRules.length === 0) await suggestPlanForStage(currentUpstreamStage.stageId, false);
			await runStageQuietly(currentUpstreamStage.stageId);
		}
		return true;
	}

	const latestSuggestionTokenByStageId = new Map<string, number>();

	async function suggestPlanForStage(stageId: string, shouldPrepareUpstream = true): Promise<boolean> {
		const stage = findStage(stageId);
		if (!stage) return false;
		const suggestionToken = (latestSuggestionTokenByStageId.get(stageId) ?? 0) + 1;
		latestSuggestionTokenByStageId.set(stageId, suggestionToken);
		const isLatestSuggestion = (): boolean => latestSuggestionTokenByStageId.get(stageId) === suggestionToken;
		session.isSuggesting = true;
		try {
			if (shouldPrepareUpstream) await ensureUpstreamStagesHaveRun(stageId);
			const preparedStage = findStage(stageId)!;
			const response = await requireWorker().sendRequest<'stage_plan_suggested'>({ requestType: 'suggest_stage_plan', leftInput: $state.snapshot(preparedStage.leftInput), rightInput: $state.snapshot(preparedStage.rightInput) });
			if (!isLatestSuggestion()) {
				console.log(`[workflowSession] Ignoring an out-of-date suggestion for step ${preparedStage.stageNumber}`);
				return false;
			}
			const suggestedRuleIds = [...response.suggestedPlan.plan.keyRules, ...response.suggestedPlan.plan.compareRules].map((rule) => rule.ruleId);
			return updateStage(stageId, { plan: response.suggestedPlan.plan, leftOverview: response.leftOverview, rightOverview: response.rightOverview, suggestedRuleIds, confidenceLevel: response.suggestedPlan.confidenceLevel, outputColumns: null });
		} finally {
			if (isLatestSuggestion()) session.isSuggesting = false;
		}
	}

	async function changeStageInputs(stageId: string, leftInput: StageInput, rightInput: StageInput): Promise<boolean> {
		updateStage(stageId, { leftInput, rightInput });
		try {
			return await suggestPlanForStage(stageId);
		} catch (error) {
			return showFriendlyError(error, 'linking');
		}
	}

	function updateStagePlan(stageId: string, updatedPlan: MatchPlan): boolean {
		return updateStage(stageId, { plan: updatedPlan });
	}

	function confirmSuggestedRule(stageId: string, ruleId: string): boolean {
		const stage = findStage(stageId);
		return stage ? updateStage(stageId, { suggestedRuleIds: stage.suggestedRuleIds.filter((suggestedRuleId) => suggestedRuleId !== ruleId) }) : false;
	}

	async function runStageQuietly(stageId: string): Promise<boolean> {
		const stage = findStage(stageId);
		if (!stage) return false;
		const response = await requireWorker().sendRequest<'stage_completed'>({ requestType: 'run_stage', stage: $state.snapshot(stage) as StageState, labels: labelsForStage(stage, session.files, session.stages) });
		const { responseType: _ignored, ...runSummary } = response;
		updateStage(stageId, { runSummary, suggestedRuleIds: [] });
		session.reviewedItemKeysByStageId = { ...session.reviewedItemKeysByStageId, [stageId]: [] };
		return true;
	}

	async function rerunDependentStages(stageId: string): Promise<boolean> {
		for (const dependentStage of findStagesDependingOn(session.stages, stageId)) {
			const previousLeftColumns = dependentStage.leftOverview?.columnNames.join('|');
			const previousRightColumns = dependentStage.rightOverview?.columnNames.join('|');
			await suggestPlanForStage(dependentStage.stageId);
			const refreshedStage = findStage(dependentStage.stageId)!;
			const columnsUnchanged = refreshedStage.leftOverview?.columnNames.join('|') === previousLeftColumns && refreshedStage.rightOverview?.columnNames.join('|') === previousRightColumns;
			if (columnsUnchanged) updateStage(dependentStage.stageId, { plan: dependentStage.plan, suggestedRuleIds: [], outputColumns: dependentStage.outputColumns });
			if (dependentStage.runSummary) await runStageQuietly(dependentStage.stageId);
		}
		return true;
	}

	async function runStage(stageId: string): Promise<boolean> {
		const stage = findStage(stageId);
		if (!stage) return false;
		session.screenState = 'working';
		session.workingPhaseLabels = ['Pairing rows', 'Checking every column', 'Adding up the totals'];
		session.workingPhaseIndex = 0;
		try {
			await ensureUpstreamStagesHaveRun(stageId);
			await waitAtLeast(runStageQuietly(stageId), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
			session.workingPhaseIndex = 1;
			await waitAtLeast(rerunDependentStages(stageId), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
			session.workingPhaseIndex = 2;
			return await finishOnResults(stageId);
		} catch (error) {
			return showFriendlyError(error, 'linking');
		}
	}

	async function finishOnResults(stageId: string): Promise<boolean> {
		const finishedStage = findStage(stageId)!;
		await waitAtLeast(showCategory(stageId, chooseFirstInterestingCategory(finishedStage.runSummary!.categoryCounts)), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
		session.workingPhaseIndex = session.workingPhaseLabels.length;
		await waitAtLeast(Promise.resolve(true), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
		session.activeStageId = stageId;
		session.screenState = 'showing_results';
		return true;
	}

	async function matchAllFilesInChain(): Promise<boolean> {
		const fileTableIds = session.files.map((file) => file.tableId);
		const chainedInputs = buildChainStageInputs(fileTableIds, 1);
		session.stages = [];
		session.screenState = 'working';
		session.workingPhaseLabels = [...chainedInputs.map((chainedInput) => `Step ${chainedInput.stageNumber}: adding file ${session.files[chainedInput.stageNumber].fileLetter}`), 'Adding up the totals'];
		session.workingPhaseIndex = 0;
		try {
			for (const chainedInput of chainedInputs) {
				const chainedStage: StageState = { ...createStageState(session.stages, chainedInput.leftInput, chainedInput.rightInput), stageId: chainedInput.stageId };
				session.stages = [...session.stages, chainedStage];
				await suggestPlanForStage(chainedStage.stageId);
				await waitAtLeast(runStageQuietly(chainedStage.stageId), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
				session.workingPhaseIndex = chainedInput.stageNumber;
			}
			return await finishOnResults(chainedInputs[chainedInputs.length - 1].stageId);
		} catch (error) {
			return showFriendlyError(error, 'linking');
		}
	}

	async function runAllSteps(): Promise<boolean> {
		const stagesInRunOrder = [...session.stages].sort((first, second) => first.stageNumber - second.stageNumber);
		if (stagesInRunOrder.length === 0) return false;
		session.screenState = 'working';
		session.workingPhaseLabels = [...stagesInRunOrder.map((stage) => `Step ${stage.stageNumber}: ${labelsForStage(stage, session.files, session.stages).leftLabel} ↔ ${labelsForStage(stage, session.files, session.stages).rightLabel}`), 'Adding up the totals'];
		session.workingPhaseIndex = 0;
		try {
			for (const [stagePosition, stage] of stagesInRunOrder.entries()) {
				if (findStage(stage.stageId)!.plan.keyRules.length === 0) await suggestPlanForStage(stage.stageId, false);
				await waitAtLeast(runStageQuietly(stage.stageId), MINIMUM_PHASE_DISPLAY_IN_MILLISECONDS);
				session.workingPhaseIndex = stagePosition + 1;
			}
			return await finishOnResults(stagesInRunOrder[stagesInRunOrder.length - 1].stageId);
		} catch (error) {
			return showFriendlyError(error, 'workflow_map');
		}
	}

	async function deleteStage(stageId: string): Promise<boolean> {
		const stagesToRemove = [findStage(stageId), ...findStagesDependingOn(session.stages, stageId)].filter((stage): stage is StageState => stage !== undefined);
		const removedStageIds = new Set(stagesToRemove.map((stage) => stage.stageId));
		console.log(`[workflowSession] Deleting steps ${stagesToRemove.map((stage) => stage.stageNumber).join(', ')}`);
		session.stages = session.stages.filter((stage) => !removedStageIds.has(stage.stageId));
		for (const removedStage of stagesToRemove) await getWorkerClient()?.sendRequest<'table_removed'>({ requestType: 'remove_table', tableId: buildStageOutputTableId(removedStage.stageId) });
		if (session.activeStageId && removedStageIds.has(session.activeStageId)) session.activeStageId = session.stages[session.stages.length - 1]?.stageId ?? null;
		session.screenState = 'workflow_map';
		return true;
	}

	function showWorkflowMap(): boolean {
		session.screenState = 'workflow_map';
		return true;
	}

	async function addStep(): Promise<boolean> {
		const { leftInput, rightInput } = suggestNextStepInputs(session.files, session.stages);
		const newStage = createStageState(session.stages, leftInput, rightInput);
		session.stages = [...session.stages, newStage];
		session.activeStageId = newStage.stageId;
		session.screenState = 'linking';
		try {
			return await suggestPlanForStage(newStage.stageId);
		} catch (error) {
			return showFriendlyError(error, 'linking');
		}
	}

	function openStage(stageId: string): boolean {
		const stage = findStage(stageId);
		if (!stage) return false;
		session.activeStageId = stageId;
		if (!stage.runSummary) {
			session.screenState = 'linking';
			return true;
		}
		void showCategory(stageId, chooseFirstInterestingCategory(stage.runSummary.categoryCounts));
		session.screenState = 'showing_results';
		return true;
	}

	async function showCategory(stageId: string, category: ResultCategory, pageNumber = 0, searchText = ''): Promise<boolean> {
		session.activeSearchText = searchText;
		session.isLoadingPage = true;
		try {
			const response = await requireWorker().sendRequest<'result_page'>({ requestType: 'get_result_page', stageId, category, pageNumber, pageSize: RESULT_PAGE_SIZE, searchText });
			session.resultPage = response.page;
			session.activeCategory = category;
			return true;
		} catch (error) {
			return showFriendlyError(error, 'showing_results');
		} finally {
			session.isLoadingPage = false;
		}
	}

	async function changeOutputColumns(stageId: string, outputColumns: OutputColumn[]): Promise<boolean> {
		updateStage(stageId, { outputColumns });
		try {
			await runStageQuietly(stageId);
			return await rerunDependentStages(stageId);
		} catch (error) {
			return showFriendlyError(error, 'showing_results');
		}
	}

	async function exportAllSteps(): Promise<ArrayBuffer> {
		const stageExports = session.stages.filter((stage) => stage.runSummary).sort((first, second) => first.stageNumber - second.stageNumber).map((stage) => ({ stageId: stage.stageId, labels: labelsForStage(stage, session.files, session.stages) }));
		const response = await requireWorker().sendRequest<'excel_ready'>({ requestType: 'export_excel', stageExports });
		return response.workbookBytes;
	}

	function toggleReviewed(stageId: string, itemKey: string): boolean {
		const currentKeys = session.reviewedItemKeysByStageId[stageId] ?? [];
		const updatedKeys = currentKeys.includes(itemKey) ? currentKeys.filter((existingKey) => existingKey !== itemKey) : [...currentKeys, itemKey];
		session.reviewedItemKeysByStageId = { ...session.reviewedItemKeysByStageId, [stageId]: updatedKeys };
		return true;
	}

	async function startOver(nextScreenState: ScreenState = 'choosing_files'): Promise<boolean> {
		for (const workflowFile of session.files) await getWorkerClient()?.sendRequest<'table_removed'>({ requestType: 'remove_table', tableId: workflowFile.tableId });
		readableFilesByTableId.clear();
		Object.assign(session, { screenState: nextScreenState, files: [], stages: [], activeStageId: null, resultPage: null, friendlyErrorMessage: '', reviewedItemKeysByStageId: {}, reconciliationId: null });
		return true;
	}

	return { session, readableFilesByTableId, runStageQuietly, finishOnResults, RESULT_PAGE_SIZE, runAllSteps, deleteStage, showWorkflowMap, addFiles, changeStageInputs, updateStagePlan, confirmSuggestedRule, runStage, matchAllFilesInChain, addStep, openStage, showCategory, changeOutputColumns, exportAllSteps, toggleReviewed, startOver, findStage };
}

export type WorkflowSession = ReturnType<typeof createWorkflowSession>;
