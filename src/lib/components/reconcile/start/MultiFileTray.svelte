<script lang="ts">
	import { flip } from 'svelte/animate';
	import FileDropZone from '../FileDropZone.svelte';
	import { collapseAway, isMotionReduced, popIn } from '../motion';
	import { fileLetterColor } from '../workflow/workflowModel';
	import type { StartModeOption } from './startModes';

	type MultiFileTrayProps = {
		trayFiles: File[];
		modeOption: StartModeOption;
		isFileBeingDraggedOnPage: boolean;
		onFilesAdded: (addedFiles: File[]) => boolean;
		onFileRemoved: (filePosition: number) => boolean;
		onStartRequested: () => boolean;
	};

	let { trayFiles, modeOption, isFileBeingDraggedOnPage, onFilesAdded, onFileRemoved, onStartRequested }: MultiFileTrayProps = $props();
	const FILE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	let missingFileCount = $derived(Math.max(0, modeOption.minimumFileCount - trayFiles.length));
	let isReadyToStart = $derived(missingFileCount === 0);

	function describeFileSize(sizeInBytes: number): string {
		return sizeInBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeInBytes / 1024))} KB` : `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<div class="flex flex-col gap-2">
		{#each trayFiles as trayFile, filePosition (trayFile)}
			{@const fileLetter = FILE_LETTERS[filePosition % FILE_LETTERS.length]}
			<div class="flex items-center gap-3 rounded-card bg-gray-800 p-2.5 shadow-md" animate:flip={{ duration: isMotionReduced() ? 0 : 300 }} in:popIn={{ duration: 420 }} out:collapseAway>
				<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-base font-extrabold text-white {fileLetterColor(fileLetter)}">{fileLetter}</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-semibold text-white">{trayFile.name}</span>
					<span class="text-xs text-gray-500">{describeFileSize(trayFile.size)}{filePosition > 0 && modeOption.startMode === 'all_together' ? ` · matched against ${FILE_LETTERS.slice(0, filePosition).split('').join(', ')}` : ''}</span>
				</span>
				<button type="button" class="rounded-control px-2.5 py-1 text-lg text-gray-500 transition hover:bg-red-400 hover:text-white active:scale-90" aria-label="Remove {trayFile.name}" onclick={() => onFileRemoved(filePosition)}>×</button>
			</div>
		{/each}
		{#each Array.from({ length: missingFileCount }) as _, emptySlotPosition (emptySlotPosition)}
			<div class="flex items-center gap-3 rounded-card border-2 border-dashed border-gray-700 p-2.5 text-sm text-gray-500">
				<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-gray-800 font-extrabold text-gray-600">{FILE_LETTERS[trayFiles.length + emptySlotPosition]}</span>
				File {trayFiles.length + emptySlotPosition + 1} goes here
			</div>
		{/each}
		<p class="px-1 text-xs text-gray-500">{modeOption.fileSlotHint}</p>
	</div>

	<div class="flex flex-col gap-3">
		<FileDropZone stepLabel={trayFiles.length === 0 ? 'Your files' : 'Add more'} helperText="Drop several at once, or add them one by one" chosenFile={null} {isFileBeingDraggedOnPage} onFilesChosen={onFilesAdded} />
		<button type="button" disabled={!isReadyToStart} onclick={onStartRequested}
			class="w-full rounded-control bg-green-500 px-6 py-3.5 text-lg font-extrabold text-white shadow-xl transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:bg-green-600 active:scale-95 disabled:translate-y-0 disabled:bg-gray-700 disabled:text-gray-400">
			{isReadyToStart ? modeOption.startButtonLabel(trayFiles.length) : `Add ${missingFileCount} more file${missingFileCount === 1 ? '' : 's'}`}
		</button>
	</div>
</div>
