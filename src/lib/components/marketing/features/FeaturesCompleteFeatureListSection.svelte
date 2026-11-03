<script lang="ts">
	import FeaturesCompleteFeatureListFirstGroup from './FeaturesCompleteFeatureListFirstGroup.svelte';
	import FeaturesCompleteFeatureListSecondGroup from './FeaturesCompleteFeatureListSecondGroup.svelte';
</script>

<div class="mb-16 overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
	<div class="border-b border-gray-200 p-8 dark:border-gray-700">
		<h2 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Complete Feature List</h2>
		<p class="text-gray-600 dark:text-gray-300">
			Everything you need for powerful data reconciliation
		</p>
	</div>

	<div class="grid grid-cols-1 p-2 md:grid-cols-2 lg:grid-cols-3">
		<FeaturesCompleteFeatureListFirstGroup />
		<FeaturesCompleteFeatureListSecondGroup />
	</div>
</div>
