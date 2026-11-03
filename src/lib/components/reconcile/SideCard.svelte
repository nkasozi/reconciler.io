<script lang="ts">
	import type { Snippet } from 'svelte';

	type SideCardProps = {
		side: 'left' | 'right';
		children: Snippet;
	};

	let { side, children }: SideCardProps = $props();
	let accentBarClass = $derived(side === 'left' ? 'bg-blue-500' : 'bg-red-400');
</script>

<div class="flex min-w-0 flex-col overflow-hidden rounded-card bg-gray-800 shadow-xl ring-1 ring-gray-700 {side === 'left' ? 'col-start-1' : 'col-start-3'} row-start-1">
	<span class="h-1 w-full shrink-0 {accentBarClass}"></span>
	<div class="flex flex-1 flex-col gap-3 p-2.5 sm:p-4">
		{@render children()}
	</div>
</div>
