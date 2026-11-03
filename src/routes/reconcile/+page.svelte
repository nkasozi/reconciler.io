<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import ChooseFilesScreen from '$lib/components/reconcile/ChooseFilesScreen.svelte';
	import { riseIn } from '$lib/components/reconcile/motion';
	import WorkingProgress from '$lib/components/reconcile/WorkingProgress.svelte';
	import { downloadBytesAsFile } from '$lib/components/reconcile/reconcileSession';
	import ResultsScreen from '$lib/components/reconcile/ResultsScreen.svelte';
	import ReconciliationSidebar from '$lib/components/reconcile/history/ReconciliationSidebar.svelte';
	import { createReconciliationLibrary } from '$lib/components/reconcile/history/reconciliationLibrary.svelte';
	import StageSetupScreen from '$lib/components/reconcile/workflow/StageSetupScreen.svelte';
	import WorkflowMapScreen from '$lib/components/reconcile/workflow/WorkflowMapScreen.svelte';
	import WorkflowRail from '$lib/components/reconcile/workflow/WorkflowRail.svelte';
	import { labelsForStage } from '$lib/components/reconcile/workflow/workflowModel';
	import { createWorkflowSession } from '$lib/components/reconcile/workflow/workflowSession.svelte';
	import type { StartMode } from '$lib/components/reconcile/start/startModes';
	import { areLocationsEqual, createStartLocation, describeLocationForBackButton, findParentLocation, type AppLocation } from '$lib/components/reconcile/navigation/appLocation';
	import { createHistorySync } from '$lib/components/reconcile/navigation/historySync.svelte';
	import type { GridView, ResultGridPage } from '$lib/engine/resultGrid';
	import ScreenBackButton from '$lib/components/reconcile/navigation/ScreenBackButton.svelte';
	import { applyLocationToWorkflow, chooseLandingLocation, readSessionLocation } from '$lib/components/reconcile/navigation/workflowLocations';
	import { buildSampleFiles, buildThreeWaySampleFiles } from '$lib/engine/sampleFiles';
	import { createBrowserAdapters } from '$lib/adapters/browserAdapters';
	import type { MatchingEngineGateway } from '$lib/ports/matchingEngine';

	const PAUSE_TO_SHOW_FILES_LINKING_IN_MILLISECONDS = 650;
	const browserAdapters = createBrowserAdapters();
	let matchingEngine: MatchingEngineGateway | null = null;
	const workflow = createWorkflowSession({ getMatchingEngine: () => matchingEngine, documentPreparer: browserAdapters.documentPreparer });
	const session = workflow.session;

	let hasStartedLoadingFiles = false;
	let pendingLeftFiles = $state<File[]>([]);
	let pendingRightFiles = $state<File[]>([]);
	let lastStartRequest = $state<{ filesToLoad: File[]; startMode: StartMode } | null>(null);
	let startMode = $state<StartMode>('two_files');
	let isSidebarOpenOnPhone = $state(false);
	const library = createReconciliationLibrary({ workflow, repository: browserAdapters.reconciliationRepository, getMatchingEngine: () => matchingEngine });
	library.watchAndAutosave();
	const historySync = createHistorySync({
		readSessionLocation: () => readSessionLocation(session, startMode),
		applyLocation: goToLocation,
		isBusyWorking: () => session.screenState === 'working'
	});
	let currentLocation = $derived(readSessionLocation(session, startMode));
	let backTarget = $derived(chooseBackTarget(currentLocation, historySync.previousLocation));
	let activeStage = $derived(session.stages.find((stage) => stage.stageId === session.activeStageId) ?? null);
	let activeLabels = $derived(activeStage ? labelsForStage(activeStage, session.files, session.stages) : { leftLabel: 'File 1', rightLabel: 'File 2' });

	onMount(() => {
		matchingEngine = browserAdapters.startMatchingEngine();
	});
	onDestroy(() => {
		matchingEngine?.terminate();
	});

	function goToLocation(requestedLocation: AppLocation): AppLocation {
		const isAnotherSavedReconciliation = requestedLocation.view !== 'start' && !!requestedLocation.reconciliationId && requestedLocation.reconciliationId !== session.reconciliationId;
		if (isAnotherSavedReconciliation) {
			void openSavedReconciliation(requestedLocation.reconciliationId!, requestedLocation);
			return requestedLocation;
		}
		if (requestedLocation.view === 'start') {
			startMode = requestedLocation.startMode;
			hasStartedLoadingFiles = false;
			pendingLeftFiles = [];
			pendingRightFiles = [];
		}
		return applyLocationToWorkflow(workflow, requestedLocation);
	}

	async function openSavedReconciliation(reconciliationId: string, requestedLocation: AppLocation | null): Promise<boolean> {
		isSidebarOpenOnPhone = false;
		session.friendlyErrorMessage = '';
		try {
			await library.openSavedReconciliation(reconciliationId);
			applyLocationToWorkflow(workflow, requestedLocation ?? chooseLandingLocation(session));
			return true;
		} catch (error) {
			console.error('[reconcile page] Could not open a saved reconciliation', error);
			await startOver();
			session.friendlyErrorMessage = error instanceof Error ? error.message : 'Could not open that reconciliation.';
			return false;
		}
	}

	function closePhoneSidebar(): boolean {
		isSidebarOpenOnPhone = false;
		return true;
	}

	async function deleteSavedReconciliation(reconciliationId: string): Promise<boolean> {
		if (reconciliationId === session.reconciliationId) await startOver();
		return library.deleteSavedReconciliation(reconciliationId);
	}

	function chooseBackTarget(location: AppLocation | null, previousLocation: AppLocation | null): { backLabel: string; goBack: () => boolean } | null {
		if (!location || location.view === 'start') return null;
		if (previousLocation && !areLocationsEqual(previousLocation, location)) return { backLabel: describeLocationForBackButton(previousLocation), goBack: () => { history.back(); return true; } };
		const parentLocation = findParentLocation(location, session.stages.length);
		return { backLabel: describeLocationForBackButton(parentLocation), goBack: () => goToLocation(parentLocation) !== null };
	}

	function chooseFiles(side: 'left' | 'right', chosenFiles: File[]): boolean {
		if (side === 'left') pendingLeftFiles = chosenFiles;
		else pendingRightFiles = chosenFiles;
		const allChosenFiles = [...pendingLeftFiles, ...pendingRightFiles];
		if (allChosenFiles.length < 2 || hasStartedLoadingFiles) return true;
		return startLoadingFiles(allChosenFiles, 'two_files');
	}

	function startLoadingFiles(filesToLoad: File[], startMode: StartMode): boolean {
		if (hasStartedLoadingFiles) return false;
		hasStartedLoadingFiles = true;
		lastStartRequest = { filesToLoad, startMode };
		setTimeout(async () => {
			if (session.files.length > 0) await workflow.startOver();
			const wasLoaded = await workflow.addFiles(filesToLoad, startMode);
			if (!wasLoaded) hasStartedLoadingFiles = false;
		}, PAUSE_TO_SHOW_FILES_LINKING_IN_MILLISECONDS);
		return true;
	}

	function trySampleFiles(startMode: StartMode): boolean {
		switch (startMode) {
			case 'two_files': {
				const sampleFiles = buildSampleFiles();
				pendingLeftFiles = [sampleFiles.leftFile];
				return chooseFiles('right', [sampleFiles.rightFile]);
			}
			default:
				return startLoadingFiles(buildThreeWaySampleFiles(), startMode);
		}
	}

	async function requestGridPage(stageId: string, view: GridView, pageNumber: number, pageSize: number, searchText: string): Promise<ResultGridPage> {
		if (!matchingEngine) throw new Error('The matching engine is still starting. Please try again in a moment.');
		const response = await matchingEngine.sendRequest<'result_grid'>({ requestType: 'get_result_grid', stageId, view, pageNumber, pageSize, searchText });
		return response.gridPage;
	}

	async function downloadExcelReport(): Promise<boolean> {
		try {
			const workbookBytes = await workflow.exportAllSteps();
			return downloadBytesAsFile(workbookBytes, `Reconciliation ${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		} catch (error) {
			session.friendlyErrorMessage = error instanceof Error ? error.message : 'Could not build the report.';
			return false;
		}
	}

	function describeOtherFilesForProgress(): string {
		const totalFileCount = Math.max(session.files.length, lastStartRequest?.filesToLoad.length ?? 0);
		if (totalFileCount > 2) return `${totalFileCount - 1} more files`;
		return session.files[1]?.overview.fileName ?? lastStartRequest?.filesToLoad[1]?.name ?? 'File 2';
	}

	async function startOver(): Promise<boolean> {
		pendingLeftFiles = [];
		pendingRightFiles = [];
		lastStartRequest = null;
		hasStartedLoadingFiles = false;
		return workflow.startOver();
	}
</script>

<svelte:head><title>Reconcile files · Reconciler</title></svelte:head>

<div class="mx-auto flex w-full max-w-7xl gap-6 px-4 pt-6 sm:px-6 sm:pt-10">
<ReconciliationSidebar savedReconciliations={library.savedReconciliations} activeReconciliationId={session.reconciliationId} isOpenOnPhone={isSidebarOpenOnPhone}
	onOpenRequested={(reconciliationId) => { void openSavedReconciliation(reconciliationId, null); return true; }}
	onNewRequested={() => { isSidebarOpenOnPhone = false; void startOver(); return true; }}
	onRenamed={(reconciliationId, newTitle) => { void library.renameSavedReconciliation(reconciliationId, newTitle); return true; }}
	onDeleted={(reconciliationId) => { void deleteSavedReconciliation(reconciliationId); return true; }}
	onPhoneCloseRequested={closePhoneSidebar} />

<main class="min-w-0 flex-1 pb-24">
	{#if library.savedReconciliations.length > 0}
		<button type="button" class="mb-3 inline-flex items-center gap-2 rounded-control bg-gray-800 px-3 py-1.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-700 active:scale-95 lg:hidden" onclick={() => (isSidebarOpenOnPhone = true)}>
			🕘 Your reconciliations <span class="rounded-control bg-gray-700 px-1.5 text-xs">{library.savedReconciliations.length}</span>
		</button>
	{/if}
	{#if session.friendlyErrorMessage}
		<div class="mb-4 flex flex-col gap-3 rounded-card border-l-4 border-red-400 bg-gray-800 p-4 text-sm text-red-200 shadow-lg sm:flex-row sm:items-center sm:justify-between" role="alert" in:riseIn>
			<span>{session.friendlyErrorMessage}</span>
			{#if session.screenState === 'choosing_files' && lastStartRequest}
				{@const requestToRetry = lastStartRequest}
				<button type="button" class="shrink-0 rounded-control bg-red-400 px-4 py-2 font-bold text-white transition-all hover:bg-red-500 active:scale-95" onclick={() => { session.friendlyErrorMessage = ''; startLoadingFiles(requestToRetry.filesToLoad, requestToRetry.startMode); }}>Try again</button>
			{/if}
		</div>
	{/if}

	{#if backTarget && session.screenState !== 'working'}
		<ScreenBackButton backLabel={backTarget.backLabel} onBackRequested={backTarget.goBack} />
	{/if}

	{#if session.files.length >= 2 && session.screenState !== 'working' && session.screenState !== 'choosing_files'}
		<WorkflowRail files={session.files} stages={session.stages} activeStageId={session.activeStageId}
			onStageChosen={workflow.openStage} onFilesAdded={(addedFiles) => { void workflow.addFiles(addedFiles); return true; }}
			onAddStepRequested={() => { void workflow.addStep(); return true; }} onMatchAllRequested={() => { void workflow.matchAllFilesInChain(); return true; }}
			onShowMapRequested={workflow.showWorkflowMap} onRunAllRequested={() => { void workflow.runAllSteps(); return true; }} isMapShowing={session.screenState === 'workflow_map'} />
	{/if}

	{#key `${session.screenState}-${session.activeStageId}`}
		<div in:riseIn={{ duration: 450 }}>
			{#if session.screenState === 'choosing_files'}
				{#if session.files.length >= 2}
					<div class="mb-6 flex flex-col gap-3 rounded-card border-l-4 border-blue-500 bg-gray-800 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between" in:riseIn>
						<p class="text-sm text-gray-200"><strong class="text-white">You have {session.files.length} files and {session.stages.length} step{session.stages.length === 1 ? '' : 's'} in progress.</strong> Pick up where you left off, or drop new files below to start fresh.</p>
						<button type="button" class="shrink-0 rounded-control bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-600 active:scale-95" onclick={() => goToLocation(chooseLandingLocation(session)) !== null}>Continue →</button>
					</div>
				{/if}
				<ChooseFilesScreen chosenStartMode={startMode} onStartModeChanged={(newStartMode) => { startMode = newStartMode; return true; }} leftFile={pendingLeftFiles[0] ?? null} rightFile={pendingRightFiles[0] ?? (pendingLeftFiles[1] ?? null)} onFilesChosen={chooseFiles} onManyFilesStartRequested={startLoadingFiles} onSampleRequested={trySampleFiles} />
			{:else if session.screenState === 'working'}
				<WorkingProgress phaseIndex={session.workingPhaseIndex} phaseLabels={session.workingPhaseLabels}
					leftFileName={session.files[0]?.overview.fileName ?? lastStartRequest?.filesToLoad[0]?.name ?? 'File 1'} rightFileName={describeOtherFilesForProgress()} detailMessage={session.workingDetailMessage} />
			{:else if session.screenState === 'workflow_map'}
				<WorkflowMapScreen files={session.files} stages={session.stages}
					onStageLinksRequested={(stageId) => { session.activeStageId = stageId; session.screenState = 'linking'; return true; }}
					onStageResultsRequested={workflow.openStage}
					onStageDeleted={(stageId) => { void workflow.deleteStage(stageId); return true; }}
					onAddStepRequested={() => { void workflow.addStep(); return true; }}
					onRunAllRequested={() => { void workflow.runAllSteps(); return true; }} />
			{:else if session.screenState === 'linking' && activeStage}
				<StageSetupScreen stage={activeStage} files={session.files} stages={session.stages} isSuggesting={session.isSuggesting}
					onInputsChanged={(leftInput, rightInput) => { void workflow.changeStageInputs(activeStage!.stageId, leftInput, rightInput); return true; }}
					onPlanChanged={(updatedPlan) => workflow.updateStagePlan(activeStage!.stageId, updatedPlan)}
					onRuleConfirmed={(ruleId) => workflow.confirmSuggestedRule(activeStage!.stageId, ruleId)}
					onAllSuggestionsConfirmed={() => activeStage!.suggestedRuleIds.every((ruleId) => workflow.confirmSuggestedRule(activeStage!.stageId, ruleId))}
					onRunRequested={() => { void workflow.runStage(activeStage!.stageId); return true; }} />
			{:else if session.screenState === 'showing_results' && activeStage?.runSummary}
				<ResultsScreen {workflow} stage={activeStage} labels={activeLabels} {requestGridPage} onExcelReportRequested={downloadExcelReport} onStartOverRequested={startOver} />
			{/if}
		</div>
	{/key}
</main>
</div>
