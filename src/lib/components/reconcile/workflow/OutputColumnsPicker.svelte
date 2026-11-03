<script lang="ts">
	import { slide } from 'svelte/transition';
	import { buildDefaultOutputColumns } from '$lib/engine/stageTables';
	import type { DataTable } from '$lib/engine/types';
	import type { OutputColumn, TableLabels } from '$lib/engine/workflowTypes';
	import type { TableOverview } from '$lib/engine/workerProtocol';
	import { isMotionReduced, riseIn } from '../motion';

	type OutputColumnsPickerProps = {
		stageNumber: number;
		leftOverview: TableOverview;
		rightOverview: TableOverview;
		labels: TableLabels;
		chosenOutputColumns: OutputColumn[] | null;
		onOutputColumnsChanged: (updatedOutputColumns: OutputColumn[]) => boolean;
	};

	let { stageNumber, leftOverview, rightOverview, labels, chosenOutputColumns, onOutputColumnsChanged }: OutputColumnsPickerProps = $props();
	let isOpen = $state(false);

	let availableOutputColumns = $derived(buildDefaultOutputColumns(leftOverview as unknown as DataTable, rightOverview as unknown as DataTable, labels, stageNumber));
	let chosenOutputNames = $derived(new Set((chosenOutputColumns ?? availableOutputColumns).map((outputColumn) => outputColumn.outputName)));

	function toggleOutputColumn(outputName: string): boolean {
		const updatedOutputColumns = availableOutputColumns.filter((outputColumn) => (outputColumn.outputName === outputName ? !chosenOutputNames.has(outputName) : chosenOutputNames.has(outputColumn.outputName)));
		return onOutputColumnsChanged(updatedOutputColumns.length > 0 ? updatedOutputColumns : availableOutputColumns.slice(0, 1));
	}

	function chipColor(outputColumn: OutputColumn): string {
		if (!chosenOutputNames.has(outputColumn.outputName)) return 'bg-gray-900 text-gray-500 line-through hover:bg-gray-700';
		switch (outputColumn.sourceSide) {
			case 'result':
				return 'bg-green-500 text-white';
			case 'left':
				return 'bg-blue-500 text-white';
			case 'right':
				return 'bg-red-400 text-white';
		}
	}
</script>

<section class="mt-4 rounded-card bg-gray-800 p-4 shadow-xl" in:riseIn={{ delay: 260 }}>
	<button type="button" class="flex w-full items-center justify-between gap-3 text-left" onclick={() => (isOpen = !isOpen)}>
		<span>
			<span class="block text-base font-bold text-white">Result table for the next step</span>
			<span class="block text-sm text-gray-400">{chosenOutputNames.size} of {availableOutputColumns.length} columns kept — use this result in another step to match it against more files.</span>
		</span>
		<span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-blue-500 text-white transition-transform duration-300 ease-[var(--ease-spring)] {isOpen ? 'rotate-90' : ''}">›</span>
	</button>
	{#if isOpen}
		<div class="mt-3 flex flex-wrap gap-1.5" transition:slide={{ duration: isMotionReduced() ? 0 : 320 }}>
			{#each availableOutputColumns as outputColumn (outputColumn.outputName)}
				<button type="button" onclick={() => toggleOutputColumn(outputColumn.outputName)}
					class="rounded-control px-2.5 py-1 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-90 {chipColor(outputColumn)}">
					{outputColumn.outputName}
				</button>
			{/each}
		</div>
	{/if}
</section>
