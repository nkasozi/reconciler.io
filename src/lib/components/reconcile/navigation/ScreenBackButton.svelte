<script lang="ts">
	import { riseIn } from '../motion';

	type ScreenBackButtonProps = {
		backLabel: string;
		onBackRequested: () => boolean;
	};

	let { backLabel, onBackRequested }: ScreenBackButtonProps = $props();
</script>

<button type="button" onclick={onBackRequested} in:riseIn={{ distance: 6, duration: 300 }}
	class="group mb-3 inline-flex items-center gap-2 rounded-control py-1.5 pl-1.5 pr-3 text-sm font-semibold text-gray-300 transition-all duration-200 hover:bg-gray-800 hover:text-white active:scale-95">
	<span class="flex h-7 w-7 items-center justify-center rounded-control bg-gray-800 text-base transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-translate-x-1 group-hover:bg-gray-700" aria-hidden="true">←</span>
	{backLabel}
</button>
