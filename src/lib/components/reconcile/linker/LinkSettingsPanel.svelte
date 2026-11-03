<script lang="ts">
	import { FIELD_KIND_LABELS } from '$lib/engine/planEditing';
	import type { AmountSignMode, FieldKind, FieldRule } from '$lib/engine/types';
	import { riseIn } from '../motion';
	import type { LinkRole } from './linkerModel';

	type LinkSettingsPanelProps = {
		rule: FieldRule;
		role: LinkRole;
		linkTitle: string;
		onRoleChanged: (newRole: LinkRole) => boolean;
		onRuleChanged: (updatedRule: FieldRule) => boolean;
		onRemoved: () => boolean;
		onClosed: () => boolean;
	};

	let { rule, role, linkTitle, onRoleChanged, onRuleChanged, onRemoved, onClosed }: LinkSettingsPanelProps = $props();
	const inputClass = 'w-full rounded-control border-gray-600 bg-gray-800 text-sm text-white focus:border-blue-400 focus:ring-blue-400';
	const signModeLabels: Record<AmountSignMode, string> = { same_sign: 'Same + / − in both', opposite_sign: 'Flipped (+ in one, − in other)', ignore_sign: 'Ignore + / −' };
	const roleOptions: { roleValue: LinkRole; roleLabel: string; roleHint: string }[] = [
		{ roleValue: 'pair', roleLabel: '🔗 Pair rows by this', roleHint: 'Rows are paired when these are the same' },
		{ roleValue: 'check', roleLabel: '✓ Check it agrees', roleHint: 'After pairing, flag rows where these differ' }
	];
</script>

<div class="mt-4 rounded-card border-l-4 bg-gray-900 p-4 shadow-xl {role === 'pair' ? 'border-green-500' : 'border-blue-500'}" in:riseIn={{ distance: 10 }}>
	<div class="mb-3 flex items-start justify-between gap-3">
		<p class="text-sm font-bold text-white">{linkTitle}</p>
		<button type="button" class="rounded-control px-2 text-lg leading-none text-gray-400 transition hover:bg-gray-700 hover:text-white" aria-label="Close link settings" onclick={onClosed}>×</button>
	</div>

	<div class="grid grid-cols-2 gap-2">
		{#each roleOptions as roleOption (roleOption.roleValue)}
			<button type="button" onclick={() => onRoleChanged(roleOption.roleValue)}
				class="rounded-control p-2.5 text-left transition-all duration-200 active:scale-95 {role === roleOption.roleValue ? (roleOption.roleValue === 'pair' ? 'bg-green-500 text-white shadow-lg' : 'bg-blue-500 text-white shadow-lg') : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}">
				<span class="block text-sm font-bold">{roleOption.roleLabel}</span>
				<span class="block text-[11px] {role === roleOption.roleValue ? 'text-gray-100' : 'text-gray-500'}">{roleOption.roleHint}</span>
			</button>
		{/each}
	</div>

	<div class="mt-3 flex flex-wrap items-end gap-3">
		<label class="block text-xs text-gray-400">
			Treat values as
			<select class={inputClass} value={rule.fieldKind} onchange={(changeEvent) => onRuleChanged({ ...rule, fieldKind: changeEvent.currentTarget.value as FieldKind })}>
				{#each Object.entries(FIELD_KIND_LABELS) as [fieldKindValue, fieldKindLabel] (fieldKindValue)}
					<option value={fieldKindValue}>{fieldKindLabel}</option>
				{/each}
			</select>
		</label>
		{#if rule.fieldKind === 'amount'}
			{#if role === 'check'}
				<label class="block w-32 text-xs text-gray-400">Allowed difference
					<input type="number" min="0" step="0.01" class={inputClass} value={rule.amountTolerance} onchange={(changeEvent) => onRuleChanged({ ...rule, amountTolerance: Math.max(0, Number(changeEvent.currentTarget.value) || 0) })} />
				</label>
			{/if}
			<label class="block text-xs text-gray-400">Signs
				<select class={inputClass} value={rule.amountSignMode} onchange={(changeEvent) => onRuleChanged({ ...rule, amountSignMode: changeEvent.currentTarget.value as AmountSignMode })}>
					{#each Object.entries(signModeLabels) as [signModeValue, signModeLabel] (signModeValue)}
						<option value={signModeValue}>{signModeLabel}</option>
					{/each}
				</select>
			</label>
		{:else if rule.fieldKind === 'date' && role === 'check'}
			<label class="block w-32 text-xs text-gray-400">Allowed days apart
				<input type="number" min="0" step="1" class={inputClass} value={rule.dateToleranceDays} onchange={(changeEvent) => onRuleChanged({ ...rule, dateToleranceDays: Math.max(0, Math.round(Number(changeEvent.currentTarget.value) || 0)) })} />
			</label>
		{:else if rule.fieldKind === 'text' && role === 'check'}
			<label class="block w-32 text-xs text-gray-400">How similar (%)
				<input type="number" min="1" max="100" step="5" class={inputClass} value={rule.textSimilarityPercent} onchange={(changeEvent) => onRuleChanged({ ...rule, textSimilarityPercent: Math.min(100, Math.max(1, Number(changeEvent.currentTarget.value) || 100)) })} />
			</label>
		{/if}
		<button type="button" class="ml-auto rounded-control px-3 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-400 hover:text-white active:scale-90" onclick={onRemoved}>Unlink</button>
	</div>
</div>
