<script lang="ts">
	import type { ResultCategory, ResultItem } from '$lib/engine/resultViews';
	import { CATEGORY_STYLES } from './categoryStyles';
	import DrawnCheckmark from './DrawnCheckmark.svelte';

	type ResultCardProps = {
		resultItem: ResultItem;
		category: ResultCategory;
		leftLabel: string;
		rightLabel: string;
		isReviewed: boolean;
		onReviewToggled: () => boolean;
	};

	let { resultItem, category, leftLabel, rightLabel, isReviewed, onReviewToggled }: ResultCardProps = $props();
	let categoryStyle = $derived(CATEGORY_STYLES[category]);
	let canBeReviewed = $derived(category !== 'matched');

	function describeRowNumbers(leftRowNumber: number | null, rightRowNumber: number | null): string {
		const rowNumberParts = [leftRowNumber ? `${leftLabel} row ${leftRowNumber}` : '', rightRowNumber ? `${rightLabel} row ${rightRowNumber}` : ''];
		return rowNumberParts.filter((rowNumberPart) => rowNumberPart !== '').join(' · ');
	}
</script>

<article class="group relative overflow-hidden rounded-card bg-gray-800 py-4 pl-5 pr-4 shadow-md transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-xl {isReviewed ? 'bg-gray-900' : ''}">
	<span class="absolute inset-y-0 left-0 w-1.5 transition-all duration-300 group-hover:w-2 {isReviewed ? 'bg-gray-600' : categoryStyle.solidBackgroundClass}"></span>

	<header class="mb-3 flex flex-wrap items-start justify-between gap-2">
		<h4 class="max-w-full break-all text-base font-bold {isReviewed ? 'text-gray-500 line-through' : 'text-white'}">{resultItem.itemTitle}</h4>
		<span class="rounded-control px-2 py-0.5 text-xs font-bold {categoryStyle.solidBackgroundClass} {categoryStyle.textOnSolidClass}">{resultItem.badgeText}</span>
	</header>

	<dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
		{#each resultItem.fieldLines as fieldLine, fieldLinePosition (fieldLinePosition)}
			<div class="min-w-0">
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">{fieldLine.fieldLabel}</dt>
				<dd class="mt-0.5 flex flex-wrap items-center gap-1.5 break-words">
					{#if fieldLine.rightValue === null || fieldLine.leftValue === fieldLine.rightValue}
						<span class="text-gray-100">{fieldLine.leftValue || '—'}</span>
					{:else}
						<span class="{fieldLine.isMatch ? 'text-gray-100' : 'text-orange-300'}">{fieldLine.leftValue || '—'}</span>
						<span class="text-gray-500 transition-transform duration-300 group-hover:translate-x-1" aria-label="versus">→</span>
						<span class="{fieldLine.isMatch ? 'text-gray-100' : 'text-orange-300'}">{fieldLine.rightValue || '—'}</span>
					{/if}
					{#if fieldLine.differenceText}
						<span class="whitespace-nowrap rounded-control bg-orange-400 px-1.5 text-xs font-bold text-gray-900">{fieldLine.differenceText}</span>
					{/if}
				</dd>
			</div>
		{/each}
	</dl>

	<footer class="mt-3 flex flex-wrap items-center justify-between gap-2">
		<p class="text-xs text-gray-500">{describeRowNumbers(resultItem.leftRowNumber, resultItem.rightRowNumber)}</p>
		{#if canBeReviewed}
			<button
				type="button"
				onclick={onReviewToggled}
				class="flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-90
					{isReviewed ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-green-500 text-white hover:bg-green-600'}"
			>
				{#if isReviewed}
					<DrawnCheckmark sizeInPixels={14} colorClass="text-green-400" /> Reviewed · undo
				{:else}
					✓ Mark as reviewed
				{/if}
			</button>
		{/if}
	</footer>
</article>
