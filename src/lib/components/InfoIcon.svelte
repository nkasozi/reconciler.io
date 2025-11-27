<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		tooltip: string;
	}

	let { tooltip }: Props = $props();

	let showTooltip = $state(false);
	let touchStartTime = $state<number | null>(null);
	let touchTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		return () => {
			if (touchTimer) clearTimeout(touchTimer);
		};
	});

	function handleMouseEnter() {
		showTooltip = true;
	}

	function handleMouseLeave() {
		showTooltip = false;
	}

	function handleTouchStart() {
		touchStartTime = Date.now();
		touchTimer = setTimeout(() => {
			showTooltip = true;
		}, 500); // Show tooltip after 500ms long press
	}

	function handleTouchEnd() {
		if (touchTimer) {
			clearTimeout(touchTimer);
			touchTimer = null;
		}
		touchStartTime = null;
		// Keep tooltip visible for a few seconds on mobile
		const hideTimer = setTimeout(() => {
			showTooltip = false;
		}, 3000);
		return () => clearTimeout(hideTimer);
	}
</script>

<div class="relative inline-block">
	<!-- Info Icon -->
	<button
		type="button"
		class="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 bg-white text-xs font-semibold text-gray-600 transition-colors duration-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-400 dark:hover:bg-blue-900 dark:hover:text-blue-300"
		aria-label="More information"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		i
	</button>

	<!-- Tooltip -->
	{#if showTooltip}
		<div
			class="absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 transform rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-gray-800"
			role="tooltip"
		>
			<div class="text-sm">{tooltip}</div>
			<div
				class="absolute left-1/2 right-auto top-0 -mt-1 -translate-x-1/2 transform border-4 border-transparent border-b-gray-900 dark:border-b-gray-800"
			></div>
		</div>
	{/if}
</div>

<style>
	button:active {
		transform: scale(0.95);
	}
</style>
