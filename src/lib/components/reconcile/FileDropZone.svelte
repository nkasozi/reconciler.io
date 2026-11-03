<script lang="ts">
	import { SUPPORTED_FILE_EXTENSIONS } from '$lib/engine/fileReaders/supportedExtensions';
	import DrawnCheckmark from './DrawnCheckmark.svelte';
	import { popIn } from './motion';

	type FileDropZoneProps = {
		stepLabel: string;
		helperText: string;
		chosenFile: File | null;
		isFileBeingDraggedOnPage: boolean;
		onFilesChosen: (chosenFiles: File[]) => boolean;
	};

	const FILE_BADGE_COLOR_BY_EXTENSION: Record<string, string> = {
		csv: 'bg-green-600', tsv: 'bg-green-600', txt: 'bg-gray-600', xlsx: 'bg-green-700', xls: 'bg-green-700', xlsm: 'bg-green-700', ods: 'bg-green-700',
		ofx: 'bg-blue-600', qfx: 'bg-blue-600', qbo: 'bg-blue-600', qif: 'bg-blue-600', pdf: 'bg-red-500', png: 'bg-orange-500', jpg: 'bg-orange-500', jpeg: 'bg-orange-500', webp: 'bg-orange-500'
	};

	let { stepLabel, helperText, chosenFile, isFileBeingDraggedOnPage, onFilesChosen }: FileDropZoneProps = $props();
	let isDraggingOverThisZone = $state(false);
	let isHovered = $state(false);
	let fileInputElement: HTMLInputElement | undefined = $state();

	let fileExtension = $derived(chosenFile ? (chosenFile.name.split('.').pop() ?? '').toLowerCase() : '');
	let shouldMarchBorder = $derived(isDraggingOverThisZone || isHovered || (isFileBeingDraggedOnPage && !chosenFile));

	function handleDroppedFiles(droppedFiles: FileList | null | undefined): boolean {
		const chosenFiles = [...(droppedFiles ?? [])];
		if (chosenFiles.length === 0) return false;
		console.log(`[FileDropZone] ${stepLabel} received ${chosenFiles.length} file(s): ${chosenFiles.map((chosenFileItem) => chosenFileItem.name).join(', ')}`);
		return onFilesChosen(chosenFiles);
	}

	function formatFileSize(sizeInBytes: number): string {
		if (sizeInBytes < 1024) return `${sizeInBytes} B`;
		if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(0)} KB`;
		return `${(sizeInBytes / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<button
	type="button"
	class="drop-zone group relative flex min-h-52 w-full flex-col items-center justify-center rounded-card px-4 py-8 text-center transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]
		{isDraggingOverThisZone ? 'scale-[1.03] bg-gray-700 shadow-2xl shadow-black/40' : chosenFile ? 'bg-gray-800' : 'bg-gray-800 hover:-translate-y-1 hover:bg-gray-700 hover:shadow-xl hover:shadow-black/30'}
		{isFileBeingDraggedOnPage && !chosenFile && !isDraggingOverThisZone ? 'animate-soft-pulse' : ''}"
	onclick={() => fileInputElement?.click()}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	ondragenter={(dragEvent) => {
		dragEvent.preventDefault();
		isDraggingOverThisZone = true;
	}}
	ondragover={(dragEvent) => dragEvent.preventDefault()}
	ondragleave={(dragEvent) => {
		if (!(dragEvent.currentTarget as HTMLElement).contains(dragEvent.relatedTarget as Node)) isDraggingOverThisZone = false;
	}}
	ondrop={(dropEvent) => {
		dropEvent.preventDefault();
		isDraggingOverThisZone = false;
		handleDroppedFiles(dropEvent.dataTransfer?.files);
	}}
>
	<svg class="pointer-events-none absolute left-0 top-0 h-[calc(100%-2px)] w-[calc(100%-2px)] overflow-visible" aria-hidden="true">
		<rect x="1" y="1" width="100%" height="100%" rx="7" fill="none" stroke-width="2"
			class="border-dash transition-colors duration-300 {isDraggingOverThisZone || chosenFile ? 'stroke-green-500' : shouldMarchBorder ? 'stroke-blue-400' : 'stroke-gray-600'} {shouldMarchBorder ? 'is-marching' : ''}"
			stroke-dasharray={chosenFile ? '0' : '9 7'} />
	</svg>

	<span class="mb-3 rounded-control bg-gray-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">{stepLabel}</span>

	{#if chosenFile}
		{#key chosenFile}
			<div class="flex flex-col items-center" in:popIn>
				<div class="relative mb-2">
					<span class="flex h-14 w-12 items-end justify-center rounded-control bg-gray-200 pb-1.5 shadow-lg">
						<span class="rounded-control px-1.5 text-[10px] font-extrabold uppercase text-white {FILE_BADGE_COLOR_BY_EXTENSION[fileExtension] ?? 'bg-gray-600'}">{fileExtension || 'file'}</span>
					</span>
					<span class="absolute -right-3 -top-2 rounded-full bg-gray-800"><DrawnCheckmark sizeInPixels={24} delayInMilliseconds={150} /></span>
				</div>
				<span class="max-w-full truncate text-base font-semibold text-white">{chosenFile.name}</span>
				<span class="mt-1 text-sm text-gray-400">{formatFileSize(chosenFile.size)} · <span class="text-blue-300 group-hover:underline">change</span></span>
			</div>
		{/key}
	{:else}
		<span class="mb-3 flex h-14 w-14 items-center justify-center rounded-card transition-all duration-300 ease-[var(--ease-spring)]
			{isDraggingOverThisZone ? 'scale-125 bg-green-500 text-white' : 'animate-float-bob bg-blue-500 text-white group-hover:bg-blue-400'}">
			<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				{#if isDraggingOverThisZone}
					<path d="M12 4v12m0 0l-5-5m5 5l5-5M5 20h14" />
				{:else}
					<path d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
				{/if}
			</svg>
		</span>
		<span class="text-base font-semibold text-white">{isDraggingOverThisZone ? 'Let go to add it!' : isFileBeingDraggedOnPage ? 'Drop it here' : 'Drop a file or tap to choose'}</span>
		<span class="mt-1 text-sm text-gray-400">{helperText}</span>
	{/if}
</button>
<input
	bind:this={fileInputElement}
	type="file"
	multiple
	class="hidden"
	accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
	onchange={(changeEvent) => { const fileInput = changeEvent.currentTarget as HTMLInputElement; handleDroppedFiles(fileInput.files); fileInput.value = ''; }}
/>

<style>
	.border-dash.is-marching {
		animation: march-dashes 0.7s linear infinite;
	}
	@keyframes march-dashes {
		to { stroke-dashoffset: -16; }
	}
</style>
