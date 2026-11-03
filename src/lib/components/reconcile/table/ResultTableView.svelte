<script lang="ts">
	import type { GridView, ResultGridPage } from '$lib/engine/resultGrid';
	import type { TableLabels } from '$lib/engine/workflowTypes';
	import { riseIn } from '../motion';
	import ResultTableRow from './ResultTableRow.svelte';
	import { buildGridViewChoices } from './resultTableStyles';

	type ResultTableViewProps = {
		labels: TableLabels;
		initialChoiceKey: string;
		requestGridPage: (view: GridView, pageNumber: number, pageSize: number, searchText: string) => Promise<ResultGridPage>;
	};

	let { labels, initialChoiceKey, requestGridPage }: ResultTableViewProps = $props();
	const TABLE_PAGE_SIZE = 50;
	let viewChoices = $derived(buildGridViewChoices(labels));
	let chosenChoiceKey = $state(initialChoiceKey);
	let searchText = $state('');
	let pageNumber = $state(0);
	let gridPage = $state<ResultGridPage | null>(null);
	let isLoading = $state(false);
	let loadErrorMessage = $state('');
	let expandedRowKey = $state<string | null>(null);
	let highlightedExplanation = $state<string | null>(null);
	let latestRequestToken = 0;

	let chosenView = $derived(viewChoices.find((viewChoice) => viewChoice.choiceKey === chosenChoiceKey)?.view ?? viewChoices[0].view);
	let pageCount = $derived(gridPage ? Math.max(1, Math.ceil(gridPage.totalRowCount / TABLE_PAGE_SIZE)) : 1);

	$effect(() => {
		void loadPage(chosenView, pageNumber, searchText);
	});

	async function loadPage(view: GridView, requestedPageNumber: number, requestedSearchText: string): Promise<boolean> {
		const requestToken = ++latestRequestToken;
		isLoading = true;
		try {
			const loadedPage = await requestGridPage($state.snapshot(view) as GridView, requestedPageNumber, TABLE_PAGE_SIZE, requestedSearchText);
			if (requestToken !== latestRequestToken) return false;
			gridPage = loadedPage;
			loadErrorMessage = '';
			return true;
		} catch (error) {
			loadErrorMessage = error instanceof Error ? error.message : 'Could not load these rows.';
			return false;
		} finally {
			if (requestToken === latestRequestToken) isLoading = false;
		}
	}

	function chooseView(choiceKey: string): boolean {
		chosenChoiceKey = choiceKey;
		pageNumber = 0;
		expandedRowKey = null;
		return true;
	}

	function toggleRow(rowKey: string, explanationToHighlight: string | null): boolean {
		const isOpeningSameRowForCell = expandedRowKey === rowKey && explanationToHighlight !== null;
		expandedRowKey = expandedRowKey === rowKey && !isOpeningSameRowForCell ? null : rowKey;
		highlightedExplanation = explanationToHighlight;
		return true;
	}
</script>

<section class="space-y-3" in:riseIn>
	<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
		<div class="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Which rows to show">
			{#each viewChoices as viewChoice (viewChoice.choiceKey)}
				<button type="button" role="tab" aria-selected={viewChoice.choiceKey === chosenChoiceKey} onclick={() => chooseView(viewChoice.choiceKey)}
					class="shrink-0 whitespace-nowrap rounded-control px-2.5 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 {viewChoice.choiceKey === chosenChoiceKey ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">
					{viewChoice.choiceLabel}
				</button>
			{/each}
		</div>
		<input type="search" placeholder="Search any cell…" bind:value={searchText} oninput={() => (pageNumber = 0)}
			class="w-full shrink-0 rounded-control border-gray-700 bg-gray-800 text-sm text-white placeholder:text-gray-500 focus:border-blue-400 focus:ring-blue-400 lg:w-56" />
	</div>

	<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
		<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-red-950 ring-2 ring-inset ring-red-400"></span>Value that disagrees</span>
		<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-orange-950 ring-2 ring-inset ring-orange-400"></span>Value with no partner</span>
		<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-green-950"></span>Value that agrees</span>
		<span>Tap a row or a coloured cell to see exactly why.</span>
	</div>

	{#if loadErrorMessage}
		<p class="rounded-card bg-gray-800 p-4 text-sm text-red-300">{loadErrorMessage}</p>
	{:else if gridPage}
		<div class="relative max-h-[70vh] overflow-auto rounded-card bg-gray-900 shadow-xl ring-1 ring-gray-700 transition-opacity duration-200 {isLoading ? 'opacity-60' : 'opacity-100'}">
			<table class="min-w-full border-separate border-spacing-0 text-left">
				<thead class="sticky top-0 z-20">
					<tr>
						<th rowspan="2" class="sticky left-0 z-30 border-b border-r border-gray-700 bg-gray-950 px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
						<th colspan={gridPage.leftColumnNames.length + 1} class="border-b border-gray-700 bg-blue-500 px-2 py-1 text-xs font-extrabold text-white">{labels.leftLabel}</th>
						<th colspan={gridPage.rightColumnNames.length + 1} class="border-b border-l-4 border-gray-700 border-l-gray-600 bg-red-400 px-2 py-1 text-xs font-extrabold text-white">{labels.rightLabel}</th>
					</tr>
					<tr>
						<th class="border-b border-r border-gray-700 bg-gray-950 px-2 py-1.5 text-right text-[11px] text-blue-300">Row</th>
						{#each gridPage.leftColumnNames as columnName, columnIndex (columnIndex)}
							<th class="whitespace-nowrap border-b border-r border-gray-700 bg-gray-950 px-2 py-1.5 text-xs font-bold text-gray-200">{columnName}</th>
						{/each}
						<th class="border-b border-l-4 border-r border-gray-700 border-l-gray-600 bg-gray-950 px-2 py-1.5 text-right text-[11px] text-red-300">Row</th>
						{#each gridPage.rightColumnNames as columnName, columnIndex (columnIndex)}
							<th class="whitespace-nowrap border-b border-r border-gray-700 bg-gray-950 px-2 py-1.5 text-xs font-bold text-gray-200">{columnName}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each gridPage.rows as gridRow (gridRow.rowKey)}
						<ResultTableRow {gridRow} leftColumnCount={gridPage.leftColumnNames.length} rightColumnCount={gridPage.rightColumnNames.length}
							isExpanded={expandedRowKey === gridRow.rowKey} highlightedExplanation={expandedRowKey === gridRow.rowKey ? highlightedExplanation : null}
							onRowToggled={(explanationToHighlight) => toggleRow(gridRow.rowKey, explanationToHighlight)} />
					{:else}
						<tr><td colspan={gridPage.leftColumnNames.length + gridPage.rightColumnNames.length + 3} class="p-6 text-center text-sm text-gray-400">No rows here{searchText ? ` match “${searchText}”` : ''}.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="flex items-center justify-between text-sm text-gray-400">
			<span>{gridPage.totalRowCount.toLocaleString()} row{gridPage.totalRowCount === 1 ? '' : 's'}</span>
			{#if pageCount > 1}
				<span class="flex items-center gap-2">
					<button type="button" class="rounded-control bg-gray-800 px-3 py-1.5 font-bold text-gray-200 transition hover:bg-gray-700 active:scale-95 disabled:opacity-40" disabled={pageNumber === 0} onclick={() => (pageNumber -= 1)}>←</button>
					Page {pageNumber + 1} of {pageCount}
					<button type="button" class="rounded-control bg-gray-800 px-3 py-1.5 font-bold text-gray-200 transition hover:bg-gray-700 active:scale-95 disabled:opacity-40" disabled={pageNumber >= pageCount - 1} onclick={() => (pageNumber += 1)}>→</button>
				</span>
			{/if}
		</div>
	{:else}
		<div class="h-64 animate-pulse rounded-card bg-gray-800"></div>
	{/if}
</section>
