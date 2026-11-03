<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import DrawnCheckmark from './DrawnCheckmark.svelte';
	import { isMotionReduced, riseIn, staggerDelay } from './motion';

	type WorkingProgressProps = { phaseIndex: number; phaseLabels: string[]; leftFileName: string; rightFileName: string; detailMessage: string };

	let { phaseIndex, phaseLabels, leftFileName, rightFileName, detailMessage }: WorkingProgressProps = $props();
	const progressPercent = new Tween(4, { duration: 700, easing: cubicOut });

	$effect(() => {
		const targetPercent = Math.min(100, Math.round(((phaseIndex + 0.85) / phaseLabels.length) * 100));
		progressPercent.set(phaseIndex >= phaseLabels.length ? 100 : targetPercent, { duration: isMotionReduced() ? 0 : 700 });
	});
</script>

<div class="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center" aria-live="polite">
	<div class="mb-8 flex items-center gap-2" in:riseIn>
		<span class="min-w-0 flex-1 truncate rounded-control bg-gray-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg">{leftFileName}</span>
		<span class="link-track relative h-1 w-16 shrink-0 overflow-hidden rounded-full bg-gray-700 sm:w-24" aria-hidden="true">
			<span class="link-dot absolute top-0 h-1 w-4 rounded-full bg-green-500"></span>
			<span class="link-dot link-dot-late absolute top-0 h-1 w-4 rounded-full bg-blue-500"></span>
		</span>
		<span class="min-w-0 flex-1 truncate rounded-control bg-gray-800 px-3 py-2 text-center text-sm font-semibold text-white shadow-lg">{rightFileName}</span>
	</div>

	<div class="rounded-card bg-gray-800 p-5 shadow-xl sm:p-6" in:riseIn={{ delay: 80 }}>
		<div class="mb-2 flex items-baseline justify-between">
			<p class="text-lg font-bold text-white">{phaseLabels[Math.min(phaseIndex, phaseLabels.length - 1)]}…</p>
			<p class="text-sm font-semibold tabular-nums text-green-400">{Math.round(progressPercent.current)}%</p>
		</div>
		<div class="relative h-3 w-full overflow-hidden rounded-control bg-gray-700" role="progressbar" aria-valuenow={Math.round(progressPercent.current)} aria-valuemin={0} aria-valuemax={100}>
			<div class="progress-fill relative h-full overflow-hidden rounded-control bg-green-500" style="width: {progressPercent.current}%"></div>
		</div>
		{#if detailMessage}<p class="mt-2 text-sm text-gray-400">{detailMessage}</p>{/if}

		<ol class="mt-5 space-y-2.5">
			{#each phaseLabels as phaseLabel, phasePosition (phaseLabel)}
				<li class="flex items-center gap-3 text-sm" in:riseIn={{ delay: staggerDelay(phasePosition, 150), distance: 8 }}>
					{#if phasePosition < phaseIndex}
						<DrawnCheckmark sizeInPixels={20} />
					{:else if phasePosition === phaseIndex}
						<span class="relative flex h-5 w-5 items-center justify-center">
							<span class="absolute h-5 w-5 animate-ping rounded-full bg-blue-500 opacity-40"></span>
							<span class="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
						</span>
					{:else}
						<span class="h-5 w-5 rounded-full border-2 border-gray-600"></span>
					{/if}
					<span class="transition-colors duration-300 {phasePosition < phaseIndex ? 'text-gray-400' : phasePosition === phaseIndex ? 'font-semibold text-white' : 'text-gray-500'}">{phaseLabel}</span>
				</li>
			{/each}
		</ol>
	</div>
</div>

<style>
	.link-dot {
		animation: travel-along-link 1.1s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}
	.link-dot-late {
		animation-delay: 0.55s;
	}
	@keyframes travel-along-link {
		from { left: -1rem; }
		to { left: 100%; }
	}
	.progress-fill::after {
		content: '';
		position: absolute;
		inset: 0;
		width: 30%;
		background: var(--color-green-400);
		animation: progress-sheen 1.2s ease-in-out infinite;
	}
	@keyframes progress-sheen {
		from { transform: translateX(-120%); }
		to { transform: translateX(380%); }
	}
</style>
