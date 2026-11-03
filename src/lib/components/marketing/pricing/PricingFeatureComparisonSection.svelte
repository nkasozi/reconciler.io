<script lang="ts">
	import PricingFeatureComparisonCoreLimitsRows from './PricingFeatureComparisonCoreLimitsRows.svelte';
	import PricingFeatureComparisonAdvancedProcessingRows from './PricingFeatureComparisonAdvancedProcessingRows.svelte';
	import PricingFeatureComparisonCollaborationRows from './PricingFeatureComparisonCollaborationRows.svelte';
</script>

<div class="mx-auto mb-16 max-w-5xl overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
	<div class="border-b border-gray-200 p-6 dark:border-gray-700">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Feature Comparison</h2>
	</div>
	<div class="overflow-x-auto">
		<table class="w-full">
			<thead>
				<tr class="bg-gray-50 dark:bg-gray-700">
					<th
						class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
						>Feature</th
					>
					<th
						class="px-6 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
						>Free</th
					>
					<th
						class="px-6 py-3 text-center text-xs font-medium tracking-wider text-blue-600 uppercase dark:text-blue-400"
						>Pro</th
					>
					<th
						class="px-6 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
						>Enterprise</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
				<PricingFeatureComparisonCoreLimitsRows />
				<PricingFeatureComparisonAdvancedProcessingRows />
				<PricingFeatureComparisonCollaborationRows />
			</tbody>
		</table>
	</div>
</div>
