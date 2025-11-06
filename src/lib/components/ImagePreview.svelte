<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let file: File | null = null;
	export let scanResult: any = null;

	const dispatch = createEventDispatcher<{
		retake: void;
		process: { file: File };
		reject: void;
	}>();

	let imageUrl = '';
	let isProcessing = false;

	// Create image URL when file changes
	$: if (file) {
		if (imageUrl) {
			URL.revokeObjectURL(imageUrl);
		}
		imageUrl = URL.createObjectURL(file);
	}

	function handleRetake() {
		dispatch('retake');
	}

	function handleProcess() {
		if (file && !isProcessing) {
			isProcessing = true;
			dispatch('process', { file });
		}
	}

	function handleReject() {
		dispatch('reject');
	}

	// Quality indicators
	function getQualityScore(): { score: number; issues: string[]; suggestions: string[] } {
		if (!scanResult) return { score: 0, issues: [], suggestions: [] };

		const issues: string[] = [];
		const suggestions: string[] = [];
		let score = 100;

		// Check OCR confidence if available
		if (scanResult.confidence !== undefined) {
			if (scanResult.confidence < 50) {
				score -= 40;
				issues.push('Very low text recognition confidence');
				suggestions.push('Retake with better lighting and focus');
			} else if (scanResult.confidence < 70) {
				score -= 20;
				issues.push('Low text recognition confidence');
				suggestions.push('Ensure document is well-lit and in focus');
			}
		}

		// Check text amount
		if (scanResult.text && scanResult.text.length < 20) {
			score -= 30;
			issues.push('Very little text detected');
			suggestions.push('Ensure the entire document is visible');
		}

		// Check for table data
		if (scanResult.tableData && scanResult.tableData.length === 0) {
			score -= 10;
			issues.push('No structured data detected');
			suggestions.push('Ensure tables are clearly visible');
		}

		return { score: Math.max(0, score), issues, suggestions };
	}

	$: quality = getQualityScore();
</script>

<div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
	<!-- Image preview -->
	{#if imageUrl}
		<div class="relative">
			<img
				src={imageUrl}
				alt="Document preview"
				class="max-h-96 w-full bg-gray-50 object-contain"
			/>

			<!-- Quality overlay -->
			{#if scanResult && quality.score < 80}
				<div
					class="absolute right-2 top-2 max-w-xs rounded-lg border border-red-300 bg-red-100 p-2"
				>
					<div class="flex items-center space-x-2">
						<div
							class="h-3 w-3 rounded-full {quality.score >= 70 ? 'bg-yellow-400' : 'bg-red-400'}"
						></div>
						<span
							class="text-xs font-medium {quality.score >= 70 ? 'text-yellow-800' : 'text-red-800'}"
						>
							Quality: {quality.score}%
						</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<div class="p-4">
		<!-- File info -->
		{#if file}
			<div class="mb-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-900">{file.name}</p>
					<p class="text-xs text-gray-500">
						{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
					</p>
				</div>

				{#if scanResult}
					<div class="text-right">
						<div
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
							{quality.score >= 80
								? 'bg-green-100 text-green-800'
								: quality.score >= 60
									? 'bg-yellow-100 text-yellow-800'
									: 'bg-red-100 text-red-800'}"
						>
							{#if quality.score >= 80}
								Good Quality
							{:else if quality.score >= 60}
								Fair Quality
							{:else}
								Poor Quality
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Scan results info -->
		{#if scanResult}
			<div class="mb-4 space-y-2">
				<div class="text-sm">
					<span class="font-medium text-gray-700">Text detected:</span>
					<span class="text-gray-600">{scanResult.text.length} characters</span>
				</div>

				{#if scanResult.confidence !== undefined}
					<div class="text-sm">
						<span class="font-medium text-gray-700">OCR confidence:</span>
						<span class="text-gray-600">{scanResult.confidence.toFixed(1)}%</span>
					</div>
				{/if}

				{#if scanResult.tableData}
					<div class="text-sm">
						<span class="font-medium text-gray-700">Rows detected:</span>
						<span class="text-gray-600">{scanResult.tableData.length}</span>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Quality issues -->
		{#if scanResult && quality.issues.length > 0}
			<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-amber-800">Quality Issues</h4>
				<ul class="space-y-1 text-xs text-amber-700">
					{#each quality.issues as issue}
						<li>• {issue}</li>
					{/each}
				</ul>
				{#if quality.suggestions.length > 0}
					<h5 class="mb-1 mt-2 text-xs font-medium text-amber-800">Suggestions:</h5>
					<ul class="space-y-1 text-xs text-amber-700">
						{#each quality.suggestions as suggestion}
							<li>• {suggestion}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex space-x-3">
			<button
				type="button"
				on:click={handleRetake}
				class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
			>
				Retake
			</button>

			<button
				type="button"
				on:click={handleReject}
				class="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-red-700 transition-colors hover:bg-red-100"
			>
				Cancel
			</button>

			<button
				type="button"
				on:click={handleProcess}
				disabled={isProcessing}
				class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isProcessing}
					Processing...
				{:else}
					Use This Scan
				{/if}
			</button>
		</div>
	</div>
</div>
