<script lang="ts">
	type ReviewProgressRingProps = { reviewedCount: number; totalCount: number };

	const RING_RADIUS = 9;
	const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

	let { reviewedCount, totalCount }: ReviewProgressRingProps = $props();
	let reviewedFraction = $derived(totalCount === 0 ? 0 : Math.min(1, reviewedCount / totalCount));
</script>

<span class="flex items-center gap-1.5 text-xs font-semibold text-gray-400" title="{reviewedCount} of {totalCount} reviewed">
	<svg width="24" height="24" viewBox="0 0 24 24" class="-rotate-90" aria-hidden="true">
		<circle cx="12" cy="12" r={RING_RADIUS} fill="none" stroke-width="3" class="stroke-gray-700" />
		<circle cx="12" cy="12" r={RING_RADIUS} fill="none" stroke-width="3" stroke-linecap="round"
			class="stroke-green-500 transition-[stroke-dashoffset] duration-700 ease-[var(--ease-spring)]"
			stroke-dasharray={RING_CIRCUMFERENCE} stroke-dashoffset={RING_CIRCUMFERENCE * (1 - reviewedFraction)} />
	</svg>
	{#key reviewedCount}
		<span class="inline-block tabular-nums {reviewedCount > 0 ? 'animate-wiggle text-green-400' : ''}">{reviewedCount}/{totalCount}</span>
	{/key}
</span>
