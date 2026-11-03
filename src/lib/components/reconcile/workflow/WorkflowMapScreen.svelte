<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { CATEGORY_DISPLAY_ORDER, CATEGORY_STYLES } from '../categoryStyles';
	import { buildCurvedLinkPath, findCurvePoint } from '../linker/linkerModel';
	import { popIn, riseIn, staggerDelay } from '../motion';
	import { buildMapColumns, buildMapEdges } from './workflowMapLayout';
	import { fileLetterColor, findStagesDependingOn, labelsForStage, shortFileName, type StageState, type WorkflowFile } from './workflowModel';

	type WorkflowMapScreenProps = {
		files: WorkflowFile[];
		stages: StageState[];
		onStageLinksRequested: (stageId: string) => boolean;
		onStageResultsRequested: (stageId: string) => boolean;
		onStageDeleted: (stageId: string) => boolean;
		onAddStepRequested: () => boolean;
		onRunAllRequested: () => boolean;
	};

	let { files, stages, onStageLinksRequested, onStageResultsRequested, onStageDeleted, onAddStepRequested, onRunAllRequested }: WorkflowMapScreenProps = $props();
	const nodeElementsById = new Map<string, HTMLElement>();
	let canvasElement: HTMLElement | undefined = $state();
	let nodeBoxesById = $state<Record<string, { left: number; right: number; middleY: number }>>({});
	let stageIdAwaitingDeleteConfirmation = $state<string | null>(null);

	let mapColumns = $derived(buildMapColumns(files, stages));
	let mapEdges = $derived(buildMapEdges(stages));

	function registerNode(nodeElement: HTMLElement, nodeId: string) {
		nodeElementsById.set(nodeId, nodeElement);
		return { destroy: () => nodeElementsById.delete(nodeId) };
	}

	function measureNodes(): boolean {
		if (!canvasElement) return false;
		const canvasBox = canvasElement.getBoundingClientRect();
		const measuredBoxes: typeof nodeBoxesById = {};
		for (const [nodeId, nodeElement] of nodeElementsById) {
			const nodeBox = nodeElement.getBoundingClientRect();
			measuredBoxes[nodeId] = { left: nodeBox.left - canvasBox.left + canvasElement.scrollLeft, right: nodeBox.right - canvasBox.left + canvasElement.scrollLeft, middleY: nodeBox.top + nodeBox.height / 2 - canvasBox.top };
		}
		nodeBoxesById = measuredBoxes;
		return true;
	}

	onMount(() => {
		const resizeObserver = new ResizeObserver(() => measureNodes());
		if (canvasElement) resizeObserver.observe(canvasElement);
		return () => resizeObserver.disconnect();
	});

	$effect(() => {
		void mapColumns;
		tick().then(measureNodes);
		const settleTimers = [300, 800].map((delayInMilliseconds) => setTimeout(measureNodes, delayInMilliseconds));
		return () => settleTimers.forEach((settleTimer) => clearTimeout(settleTimer));
	});

	function stageFor(nodeId: string): StageState | undefined {
		return stages.find((stage) => `stage:${stage.stageId}` === nodeId);
	}

	function fileFor(nodeId: string): WorkflowFile | undefined {
		return files.find((file) => `file:${file.tableId}` === nodeId);
	}

	function requestDelete(stageId: string): boolean {
		if (stageIdAwaitingDeleteConfirmation !== stageId) {
			stageIdAwaitingDeleteConfirmation = stageId;
			return false;
		}
		stageIdAwaitingDeleteConfirmation = null;
		return onStageDeleted(stageId);
	}

	function describeDeletion(stageId: string): string {
		const dependentStepNumbers = findStagesDependingOn(stages, stageId).map((stage) => stage.stageNumber);
		return dependentStepNumbers.length > 0 ? `Also removes step ${dependentStepNumbers.join(', ')}` : 'Tap again to delete';
	}
</script>

<section class="space-y-4">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" in:riseIn>
		<div>
			<p class="text-xs font-bold uppercase tracking-widest text-green-400">Workflow map</p>
			<h2 class="text-2xl font-extrabold text-white sm:text-3xl">Your sources and steps</h2>
			<p class="mt-1 text-sm text-gray-400">Each step matches two inputs — a file, several files combined, or the result of an earlier step. Results flow to the right.</p>
		</div>
		<div class="flex gap-2">
			<button type="button" class="rounded-control border-2 border-dashed border-gray-600 px-4 py-2.5 text-sm font-bold text-gray-200 transition-all hover:border-green-500 hover:text-white active:scale-95" onclick={onAddStepRequested}>+ Add a step</button>
			<button type="button" class="rounded-control bg-green-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-green-600 active:scale-95 disabled:opacity-40" disabled={stages.length === 0} onclick={onRunAllRequested}>▶ Run all steps</button>
		</div>
	</header>

	<div bind:this={canvasElement} class="relative overflow-x-auto rounded-card bg-gray-800 p-4 shadow-xl sm:p-6" onscroll={measureNodes}>
		<div class="relative flex min-w-max gap-16 sm:gap-24">
			{#each mapColumns as mapColumn, columnPosition (mapColumn.columnLevel)}
				<div class="flex w-52 flex-col justify-center gap-4 sm:w-60">
					<p class="text-[11px] font-bold uppercase tracking-widest text-gray-500">{mapColumn.columnLevel === 0 ? 'Sources' : `Stage ${mapColumn.columnLevel}`}</p>
					{#each mapColumn.nodeIds as nodeId, nodePosition (nodeId)}
						{@const workflowFile = fileFor(nodeId)}
						{@const stage = stageFor(nodeId)}
						<div use:registerNode={nodeId} class="relative z-10" in:popIn={{ delay: staggerDelay(columnPosition * 3 + nodePosition, 80) }}>
							{#if workflowFile}
								<div class="flex items-center gap-2 rounded-control bg-gray-900 p-2.5 shadow-md">
									<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-sm font-extrabold text-white {fileLetterColor(workflowFile.fileLetter)}">{workflowFile.fileLetter}</span>
									<span class="min-w-0"><span class="block truncate text-sm font-semibold text-white">{shortFileName(workflowFile.overview)}</span><span class="text-xs text-gray-500">{workflowFile.overview.rowCount.toLocaleString()} rows</span></span>
								</div>
							{:else if stage}
								{@const stageLabels = labelsForStage(stage, files, stages)}
								<div class="rounded-control border-l-4 bg-gray-900 p-3 shadow-lg {stage.runSummary ? 'border-green-500' : 'border-gray-600'}">
									<p class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-green-400">Step {stage.stageNumber}<span class="normal-case tracking-normal text-gray-500">{stage.runSummary ? `${stage.runSummary.categoryCounts.matched} matched` : 'not run'}</span></p>
									<p class="mt-1 text-xs text-gray-300"><span class="text-blue-300">{stageLabels.leftLabel}</span> ↔ <span class="text-red-300">{stageLabels.rightLabel}</span></p>
									{#if stage.runSummary}
										<span class="mt-2 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-control bg-gray-700">
											{#each CATEGORY_DISPLAY_ORDER as category (category)}
												<span class="h-full {CATEGORY_STYLES[category].solidBackgroundClass}" style="flex-grow: {stage.runSummary.categoryCounts[category]}"></span>
											{/each}
										</span>
									{/if}
									<div class="mt-2.5 flex flex-wrap gap-1.5">
										<button type="button" class="rounded-control bg-blue-500 px-2 py-1 text-xs font-bold text-white transition-all hover:bg-blue-600 active:scale-90" onclick={() => onStageLinksRequested(stage.stageId)}>🔗 Links</button>
										{#if stage.runSummary}<button type="button" class="rounded-control bg-green-500 px-2 py-1 text-xs font-bold text-white transition-all hover:bg-green-600 active:scale-90" onclick={() => onStageResultsRequested(stage.stageId)}>Results</button>{/if}
										<button type="button" class="ml-auto rounded-control px-2 py-1 text-xs font-bold transition-all active:scale-90 {stageIdAwaitingDeleteConfirmation === stage.stageId ? 'bg-red-400 text-white' : 'text-red-400 hover:bg-gray-700'}" onclick={() => requestDelete(stage.stageId)}>
											{stageIdAwaitingDeleteConfirmation === stage.stageId ? describeDeletion(stage.stageId) : 'Delete'}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
					{#if columnPosition === mapColumns.length - 1}
						<button type="button" class="rounded-control border-2 border-dashed border-gray-600 p-3 text-sm font-bold text-gray-400 transition-all hover:border-green-500 hover:text-white active:scale-95" onclick={onAddStepRequested} in:popIn={{ delay: 300 }}>+ Next step</button>
					{/if}
				</div>
			{/each}
		</div>

		<svg class="pointer-events-none absolute left-0 top-0 h-full overflow-visible" style="width: {canvasElement?.scrollWidth ?? 0}px" aria-hidden="true">
			{#each mapEdges as mapEdge (mapEdge.edgeId)}
				{@const fromBox = nodeBoxesById[mapEdge.fromNodeId]}
				{@const toBox = nodeBoxesById[mapEdge.toNodeId]}
				{#if fromBox && toBox}
					{@const startPoint = { x: fromBox.right, y: fromBox.middleY }}
					{@const endPoint = { x: toBox.left, y: toBox.middleY + (mapEdge.sideLabel === 'compare' ? -8 : 8) }}
					{@const labelPoint = findCurvePoint(startPoint, endPoint, 0.5)}
					<path d={buildCurvedLinkPath(startPoint, endPoint)} fill="none" stroke-width="3" class={mapEdge.sideLabel === 'compare' ? 'stroke-blue-500' : 'stroke-red-400'} />
					<path d={buildCurvedLinkPath(startPoint, endPoint)} fill="none" stroke-width="3" stroke-linecap="round" class="flow-dashes stroke-white" />
					<circle cx={endPoint.x} cy={endPoint.y} r="4" class={mapEdge.sideLabel === 'compare' ? 'fill-blue-500' : 'fill-red-400'} />
					{#if mapEdge.edgeLabel}
						<g>
							<rect x={labelPoint.x - mapEdge.edgeLabel.length * 3.2 - 6} y={labelPoint.y - 9} width={mapEdge.edgeLabel.length * 6.4 + 12} height="18" rx="3" class="fill-orange-400" />
							<text x={labelPoint.x} y={labelPoint.y + 4} text-anchor="middle" class="fill-gray-900 text-[11px] font-bold">{mapEdge.edgeLabel}</text>
						</g>
					{/if}
				{/if}
			{/each}
		</svg>
	</div>
</section>

<style>
	.flow-dashes {
		stroke-dasharray: 2 18;
		animation: data-flow 1.2s linear infinite;
	}
	@keyframes data-flow {
		to { stroke-dashoffset: -20; }
	}
</style>
