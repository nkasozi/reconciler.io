<script lang="ts">
	import { ACCOUNTING_SYSTEM_SIGNATURES } from '$lib/engine/accountingSystems';

	let chosenSystemName = $state(ACCOUNTING_SYSTEM_SIGNATURES[0].systemName);
	let chosenSignature = $derived(ACCOUNTING_SYSTEM_SIGNATURES.find((signature) => signature.systemName === chosenSystemName));
</script>

<details class="group rounded-card bg-gray-800 p-4 transition-colors duration-300 open:bg-gray-800">
	<summary class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-blue-300 marker:hidden">
		<span class="inline-flex h-5 w-5 items-center justify-center rounded-control bg-blue-500 text-white transition-transform duration-300 ease-[var(--ease-spring)] group-open:rotate-90">›</span> Where do I get these files?
	</summary>
	<div class="mt-3 space-y-3 text-sm text-gray-300">
		<p>Export from your accounting software, bank, POS or mobile money as <strong>Excel, CSV, OFX/QFX or QIF</strong>. PDFs and photos of statements work too, but take longer and are less exact. Don't tidy them up — we skip report titles, blank lines and total rows for you.</p>
		<label class="block text-xs text-gray-400">
			Pick your system for instructions
			<select class="mt-1 w-full rounded-control border-gray-600 bg-gray-900 text-sm text-white sm:w-72" bind:value={chosenSystemName}>
				{#each ACCOUNTING_SYSTEM_SIGNATURES as signature (signature.systemName)}
					<option value={signature.systemName}>{signature.systemName}</option>
				{/each}
			</select>
		</label>
		{#if chosenSignature}
			{#key chosenSignature.systemName}<p class="details-reveal rounded-control border-l-4 border-green-500 bg-gray-900 p-3 text-gray-200">{chosenSignature.exportHint}</p>{/key}
		{/if}
	</div>
</details>

<style>
	.details-reveal {
		animation: hint-reveal 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	@keyframes hint-reveal {
		from { opacity: 0; transform: translateY(6px); }
	}
</style>
