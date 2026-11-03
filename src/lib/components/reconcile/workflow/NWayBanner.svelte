<script lang="ts">
	import AnimatedNumber from '../AnimatedNumber.svelte';
	import { bounceIn, riseIn } from '../motion';

	type NWayBannerProps = { stepCount: number; matchedEverywhereCount: number; totalRowCount: number };

	let { stepCount, matchedEverywhereCount, totalRowCount }: NWayBannerProps = $props();
	let fileCount = $derived(stepCount + 1);
	let matchedPercent = $derived(totalRowCount === 0 ? 0 : Math.round((matchedEverywhereCount / totalRowCount) * 100));
</script>

<section class="mb-4 flex items-center gap-4 rounded-card border-l-4 border-green-500 bg-gray-800 p-4 shadow-xl" in:riseIn>
	<div class="flex shrink-0 -space-x-2" aria-hidden="true">
		{#each Array.from({ length: Math.min(fileCount, 6) }) as _, filePosition (filePosition)}
			<span class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-800 bg-green-500 text-xs font-extrabold text-white" in:bounceIn={{ delay: 150 + filePosition * 90 }}>✓</span>
		{/each}
	</div>
	<div class="min-w-0">
		<p class="text-lg font-extrabold text-white">
			<span class="text-green-400"><AnimatedNumber targetValue={matchedEverywhereCount} /></span> {matchedEverywhereCount === 1 ? "row" : "rows"} matched across all {fileCount} files
		</p>
		<p class="text-sm text-gray-400">That's {matchedPercent}% of {totalRowCount.toLocaleString()} rows in the final result. Use the “Step N status” columns in the Excel report to see where each other row dropped out.</p>
	</div>
</section>
