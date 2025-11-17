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
			</div>
		{/if}

		<!-- Scan results info -->
		{#if scanResult}
			<div class="mb-4 space-y-2">
				<div class="text-sm">
					<span class="font-medium text-gray-700">Text detected:</span>
					<span class="text-gray-600">{scanResult.text.length} characters</span>
				</div>

				{#if scanResult.tableData}
					<div class="text-sm">
						<span class="font-medium text-gray-700">Rows detected:</span>
						<span class="text-gray-600">{scanResult.tableData.length}</span>
					</div>
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
