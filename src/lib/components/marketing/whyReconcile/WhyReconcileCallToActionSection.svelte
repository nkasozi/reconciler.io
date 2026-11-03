<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div
	class="mx-auto mb-10 max-w-4xl rounded-xl bg-blue-600 p-10 text-center shadow-xl dark:bg-blue-700"
>
	<h2 class="mb-4 text-3xl font-bold text-white">
		Ready to Transform Your Reconciliation Process?
	</h2>
	<p class="mx-auto mb-8 max-w-xl text-lg text-blue-100">
		Join thousands of companies who have simplified their data reconciliation with our powerful,
		easy-to-use platform.
	</p>
	<div class="flex flex-col justify-center gap-4 sm:flex-row">
		<button
			on:click={() => goto('/reconcile')}
			class="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition duration-300 hover:bg-gray-100"
		>
			Start Free Trial
		</button>
		<button
			on:click={() => goto('/pricing')}
			class="rounded-lg border border-white bg-transparent px-8 py-3 font-semibold text-white transition duration-300 hover:bg-blue-700"
		>
			View Pricing
		</button>
	</div>
</div>
