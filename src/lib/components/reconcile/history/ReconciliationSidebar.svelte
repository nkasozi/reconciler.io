<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import { isMotionReduced, riseIn } from '../motion';
	import SavedReconciliationItem from './SavedReconciliationItem.svelte';
	import type { SavedReconciliation } from './savedReconciliation';

	type ReconciliationSidebarProps = {
		savedReconciliations: SavedReconciliation[];
		activeReconciliationId: string | null;
		isOpenOnPhone: boolean;
		onOpenRequested: (reconciliationId: string) => boolean;
		onNewRequested: () => boolean;
		onRenamed: (reconciliationId: string, newTitle: string) => boolean;
		onDeleted: (reconciliationId: string) => boolean;
		onPhoneCloseRequested: () => boolean;
	};

	let { savedReconciliations, activeReconciliationId, isOpenOnPhone, onOpenRequested, onNewRequested, onRenamed, onDeleted, onPhoneCloseRequested }: ReconciliationSidebarProps = $props();
	let currentTime = $state(Date.now());

	$effect(() => {
		const clockTimer = setInterval(() => (currentTime = Date.now()), 60000);
		return () => clearInterval(clockTimer);
	});
</script>

{#snippet sidebarContents()}
	<div class="flex items-center justify-between gap-2 px-1">
		<p class="text-xs font-bold uppercase tracking-widest text-gray-400">Your reconciliations</p>
		<button type="button" class="rounded-control px-2 py-1 text-lg leading-none text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden" aria-label="Close" onclick={onPhoneCloseRequested}>×</button>
	</div>
	<button type="button" onclick={onNewRequested}
		class="group mt-3 flex w-full items-center gap-2 rounded-control bg-green-500 px-3 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-green-600 active:scale-95">
		<span class="text-base transition-transform duration-300 group-hover:rotate-90">+</span> New reconciliation
	</button>
	<div class="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
		{#each savedReconciliations as record (record.reconciliationId)}
			<div animate:flip={{ duration: isMotionReduced() ? 0 : 300 }} in:riseIn={{ distance: 8, duration: 300 }}>
				<SavedReconciliationItem {record} {currentTime} isActive={record.reconciliationId === activeReconciliationId}
					onOpenRequested={() => onOpenRequested(record.reconciliationId)} onRenamed={(newTitle) => onRenamed(record.reconciliationId, newTitle)} onDeleted={() => onDeleted(record.reconciliationId)} />
			</div>
		{:else}
			<p class="rounded-control border-2 border-dashed border-gray-700 p-3 text-xs text-gray-400">Every reconciliation you run is saved here automatically, with its files, steps and results.</p>
		{/each}
	</div>
	<p class="mt-3 px-1 text-[11px] leading-snug text-gray-500">🔒 Saved only in this browser on this device.</p>
{/snippet}

<aside class="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-64 shrink-0 flex-col self-start rounded-card bg-gray-900 p-3 ring-1 ring-gray-800 lg:flex" aria-label="Your reconciliations">
	{@render sidebarContents()}
</aside>

{#if isOpenOnPhone}
	<div class="fixed inset-0 z-50 lg:hidden">
		<button type="button" class="absolute inset-0 bg-gray-950" style="opacity: 0.7" aria-label="Close" onclick={onPhoneCloseRequested} transition:fade={{ duration: isMotionReduced() ? 0 : 200 }}></button>
		<aside class="absolute inset-y-0 left-0 flex w-[85vw] max-w-xs flex-col bg-gray-900 p-4 shadow-2xl" aria-label="Your reconciliations" transition:fly={{ x: -320, duration: isMotionReduced() ? 0 : 300, opacity: 1 }}>
			{@render sidebarContents()}
		</aside>
	</div>
{/if}
