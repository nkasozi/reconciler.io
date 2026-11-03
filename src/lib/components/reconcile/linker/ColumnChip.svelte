<script lang="ts">
	import type { ColumnRole } from '$lib/engine/columnRoles';
	import { ROLE_ICONS, type LinkRole } from './linkerModel';

	type ColumnChipProps = {
		side: 'left' | 'right';
		encodedValue: string;
		columnLabel: string;
		sampleValue: string;
		columnRole: ColumnRole;
		linkRoles: LinkRole[];
		isArmed: boolean;
		isTargetHighlighted: boolean;
		registerChip: (chipKey: string, chipElement: HTMLElement | null) => boolean;
		onChipPointerDown: (pointerEvent: PointerEvent) => boolean;
		onChipActivated: () => boolean;
	};

	let { side, encodedValue, columnLabel, sampleValue, columnRole, linkRoles, isArmed, isTargetHighlighted, registerChip, onChipPointerDown, onChipActivated }: ColumnChipProps = $props();
	let chipElement: HTMLElement | undefined = $state();

	$effect(() => {
		registerChip(`${side}|${encodedValue}`, chipElement ?? null);
		return () => registerChip(`${side}|${encodedValue}`, null);
	});

	let isPairColumn = $derived(linkRoles.includes('pair'));
	let isLinked = $derived(linkRoles.length > 0);
</script>

<button
	bind:this={chipElement}
	type="button"
	data-linker-side={side}
	data-linker-value={encodedValue}
	onpointerdown={onChipPointerDown}
	onclick={onChipActivated}
	class="relative flex w-full select-none items-center gap-2 rounded-control px-2.5 py-2 text-left transition-all duration-200 ease-[var(--ease-spring)] active:scale-95
		{isArmed ? 'z-10 scale-[1.04] bg-blue-500 text-white shadow-xl' : isTargetHighlighted ? 'animate-soft-pulse bg-gray-700 text-white ring-2 ring-blue-400' : isPairColumn ? 'bg-green-500 text-white shadow-md' : isLinked ? 'bg-gray-700 text-white ring-2 ring-blue-500' : 'bg-gray-900 text-gray-200 hover:bg-gray-700'}"
>
	<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-xs font-bold {isArmed || isPairColumn ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-300'}">{ROLE_ICONS[columnRole]}</span>
	<span class="min-w-0 flex-1">
		<span class="block truncate text-xs font-semibold sm:text-sm">{columnLabel}</span>
		{#if sampleValue}<span class="block truncate text-[11px] {isArmed || isPairColumn ? 'text-gray-100' : 'text-gray-500'}">{sampleValue}</span>{/if}
	</span>
	{#if !isLinked}
		<span class="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-gray-900 transition-all duration-200
			{side === 'left' ? '-right-1.5' : '-left-1.5'}
			{isArmed ? 'scale-125 bg-white' : 'bg-gray-600'}"></span>
	{/if}
</button>
