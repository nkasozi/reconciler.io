<script lang="ts">
	interface PricingEnterprisePlanCardProperties {
		isEnterprisePlanHighlighted: boolean;
		displayedEnterprisePlanPrice: string;
		displayedBillingPeriodSuffix: string;
		onContactSales: () => void;
	}

	let {
		isEnterprisePlanHighlighted = $bindable(false),
		displayedEnterprisePlanPrice,
		displayedBillingPeriodSuffix,
		onContactSales
	}: PricingEnterprisePlanCardProperties = $props();
</script>

<div
	class={`overflow-hidden rounded-lg border border-transparent bg-white shadow-lg transition-all duration-300 dark:bg-gray-800 ${isEnterprisePlanHighlighted ? 'scale-105' : ''}`}
	on:mouseenter={() => (isEnterprisePlanHighlighted = true)}
	on:mouseleave={() => (isEnterprisePlanHighlighted = false)}
>
	<div class="border-b border-gray-200 p-6 dark:border-gray-700">
		<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Enterprise</h3>
		<div class="mb-4 flex items-end gap-1">
			<span class="text-4xl font-bold text-gray-900 dark:text-white"
				>{displayedEnterprisePlanPrice}</span
			>
			<span class="pb-1 text-gray-500 dark:text-gray-400">{displayedBillingPeriodSuffix}</span>
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			For organizations with complex reconciliation needs
		</p>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Unlimited rows and file size</span>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Custom reconciliation rules</span>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">API access & integrations</span>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Advanced reconciliation analytics</span>
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
					>Multiple concurrent reconciliations</span
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
					>Reconciliation categories with alerts</span
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Advanced configuration options</span>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Multi-user notifications</span>
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
				<span class="ml-2 text-gray-600 dark:text-gray-300">Dedicated account manager</span>
			</li>
		</ul>
		<button
			on:click={onContactSales}
			class="mt-8 w-full rounded-lg bg-gray-800 px-4 py-3 font-medium text-white transition duration-300 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
		>
			Contact Sales
		</button>
	</div>
</div>
