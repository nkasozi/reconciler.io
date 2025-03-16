<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ColumnPair, ReconciliationConfig } from '$lib/utils/reconciliation';
	import type { ParsedFileData } from '$lib/utils/fileParser';
	import ColumnMappingModal from '$lib/components/ColumnMappingModal.svelte';

	// Type for column with sample values
	type ColumnData = {
		name: string;
		sampleValues: string[];
	};

	// File preview data with sample values for display
	type FilePreviewData = {
		columns: ColumnData[];
		rows: Record<string, string>[];
		fileName: string;
		fileType: string;
	};

	// Primary and comparison file data from the store
	let primaryFile: ParsedFileData | null = null;
	let comparisonFile: ParsedFileData | null = null;

	// Derived file preview data with sample values
	let primaryFilePreview = $state<FilePreviewData | null>(null);
	let comparisonFilePreview = $state<FilePreviewData | null>(null);

	// Selected column pairs for ID matching
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});

	// Selected column pairs for comparison
	let comparisonPairs = $state<ColumnPair[]>([{ primaryColumn: null, comparisonColumn: null }]);

	// Contact information
	let contactEmail = $state('');
	let emailValid = $state(false);

	// Validation state
	let primaryIdPairValid = $state(false);
	let formValid = $state(false);
	let errorMessage = $state<string | null>(null);

	// Column mapping modal
	let showMappingModal = $state(false);

	// Subscribe to the store
	onMount(() => {
		// First check if localStorage has data as a backup
		try {
			const storedPrimary = localStorage.getItem('primary_file_data');
			const storedComparison = localStorage.getItem('comparison_file_data');

			if (storedPrimary) {
				console.log('Found primary file data in localStorage');
				primaryFile = JSON.parse(storedPrimary);
			}

			if (storedComparison) {
				console.log('Found comparison file data in localStorage');
				comparisonFile = JSON.parse(storedComparison);
			}
		} catch (error) {
			console.error('Error retrieving from localStorage:', error);
		}

		// Subscribe to the store
		const unsubscribe = reconciliationStore.subscribe((state) => {
			console.log('Store state in column-selection:', state);

			// Only update if we don't already have data
			if (!primaryFile && state.primaryFileData) {
				primaryFile = state.primaryFileData;
				console.log('Updated primary file from store:', primaryFile);

				// Save to localStorage as backup
				try {
					localStorage.setItem('primary_file_data', JSON.stringify(primaryFile));
				} catch (error) {
					console.error('Error saving primary file to localStorage:', error);
				}
			}

			if (!comparisonFile && state.comparisonFileData) {
				comparisonFile = state.comparisonFileData;
				console.log('Updated comparison file from store:', comparisonFile);

				// Save to localStorage as backup
				try {
					localStorage.setItem('comparison_file_data', JSON.stringify(comparisonFile));
				} catch (error) {
					console.error('Error saving comparison file to localStorage:', error);
				}
			}

			// Process the data if we have both files
			processFiles();
		});

		// If we already got data from localStorage, process it immediately
		if (primaryFile && comparisonFile) {
			processFiles();
		}

		// Cleanup
		return () => {
			unsubscribe();
		};
	});

	// Separate function to process the files and create previews
	function processFiles() {
		// Check if we have the data we need
		if (!primaryFile || !comparisonFile) {
			console.error('Missing file data:', {
				primaryFile: !!primaryFile,
				comparisonFile: !!comparisonFile
			});
			errorMessage = 'Required file data is missing. Please go back and upload both files.';
			setTimeout(() => {
				goto('/upload');
			}, 2000);
			return;
		}

		console.log('Creating preview data with:', {
			primaryFile,
			comparisonFile
		});

		// Create preview data with sample values
		primaryFilePreview = createPreviewData(primaryFile);
		comparisonFilePreview = createPreviewData(comparisonFile);

		console.log('Preview data created:', {
			primaryFilePreview,
			comparisonFilePreview
		});
	}

	// Helper to create preview data with sample values from parsed data
	function createPreviewData(data: ParsedFileData): FilePreviewData {
		const columnNames = data.columns;

		// Extract sample values for each column (up to 3 values)
		const columns: ColumnData[] = columnNames.map((name) => {
			const sampleValues: string[] = [];

			// Take up to 3 unique sample values
			const uniqueValues = new Set<string>();
			for (const row of data.rows) {
				if (uniqueValues.size >= 3) break;
				if (row[name] && !uniqueValues.has(row[name])) {
					uniqueValues.add(row[name]);
					sampleValues.push(row[name]);
				}
			}

			return { name, sampleValues };
		});

		return {
			columns,
			rows: data.rows.slice(0, 3), // Just take the first 3 rows
			fileName: data.fileName,
			fileType: data.fileType
		};
	}

	// Check if primary ID pair is valid
	$effect(() => {
		primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
		validateForm();
	});

	// Validate email
	function validateEmail() {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		emailValid = emailRegex.test(contactEmail);
		validateForm();
	}

	// Validate the entire form
	function validateForm() {
		formValid = primaryIdPairValid && emailValid;
	}

	// Add another comparison pair
	function addComparisonPair() {
		comparisonPairs = [...comparisonPairs, { primaryColumn: null, comparisonColumn: null }];
	}

	// Remove a comparison pair
	function removeComparisonPair(index: number) {
		comparisonPairs = comparisonPairs.filter((_, i) => i !== index);
	}

	// Show column mapping modal
	function openMappingModal() {
		showMappingModal = true;
	}

	// Handle column mapping completion
	function handleColumnMapping(event: CustomEvent) {
		const { primaryIdPair: mappedPrimaryIdPair, comparisonPairs: mappedComparisonPairs } =
			event.detail;

		console.log('Column mapping complete:', { mappedPrimaryIdPair, mappedComparisonPairs });

		// Update the local state with the mapping results
		primaryIdPair = mappedPrimaryIdPair;
		comparisonPairs = mappedComparisonPairs;

		// Validate the form after mapping
		primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
		validateForm();
	}

	// Start reconciliation process
	function startReconciliation() {
		if (!formValid) return;

		// Prepare reconciliation data
		const reconciliationConfig: ReconciliationConfig = {
			primaryIdPair,
			comparisonPairs: comparisonPairs.filter(
				(pair) => pair.primaryColumn && pair.comparisonColumn
			),
			contactEmail
		};

		// Save the configuration to the store
		reconciliationStore.setConfig(reconciliationConfig);

		// Navigate to summary page (not directly to results)
		goto('/reconciliation-progress');
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="text-foreground dark:text-dark-foreground mb-6 text-center text-3xl font-bold">
		File Column Selection
	</h1>

	<!-- Error message display -->
	{#if errorMessage}
		<div class="mx-auto mb-6 max-w-2xl">
			<div class="rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<div class="mt-2 text-sm text-red-700">
							<p>{errorMessage}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- File preview - only show if we have data -->
	{#if primaryFilePreview && comparisonFilePreview}
		<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Primary file preview -->
			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow-md dark:shadow-gray-800">
				<h2 class="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-200">
					Primary File: {primaryFilePreview.fileName}
					<span class="ml-2 text-xs text-gray-500 dark:text-gray-400"
						>({primaryFilePreview.fileType})</span
					>
				</h2>

				<div class="overflow-x-auto">
					<table
						class="min-w-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
					>
						<thead>
							<tr>
								{#each primaryFilePreview.columns as column}
									<th
										class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
									>
										{column.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each primaryFilePreview.rows as row, rowIndex}
								<tr
									class={rowIndex % 2 === 0
										? 'bg-white dark:bg-gray-800'
										: 'bg-gray-50 dark:bg-gray-700'}
								>
									{#each primaryFilePreview.columns as column}
										<td
											class="border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-300"
										>
											{row[column.name] || ''}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Comparison file preview -->
			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow-md dark:shadow-gray-800">
				<h2 class="mb-2 text-xl font-semibold text-gray-700 dark:text-gray-200">
					Comparison File: {comparisonFilePreview.fileName}
					<span class="ml-2 text-xs text-gray-500 dark:text-gray-400"
						>({comparisonFilePreview.fileType})</span
					>
				</h2>

				<div class="overflow-x-auto">
					<table
						class="min-w-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
					>
						<thead>
							<tr>
								{#each comparisonFilePreview.columns as column}
									<th
										class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200"
									>
										{column.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each comparisonFilePreview.rows as row, rowIndex}
								<tr
									class={rowIndex % 2 === 0
										? 'bg-white dark:bg-gray-800'
										: 'bg-gray-50 dark:bg-gray-700'}
								>
									{#each comparisonFilePreview.columns as column}
										<td
											class="border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-300"
										>
											{row[column.name] || ''}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- Primary ID column pair selection -->
	{#if primaryFilePreview && comparisonFilePreview}
		<div
			class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow-md dark:shadow-gray-800"
		>
			<h2 class="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
				Select Primary ID Columns
			</h2>
			<p class="mb-4 text-gray-600 dark:text-gray-400">
				Select the columns from each file that uniquely identify a row. These columns will be used
				to match rows between files.
			</p>

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label
						class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
						for="primary-id-column"
					>
						Primary File ID Column:
					</label>
					<select
						id="primary-id-column"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:shadow-gray-900"
						bind:value={primaryIdPair.primaryColumn}
					>
						<option value="">Select a column</option>
						{#each primaryFilePreview.columns as column}
							<option value={column.name}>{column.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label
						class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
						for="comparison-id-column"
					>
						Comparison File ID Column:
					</label>
					<select
						id="comparison-id-column"
						class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:shadow-gray-900"
						bind:value={primaryIdPair.comparisonColumn}
					>
						<option value="">Select a column</option>
						{#each comparisonFilePreview.columns as column}
							<option value={column.name}>{column.name}</option>
						{/each}
					</select>
				</div>
			</div>

			{#if !primaryIdPairValid}
				<p class="text-xs text-red-500 italic">Both ID columns must be selected.</p>
			{/if}
		</div>
	{/if}

	<!-- Comparison column pairs selection -->
	{#if primaryFilePreview && comparisonFilePreview}
		<div
			class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow-md dark:shadow-gray-800"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-gray-700 dark:text-gray-200">
					Select Comparison Column Pairs
				</h2>
				<button
					type="button"
					on:click={addComparisonPair}
					class="rounded bg-blue-500 px-2 py-1 text-sm font-bold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800"
				>
					+ Add Pair
				</button>
			</div>

			<p class="mb-4 text-gray-600 dark:text-gray-400">
				Select columns to compare between the two files. You can add multiple comparison pairs.
			</p>

			{#each comparisonPairs as pair, index}
				<div class="mb-4 rounded-md bg-gray-50 p-4 dark:bg-gray-700">
					<div class="mb-2 flex items-center justify-between">
						<h3 class="text-md font-medium text-gray-700 dark:text-gray-200">
							Comparison Pair {index + 1}
						</h3>
						{#if comparisonPairs.length > 1}
							<button
								type="button"
								on:click={() => removeComparisonPair(index)}
								class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
							>
								Remove
							</button>
						{/if}
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label
								class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
								for={`primary-col-${index}`}
							>
								Primary File Column:
							</label>
							<select
								id={`primary-col-${index}`}
								class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:shadow-gray-900"
								bind:value={pair.primaryColumn}
							>
								<option value="">Select a column</option>
								{#each primaryFilePreview.columns as column}
									<option value={column.name}>{column.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label
								class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300"
								for={`comparison-col-${index}`}
							>
								Comparison File Column:
							</label>
							<select
								id={`comparison-col-${index}`}
								class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:shadow-gray-900"
								bind:value={pair.comparisonColumn}
							>
								<option value="">Select a column</option>
								{#each comparisonFilePreview.columns as column}
									<option value={column.name}>{column.name}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Contact information -->
	{#if primaryFilePreview && comparisonFilePreview}
		<div
			class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow-md dark:shadow-gray-800"
		>
			<h2 class="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">
				Contact Information
			</h2>
			<p class="mb-4 text-gray-600 dark:text-gray-400">
				Enter your email address to receive the reconciliation results.
			</p>

			<div class="mb-4">
				<label class="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300" for="email">
					Email:
				</label>
				<input
					type="email"
					id="email"
					class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:shadow-gray-900"
					placeholder="your@email.com"
					bind:value={contactEmail}
					on:input={validateEmail}
				/>
				{#if contactEmail && !emailValid}
					<p class="text-xs text-red-500 italic">Please enter a valid email address.</p>
				{/if}
			</div>
		</div>

		<!-- Action buttons -->
		<div class="mt-6 flex justify-center space-x-4">
			<button
				type="button"
				on:click={() => goto('/upload')}
				class="rounded border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
			>
				Back
			</button>

			<button
				type="button"
				on:click={openMappingModal}
				class="reconcile-button rounded border border-green-500 bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600 hover:text-white"
			>
				Map Columns
			</button>

			<button
				type="button"
				on:click={startReconciliation}
				class="rounded border border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-green-600 hover:text-pink-100 dark:border-green-600 dark:bg-green-600 dark:hover:bg-green-700"
				disabled={!formValid}
				class:opacity-50={!formValid}
				class:cursor-not-allowed={!formValid}
			>
				Start Reconciliation
			</button>
		</div>
	{/if}

	<!-- Column Mapping Modal -->
	{#if primaryFile && comparisonFile}
		<ColumnMappingModal
			{primaryFile}
			{comparisonFile}
			show={showMappingModal}
			on:close={() => (showMappingModal = false)}
			on:mapping={handleColumnMapping}
		/>
	{/if}
</div>
