<script lang="ts">
	import WhyReconcileHeroSection from '$lib/components/marketing/whyReconcile/WhyReconcileHeroSection.svelte';
	import WhyReconcileKeyBenefitsSection from '$lib/components/marketing/whyReconcile/WhyReconcileKeyBenefitsSection.svelte';
	import WhyReconcileHowItWorksSection from '$lib/components/marketing/whyReconcile/WhyReconcileHowItWorksSection.svelte';
	import WhyReconcileUseCasesSection from '$lib/components/marketing/whyReconcile/WhyReconcileUseCasesSection.svelte';
	import WhyReconcileTestimonialsSection from '$lib/components/marketing/whyReconcile/WhyReconcileTestimonialsSection.svelte';
	import WhyReconcileCallToActionSection from '$lib/components/marketing/whyReconcile/WhyReconcileCallToActionSection.svelte';
	import WhyReconcileFrequentlyAskedQuestionsSection from '$lib/components/marketing/whyReconcile/WhyReconcileFrequentlyAskedQuestionsSection.svelte';
</script>

<svelte:head>
	<title>Why Reconcile | Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Discover why Reconcile is the most powerful solution for your data reconciliation needs."
	/>
</svelte:head>

<div class="bg-blue-50 py-16 dark:bg-gray-900">
	<div class="container mx-auto px-4">
		<WhyReconcileHeroSection />
		<WhyReconcileKeyBenefitsSection />
		<WhyReconcileHowItWorksSection />
		<WhyReconcileUseCasesSection />
		<WhyReconcileTestimonialsSection />
		<WhyReconcileCallToActionSection />
		<WhyReconcileFrequentlyAskedQuestionsSection />
	</div>
</div>
