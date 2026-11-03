<script lang="ts">
	import { onMount } from 'svelte';
	import type { ResultCategory } from '$lib/engine/resultViews';
	import type { CategoryCounts } from '$lib/engine/workerProtocol';
	import { CATEGORY_DISPLAY_ORDER, CATEGORY_STYLES } from './categoryStyles';
	import { isMotionReduced } from './motion';

	type MatchBreakdownBarProps = { categoryCounts: CategoryCounts; activeCategory: ResultCategory; onCategoryChosen: (category: ResultCategory) => boolean };

	let { categoryCounts, activeCategory, onCategoryChosen }: MatchBreakdownBarProps = $props();
	let hasGrown = $state(false);

	let totalItemCount = $derived(Math.max(1, CATEGORY_DISPLAY_ORDER.reduce((runningTotal, category) => runningTotal + categoryCounts[category], 0)));
	let matchedPercent = $derived(Math.round((categoryCounts.matched / totalItemCount) * 100));

	onMount(() => {
		const growTimer = setTimeout(() => (hasGrown = true), isMotionReduced() ? 0 : 150);
		return () => clearTimeout(growTimer);
	});
</script>

<div class="mt-4">
	<div class="flex h-4 w-full gap-1 overflow-hidden rounded-control bg-gray-700">
		{#each CATEGORY_DISPLAY_ORDER as category, segmentPosition (category)}
			{#if categoryCounts[category] > 0}
				<button
					type="button"
					aria-label="Show {category.replace('_', ' ')}"
					onclick={() => onCategoryChosen(category)}
					class="h-full transition-all ease-[var(--ease-spring)] hover:brightness-110 {CATEGORY_STYLES[category].solidBackgroundClass} {activeCategory === category ? 'ring-2 ring-inset ring-white' : ''}"
					style="width: {hasGrown ? (categoryCounts[category] / totalItemCount) * 100 : 0}%; transition-duration: 900ms; transition-delay: {segmentPosition * 140}ms"
				></button>
			{/if}
		{/each}
	</div>
	<p class="mt-1.5 text-right text-xs text-gray-400">{matchedPercent}% matched exactly</p>
</div>
