<script lang="ts">
	interface PricingProPlanCardProperties {
		isProPlanHighlighted: boolean;
		displayedProPlanPrice: string;
		displayedBillingPeriodSuffix: string;
		onRequestProPlanTrial: () => void;
	}

	let {
		isProPlanHighlighted = $bindable(false),
		displayedProPlanPrice,
		displayedBillingPeriodSuffix,
		onRequestProPlanTrial
	}: PricingProPlanCardProperties = $props();
</script>

<div
	class={`transform overflow-hidden rounded-lg bg-white shadow-xl transition-all duration-300 dark:bg-gray-800 ${isProPlanHighlighted ? 'scale-105' : ''} border-2 border-blue-500`}
	on:mouseenter={() => (isProPlanHighlighted = true)}
	on:mouseleave={() => (isProPlanHighlighted = false)}
>
	<div class="bg-blue-500 px-4 py-2 text-center text-sm font-semibold text-white">MOST POPULAR</div>
	<div class="border-b border-gray-200 p-6 dark:border-gray-700">
		<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Pro</h3>
		<div class="mb-4 flex items-end gap-1">
			<span class="text-4xl font-bold text-gray-900 dark:text-white">{displayedProPlanPrice}</span>
			<span class="pb-1 text-gray-500 dark:text-gray-400">{displayedBillingPeriodSuffix}</span>
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-300">For teams that need advanced features</p>
	</div>
	<div class="p-6">
		<ul class="space-y-3">
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Up to 10,000,000 rows per file</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Advanced column mapping</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Support for all file formats</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Interactive failure analysis</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Reverse reconciliation</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300"
					>Duplicate handling in comparison files</span
				>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300"
					>Continuous comparison after failures</span
				>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Results history</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Priority email support</span>
			</li>
		</ul>
		<button
			on:click={onRequestProPlanTrial}
			class="mt-8 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition duration-300 hover:bg-blue-700"
		>
			Start Pro Trial
		</button>
	</div>
</div>
