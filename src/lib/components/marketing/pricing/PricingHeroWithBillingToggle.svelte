<script lang="ts">
	interface PricingHeroWithBillingToggleProperties {
		isAnnualBillingSelected: boolean;
		onToggleBillingPeriod: () => void;
	}

	let { isAnnualBillingSelected, onToggleBillingPeriod }: PricingHeroWithBillingToggleProperties =
		$props();
</script>

<div class="mb-16 text-center">
	<h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
		Simple, Transparent <span class="text-blue-600 dark:text-blue-400">Pricing</span>
	</h1>
	<p class="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
		Choose the plan that works best for your reconciliation needs
	</p>

	<div class="mt-8 flex items-center justify-center">
		<span
			class={`text-sm ${!isAnnualBillingSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
			>Monthly</span
		>
		<button
			class="relative mx-4 flex h-6 w-12 items-center rounded-full bg-blue-600 px-0.5 dark:bg-blue-500"
			on:click={onToggleBillingPeriod}
			aria-label={isAnnualBillingSelected
				? 'Switch to monthly billing'
				: 'Switch to annual billing'}
		>
			<span
				class={`absolute h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${isAnnualBillingSelected ? 'translate-x-6' : 'translate-x-0'}`}
			></span>
		</button>
		<span
			class={`text-sm ${isAnnualBillingSelected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
		>
			Annual <span class="ml-1 font-medium text-green-500">Save 15%</span>
		</span>
	</div>
</div>
