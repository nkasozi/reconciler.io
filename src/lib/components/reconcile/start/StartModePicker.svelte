<script lang="ts">
	import { popIn, riseIn, staggerDelay } from '../motion';
	import { START_MODE_OPTIONS, type DiagramPiece, type StartMode } from './startModes';

	type StartModePickerProps = {
		chosenStartMode: StartMode;
		onStartModeChosen: (startMode: StartMode) => boolean;
	};

	let { chosenStartMode, onStartModeChosen }: StartModePickerProps = $props();

	function pieceClass(diagramPiece: DiagramPiece, isChosen: boolean): string {
		switch (diagramPiece.pieceKind) {
			case 'file':
				return `h-6 w-6 rounded-control text-[11px] font-extrabold text-white ${isChosen ? 'bg-blue-500' : 'bg-gray-600'}`;
			case 'result':
				return `h-6 w-6 rounded-full text-[11px] font-extrabold text-white ${isChosen ? 'bg-green-500' : 'bg-gray-600'}`;
			case 'link':
				return `diagram-link text-sm font-bold ${isChosen ? 'text-green-400' : 'text-gray-500'}`;
			case 'arrow':
				return `diagram-arrow text-sm font-bold ${isChosen ? 'text-orange-400' : 'text-gray-500'}`;
		}
	}
</script>

<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3" role="radiogroup" aria-label="What are you matching?">
	{#each START_MODE_OPTIONS as modeOption, optionPosition (modeOption.startMode)}
		{@const isChosen = modeOption.startMode === chosenStartMode}
		<button type="button" role="radio" aria-checked={isChosen} onclick={() => onStartModeChosen(modeOption.startMode)} in:riseIn={{ delay: staggerDelay(optionPosition, 150) }}
			class="relative flex flex-col gap-2 rounded-card p-3.5 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] sm:p-4
				{isChosen ? 'bg-gray-800 shadow-xl ring-2 ring-green-500 sm:-translate-y-1' : 'bg-gray-800 ring-1 ring-gray-700 hover:-translate-y-0.5 hover:ring-gray-500'}">
			{#if isChosen}
				<span class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[11px] font-bold text-white" in:popIn={{ duration: 360 }}>✓</span>
			{/if}
			<span class="flex items-center gap-1 {isChosen ? 'is-chosen' : ''}" aria-hidden="true">
				{#each modeOption.diagramPieces as diagramPiece, piecePosition (piecePosition)}
					<span class="flex items-center justify-center transition-colors duration-300 {pieceClass(diagramPiece, isChosen)}" style="animation-delay: {piecePosition * 120}ms">{diagramPiece.pieceText}</span>
				{/each}
			</span>
			<span>
				<strong class="block text-sm text-white sm:text-base">{modeOption.optionTitle}</strong>
				<span class="hidden text-xs text-gray-300 sm:block sm:text-sm">{modeOption.optionSummary}</span>
				<span class="mt-0.5 block text-xs text-gray-400 sm:mt-1 sm:text-gray-500">{modeOption.exampleText}</span>
			</span>
		</button>
	{/each}
</div>

<style>
	.is-chosen .diagram-link {
		animation: link-pulse 1.4s ease-in-out infinite;
	}
	.is-chosen .diagram-arrow {
		animation: arrow-nudge 1.4s ease-in-out infinite;
	}
	@keyframes link-pulse {
		50% { transform: scale(1.35); }
	}
	@keyframes arrow-nudge {
		50% { transform: translateX(3px); }
	}
</style>
