<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="text-center">
	<h2 class="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
		Ready to transform your data reconciliation workflow?
	</h2>
	<div class="flex flex-col justify-center gap-4 sm:flex-row">
		<button
			on:click={() => goto('/reconcile')}
			class="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition duration-300 hover:bg-blue-700"
		>
			Start Reconciling Now
		</button>
		<button
			on:click={() => goto('/pricing')}
			class="rounded-lg border border-blue-600 bg-white px-8 py-3 font-semibold text-blue-600 transition duration-300 hover:bg-gray-100 dark:border-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
		>
			View Pricing
		</button>
	</div>
</div>
