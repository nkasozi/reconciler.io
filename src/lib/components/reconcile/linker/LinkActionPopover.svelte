<script lang="ts">
	import { popIn } from '../motion';
	import type { LinkRole, ScreenPoint } from './linkerModel';

	type LinkActionPopoverProps = {
		anchorPoint: ScreenPoint;
		containerWidth: number;
		linkTitle: string;
		role: LinkRole;
		isSuggested: boolean;
		onUnlinked: () => boolean;
		onRoleChanged: (newRole: LinkRole) => boolean;
		onKept: () => boolean;
		onSettingsOpened: () => boolean;
	};

	let { anchorPoint, containerWidth, linkTitle, role, isSuggested, onUnlinked, onRoleChanged, onKept, onSettingsOpened }: LinkActionPopoverProps = $props();
	const POPOVER_WIDTH_IN_PIXELS = 236;
	const GAP_BELOW_POINTER_IN_PIXELS = 14;

	let popoverLeft = $derived(Math.min(Math.max(0, anchorPoint.x - POPOVER_WIDTH_IN_PIXELS / 2), Math.max(0, containerWidth - POPOVER_WIDTH_IN_PIXELS)));
	let arrowLeft = $derived(Math.min(Math.max(14, anchorPoint.x - popoverLeft), POPOVER_WIDTH_IN_PIXELS - 14));
	let oppositeRole = $derived<LinkRole>(role === 'pair' ? 'check' : 'pair');
</script>

<div data-link-popover class="absolute z-30" style="left: {popoverLeft}px; top: {anchorPoint.y + GAP_BELOW_POINTER_IN_PIXELS}px; width: {POPOVER_WIDTH_IN_PIXELS}px" in:popIn={{ duration: 360 }} out:popIn={{ duration: 160 }} role="dialog" aria-label="Link options">
	<span class="absolute -top-1.5 h-3 w-3 rotate-45 bg-gray-950" style="left: {arrowLeft - 6}px"></span>
	<div class="relative rounded-card bg-gray-950 p-2 shadow-2xl ring-1 ring-gray-700">
		<p class="truncate px-1 pb-1.5 text-xs font-bold text-white">{linkTitle}</p>
		<div class="grid grid-cols-2 gap-1.5">
			<button type="button" class="col-span-2 flex items-center justify-center gap-1.5 rounded-control bg-red-400 py-2 text-sm font-extrabold text-white transition-all hover:bg-red-500 active:scale-95" onclick={onUnlinked}>
				<svg class="snip-icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
					<circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.6 20 18M8.6 16.4 20 6" />
				</svg>
				Unlink
			</button>
			{#if isSuggested}
				<button type="button" class="col-span-2 rounded-control bg-green-500 py-1.5 text-xs font-bold text-white transition-all hover:bg-green-600 active:scale-95" onclick={onKept}>✓ Looks right, keep it</button>
			{/if}
			<button type="button" class="rounded-control bg-gray-800 px-2 py-1.5 text-xs font-bold text-gray-100 transition-all hover:bg-gray-700 active:scale-95" onclick={() => onRoleChanged(oppositeRole)}>
				{oppositeRole === 'pair' ? '⇄ Pair rows by it' : '✓ Just check it'}
			</button>
			<button type="button" class="rounded-control bg-gray-800 px-2 py-1.5 text-xs font-bold text-gray-100 transition-all hover:bg-gray-700 active:scale-95" onclick={onSettingsOpened}>⚙ Tolerance</button>
		</div>
		<p class="px-1 pt-1.5 text-[11px] text-gray-500">Tip: drag either end dot onto another column to move this link.</p>
	</div>
</div>

<style>
	.snip-icon {
		animation: snip 1.6s ease-in-out infinite;
	}
	@keyframes snip {
		0%, 70%, 100% { transform: rotate(0deg); }
		78% { transform: rotate(-18deg); }
		86% { transform: rotate(8deg); }
	}
	@media (prefers-reduced-motion: reduce) {
		.snip-icon { animation: none; }
	}
</style>
