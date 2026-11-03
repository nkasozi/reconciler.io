<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { GridCell, GridRow } from '$lib/engine/resultGrid';
	import { isMotionReduced } from '../motion';
	import { GRID_CELL_CLASSES, ROW_STATUS_CLASSES, ROW_STATUS_LABELS } from './resultTableStyles';

	type ResultTableRowProps = {
		gridRow: GridRow;
		leftColumnCount: number;
		rightColumnCount: number;
		isExpanded: boolean;
		highlightedExplanation: string | null;
		onRowToggled: (explanationToHighlight: string | null) => boolean;
	};

	let { gridRow, leftColumnCount, rightColumnCount, isExpanded, highlightedExplanation, onRowToggled }: ResultTableRowProps = $props();
	let totalColumnCount = $derived(leftColumnCount + rightColumnCount + 3);

	function emptyCells(columnCount: number): GridCell[] {
		return Array.from({ length: columnCount }, () => ({ cellText: '', cellState: 'plain' as const, explanation: '' }));
	}

	function clickCell(clickEvent: MouseEvent, gridCell: GridCell): boolean {
		if (gridCell.cellState === 'plain') return false;
		clickEvent.stopPropagation();
		return onRowToggled(isExpanded && highlightedExplanation === gridCell.explanation ? null : gridCell.explanation);
	}
</script>

<tr class="group cursor-pointer border-b border-gray-800 transition-colors duration-150 {isExpanded ? 'bg-gray-800' : 'hover:bg-gray-800'}" onclick={() => onRowToggled(null)}>
	<td class="sticky left-0 z-10 border-r border-gray-700 px-2 py-1.5 {isExpanded ? 'bg-gray-800' : 'bg-gray-900 group-hover:bg-gray-800'}">
		<span class="flex items-center gap-1.5">
			<span class="inline-block whitespace-nowrap rounded-control px-1.5 py-0.5 text-[11px] font-bold {ROW_STATUS_CLASSES[gridRow.rowStatus]}">{ROW_STATUS_LABELS[gridRow.rowStatus]}</span>
			<span class="text-xs text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}" aria-hidden="true">›</span>
		</span>
	</td>
	<td class="border-r border-gray-800 bg-gray-950 px-2 py-1.5 text-right text-xs tabular-nums text-blue-300">{gridRow.leftRowNumber ?? ''}</td>
	{#each gridRow.leftCells ?? emptyCells(leftColumnCount) as gridCell, columnIndex (columnIndex)}
		<td class="max-w-56 truncate whitespace-nowrap border-r border-gray-800 px-2 py-1.5 text-xs {gridRow.leftCells ? GRID_CELL_CLASSES[gridCell.cellState] : 'bg-gray-950'}" title={gridCell.explanation || gridCell.cellText} onclick={(clickEvent) => clickCell(clickEvent, gridCell)}>{gridCell.cellText}</td>
	{/each}
	<td class="border-l-4 border-r border-l-gray-600 border-r-gray-800 bg-gray-950 px-2 py-1.5 text-right text-xs tabular-nums text-red-300">{gridRow.rightRowNumber ?? ''}</td>
	{#each gridRow.rightCells ?? emptyCells(rightColumnCount) as gridCell, columnIndex (columnIndex)}
		<td class="max-w-56 truncate whitespace-nowrap border-r border-gray-800 px-2 py-1.5 text-xs {gridRow.rightCells ? GRID_CELL_CLASSES[gridCell.cellState] : 'bg-gray-950'}" title={gridCell.explanation || gridCell.cellText} onclick={(clickEvent) => clickCell(clickEvent, gridCell)}>{gridCell.cellText}</td>
	{/each}
</tr>
{#if isExpanded}
	<tr class="bg-gray-800">
		<td colspan={totalColumnCount} class="p-0">
			<div class="sticky left-0 w-[min(100vw-2rem,56rem)] px-3 pb-3 pt-1" transition:slide={{ duration: isMotionReduced() ? 0 : 220 }}>
				<p class="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Why</p>
				<ul class="space-y-1.5">
					{#each gridRow.reasons as reason (reason)}
						<li class="flex gap-2 rounded-control px-2 py-1.5 text-sm transition-colors duration-300 {highlightedExplanation === reason ? 'bg-gray-950 text-white ring-2 ring-orange-400' : 'bg-gray-900 text-gray-200'}">
							<span class="shrink-0 font-bold {reason.startsWith('Paired') || reason.includes('agrees') ? 'text-green-400' : 'text-orange-400'}">{reason.startsWith('Paired') || reason.includes('agrees') ? '✓' : '!'}</span>
							<span>{reason}</span>
						</li>
					{/each}
				</ul>
			</div>
		</td>
	</tr>
{/if}
