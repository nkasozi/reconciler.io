<script lang="ts">
	import { onMount } from 'svelte';
	import PricingUpgradeNotice from '$lib/components/marketing/pricing/PricingUpgradeNotice.svelte';
	import PricingHeroWithBillingToggle from '$lib/components/marketing/pricing/PricingHeroWithBillingToggle.svelte';
	import PricingFreePlanCard from '$lib/components/marketing/pricing/PricingFreePlanCard.svelte';
	import PricingProPlanCard from '$lib/components/marketing/pricing/PricingProPlanCard.svelte';
	import PricingEnterprisePlanCard from '$lib/components/marketing/pricing/PricingEnterprisePlanCard.svelte';
	import PricingReconciliationSolutionsSection from '$lib/components/marketing/pricing/PricingReconciliationSolutionsSection.svelte';
	import PricingFeatureComparisonSection from '$lib/components/marketing/pricing/PricingFeatureComparisonSection.svelte';
	import PricingFrequentlyAskedQuestionsSection from '$lib/components/marketing/pricing/PricingFrequentlyAskedQuestionsSection.svelte';
	import PricingCallToActionSection from '$lib/components/marketing/pricing/PricingCallToActionSection.svelte';

	let isAnnual = $state(false); // Default to monthly
	let isHoveredPro = $state(false);
	let isHoveredEnterprise = $state(false);
	let upgradeNotice = $state<string | null>(null);

	// Check for upgrade prompt from file upload
	onMount(() => {
		// Get the upgrade reason from session storage
		const reason = sessionStorage.getItem('upgrade_reason');
		if (reason) {
			upgradeNotice = reason;
			// Highlight the Pro tier
			isHoveredPro = true;
			setTimeout(() => {
				// Reset the highlighting after 3 seconds
				isHoveredPro = false;
			}, 3000);
		}
		return () => sessionStorage.removeItem('upgrade_reason');
	});

	function switchBilling() {
		console.log('Switch billing clicked, current isAnnual:', isAnnual);
		isAnnual = !isAnnual;
		console.log('After toggle, isAnnual:', isAnnual);
	}

	function getPrice(monthly: number): string {
		if (isAnnual) {
			return `$${(monthly * 10).toFixed(0)}`;
		}
		return `$${monthly}`;
	}

	function getPeriod(): string {
		return isAnnual ? '/year' : '/month';
	}

	function contactEmail() {
		window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Pro%20Trial%20Request';
	}

	function contactSales() {
		window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Enterprise%20Inquiry';
	}
</script>

<svelte:head>
	<title>Pricing | Reconcile - Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Simple, transparent pricing for all your data reconciliation needs."
	/>
</svelte:head>

<div class="bg-blue-50 py-16 dark:bg-gray-900">
	<div class="container mx-auto px-4">
		{#if upgradeNotice}
			<PricingUpgradeNotice upgradeNoticeMessage={upgradeNotice} />
		{/if}

		<PricingHeroWithBillingToggle
			isAnnualBillingSelected={isAnnual}
			onToggleBillingPeriod={switchBilling}
		/>

		<div class="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
			<PricingFreePlanCard />
			<PricingProPlanCard
				bind:isProPlanHighlighted={isHoveredPro}
				displayedProPlanPrice={getPrice(3)}
				displayedBillingPeriodSuffix={getPeriod()}
				onRequestProPlanTrial={contactEmail}
			/>
			<PricingEnterprisePlanCard
				bind:isEnterprisePlanHighlighted={isHoveredEnterprise}
				displayedEnterprisePlanPrice={getPrice(10)}
				displayedBillingPeriodSuffix={getPeriod()}
				onContactSales={contactSales}
			/>
		</div>

		<PricingReconciliationSolutionsSection />
		<PricingFeatureComparisonSection />
		<PricingFrequentlyAskedQuestionsSection />
		<PricingCallToActionSection onContactSales={contactSales} />
	</div>
</div>
