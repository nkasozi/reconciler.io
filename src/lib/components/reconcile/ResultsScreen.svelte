<script lang="ts">
	import type { GridView, ResultGridPage } from '$lib/engine/resultGrid';
	import type { TableLabels } from '$lib/engine/workflowTypes';
	import ExcelReportButton from './ExcelReportButton.svelte';
	import { riseIn } from './motion';
	import { CATEGORY_TITLES } from './reconcileSession';
	import ResultList from './ResultList.svelte';
	import SummaryHeadline from './SummaryHeadline.svelte';
	import ResultTableView from './table/ResultTableView.svelte';
	import NWayBanner from './workflow/NWayBanner.svelte';
	import OutputColumnsPicker from './workflow/OutputColumnsPicker.svelte';
	import type { StageState } from './workflow/workflowModel';
	import type { WorkflowSession } from './workflow/workflowSession.svelte';

	type ResultsViewMode = 'cards' | 'table';

	type ResultsScreenProps = {
		workflow: WorkflowSession;
		stage: StageState;
		labels: TableLabels;
		requestGridPage: (stageId: string, view: GridView, pageNumber: number, pageSize: number, searchText: string) => Promise<ResultGridPage>;
		onExcelReportRequested: () => Promise<boolean>;
		onStartOverRequested: () => Promise<boolean>;
	};

	let { workflow, stage, labels, requestGridPage, onExcelReportRequested, onStartOverRequested }: ResultsScreenProps = $props();
	const VIEW_MODE_OPTIONS: { modeKey: ResultsViewMode; modeLabel: string; modeHint: string }[] = [
		{ modeKey: 'cards', modeLabel: '▤ Cards', modeHint: 'One card per item to review' },
		{ modeKey: 'table', modeLabel: '▦ Table', modeHint: 'Every row from both files, side by side' }
	];
	const session = workflow.session;
	let resultsViewMode = $state<ResultsViewMode>('cards');
	let runSummary = $derived(stage.runSummary!);
	let reviewedItemKeys = $derived(new Set(session.reviewedItemKeysByStageId[stage.stageId] ?? []));
</script>

<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	<div>
		<p class="text-xs font-bold uppercase tracking-widest text-green-400">Step {stage.stageNumber} results</p>
		<h2 class="text-xl font-extrabold text-white">{labels.leftLabel} ↔ {labels.rightLabel}</h2>
	</div>
	<div class="flex gap-2">
		<button type="button" class="rounded-control bg-gray-800 px-4 py-2.5 font-semibold text-gray-200 shadow-lg transition-all hover:bg-gray-700 active:scale-95" onclick={() => (session.screenState = 'linking')}>🔗 Edit links</button>
		<ExcelReportButton onExportRequested={onExcelReportRequested} />
		<button type="button" class="rounded-control bg-gray-800 px-4 py-2.5 font-semibold text-gray-200 shadow-lg transition-all hover:bg-gray-700 active:scale-95" onclick={onStartOverRequested}>New</button>
	</div>
</div>

{#if runSummary.matchedInEveryStep.stepCount > 1}
	<NWayBanner stepCount={runSummary.matchedInEveryStep.stepCount} matchedEverywhereCount={runSummary.matchedInEveryStep.matchedEverywhereCount} totalRowCount={runSummary.outputOverview.rowCount} />
{/if}
<SummaryHeadline summary={runSummary.summary} categoryCounts={runSummary.categoryCounts} leftLabel={labels.leftLabel} rightLabel={labels.rightLabel} activeCategory={session.activeCategory}
	onCategoryChosen={(category) => { void workflow.showCategory(stage.stageId, category); return true; }} />

<div class="mb-3 mt-6 flex items-center justify-between gap-3">
	<div class="inline-flex rounded-control bg-gray-800 p-1" role="tablist" aria-label="How to show the rows">
		{#each VIEW_MODE_OPTIONS as viewModeOption (viewModeOption.modeKey)}
			<button type="button" role="tab" aria-selected={resultsViewMode === viewModeOption.modeKey} onclick={() => (resultsViewMode = viewModeOption.modeKey)}
				class="rounded-control px-3 py-1.5 text-sm font-bold transition-all duration-200 {resultsViewMode === viewModeOption.modeKey ? 'bg-blue-500 text-white shadow' : 'text-gray-300 hover:text-white'}">{viewModeOption.modeLabel}</button>
		{/each}
	</div>
	<span class="hidden text-sm text-gray-400 sm:inline">{VIEW_MODE_OPTIONS.find((viewModeOption) => viewModeOption.modeKey === resultsViewMode)?.modeHint}</span>
</div>

{#if resultsViewMode === 'table'}
	{#key `${stage.stageId}-${session.activeCategory}`}
		<ResultTableView {labels} initialChoiceKey={session.activeCategory} requestGridPage={(view, pageNumber, pageSize, searchText) => requestGridPage(stage.stageId, view, pageNumber, pageSize, searchText)} />
	{/key}
{:else}
	{#if stage.leftOverview && stage.rightOverview}
		<OutputColumnsPicker stageNumber={stage.stageNumber} leftOverview={stage.leftOverview} rightOverview={stage.rightOverview} {labels} chosenOutputColumns={stage.outputColumns}
			onOutputColumnsChanged={(outputColumns) => { void workflow.changeOutputColumns(stage.stageId, outputColumns); return true; }} />
	{/if}
	{#key session.activeCategory}
		<ResultList resultPage={session.resultPage} category={session.activeCategory} pageSize={workflow.RESULT_PAGE_SIZE} isLoadingPage={session.isLoadingPage} leftLabel={labels.leftLabel} rightLabel={labels.rightLabel}
			categoryTitle={CATEGORY_TITLES[session.activeCategory](labels.leftLabel, labels.rightLabel)} {reviewedItemKeys}
			onReviewToggled={(itemKey) => workflow.toggleReviewed(stage.stageId, itemKey)}
			onSearchChanged={(searchText) => { void workflow.showCategory(stage.stageId, session.activeCategory, 0, searchText); return true; }}
			onPageChosen={(pageNumber) => { void workflow.showCategory(stage.stageId, session.activeCategory, pageNumber, session.activeSearchText); return true; }} />
	{/key}
{/if}

<button type="button" onclick={() => void workflow.addStep()} in:riseIn={{ delay: 400 }}
	class="group mt-8 flex w-full items-center justify-center gap-3 rounded-card border-2 border-dashed border-gray-600 p-5 text-gray-300 transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:border-green-500 hover:bg-gray-800 hover:text-white active:scale-[0.98]">
	<span class="flex h-9 w-9 items-center justify-center rounded-control bg-green-500 text-xl font-bold text-white transition-transform duration-300 group-hover:rotate-90">+</span>
	<span class="text-left"><strong class="block text-white">Match this result against another file</strong><span class="text-sm">Chain as many steps as you need — 3-way, 4-way, N-way.</span></span>
</button>
