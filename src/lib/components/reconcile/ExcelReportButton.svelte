<script lang="ts">
	import DrawnCheckmark from './DrawnCheckmark.svelte';

	type ExportButtonState = 'idle' | 'preparing' | 'done';
	type ExcelReportButtonProps = { onExportRequested: () => Promise<boolean> };

	let { onExportRequested }: ExcelReportButtonProps = $props();
	let buttonState = $state<ExportButtonState>('idle');

	async function runExport(): Promise<boolean> {
		if (buttonState === 'preparing') return false;
		buttonState = 'preparing';
		const wasExported = await onExportRequested();
		buttonState = wasExported ? 'done' : 'idle';
		if (wasExported) setTimeout(() => (buttonState = 'idle'), 2200);
		return wasExported;
	}
</script>

<button
	type="button"
	onclick={runExport}
	class="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-control px-5 py-2.5 font-bold text-white shadow-lg transition-all duration-300 ease-[var(--ease-spring)] active:scale-95 sm:flex-none
		{buttonState === 'done' ? 'bg-green-600' : 'bg-green-500 hover:-translate-y-0.5 hover:bg-green-600'}"
	aria-live="polite"
>
	{#if buttonState === 'preparing'}
		<span class="h-4 w-4 animate-spin rounded-full border-2 border-green-300 border-t-white"></span> Building report…
		<span class="export-progress absolute bottom-0 left-0 h-1 bg-white"></span>
	{:else if buttonState === 'done'}
		<DrawnCheckmark sizeInPixels={18} colorClass="text-white" /> Downloaded!
	{:else}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true"><path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" /></svg>
		Excel report
	{/if}
</button>

<style>
	.export-progress {
		animation: export-progress 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}
	@keyframes export-progress {
		from { width: 0; }
		to { width: 92%; }
	}
</style>
