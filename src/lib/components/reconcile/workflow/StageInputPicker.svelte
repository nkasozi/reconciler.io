<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ROW_FILTER_LABELS, type RowFilter, type StageInput } from '$lib/engine/workflowTypes';
	import { isMotionReduced } from '../motion';
	import type { InputSourceOption } from './workflowModel';

	type StageInputPickerProps = {
		sideTitle: string;
		stageInput: StageInput;
		sourceOptions: InputSourceOption[];
		accentClass: string;
		onInputChanged: (updatedInput: StageInput) => boolean;
	};

	let { sideTitle, stageInput, sourceOptions, accentClass, onInputChanged }: StageInputPickerProps = $props();
	const selectClass = 'w-full rounded-control border-gray-600 bg-gray-900 text-sm text-white focus:border-blue-400 focus:ring-blue-400';

	let chosenSource = $derived(sourceOptions.find((sourceOption) => sourceOption.tableId === stageInput.tableId));
	let sourceColumnNames = $derived(chosenSource?.overview?.columnNames ?? []);
	let stackedTableIds = $derived(stageInput.stackedTableIds ?? []);
	let stackableSourceOptions = $derived(sourceOptions.filter((sourceOption) => sourceOption.tableId !== stageInput.tableId && !stackedTableIds.includes(sourceOption.tableId)));

	function describeSourceOption(sourceOption: InputSourceOption): string {
		return sourceOption.overview ? `${sourceOption.optionLabel} (${sourceOption.overview.rowCount.toLocaleString()} rows)` : sourceOption.optionLabel;
	}

	function stackAnotherSource(tableIdToStack: string): boolean {
		if (!tableIdToStack) return false;
		return onInputChanged({ ...stageInput, stackedTableIds: [...stackedTableIds, tableIdToStack], summarize: null });
	}

	function unstackSource(tableIdToRemove: string): boolean {
		return onInputChanged({ ...stageInput, stackedTableIds: stackedTableIds.filter((stackedTableId) => stackedTableId !== tableIdToRemove), summarize: null });
	}
	let isAddingUp = $derived(stageInput.summarize !== null);

	function toggleColumnInList(columnIndexes: number[], columnIndex: number): number[] {
		return columnIndexes.includes(columnIndex) ? columnIndexes.filter((existingIndex) => existingIndex !== columnIndex) : [...columnIndexes, columnIndex].sort((first, second) => first - second);
	}

	function toggleGroupColumn(columnIndex: number): boolean {
		const currentSpec = stageInput.summarize ?? { groupByColumnIndexes: [], sumColumnIndexes: [] };
		return onInputChanged({ ...stageInput, summarize: { ...currentSpec, groupByColumnIndexes: toggleColumnInList(currentSpec.groupByColumnIndexes, columnIndex), sumColumnIndexes: currentSpec.sumColumnIndexes.filter((existingIndex) => existingIndex !== columnIndex) } });
	}

	function toggleSumColumn(columnIndex: number): boolean {
		const currentSpec = stageInput.summarize ?? { groupByColumnIndexes: [], sumColumnIndexes: [] };
		return onInputChanged({ ...stageInput, summarize: { ...currentSpec, sumColumnIndexes: toggleColumnInList(currentSpec.sumColumnIndexes, columnIndex), groupByColumnIndexes: currentSpec.groupByColumnIndexes.filter((existingIndex) => existingIndex !== columnIndex) } });
	}
</script>

<div class="min-w-0">
	<p class="mb-2 text-xs font-bold uppercase tracking-wider {accentClass}">{sideTitle}</p>
	<select class={selectClass} value={stageInput.tableId} onchange={(changeEvent) => onInputChanged({ tableId: changeEvent.currentTarget.value, rowFilter: 'all_rows', summarize: null, stackedTableIds: stackedTableIds.filter((stackedTableId) => stackedTableId !== changeEvent.currentTarget.value) })}>
		{#each sourceOptions as sourceOption (sourceOption.tableId)}
			<option value={sourceOption.tableId}>{describeSourceOption(sourceOption)}</option>
		{/each}
	</select>

	{#each stackedTableIds as stackedTableId (stackedTableId)}
		{@const stackedSource = sourceOptions.find((sourceOption) => sourceOption.tableId === stackedTableId)}
		<div class="mt-2 flex items-center gap-2 rounded-control bg-gray-800 py-1.5 pl-3 pr-1 text-sm text-gray-200" transition:slide={{ duration: isMotionReduced() ? 0 : 250 }}>
			<span class="font-bold text-green-400">+</span>
			<span class="min-w-0 flex-1 truncate">{stackedSource ? describeSourceOption(stackedSource) : 'Missing source'}</span>
			<button type="button" class="rounded-control px-2 text-gray-400 transition hover:bg-red-400 hover:text-white active:scale-90" aria-label="Remove this source" onclick={() => unstackSource(stackedTableId)}>×</button>
		</div>
	{/each}
	{#if stackableSourceOptions.length > 0}
		<select class="mt-2 w-full rounded-control border-dashed border-gray-600 bg-gray-800 text-xs text-gray-400 focus:border-green-500 focus:ring-green-500" value=""
			onchange={(changeEvent) => { stackAnotherSource(changeEvent.currentTarget.value); changeEvent.currentTarget.value = ''; }}>
			<option value="">＋ Combine with another source…</option>
			{#each stackableSourceOptions as sourceOption (sourceOption.tableId)}
				<option value={sourceOption.tableId}>{describeSourceOption(sourceOption)}</option>
			{/each}
		</select>
	{/if}

	{#if chosenSource?.isStepResult}
		<label class="mt-2 block text-xs text-gray-400" transition:slide={{ duration: isMotionReduced() ? 0 : 250 }}>
			Which rows?
			<select class={selectClass} value={stageInput.rowFilter} onchange={(changeEvent) => onInputChanged({ ...stageInput, rowFilter: changeEvent.currentTarget.value as RowFilter })}>
				{#each Object.entries(ROW_FILTER_LABELS) as [rowFilterValue, rowFilterLabel] (rowFilterValue)}
					<option value={rowFilterValue}>{rowFilterLabel}</option>
				{/each}
			</select>
		</label>
	{/if}

	<label class="mt-3 flex items-center gap-2 text-sm text-gray-200">
		<input type="checkbox" class="rounded-control border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" checked={isAddingUp}
			onchange={(changeEvent) => onInputChanged({ ...stageInput, summarize: changeEvent.currentTarget.checked ? { groupByColumnIndexes: [], sumColumnIndexes: [] } : null })} />
		Add up rows first <span class="hidden text-xs text-gray-500 sm:inline">(e.g. daily totals)</span>
	</label>

	{#if isAddingUp && stageInput.summarize}
		<div class="mt-2 space-y-2" transition:slide={{ duration: isMotionReduced() ? 0 : 300 }}>
			<p class="text-xs text-gray-400">One row per…</p>
			<div class="flex flex-wrap gap-1.5">
				{#each sourceColumnNames as columnName, columnIndex (columnIndex)}
					<button type="button" onclick={() => toggleGroupColumn(columnIndex)} class="rounded-control px-2 py-1 text-xs font-semibold transition-all duration-200 active:scale-90 {stageInput.summarize.groupByColumnIndexes.includes(columnIndex) ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">{columnName}</button>
				{/each}
			</div>
			<p class="text-xs text-gray-400">…adding up</p>
			<div class="flex flex-wrap gap-1.5">
				{#each sourceColumnNames as columnName, columnIndex (columnIndex)}
					{#if !stageInput.summarize.groupByColumnIndexes.includes(columnIndex)}
						<button type="button" onclick={() => toggleSumColumn(columnIndex)} class="rounded-control px-2 py-1 text-xs font-semibold transition-all duration-200 active:scale-90 {stageInput.summarize.sumColumnIndexes.includes(columnIndex) ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">Σ {columnName}</button>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
