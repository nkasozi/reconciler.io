<script lang="ts">
	import FeaturesBackgroundIllustrations from '$lib/components/marketing/features/FeaturesBackgroundIllustrations.svelte';
	import FeaturesHeroSection from '$lib/components/marketing/features/FeaturesHeroSection.svelte';
	import FeaturesCategoriesSection from '$lib/components/marketing/features/FeaturesCategoriesSection.svelte';
	import FeaturesUseCaseSolutionsSection from '$lib/components/marketing/features/FeaturesUseCaseSolutionsSection.svelte';
	import FeaturesCoreCapabilitiesSection from '$lib/components/marketing/features/FeaturesCoreCapabilitiesSection.svelte';
	import FeaturesCompleteFeatureListSection from '$lib/components/marketing/features/FeaturesCompleteFeatureListSection.svelte';
	import FeaturesCallToActionSection from '$lib/components/marketing/features/FeaturesCallToActionSection.svelte';
</script>

<svelte:head>
	<title>Features | Reconcile - Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Powerful features for seamless data reconciliation across all your systems."
	/>
</svelte:head>

<div class="relative min-h-screen bg-gray-900 py-16 text-white">
	<FeaturesBackgroundIllustrations />
	<div class="container mx-auto px-4">
		<FeaturesHeroSection />
		<FeaturesCategoriesSection />
		<FeaturesUseCaseSolutionsSection />
		<FeaturesCoreCapabilitiesSection />
		<FeaturesCompleteFeatureListSection />
		<FeaturesCallToActionSection />
	</div>
</div>
