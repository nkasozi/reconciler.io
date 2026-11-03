<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { MatchPlan } from '$lib/engine/types';
	import type { StageInput } from '$lib/engine/workflowTypes';
	import ColumnLinker from '../linker/ColumnLinker.svelte';
	import { isMotionReduced, riseIn } from '../motion';
	import SideCard from '../SideCard.svelte';
	import StageInputPicker from './StageInputPicker.svelte';
	import { labelsForStage, listInputSources, type StageState, type WorkflowFile } from './workflowModel';

	type StageSetupScreenProps = {
		stage: StageState;
		files: WorkflowFile[];
		stages: StageState[];
		isSuggesting: boolean;
		onInputsChanged: (leftInput: StageInput, rightInput: StageInput) => boolean;
		onPlanChanged: (updatedPlan: MatchPlan) => boolean;
		onRuleConfirmed: (ruleId: string) => boolean;
		onAllSuggestionsConfirmed: () => boolean;
		onRunRequested: () => boolean;
	};

	let { stage, files, stages, isSuggesting, onInputsChanged, onPlanChanged, onRuleConfirmed, onAllSuggestionsConfirmed, onRunRequested }: StageSetupScreenProps = $props();

	let stageLabels = $derived(labelsForStage(stage, files, stages));
	let sourceOptions = $derived(listInputSources(files, stages, stage.stageNumber));
	let hasPairLink = $derived(stage.plan.keyRules.length > 0);
	let hasSuggestions = $derived(stage.suggestedRuleIds.length > 0);
	let linkedFieldKinds = $derived(new Set([...stage.plan.keyRules, ...stage.plan.compareRules].map((rule) => rule.fieldKind)));
	let hasAmountAndDateLinks = $derived(linkedFieldKinds.has('amount') && linkedFieldKinds.has('date'));
</script>

<section class="space-y-4">
	<header in:riseIn>
		<p class="text-xs font-bold uppercase tracking-widest text-green-400">Step {stage.stageNumber}</p>
		<h2 class="text-2xl font-extrabold text-white sm:text-3xl">Which columns belong together?</h2>
		<p class="mt-1 text-sm text-gray-400">Drag from a column on one side to its partner on the other — or tap one, then the other. <span class="text-green-400">Green</span> links pair the rows; <span class="text-blue-400">blue</span> links check the values agree.</p>
	</header>

	{#snippet leftPicker()}
		<StageInputPicker sideTitle="Compare" stageInput={stage.leftInput} {sourceOptions} accentClass="text-blue-300" onInputChanged={(updatedInput) => onInputsChanged(updatedInput, stage.rightInput)} />
	{/snippet}
	{#snippet rightPicker()}
		<StageInputPicker sideTitle="Against" stageInput={stage.rightInput} {sourceOptions} accentClass="text-red-300" onInputChanged={(updatedInput) => onInputsChanged(stage.leftInput, updatedInput)} />
	{/snippet}

	{#if hasSuggestions && !isSuggesting}
		<div class="flex flex-col gap-3 rounded-card border-l-4 border-orange-400 bg-gray-800 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between" transition:slide={{ duration: isMotionReduced() ? 0 : 300 }}>
			<p class="text-sm text-gray-200">
				<strong class="text-white">We linked these for you{stage.confidenceLevel === 'low' ? ', but we are not sure' : ''}.</strong>
				Dashed lines are suggestions — tap one to change it, or confirm them all.
			</p>
			<button type="button" class="shrink-0 rounded-control bg-orange-400 px-4 py-2 text-sm font-bold text-gray-900 shadow transition-all hover:bg-orange-300 active:scale-95" onclick={onAllSuggestionsConfirmed}>✓ Looks right</button>
		</div>
	{/if}

	<div in:riseIn={{ delay: 120 }}>
		{#if isSuggesting || !stage.leftOverview || !stage.rightOverview}
			<div class="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]" aria-busy="true">
				{#each [{ side: 'left' as const, header: leftPicker }, { side: 'right' as const, header: rightPicker }] as skeletonSide (skeletonSide.side)}
					<SideCard side={skeletonSide.side}>
						{@render skeletonSide.header()}
						<div class="space-y-2 border-t border-gray-700 pt-3">
							{#each Array.from({ length: 5 }) as _, skeletonRow (skeletonRow)}
								<div class="h-11 animate-pulse rounded-control bg-gray-700" style="animation-delay: {skeletonRow * 90}ms"></div>
							{/each}
						</div>
					</SideCard>
				{/each}
			</div>
		{:else}
			<ColumnLinker plan={stage.plan} leftOverview={stage.leftOverview} rightOverview={stage.rightOverview} leftLabel={stageLabels.leftLabel} rightLabel={stageLabels.rightLabel}
				suggestedRuleIds={stage.suggestedRuleIds} {onPlanChanged} {onRuleConfirmed} leftHeader={leftPicker} rightHeader={rightPicker} />
		{/if}
	</div>

	{#if hasAmountAndDateLinks}
		<label class="flex items-start gap-3 rounded-card bg-gray-800 p-4 text-sm text-gray-200" in:riseIn={{ delay: 220 }}>
			<input type="checkbox" class="mt-0.5 rounded-control border-gray-600 bg-gray-900 text-green-500 focus:ring-green-500" checked={stage.plan.fallbackMatching.isEnabled}
				onchange={(changeEvent) => onPlanChanged({ ...stage.plan, fallbackMatching: { ...stage.plan.fallbackMatching, isEnabled: changeEvent.currentTarget.checked } })} />
			<span>For rows that still don't pair up, try pairing by <strong>same amount</strong> within
				<input type="number" min="0" max="60" class="mx-1 inline w-16 rounded-control border-gray-600 bg-gray-900 px-2 py-0.5 text-sm text-white" value={stage.plan.fallbackMatching.dateWindowDays}
					onchange={(changeEvent) => onPlanChanged({ ...stage.plan, fallbackMatching: { ...stage.plan.fallbackMatching, dateWindowDays: Math.max(0, Number(changeEvent.currentTarget.value) || 0) } })} />
				days and mark them for review.</span>
		</label>
	{/if}

	<div class="sticky bottom-4 z-20 flex flex-col items-center gap-2 sm:flex-row sm:justify-end">
		{#if !hasPairLink && !isSuggesting}<span class="rounded-control bg-gray-900 px-3 py-1.5 text-sm text-orange-300 shadow-lg" transition:slide>Tap a link and choose ⇄ “Pair rows by it”.</span>{/if}
		<button type="button" disabled={!hasPairLink || isSuggesting} onclick={onRunRequested}
			class="w-full rounded-control bg-green-500 px-8 py-4 text-lg font-extrabold text-white shadow-2xl shadow-black/50 transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:bg-green-600 active:scale-95 disabled:translate-y-0 disabled:bg-gray-700 disabled:text-gray-400 sm:w-auto">
			Match them →
		</button>
	</div>
</section>
