<script lang="ts">
	import { onMount, tick } from 'svelte';
	import FileDropZone from './FileDropZone.svelte';
	import ImportHelp from './ImportHelp.svelte';
	import { isMotionReduced, popIn, riseIn } from './motion';
	import MultiFileTray from './start/MultiFileTray.svelte';
	import StartModePicker from './start/StartModePicker.svelte';
	import { findStartModeOption, type StartMode } from './start/startModes';

	type ChooseFilesScreenProps = {
		leftFile: File | null;
		rightFile: File | null;
		onFilesChosen: (side: 'left' | 'right', chosenFiles: File[]) => boolean;
		onManyFilesStartRequested: (filesToLoad: File[], startMode: StartMode) => boolean;
		onSampleRequested: (startMode: StartMode) => boolean;
		chosenStartMode: StartMode;
		onStartModeChanged: (startMode: StartMode) => boolean;
	};

	let { leftFile, rightFile, onFilesChosen, onManyFilesStartRequested, onSampleRequested, chosenStartMode, onStartModeChanged }: ChooseFilesScreenProps = $props();
	const SAMPLE_BUTTON_LABELS: Record<StartMode, string> = { two_files: 'Try a sample', all_together: 'Try a 3-way sample', step_by_step: 'Try sample steps' };
	let isFileBeingDraggedOnPage = $state(false);
	let trayFiles = $state<File[]>([]);
	let chosenModeOption = $derived(findStartModeOption(chosenStartMode));
	let fileAreaElement: HTMLElement | undefined = $state();
	const PHONE_WIDTH_IN_PIXELS = 640;
	let bothFilesChosen = $derived(leftFile !== null && rightFile !== null);
	let oneFileChosen = $derived((leftFile !== null) !== (rightFile !== null));

	function chooseFileForSide(side: 'left' | 'right', chosenFiles: File[]): boolean {
		const alreadyChosenFiles = [leftFile, rightFile].filter((chosenFile): chosenFile is File => chosenFile !== null);
		if (alreadyChosenFiles.length + chosenFiles.length < 3) return onFilesChosen(side, chosenFiles);
		console.log(`[ChooseFilesScreen] ${chosenFiles.length} files dropped on two-file mode, switching to several files at once`);
		trayFiles = [...alreadyChosenFiles, ...chosenFiles];
		return onStartModeChanged('all_together');
	}

	function chooseStartMode(startMode: StartMode): boolean {
		const filesChosenSoFar = [leftFile, rightFile].filter((chosenFile): chosenFile is File => chosenFile !== null);
		if (trayFiles.length === 0 && filesChosenSoFar.length > 0) trayFiles = filesChosenSoFar;
		onStartModeChanged(startMode);
		const isOnPhone = window.innerWidth < PHONE_WIDTH_IN_PIXELS;
		if (isOnPhone) tick().then(() => fileAreaElement?.scrollIntoView({ behavior: isMotionReduced() ? 'auto' : 'smooth', block: 'start' }));
		return true;
	}

	function removeTrayFile(filePosition: number): boolean {
		trayFiles = trayFiles.filter((_, trayPosition) => trayPosition !== filePosition);
		return true;
	}

	onMount(() => {
		let dragEnterDepth = 0;
		const handleWindowDragEnter = (dragEvent: DragEvent): void => {
			if (!dragEvent.dataTransfer?.types.includes('Files')) return;
			dragEnterDepth++;
			isFileBeingDraggedOnPage = true;
		};
		const handleWindowDragLeave = (): void => {
			dragEnterDepth = Math.max(0, dragEnterDepth - 1);
			if (dragEnterDepth === 0) isFileBeingDraggedOnPage = false;
		};
		const handleWindowDragOver = (dragEvent: DragEvent): void => dragEvent.preventDefault();
		const handleWindowDrop = (dropEvent: DragEvent): void => {
			dropEvent.preventDefault();
			dragEnterDepth = 0;
			isFileBeingDraggedOnPage = false;
		};
		window.addEventListener('dragenter', handleWindowDragEnter);
		window.addEventListener('dragleave', handleWindowDragLeave);
		window.addEventListener('dragover', handleWindowDragOver);
		window.addEventListener('drop', handleWindowDrop);
		return () => {
			window.removeEventListener('dragenter', handleWindowDragEnter);
			window.removeEventListener('dragleave', handleWindowDragLeave);
			window.removeEventListener('dragover', handleWindowDragOver);
			window.removeEventListener('drop', handleWindowDrop);
		};
	});
</script>

<header class="mb-6 text-center sm:mb-8">
	<h1 class="text-3xl font-extrabold text-white sm:text-5xl" in:riseIn>
		Reconcile your files <span class="inline-block text-green-400" in:popIn={{ delay: 250 }}>in seconds</span>
	</h1>
	<p class="mx-auto mt-3 max-w-2xl text-gray-300 sm:text-lg" in:riseIn={{ delay: 120 }}>Drop in ledgers, bank statements, POS reports, invoices or any spreadsheet. We work out how they match, then show you only what needs your attention.</p>
</header>

<p class="mb-2.5 text-xs font-bold uppercase tracking-widest text-gray-400" in:riseIn={{ delay: 140 }}>What are you matching?</p>
<StartModePicker {chosenStartMode} onStartModeChosen={chooseStartMode} />

<div class="mt-5 scroll-mt-4" bind:this={fileAreaElement}>
	{#key chosenStartMode === 'two_files'}
		<div in:riseIn={{ duration: 380 }}>
			{#if chosenStartMode === 'two_files'}
				<div class="relative grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-10">
					<FileDropZone stepLabel="File 1" helperText="e.g. your QuickBooks, Xero or Sage export" chosenFile={leftFile} {isFileBeingDraggedOnPage} onFilesChosen={(chosenFiles) => chooseFileForSide('left', chosenFiles)} />
					<div class="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
						<span class="flex h-11 w-11 items-center justify-center rounded-full border-4 border-gray-900 text-lg font-bold text-white shadow-xl transition-all duration-500 ease-[var(--ease-spring)]
							{bothFilesChosen ? 'scale-125 rotate-[360deg] bg-green-500' : oneFileChosen ? 'animate-soft-pulse bg-blue-500' : 'bg-gray-700'}">
							{bothFilesChosen ? '✓' : '⇄'}
						</span>
					</div>
					<FileDropZone stepLabel="File 2" helperText="e.g. your bank statement or supplier statement" chosenFile={rightFile} {isFileBeingDraggedOnPage} onFilesChosen={(chosenFiles) => chooseFileForSide('right', chosenFiles)} />
				</div>
			{:else}
				<MultiFileTray {trayFiles} modeOption={chosenModeOption} {isFileBeingDraggedOnPage}
					onFilesAdded={(addedFiles) => { trayFiles = [...trayFiles, ...addedFiles]; return true; }} onFileRemoved={removeTrayFile}
					onStartRequested={() => onManyFilesStartRequested(trayFiles, chosenStartMode)} />
			{/if}
		</div>
	{/key}
</div>

<div class="mt-5 flex flex-col items-center gap-3 text-sm text-gray-400 sm:flex-row sm:justify-between" in:riseIn={{ delay: 340 }}>
	<span>🔒 Your files never leave this device.</span>
	<button type="button" class="group rounded-control bg-blue-500 px-4 py-2 font-semibold text-white shadow-lg transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:bg-blue-600 active:scale-95" onclick={() => onSampleRequested(chosenStartMode)}>
		{SAMPLE_BUTTON_LABELS[chosenStartMode]} <span class="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
	</button>
</div>
<div class="mt-6" in:riseIn={{ delay: 420 }}><ImportHelp /></div>
