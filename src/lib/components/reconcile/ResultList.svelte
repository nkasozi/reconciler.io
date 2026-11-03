<script lang="ts">
	import { flip } from 'svelte/animate';
	import type { ResultCategory, ResultItem, ResultPage } from '$lib/engine/resultViews';
	import { CATEGORY_STYLES } from './categoryStyles';
	import ConfettiBurst from './ConfettiBurst.svelte';
	import ResultCard from './ResultCard.svelte';
	import ReviewProgressRing from './ReviewProgressRing.svelte';
	import { bounceIn, collapseAway, riseIn, staggerDelay } from './motion';

	type ResultListProps = {
		resultPage: ResultPage | null;
		category: ResultCategory;
		pageSize: number;
		isLoadingPage: boolean;
		leftLabel: string;
		rightLabel: string;
		categoryTitle: string;
		reviewedItemKeys: Set<string>;
		onReviewToggled: (itemKey: string) => boolean;
		onSearchChanged: (searchText: string) => boolean;
		onPageChosen: (pageNumber: number) => boolean;
	};

	let { resultPage, category, pageSize, isLoadingPage, leftLabel, rightLabel, categoryTitle, reviewedItemKeys, onReviewToggled, onSearchChanged, onPageChosen }: ResultListProps = $props();
	let searchText = $state('');
	let isShowingReviewed = $state(false);
	let celebrationKey = $state(0);
	let justReviewedItemKeys = $state<string[]>([]);
	const PAUSE_BEFORE_COLLAPSE_IN_MILLISECONDS = 550;
	let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	let pageCount = $derived(resultPage ? Math.max(1, Math.ceil(resultPage.totalItemCount / pageSize)) : 1);
	let itemsOnPage = $derived((resultPage?.items ?? []).map((resultItem) => ({ resultItem, itemKey: buildItemKey(category, resultItem) })));
	let reviewedCountInCategory = $derived([...reviewedItemKeys].filter((itemKey) => itemKey.startsWith(`${category}|`)).length);
	let visibleItems = $derived(isShowingReviewed ? itemsOnPage : itemsOnPage.filter((pageItem) => !reviewedItemKeys.has(pageItem.itemKey)));
	let isCategoryReviewable = $derived(category !== 'matched' && (resultPage?.totalItemCount ?? 0) > 0);
	let isEverythingReviewed = $derived(isCategoryReviewable && reviewedCountInCategory >= (resultPage?.totalItemCount ?? 0));

	function buildItemKey(itemCategory: ResultCategory, resultItem: ResultItem): string {
		return `${itemCategory}|${resultItem.leftRowNumber ?? ''}|${resultItem.rightRowNumber ?? ''}`;
	}

	function toggleReview(itemKey: string): boolean {
		const wasLastUnreviewed = !reviewedItemKeys.has(itemKey) && reviewedCountInCategory + 1 >= (resultPage?.totalItemCount ?? 0);
		if (wasLastUnreviewed) celebrationKey++;
		if (reviewedItemKeys.has(itemKey) || isShowingReviewed) return onReviewToggled(itemKey);
		justReviewedItemKeys = [...justReviewedItemKeys, itemKey];
		setTimeout(() => {
			justReviewedItemKeys = justReviewedItemKeys.filter((pendingItemKey) => pendingItemKey !== itemKey);
			onReviewToggled(itemKey);
		}, PAUSE_BEFORE_COLLAPSE_IN_MILLISECONDS);
		return true;
	}

	function scheduleSearch(nextSearchText: string): boolean {
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => onSearchChanged(nextSearchText), 250);
		return true;
	}
</script>

<section class="relative mt-6" in:riseIn={{ delay: 120 }}>
	<ConfettiBurst burstKey={celebrationKey} />
	<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<span class="h-6 w-1.5 rounded-control {CATEGORY_STYLES[category].solidBackgroundClass}"></span>
			<h3 class="text-lg font-bold text-white">
				{categoryTitle}
				{#if resultPage}<span class="ml-1 text-sm font-normal text-gray-400">({resultPage.totalItemCount.toLocaleString()})</span>{/if}
			</h3>
			{#if isCategoryReviewable}
				<ReviewProgressRing reviewedCount={reviewedCountInCategory} totalCount={resultPage?.totalItemCount ?? 0} />
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if reviewedCountInCategory > 0}
				<button type="button" class="whitespace-nowrap rounded-control px-2 py-2 text-xs font-semibold text-gray-400 hover:text-white" onclick={() => (isShowingReviewed = !isShowingReviewed)}>
					{isShowingReviewed ? 'Hide' : 'Show'} reviewed
				</button>
			{/if}
			<label class="relative w-full sm:w-64">
				<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true">⌕</span>
				<input type="search" placeholder="Search these rows…" aria-label="Search these rows"
					class="w-full rounded-control border-gray-700 bg-gray-800 pl-8 text-sm text-white placeholder-gray-500 transition-all focus:border-blue-500 focus:bg-gray-700 focus:ring-blue-500"
					bind:value={searchText} oninput={() => scheduleSearch(searchText)} />
			</label>
		</div>
	</div>

	{#if isEverythingReviewed && !isShowingReviewed}
		<div class="rounded-card bg-gray-800 p-8 text-center" in:bounceIn>
			<p class="text-4xl">🙌</p>
			<p class="mt-2 text-lg font-bold text-white">All caught up!</p>
			<p class="text-sm text-gray-400">You've reviewed every item here.</p>
		</div>
	{:else if resultPage && resultPage.items.length === 0}
		<div class="rounded-card bg-gray-800 p-8 text-center" in:bounceIn>
			<p class="text-4xl">✨</p>
			<p class="mt-2 font-semibold text-gray-300">Nothing here — nice and tidy.</p>
		</div>
	{/if}

	{#key `${resultPage?.pageNumber}-${resultPage?.totalItemCount}`}
		<div class="space-y-3 transition-opacity duration-200 {isLoadingPage ? 'opacity-40' : ''}">
			{#each visibleItems as pageItem, itemPosition (pageItem.itemKey)}
				<div animate:flip={{ duration: 350 }} in:riseIn={{ delay: staggerDelay(itemPosition) }} out:collapseAway>
					<ResultCard resultItem={pageItem.resultItem} {category} {leftLabel} {rightLabel} isReviewed={reviewedItemKeys.has(pageItem.itemKey) || justReviewedItemKeys.includes(pageItem.itemKey)} onReviewToggled={() => toggleReview(pageItem.itemKey)} />
				</div>
			{/each}
		</div>
	{/key}

	{#if resultPage && pageCount > 1}
		<nav class="mt-5 flex items-center justify-center gap-3 text-sm" aria-label="Pages">
			<button type="button" class="rounded-control bg-gray-800 px-4 py-2 font-semibold text-white transition hover:bg-gray-700 active:scale-95 disabled:opacity-40" disabled={resultPage.pageNumber === 0} onclick={() => onPageChosen(resultPage!.pageNumber - 1)}>← Previous</button>
			<span class="tabular-nums text-gray-400">Page {resultPage.pageNumber + 1} of {pageCount.toLocaleString()}</span>
			<button type="button" class="rounded-control bg-gray-800 px-4 py-2 font-semibold text-white transition hover:bg-gray-700 active:scale-95 disabled:opacity-40" disabled={resultPage.pageNumber + 1 >= pageCount} onclick={() => onPageChosen(resultPage!.pageNumber + 1)}>Next →</button>
		</nav>
	{/if}
</section>
