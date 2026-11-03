<script lang="ts">
	import { fileLetterColor } from '../workflow/workflowModel';
	import { describeTimeAgo, type SavedReconciliation } from './savedReconciliation';

	type SavedReconciliationItemProps = {
		record: SavedReconciliation;
		isActive: boolean;
		currentTime: number;
		onOpenRequested: () => boolean;
		onRenamed: (newTitle: string) => boolean;
		onDeleted: () => boolean;
	};

	let { record, isActive, currentTime, onOpenRequested, onRenamed, onDeleted }: SavedReconciliationItemProps = $props();
	let isRenaming = $state(false);
	let isConfirmingDelete = $state(false);
	let draftTitle = $state('');

	function startRenaming(clickEvent: MouseEvent): boolean {
		clickEvent.stopPropagation();
		draftTitle = record.title;
		isRenaming = true;
		return true;
	}

	function finishRenaming(): boolean {
		isRenaming = false;
		return draftTitle.trim() !== '' && draftTitle.trim() !== record.title ? onRenamed(draftTitle) : false;
	}

	function requestDelete(clickEvent: MouseEvent): boolean {
		clickEvent.stopPropagation();
		if (isConfirmingDelete) return onDeleted();
		isConfirmingDelete = true;
		setTimeout(() => (isConfirmingDelete = false), 3000);
		return true;
	}

	function focusOnMount(inputElement: HTMLInputElement) {
		inputElement.focus();
		inputElement.select();
	}
</script>

<div class="group relative rounded-control transition-all duration-200 {isActive ? 'bg-gray-700 ring-2 ring-blue-500' : 'hover:bg-gray-800'}">
	{#if isRenaming}
		<div class="p-2">
			<input use:focusOnMount bind:value={draftTitle} onblur={finishRenaming} onkeydown={(keyboardEvent) => { if (keyboardEvent.key === 'Enter') finishRenaming(); if (keyboardEvent.key === 'Escape') isRenaming = false; }}
				class="w-full rounded-control border-blue-400 bg-gray-900 px-2 py-1 text-sm text-white focus:ring-blue-400" aria-label="Name this reconciliation" />
		</div>
	{:else}
		<button type="button" class="block w-full p-2.5 pr-14 text-left" onclick={onOpenRequested}>
			<span class="block truncate text-sm font-bold text-white">{record.title}</span>
			<span class="mt-1 flex items-center gap-1">
				{#each record.files.slice(0, 6) as savedFile (savedFile.tableId)}
					<span class="flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-extrabold text-white {fileLetterColor(savedFile.fileLetter)}" title={savedFile.fileName}>{savedFile.fileLetter}</span>
				{/each}
				<span class="ml-1 truncate text-[11px] text-gray-400">{record.stages.length} step{record.stages.length === 1 ? '' : 's'} · {describeTimeAgo(record.updatedAt, currentTime)}</span>
			</span>
			{#if record.headline}
				<span class="mt-1 block text-[11px]"><span class="text-green-400">{record.headline.matchedCount} matched</span>{#if record.headline.attentionCount > 0}<span class="text-orange-400">{' · '}{record.headline.attentionCount} to check</span>{/if}</span>
			{:else}
				<span class="mt-1 block text-[11px] text-gray-500">Not run yet</span>
			{/if}
		</button>
		<span class="absolute right-1.5 top-1.5 flex gap-0.5 transition-opacity duration-200 {isConfirmingDelete ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}">
			<button type="button" class="rounded-control px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-600 hover:text-white" aria-label="Rename" title="Rename" onclick={startRenaming}>✎</button>
			<button type="button" class="rounded-control px-1.5 py-0.5 text-xs font-bold transition-all {isConfirmingDelete ? 'bg-red-400 text-white' : 'text-gray-400 hover:bg-gray-600 hover:text-red-300'}" aria-label="Delete" title="Delete" onclick={requestDelete}>{isConfirmingDelete ? 'Delete?' : '🗑'}</button>
		</span>
	{/if}
</div>
