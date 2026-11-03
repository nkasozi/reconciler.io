<script lang="ts">
	import WhyReconcileUploadAndMapSteps from './WhyReconcileUploadAndMapSteps.svelte';
	import WhyReconcileProcessAndAnalyzeSteps from './WhyReconcileProcessAndAnalyzeSteps.svelte';
</script>

<div class="mx-auto mb-20 max-w-5xl">
	<h2 class="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">How It Works</h2>

	<div class="relative">
		<div
			class="absolute top-0 bottom-0 left-1/2 z-0 hidden w-1 -translate-x-1/2 transform bg-blue-200 md:block dark:bg-blue-900/50"
		></div>
		<WhyReconcileUploadAndMapSteps />
		<WhyReconcileProcessAndAnalyzeSteps />
	</div>
</div>
