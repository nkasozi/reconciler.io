<script lang="ts">
	import type { ResultCategory } from '$lib/engine/resultViews';
	import type { ReconciliationSummary } from '$lib/engine/types';
	import type { CategoryCounts } from '$lib/ports/matchingEngine';
	import AnimatedNumber from './AnimatedNumber.svelte';
	import { CATEGORY_DISPLAY_ORDER, CATEGORY_STYLES } from './categoryStyles';
	import ConfettiBurst from './ConfettiBurst.svelte';
	import DrawnCheckmark from './DrawnCheckmark.svelte';
	import MatchBreakdownBar from './MatchBreakdownBar.svelte';
	import { bounceIn, riseIn, staggerDelay } from './motion';

	type SummaryHeadlineProps = {
		summary: ReconciliationSummary;
		categoryCounts: CategoryCounts;
		leftLabel: string;
		rightLabel: string;
		activeCategory: ResultCategory;
		onCategoryChosen: (category: ResultCategory) => boolean;
	};

	let { summary, categoryCounts, leftLabel, rightLabel, activeCategory, onCategoryChosen }: SummaryHeadlineProps = $props();

	let itemsNeedingAttention = $derived(categoryCounts.needs_review + categoryCounts.only_left + categoryCounts.only_right);
	let isEverythingMatched = $derived(itemsNeedingAttention === 0);
	let totalsDifference = $derived(Math.round((summary.leftTotals.amountTotal - summary.rightTotals.amountTotal) * 100) / 100);
	let confettiKey = $derived(isEverythingMatched ? summary.durationInMilliseconds + 1 : 0);

	let cardTitles = $derived<Record<ResultCategory, string>>({ matched: 'Matched', needs_review: 'Needs a look', only_left: `Only in ${leftLabel}`, only_right: `Only in ${rightLabel}` });
	let cardAmounts = $derived<Record<ResultCategory, number | null>>({
		matched: null,
		needs_review: summary.hasAmountRule && summary.pairedAmountDifferenceTotal !== 0 ? summary.pairedAmountDifferenceTotal : null,
		only_left: summary.hasAmountRule ? summary.onlyInLeftAmountTotal : null,
		only_right: summary.hasAmountRule ? summary.onlyInRightAmountTotal : null
	});
</script>

<section class="relative rounded-card bg-gray-800 p-5 shadow-xl sm:p-6" in:riseIn>
	<ConfettiBurst burstKey={confettiKey} />
	<div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
		<h2 class="text-2xl font-extrabold text-white sm:text-3xl">
			{#if isEverythingMatched}
				<span class="inline-block" in:bounceIn={{ delay: 200 }}>🎉</span> Everything matches
			{:else}
				<span class="text-orange-400"><AnimatedNumber targetValue={itemsNeedingAttention} /></span>
				item{itemsNeedingAttention === 1 ? '' : 's'} need{itemsNeedingAttention === 1 ? 's' : ''} your attention
			{/if}
		</h2>
		<p class="text-sm text-gray-400">
			Checked <AnimatedNumber targetValue={summary.leftTotals.rowCount + summary.rightTotals.rowCount} /> rows in {(summary.durationInMilliseconds / 1000).toFixed(2)}s ⚡
		</p>
	</div>

	<MatchBreakdownBar {categoryCounts} {activeCategory} {onCategoryChosen} />

	<div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each CATEGORY_DISPLAY_ORDER as category, cardPosition (category)}
			{@const categoryStyle = CATEGORY_STYLES[category]}
			{@const isActive = activeCategory === category}
			<button
				type="button"
				in:riseIn={{ delay: staggerDelay(cardPosition, 120) }}
				onclick={() => onCategoryChosen(category)}
				class="group relative overflow-hidden rounded-card p-3 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-95 sm:p-4
					{isActive ? `-translate-y-1 bg-gray-700 shadow-xl ring-2 ${categoryStyle.ringColorClass}` : 'bg-gray-900 hover:-translate-y-0.5 hover:bg-gray-700'}"
			>
				<span class="absolute inset-x-0 top-0 h-1 origin-left transition-transform duration-500 {categoryStyle.solidBackgroundClass} {isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}"></span>
				<span class="flex items-center gap-2 text-xs font-medium text-gray-300 sm:text-sm">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-control text-xs font-bold {categoryStyle.solidBackgroundClass} {categoryStyle.textOnSolidClass} transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">{categoryStyle.iconText}</span>
					<span class="truncate">{cardTitles[category]}</span>
				</span>
				<span class="mt-1 block text-2xl font-extrabold text-white sm:text-3xl"><AnimatedNumber targetValue={categoryCounts[category]} delayInMilliseconds={staggerDelay(cardPosition, 150)} /></span>
				{#if cardAmounts[category] !== null}
					<span class="block truncate text-xs text-gray-400"><AnimatedNumber targetValue={cardAmounts[category] ?? 0} displayStyle="amount" delayInMilliseconds={staggerDelay(cardPosition, 150)} /></span>
				{/if}
			</button>
		{/each}
	</div>

	{#if summary.hasAmountRule}
		<div class="mt-4 rounded-card bg-gray-900 p-3 text-sm text-gray-300 sm:p-4" in:riseIn={{ delay: 400 }}>
			<div class="flex flex-wrap gap-x-6 gap-y-1">
				<span>{leftLabel} total: <strong class="text-white"><AnimatedNumber targetValue={summary.leftTotals.amountTotal} displayStyle="amount" /></strong></span>
				<span>{rightLabel} total: <strong class="text-white"><AnimatedNumber targetValue={summary.rightTotals.amountTotal} displayStyle="amount" /></strong></span>
				<span>Difference: <strong class="text-white"><AnimatedNumber targetValue={totalsDifference} displayStyle="amount" /></strong></span>
			</div>
			{#if summary.unexplainedDifference === 0}
				<p class="mt-2 flex items-center gap-2 text-green-400"><DrawnCheckmark sizeInPixels={18} delayInMilliseconds={900} /> The difference is fully explained by the items below.</p>
			{:else}
				<p class="mt-2 text-orange-400">⚠ Some of the difference couldn't be explained — a few amounts may be blank or not numbers.</p>
			{/if}
		</div>
	{/if}

	{#if summary.duplicateKeyCountLeft + summary.duplicateKeyCountRight > 0}
		<p class="mt-3 text-sm text-orange-300">
			Heads up: some matching values appear more than once ({summary.duplicateKeyCountLeft} in {leftLabel}, {summary.duplicateKeyCountRight} in {rightLabel}). We paired them one-to-one using the closest match.
		</p>
	{/if}
</section>
