<script lang="ts">
	type DrawnCheckmarkProps = { sizeInPixels?: number; colorClass?: string; delayInMilliseconds?: number };

	let { sizeInPixels = 20, colorClass = 'text-green-400', delayInMilliseconds = 0 }: DrawnCheckmarkProps = $props();
</script>

<svg class="inline-block shrink-0 {colorClass}" width={sizeInPixels} height={sizeInPixels} viewBox="0 0 24 24" fill="none" aria-hidden="true">
	<circle class="checkmark-ring" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" style="animation-delay: {delayInMilliseconds}ms" />
	<path class="checkmark-tick" d="M7 12.5l3.2 3.2L17 9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="animation-delay: {delayInMilliseconds + 250}ms" />
</svg>

<style>
	.checkmark-ring {
		stroke-dasharray: 63;
		stroke-dashoffset: 63;
		animation: draw-stroke 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}
	.checkmark-tick {
		stroke-dasharray: 16;
		stroke-dashoffset: 16;
		animation: draw-stroke 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
	@keyframes draw-stroke {
		to { stroke-dashoffset: 0; }
	}
</style>
