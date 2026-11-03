<script lang="ts">
	import { flip } from 'svelte/animate';
	import { SUPPORTED_FILE_EXTENSIONS } from '$lib/ports/tableFileReader';
	import { CATEGORY_DISPLAY_ORDER, CATEGORY_STYLES } from '../categoryStyles';
	import { popIn } from '../motion';
	import { fileLetterColor, labelsForStage, shortFileName, type StageState, type WorkflowFile } from './workflowModel';

	type WorkflowRailProps = {
		files: WorkflowFile[];
		stages: StageState[];
		activeStageId: string | null;
		onStageChosen: (stageId: string) => boolean;
		onFilesAdded: (addedFiles: File[]) => boolean;
		onAddStepRequested: () => boolean;
		onMatchAllRequested: () => boolean;
		onShowMapRequested: () => boolean;
		onRunAllRequested: () => boolean;
		isMapShowing: boolean;
	};

	let { files, stages, activeStageId, onStageChosen, onFilesAdded, onAddStepRequested, onMatchAllRequested, onShowMapRequested, onRunAllRequested, isMapShowing }: WorkflowRailProps = $props();
	let fileInputElement: HTMLInputElement | undefined = $state();
	let sortedStages = $derived([...stages].sort((first, second) => first.stageNumber - second.stageNumber));
	let canMatchAllInChain = $derived(files.length >= 3 && stages.length < files.length - 1);

	function totalItems(stage: StageState): number {
		if (!stage.runSummary) return 1;
		return Math.max(1, CATEGORY_DISPLAY_ORDER.reduce((runningTotal, category) => runningTotal + stage.runSummary!.categoryCounts[category], 0));
	}
</script>

<nav class="mb-5 rounded-card bg-gray-800 p-3 shadow-xl" aria-label="Your reconciliation steps">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-[11px] font-bold uppercase tracking-widest text-gray-500">Files</span>
		{#each files as workflowFile (workflowFile.tableId)}
			<span class="flex items-center gap-1.5 rounded-control bg-gray-900 py-1 pl-1 pr-2.5 text-xs text-gray-200" title={workflowFile.overview.fileName} in:popIn animate:flip={{ duration: 300 }}>
				<span class="flex h-5 w-5 items-center justify-center rounded-control text-[11px] font-extrabold text-white {fileLetterColor(workflowFile.fileLetter)}">{workflowFile.fileLetter}</span>
				<span class="max-w-32 truncate font-semibold">{shortFileName(workflowFile.overview)}</span>
				<span class="text-gray-500">{workflowFile.overview.rowCount.toLocaleString()}</span>
			</span>
		{/each}
		<button type="button" class="rounded-control border-2 border-dashed border-gray-600 px-2.5 py-0.5 text-xs font-semibold text-gray-300 transition-all hover:border-blue-400 hover:text-white active:scale-95" onclick={() => fileInputElement?.click()}>+ Add a file</button>
		<span class="ml-auto flex gap-1.5">
			<button type="button" class="rounded-control px-2.5 py-1 text-xs font-bold transition-all active:scale-95 {isMapShowing ? 'bg-blue-500 text-white' : 'bg-gray-900 text-gray-200 hover:bg-gray-700'}" onclick={onShowMapRequested}>🗺 Map</button>
			{#if stages.length > 1}<button type="button" class="rounded-control bg-gray-900 px-2.5 py-1 text-xs font-bold text-gray-200 transition-all hover:bg-green-500 hover:text-white active:scale-95" onclick={onRunAllRequested} in:popIn>▶ Run all</button>{/if}
		</span>
		<input bind:this={fileInputElement} type="file" multiple class="hidden" accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
			onchange={(changeEvent) => { const chosenFiles = [...((changeEvent.currentTarget as HTMLInputElement).files ?? [])]; (changeEvent.currentTarget as HTMLInputElement).value = ''; if (chosenFiles.length > 0) onFilesAdded(chosenFiles); }} />
	</div>

	<div class="mt-3 flex items-stretch gap-0 overflow-x-auto pb-1">
		{#each sortedStages as stage, stagePosition (stage.stageId)}
			{@const stageLabels = labelsForStage(stage, files, stages)}
			<div class="flex shrink-0 items-stretch" in:popIn animate:flip={{ duration: 300 }}>
			{#if stagePosition > 0}
				<span class="rail-connector my-auto h-1 w-6 shrink-0 rounded-full bg-gray-600" aria-hidden="true"></span>
			{/if}
			<button type="button" onclick={() => onStageChosen(stage.stageId)}
				class="flex min-w-44 shrink-0 flex-col gap-1.5 rounded-control px-3 py-2 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-95
					{activeStageId === stage.stageId ? 'bg-gray-700 shadow-lg ring-2 ring-green-500' : 'bg-gray-900 hover:bg-gray-700'}">
				<span class="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider {activeStageId === stage.stageId ? 'text-green-400' : 'text-gray-500'}">
					Step {stage.stageNumber}
					<span class="normal-case tracking-normal">{stage.runSummary ? `${stage.runSummary.categoryCounts.matched} matched` : 'not run yet'}</span>
				</span>
				<span class="truncate text-xs font-semibold text-white">{stageLabels.leftLabel} ↔ {stageLabels.rightLabel}</span>
				<span class="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-control bg-gray-700">
					{#if stage.runSummary}
						{#each CATEGORY_DISPLAY_ORDER as category (category)}
							<span class="h-full transition-all duration-700 {CATEGORY_STYLES[category].solidBackgroundClass}" style="width: {(stage.runSummary.categoryCounts[category] / totalItems(stage)) * 100}%"></span>
						{/each}
					{/if}
				</span>
			</button>
			</div>
		{/each}
		<span class="my-auto h-1 w-6 shrink-0 rounded-full bg-gray-700" aria-hidden="true"></span>
		<button type="button" class="shrink-0 rounded-control border-2 border-dashed border-gray-600 px-3 text-xs font-bold text-gray-300 transition-all hover:border-green-500 hover:text-white active:scale-95" onclick={onAddStepRequested}>+ Add a step</button>
		{#if canMatchAllInChain}
			<button type="button" class="ml-2 shrink-0 animate-soft-pulse rounded-control bg-green-500 px-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-green-600 active:scale-95" onclick={onMatchAllRequested} in:popIn>⚡ Match all {files.length} files</button>
		{/if}
	</div>
</nav>

<style>
	.rail-connector {
		background-image: linear-gradient(90deg, var(--color-green-500) 50%, var(--color-gray-600) 50%);
		background-size: 200% 100%;
		animation: rail-flow 1.4s linear infinite;
	}
	@keyframes rail-flow {
		from { background-position: 100% 0; }
		to { background-position: 0 0; }
	}
</style>
