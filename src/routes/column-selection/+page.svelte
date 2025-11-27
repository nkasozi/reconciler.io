<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ParsedFileData } from '$lib/utils/fileParser';
	import type { ColumnPair, ReconciliationConfig } from '$lib/utils/reconciliation';
	import { get } from 'svelte/store';
	import WaitlistModal from '$lib/components/WaitlistModal.svelte';
	import InfoIcon from '$lib/components/InfoIcon.svelte';

	// Get file data from the store
	let primaryFile = $state<ParsedFileData | null>(null);
	let comparisonFile = $state<ParsedFileData | null>(null);

	// Column mapping state
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});

	let comparisonPairs = $state<ColumnPair[]>([]);

	// Selected columns during mapping
	let selectedPrimaryColumn = $state<string | null>(null);
	let selectedComparisonColumn = $state<string | null>(null);
	let currentMappingType = $state<'id' | 'comparison'>('id');
	let currentPairIndex = $state<number>(0);

	// Validation state
	let primaryIdPairValid = $state(false);
	let formValid = $state(false);

	// Configuration options state
	let reverseReconciliation = $state(false);
	let caseSensitive = $state(true);
	let trimValues = $state(true);

	// Waitlist modal state
	let showWaitlistModal = $state(false);

	// Match flash animation state
	let lastMatchedPrimary = $state<string | null>(null);
	let lastMatchedComparison = $state<string | null>(null);

	onMount(() => {
		// Get file data from the store
		const state = get(reconciliationStore);
		primaryFile = state.primaryFileData;
		comparisonFile = state.comparisonFileData;

		// If files are missing, redirect back to upload
		if (!primaryFile) {
			console.warn('Missing Primary file data, redirecting to upload page');
			goto('/upload');
			return;
		}

		if (!comparisonFile) {
			console.warn('Missing Comparison file data, redirecting to upload page');
			goto('/upload');
			return;
		}
	});

	// Validation
	$effect(() => {
		primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
		validateForm();
	});

	function validateForm() {
		// Check for primary ID validity (required)
		const isPrimaryIdValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;

		// Count valid and incomplete comparison pairs
		const validComparisonPairs = comparisonPairs.filter(
			(pair) => pair.primaryColumn && pair.comparisonColumn
		);

		const incompleteComparisonPairs = comparisonPairs.filter(
			(pair) =>
				(pair.primaryColumn && !pair.comparisonColumn) ||
				(!pair.primaryColumn && pair.comparisonColumn)
		);

		// Check that all custom tolerances have formulas
		const invalidCustomTolerances = comparisonPairs.some(
			(pair) => pair.tolerance?.type === 'custom' && !pair.tolerance?.formula?.trim()
		);

		// Form is valid if:
		// 1. Primary ID is mapped
		// 2. There are no incomplete comparison pairs (either both columns set or both null)
		// 3. All custom tolerances have formulas
		formValid =
			isPrimaryIdValid && incompleteComparisonPairs.length === 0 && !invalidCustomTolerances;
	}

	// Add another comparison pair
	function addComparisonPair() {
		const newPairIndex = comparisonPairs.length;
		comparisonPairs = [...comparisonPairs, { primaryColumn: null, comparisonColumn: null }];

		// Automatically switch to editing the new pair
		setMappingContext('comparison', newPairIndex);
		return newPairIndex;
	}

	// Remove a comparison pair
	function removeComparisonPair(index: number) {
		// Remove the pair from the array
		comparisonPairs = comparisonPairs.filter((_, i) => i !== index);

		// If we removed the currently active pair, select a different one
		if (currentMappingType === 'comparison' && currentPairIndex === index) {
			const newIndex = Math.min(index, comparisonPairs.length - 1);
			if (newIndex >= 0) {
				setMappingContext('comparison', newIndex);
			} else {
				// If no comparison pairs left, switch to ID mapping
				setMappingContext('id');
			}
		} else if (currentMappingType === 'comparison' && currentPairIndex > index) {
			// If we're editing a pair that comes after the removed one, adjust the index
			setMappingContext('comparison', currentPairIndex - 1);
		}
	}

	// Clear the Primary ID mapping - the next mapping will become the Primary ID
	function clearPrimaryIdMapping() {
		primaryIdPair = {
			primaryColumn: null,
			comparisonColumn: null
		};
		// Switch to ID mapping mode so next mapping becomes the Primary ID
		setMappingContext('id');
	}

	// Handle column selection for mapping
	function selectColumn(column: string, fileType: 'primary' | 'comparison') {
		// If we're in comparison mode and trying to map to a pair that doesn't exist yet, create it
		if (currentMappingType === 'comparison' && currentPairIndex >= comparisonPairs.length) {
			comparisonPairs = [...comparisonPairs, { primaryColumn: null, comparisonColumn: null }];
		}

		if (fileType === 'primary') {
			selectedPrimaryColumn = column;

			// If a comparison column is already selected, create the connection
			if (selectedComparisonColumn) {
				createConnection();
			}
		} else {
			selectedComparisonColumn = column;

			// If a primary column is already selected, create the connection
			if (selectedPrimaryColumn) {
				createConnection();
			}
		}
	}

	// Create a connection between selected columns and automatically advance to next mapping
	function createConnection() {
		if (!selectedPrimaryColumn || !selectedComparisonColumn) return;

		// Show flash animation for matched columns
		lastMatchedPrimary = selectedPrimaryColumn;
		lastMatchedComparison = selectedComparisonColumn;

		// Update the appropriate pair based on mapping type
		if (currentMappingType === 'id') {
			// Update the ID pair
			primaryIdPair = {
				primaryColumn: selectedPrimaryColumn,
				comparisonColumn: selectedComparisonColumn
			};

			// Automatically create and move to first comparison pair
			if (comparisonPairs.length === 0) {
				// Create the first comparison pair
				comparisonPairs = [{ primaryColumn: null, comparisonColumn: null }];
			}
			setMappingContext('comparison', 0);
		} else {
			// Update the specific comparison pair
			comparisonPairs = comparisonPairs.map((pair, index) => {
				if (index === currentPairIndex) {
					return {
						primaryColumn: selectedPrimaryColumn,
						comparisonColumn: selectedComparisonColumn
					};
				}
				return pair;
			});

			// Automatically advance to the next pair for continued mapping
			setMappingContext('comparison', currentPairIndex + 1);
		}

		// Reset selected columns
		selectedPrimaryColumn = null;
		selectedComparisonColumn = null;

		// Clear flash animation after a brief delay
		setTimeout(() => {
			lastMatchedPrimary = null;
			lastMatchedComparison = null;
		}, 600);

		// Validate form after connection is made
		validateForm();
	}

	// Set the current mapping type and pair index
	function setMappingContext(type: 'id' | 'comparison', index = 0) {
		currentMappingType = type;
		currentPairIndex = index;

		// Clear any currently selected columns
		selectedPrimaryColumn = null;
		selectedComparisonColumn = null;
	}

	// Go back to upload page
	function goBack() {
		goto('/upload');
	}

	// Apply the mapping and move to next step
	function applyMapping() {
		if (!formValid) return;

		// Filter out any empty comparison pairs (where both columns are null)
		const completeComparisonPairs = comparisonPairs.filter(
			(pair) => pair.primaryColumn && pair.comparisonColumn
		);

		// Create reconciliation config
		const reconciliationConfig: ReconciliationConfig = {
			primaryIdPair,
			comparisonPairs: completeComparisonPairs,
			reverseReconciliation,
			caseSensitive,
			trimValues
		};

		// Save the configuration to the store
		reconciliationStore.setConfig(reconciliationConfig);

		// Navigate to summary page
		goto('/summary');
	}

	// Compute whether a column is currently selected
	function isColumnSelected(column: string, fileType: 'primary' | 'comparison'): boolean {
		if (fileType === 'primary') {
			return selectedPrimaryColumn === column;
		} else {
			return selectedComparisonColumn === column;
		}
	}

	// Compute whether a column is used in any connection
	function isColumnUsed(column: string, fileType: 'primary' | 'comparison'): boolean {
		if (fileType === 'primary') {
			if (primaryIdPair.primaryColumn === column) return true;
			return comparisonPairs.some((pair) => pair.primaryColumn === column);
		} else {
			if (primaryIdPair.comparisonColumn === column) return true;
			return comparisonPairs.some((pair) => pair.comparisonColumn === column);
		}
	}

	// Get a string describing what a column is used for
	function getColumnUsageDescription(column: string, fileType: 'primary' | 'comparison'): string {
		if (fileType === 'primary') {
			if (primaryIdPair.primaryColumn === column) return 'Primary ID';

			const pairIndex = comparisonPairs.findIndex((pair) => pair.primaryColumn === column);
			if (pairIndex >= 0) return `Comparison #${pairIndex + 1}`;
		} else {
			if (primaryIdPair.comparisonColumn === column) return 'Primary ID';

			const pairIndex = comparisonPairs.findIndex((pair) => pair.comparisonColumn === column);
			if (pairIndex >= 0) return `Comparison #${pairIndex + 1}`;
		}

		return '';
	}

	// Compute display name for selected columns
	function getSelectedColumnText(): string {
		let text = '';

		if (currentMappingType === 'id') {
			text = 'Primary ID Columns';

			if (primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn) {
				text += `: ${primaryIdPair.primaryColumn} → ${primaryIdPair.comparisonColumn}`;
			}
		} else {
			text = `Comparison Pair #${currentPairIndex + 1}`;

			const pair = comparisonPairs[currentPairIndex];
			if (pair && pair.primaryColumn && pair.comparisonColumn) {
				text += `: ${pair.primaryColumn} → ${pair.comparisonColumn}`;
			}
		}

		return text;
	}

	// Tolerance management functions
	function setAbsoluteTolerance(pairIndex: number, value: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = {
				type: 'absolute',
				value
			};
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setRelativeTolerance(pairIndex: number, percentage: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = {
				type: 'relative',
				percentage
			};
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setCustomTolerance(pairIndex: number, formula: string) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = {
				type: 'custom',
				formula
			};
			comparisonPairs[pairIndex] = pair;
		}
	}

	function clearTolerance(pairIndex: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = null;
			comparisonPairs[pairIndex] = pair;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Page header -->
	<div class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between">
				<div class="flex-1 text-center">
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Column Mapping</h1>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Map columns between your files to set up the reconciliation process
					</p>
				</div>
			</div>
		</div>
	</div>

	{#if primaryFile && comparisonFile}
		<!-- Main content -->
		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<!-- Current mapping indicator -->
			<div
				class="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900"
			>
				<div class="flex items-center justify-center">
					<div class="mr-3 flex-shrink-0">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5 text-blue-600 dark:text-blue-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="text-center">
						<p class="text-sm font-medium text-blue-800 dark:text-blue-200">
							<span>{getSelectedColumnText()}</span>
							{#if selectedPrimaryColumn && !selectedComparisonColumn}
								<span class="mt-1 block text-xs font-normal text-blue-700 dark:text-blue-300">
									✓ Primary column selected: <strong>{selectedPrimaryColumn}</strong>
									<br />
									Waiting for comparison column match...
								</span>
							{:else if selectedComparisonColumn && !selectedPrimaryColumn}
								<span class="mt-1 block text-xs font-normal text-blue-700 dark:text-blue-300">
									✓ Comparison column selected: <strong>{selectedComparisonColumn}</strong>
									<br />
									Waiting for primary column match...
								</span>
							{:else if selectedPrimaryColumn && selectedComparisonColumn}
								<span class="mt-1 block text-xs font-normal text-green-700 dark:text-green-300">
									✓ Match ready: <strong>{selectedPrimaryColumn}</strong> ↔
									<strong>{selectedComparisonColumn}</strong>
									<br />
									Confirming match...
								</span>
							{/if}
						</p>
						<p class="mt-2 text-xs text-blue-700 dark:text-blue-300">
							Select a column from each side to create a mapping. The next pair will automatically
							be prepared.
						</p>
					</div>
				</div>
			</div>

			<!-- File column selection area -->
			<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Primary file columns -->
				<div>
					<h3 class="mb-4 flex items-center text-lg font-bold text-gray-800 dark:text-white">
						<span class="mr-2 h-3 w-3 rounded-full bg-green-500"></span>
						Primary File Columns
					</h3>
					<div class="max-h-[50vh] overflow-y-auto rounded-md bg-white p-4 shadow dark:bg-gray-800">
						{#each primaryFile.columns as column}
							<button
								type="button"
								class="mb-2 flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left transition-all"
								class:bg-green-100={lastMatchedPrimary === column}
								class:border-green-400={lastMatchedPrimary === column}
								class:shadow-lg={lastMatchedPrimary === column}
								class:ring-2={lastMatchedPrimary === column ||
									(isColumnSelected(column, 'primary') && lastMatchedPrimary !== column)}
								class:ring-green-300={lastMatchedPrimary === column}
								class:ring-blue-300={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:bg-green-800={lastMatchedPrimary === column}
								class:dark:border-green-600={lastMatchedPrimary === column}
								class:dark:ring-green-600={lastMatchedPrimary === column}
								class:bg-blue-100={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:border-blue-400={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:shadow-md={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:bg-blue-800={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:border-blue-600={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:ring-blue-600={isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:bg-amber-50={selectedComparisonColumn &&
									!isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:border-amber-200={selectedComparisonColumn &&
									!isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:bg-amber-800={selectedComparisonColumn &&
									!isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:dark:border-amber-800={selectedComparisonColumn &&
									!isColumnSelected(column, 'primary') &&
									lastMatchedPrimary !== column}
								class:bg-white={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								class:border-gray-200={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								class:dark:bg-gray-800={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								class:dark:border-gray-600={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								class:hover:bg-gray-100={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								class:dark:hover:bg-gray-700={!isColumnSelected(column, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column}
								onclick={() => selectColumn(column, 'primary')}
							>
								<div>
									<span class="font-medium text-gray-800 dark:text-white">{column}</span>
									{#if isColumnUsed(column, 'primary')}
										<span
											class="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
										>
											{getColumnUsageDescription(column, 'primary')}
										</span>
									{/if}
								</div>

								{#if lastMatchedPrimary === column}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-green-600 dark:text-green-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-green-500"></span>
									</div>
								{:else if isColumnSelected(column, 'primary')}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-blue-600 dark:text-blue-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-blue-500"></span>
									</div>
								{:else if selectedComparisonColumn}
									<span class="text-xs text-amber-600 dark:text-amber-300">waiting →</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Comparison file columns -->
				<div>
					<h3 class="mb-4 flex items-center text-lg font-bold text-gray-800 dark:text-white">
						<span class="mr-2 h-3 w-3 rounded-full bg-purple-500"></span>
						Comparison File Columns
					</h3>
					<div class="max-h-[50vh] overflow-y-auto rounded-md bg-white p-4 shadow dark:bg-gray-800">
						{#each comparisonFile.columns as column}
							<button
								type="button"
								class="mb-2 flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left transition-all"
								class:bg-green-100={lastMatchedComparison === column}
								class:border-green-400={lastMatchedComparison === column}
								class:shadow-lg={lastMatchedComparison === column}
								class:ring-2={lastMatchedComparison === column ||
									(isColumnSelected(column, 'comparison') && lastMatchedComparison !== column)}
								class:ring-green-300={lastMatchedComparison === column}
								class:ring-purple-300={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:bg-green-800={lastMatchedComparison === column}
								class:dark:border-green-600={lastMatchedComparison === column}
								class:dark:ring-green-600={lastMatchedComparison === column}
								class:bg-purple-100={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:border-purple-400={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:shadow-md={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:bg-purple-800={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:border-purple-600={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:ring-purple-600={isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:bg-amber-50={selectedPrimaryColumn &&
									!isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:border-amber-200={selectedPrimaryColumn &&
									!isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:bg-amber-800={selectedPrimaryColumn &&
									!isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:dark:border-amber-800={selectedPrimaryColumn &&
									!isColumnSelected(column, 'comparison') &&
									lastMatchedComparison !== column}
								class:bg-white={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								class:border-gray-200={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								class:dark:bg-gray-800={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								class:dark:border-gray-600={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								class:hover:bg-gray-100={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								class:dark:hover:bg-gray-700={!isColumnSelected(column, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column}
								onclick={() => selectColumn(column, 'comparison')}
							>
								<div>
									<span class="font-medium text-gray-800 dark:text-white">{column}</span>
									{#if isColumnUsed(column, 'comparison')}
										<span
											class="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
										>
											{getColumnUsageDescription(column, 'comparison')}
										</span>
									{/if}
								</div>

								{#if lastMatchedComparison === column}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-green-600 dark:text-green-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-green-500"></span>
									</div>
								{:else if isColumnSelected(column, 'comparison')}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-purple-600 dark:text-purple-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-purple-500"></span>
									</div>
								{:else if selectedPrimaryColumn}
									<span class="text-xs text-amber-600 dark:text-amber-300">← waiting</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<!-- Mapping controls -->
			<div class="mb-8 space-y-6">
				<!-- ID Column pair -->
				<div
					class="rounded-md border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30"
				>
					<div class="mb-3 flex items-center justify-between">
						<h3 class="font-bold text-indigo-800 dark:text-indigo-300">
							Primary ID Column Mapping
						</h3>
						{#if primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn}
							<button
								type="button"
								class="rounded-md bg-red-100 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
								onclick={clearPrimaryIdMapping}
							>
								Clear
							</button>
						{/if}
					</div>

					<p class="mb-3 text-sm text-indigo-700 dark:text-indigo-300">
						These columns uniquely identify records in each file and will be used to match rows.
					</p>

					{#if primaryIdPair.primaryColumn && primaryIdPair.comparisonColumn}
						<div class="flex items-center space-x-2 text-sm">
							<span class="font-medium text-indigo-700 dark:text-indigo-300"
								>{primaryIdPair.primaryColumn}</span
							>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4 text-indigo-500"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="font-medium text-indigo-700 dark:text-indigo-300"
								>{primaryIdPair.comparisonColumn}</span
							>
						</div>
					{:else}
						<div class="text-sm italic text-indigo-700 dark:text-indigo-300">
							No ID columns mapped yet
						</div>
					{/if}
				</div>

				<!-- Comparison column pairs -->
				<div
					class="rounded-md border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800"
				>
					<h3 class="mb-3 font-bold text-gray-800 dark:text-white">Comparison Column Pairs</h3>

					{#if comparisonPairs.length === 0}
						<p class="text-sm italic text-gray-500 dark:text-gray-400">
							No comparison pairs added yet
						</p>
					{:else}
						<div class="space-y-3">
							{#each comparisonPairs as pair, index}
								<div
									class="rounded-md border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
									class:border-gray-200={(pair.primaryColumn && pair.comparisonColumn) ||
										(!pair.primaryColumn && !pair.comparisonColumn)}
									class:border-red-300={(pair.primaryColumn && !pair.comparisonColumn) ||
										(!pair.primaryColumn && pair.comparisonColumn)}
								>
									<div class="mb-2 flex items-center justify-between">
										<h4 class="flex items-center font-medium text-gray-800 dark:text-white">
											Comparison Pair #{index + 1}
											{#if (pair.primaryColumn && !pair.comparisonColumn) || (!pair.primaryColumn && pair.comparisonColumn)}
												<span class="ml-2 text-xs italic text-red-600 dark:text-red-400"
													>(incomplete)</span
												>
											{/if}
										</h4>
										{#if comparisonPairs.length > 1}
											<button
												type="button"
												class="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700"
												onclick={() => removeComparisonPair(index)}
											>
												Remove
											</button>
										{/if}
									</div>

									{#if pair.primaryColumn && pair.comparisonColumn}
										<div class="space-y-3">
											<div class="flex items-center space-x-2 text-sm">
												<span class="font-medium text-gray-700 dark:text-gray-300"
													>{pair.primaryColumn}</span
												>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-4 w-4 text-gray-500"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fill-rule="evenodd"
														d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
														clip-rule="evenodd"
													/>
												</svg>
												<span class="font-medium text-gray-700 dark:text-gray-300"
													>{pair.comparisonColumn}</span
												>
											</div>

											<!-- Tolerance Configuration -->
											<div class="rounded-md bg-white p-2 dark:bg-gray-600">
												<div class="mb-2 flex items-center justify-between">
													<p class="text-xs font-medium text-gray-700 dark:text-gray-300">
														Tolerance Window (optional)
													</p>
													<InfoIcon
														tooltip="Define how much difference is acceptable between columns when matching. Absolute: fixed amount. Relative: percentage. Custom: write your own rule."
													/>
												</div>
												<div class="space-y-3">
													<select
														onchange={(e) => {
															const value = e.currentTarget.value;
															if (value === '' || value === 'null') {
																clearTolerance(index);
															} else if (value === 'absolute') {
																setAbsoluteTolerance(index, 0.01);
															} else if (value === 'relative') {
																setRelativeTolerance(index, 0.5);
															} else if (value === 'custom') {
																setCustomTolerance(index, '');
															}
														}}
														class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
													>
														<option value="null" selected={!pair.tolerance}> No Tolerance </option>
														<option value="absolute" selected={pair.tolerance?.type === 'absolute'}>
															Absolute (Fixed Difference)
														</option>
														<option value="relative" selected={pair.tolerance?.type === 'relative'}>
															Relative (Percentage-Based)
														</option>
														<option value="custom" selected={pair.tolerance?.type === 'custom'}>
															Custom Formula
														</option>
													</select>

													{#if pair.tolerance?.type === 'absolute'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-value-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Tolerance Value
																</label>
																<InfoIcon
																	tooltip="Numbers: the difference can be up to this amount. Example: 0.01 allows amounts like $100.00 and $100.01 to match. Text: similarity score from 0 to 1. Example: 0.9 means very similar text."
																/>
															</div>
															<input
																id="tolerance-value-{index}"
																type="number"
																step="0.01"
																placeholder="0.01"
																value={pair.tolerance.value || ''}
																onchange={(e) =>
																	setAbsoluteTolerance(
																		index,
																		parseFloat(e.currentTarget.value) || 0
																	)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
															/>
														</div>
													{:else if pair.tolerance?.type === 'relative'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-percentage-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Percentage (%)
																</label>
																<InfoIcon
																	tooltip="Numbers: the difference can be up to this percentage of the primary value. Example: 5% means $100 can match with values between $95 and $105. Text: similarity percentage. Example: 90 means 90% of characters must match."
																/>
															</div>
															<input
																id="tolerance-percentage-{index}"
																type="number"
																step="0.1"
																placeholder="0.5"
																value={pair.tolerance.percentage || ''}
																onchange={(e) =>
																	setRelativeTolerance(
																		index,
																		parseFloat(e.currentTarget.value) || 0
																	)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
															/>
														</div>
													{:else if pair.tolerance?.type === 'custom'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-formula-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Formula
																</label>
																<InfoIcon
																	tooltip="Write any expression that returns true (match) or false (no match). Use primaryColumnValue and comparisonColumnValue. Examples: Math.abs(primaryColumnValue - comparisonColumnValue) < 0.5 or primaryColumnValue.toLowerCase() === comparisonColumnValue.toLowerCase()"
																/>
															</div>
															<textarea
																id="tolerance-formula-{index}"
																placeholder="e.g., Math.abs(primaryColumnValue - comparisonColumnValue) <= 0.5"
																value={pair.tolerance.formula || ''}
																onchange={(e) => setCustomTolerance(index, e.currentTarget.value)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
																rows="2"
															></textarea>
															<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
																Allowed: numbers, operators (+, -, *, /, %), parentheses,
																primaryColumnValue, comparisonColumnValue
															</p>
														</div>
													{/if}

													{#if pair.tolerance}
														<p
															class="rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200"
														>
															{#if pair.tolerance.type === 'absolute'}
																✓ Absolute tolerance: Fixed difference of {pair.tolerance.value}
															{:else if pair.tolerance.type === 'relative'}
																✓ Relative tolerance: {pair.tolerance.percentage}% difference
																allowed
															{:else if pair.tolerance.type === 'custom'}
																✓ Custom formula enabled
															{/if}
														</p>
													{/if}
												</div>
											</div>
										</div>
									{:else}
										<div class="text-sm italic text-gray-500 dark:text-gray-400">
											No columns mapped yet
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Reconciliation Configuration Options -->
			<div
				class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
					Reconciliation Options
				</h3>
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					Configure how the reconciliation process should be performed.
				</p>

				<div class="space-y-4">
					<!-- Reverse Reconciliation -->
					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="reverse-reconciliation"
								type="checkbox"
								bind:checked={reverseReconciliation}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
							/>
						</div>
						<div class="ml-3 text-sm">
							<label
								for="reverse-reconciliation"
								class="font-medium text-gray-700 dark:text-gray-300"
							>
								Also do reverse reconciliation
							</label>
							<p class="text-gray-500 dark:text-gray-400">
								Check comparison file records against primary file records as well
							</p>
						</div>
					</div>

					<!-- Case Sensitivity -->
					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="case-sensitive"
								type="checkbox"
								bind:checked={caseSensitive}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="case-sensitive" class="font-medium text-gray-700 dark:text-gray-300">
								Consider case sensitivity
							</label>
							<p class="text-gray-500 dark:text-gray-400">
								Match text values with exact case (ABC ≠ abc)
							</p>
						</div>
					</div>

					<!-- Trim Values -->
					<div class="flex items-start">
						<div class="flex h-5 items-center">
							<input
								id="trim-values"
								type="checkbox"
								bind:checked={trimValues}
								class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
							/>
						</div>
						<div class="ml-3 text-sm">
							<label for="trim-values" class="font-medium text-gray-700 dark:text-gray-300">
								Trim whitespace from values
							</label>
							<p class="text-gray-500 dark:text-gray-400">
								Remove leading and trailing spaces before comparison (" 123 " matches "123")
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Action buttons -->
			<div class="flex items-center justify-between">
				<button
					onclick={goBack}
					class="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
				>
					← Back to Upload
				</button>

				<div>
					{#if !formValid && primaryIdPairValid}
						<p class="mb-2 text-right text-xs text-red-600 dark:text-red-400">
							Please complete or remove incomplete column pairs
						</p>
					{/if}
					<button
						onclick={applyMapping}
						class="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
						disabled={!formValid}
						class:opacity-50={!formValid}
						class:cursor-not-allowed={!formValid}
					>
						Continue to Summary →
					</button>
				</div>
			</div>
		</div>
	{:else}
		<!-- Loading or error state -->
		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="text-center">
				<p class="text-gray-500 dark:text-gray-400">Loading file data...</p>
			</div>
		</div>
	{/if}
</div>

<!-- Waitlist Modal -->
<WaitlistModal bind:isOpen={showWaitlistModal} />
