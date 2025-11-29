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

	// UI state
	let reverseReconciliation = $state(false);

	// UI flags
	let showWaitlistModal = $state(false);

	// Mapping state (mirrors ColumnMappingModal defaults)
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});

	let comparisonPairs = $state<ColumnPair[]>([
		{
			primaryColumn: null,
			comparisonColumn: null,
			tolerance: { type: 'exact_match' },
			settings: { caseSensitive: false, trimValues: true }
		}
	]);

	let selectedPrimaryColumn = $state<string | null>(null);
	let selectedComparisonColumn = $state<string | null>(null);
	let currentMappingType = $state<'id' | 'comparison'>('id');
	let currentPairIndex = $state<number>(0);

	// Validation & flash state
	let primaryIdPairValid = $state(false);
	let formValid = $state(false);
	let lastMatchedPrimary = $state<string | null>(null);
	let lastMatchedComparison = $state<string | null>(null);

	// Keep local store snapshot in sync
	onMount(() => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			// If either file is missing, send user back to upload
			if (!state.primaryFileData || !state.comparisonFileData) {
				goto('/upload');
				return;
			}

			primaryFile = state.primaryFileData;
			comparisonFile = state.comparisonFileData;

			// If config exists, hydrate mapping defaults
			if (state.reconciliationConfig) {
				const cfg = state.reconciliationConfig;
				primaryIdPair = cfg.primaryIdPair || primaryIdPair;
				comparisonPairs =
					cfg.comparisonPairs && cfg.comparisonPairs.length > 0
						? cfg.comparisonPairs
						: comparisonPairs;
				reverseReconciliation = !!cfg.reverseReconciliation;
			}
		});

		return unsubscribe;
	});

	// Reactive validation
	$effect(() => {
		primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
		validateForm();
	});

	function validateForm() {
		const isPrimaryIdValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;

		const validComparisonPairs = comparisonPairs.filter(
			(pair) => pair.primaryColumn && pair.comparisonColumn
		);

		const incompleteComparisonPairs = comparisonPairs.filter(
			(pair) =>
				(pair.primaryColumn && !pair.comparisonColumn) ||
				(!pair.primaryColumn && pair.comparisonColumn)
		);

		formValid = isPrimaryIdValid && incompleteComparisonPairs.length === 0;
	}

	// Column mapping state
	// ...existing column mapping UI lives in the template below

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
				comparisonPairs = [
					{
						primaryColumn: null,
						comparisonColumn: null,
						tolerance: { type: 'exact_match' },
						settings: { caseSensitive: false, trimValues: true }
					}
				];
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
			reverseReconciliation
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

	// Tolerance management functions (use explicit, non-null tolerance types)
	function setExactMatchTolerance(pairIndex: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = { type: 'exact_match' };
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setNumericRangeTolerance(pairIndex: number, value: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = { type: 'within_range', value };
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setNumericPercentageTolerance(pairIndex: number, percentage: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = { type: 'within_range_percentage', percentage };
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setStringSimilarityTolerance(pairIndex: number, percentage: number) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = { type: 'within_percentage_similarity', percentage };
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setCustomTolerance(pairIndex: number, formula: string) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.tolerance = { type: 'custom', formula };
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setPairCaseSensitive(pairIndex: number, caseSensitive: boolean) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.settings = pair.settings || { caseSensitive: false, trimValues: true };
			pair.settings.caseSensitive = caseSensitive;
			comparisonPairs[pairIndex] = pair;
		}
	}

	function setPairTrimValues(pairIndex: number, trimValues: boolean) {
		const pair = comparisonPairs[pairIndex];
		if (pair) {
			pair.settings = pair.settings || { caseSensitive: false, trimValues: true };
			pair.settings.trimValues = trimValues;
			comparisonPairs[pairIndex] = pair;
		}
	}

	// Helper functions for custom tolerance formula builder
	const operatorMap = {
		equals: '=',
		'less than': '<',
		'greater than': '>',
		'less than or equal': '<=',
		'greater than or equal': '>=',
		'not equal': '!='
	};

	function getOperator(formula: string): string {
		if (!formula) return '=';
		// Match operators: <=, >=, !=, ==, =, <, >
		const match = formula.match(/primaryColumnValue\s*(<=|>=|!=|==|=|<|>)\s*/);
		return match ? match[1] : '=';
	}

	function getOperatorLabel(operator: string): string {
		for (const [label, sym] of Object.entries(operatorMap)) {
			if (sym === operator) return label;
		}
		return 'equals';
	}

	function extractRHS(formula: string): string {
		if (!formula) return '';
		// Remove 'primaryColumnValue' and operator, keep the RHS
		const withoutPrimary = formula.replace(/primaryColumnValue\s*/, '');
		// Remove operator (<=, >=, !=, ==, =, <, >)
		const rhs = withoutPrimary.replace(/^(<=|>=|!=|==|=|<|>)\s*/, '');
		return rhs.trim();
	}

	// Helper: find a column's dataType from the parsed file objects
	function getColumnDataType(
		columnName: string | null,
		fileType: 'primary' | 'comparison'
	): string | null {
		if (!columnName) return null;
		const cols =
			fileType === 'primary' ? (primaryFile?.columns ?? []) : (comparisonFile?.columns ?? []);
		const col = cols.find((c: any) => c.name === columnName);
		return col?.dataType ?? null;
	}

	function isNumericType(dt: string | null) {
		return dt === 'number' || dt === 'date';
	}

	// Return allowed tolerance options for a given pair index based on mapped column data types
	function getAllowedToleranceOptions(pairIndex: number) {
		const pair = comparisonPairs[pairIndex];
		const primaryDt = getColumnDataType(pair?.primaryColumn ?? null, 'primary');
		const comparisonDt = getColumnDataType(pair?.comparisonColumn ?? null, 'comparison');

		const bothNumeric = isNumericType(primaryDt) && isNumericType(comparisonDt);
		const bothString = primaryDt === 'string' && comparisonDt === 'string';

		// Always include exact_match and custom
		const options: Array<{ value: string; label: string }> = [
			{ value: 'exact_match', label: 'Exact match' }
		];

		if (bothNumeric) {
			options.push({ value: 'within_range', label: 'Within range (fixed amount)' });
			options.push({ value: 'within_range_percentage', label: 'Within percentage (numeric)' });
		} else if (bothString) {
			options.push({
				value: 'within_percentage_similarity',
				label: 'Similarity percentage (text)'
			});
		} else {
			// Mixed types: expose both numeric and similarity options so user can pick appropriate
			options.push({ value: 'within_range', label: 'Within range (fixed amount)' });
			options.push({ value: 'within_range_percentage', label: 'Within percentage (numeric)' });
			options.push({
				value: 'within_percentage_similarity',
				label: 'Similarity percentage (text)'
			});
		}

		options.push({ value: 'custom', label: 'Custom Formula' });
		return options;
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
								class:bg-green-100={lastMatchedPrimary === column.name}
								class:border-green-400={lastMatchedPrimary === column.name}
								class:shadow-lg={lastMatchedPrimary === column.name}
								class:ring-2={lastMatchedPrimary === column.name ||
									(isColumnSelected(column.name, 'primary') && lastMatchedPrimary !== column.name)}
								class:ring-green-300={lastMatchedPrimary === column.name}
								class:ring-blue-300={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:bg-green-800={lastMatchedPrimary === column.name}
								class:dark:border-green-600={lastMatchedPrimary === column.name}
								class:dark:ring-green-600={lastMatchedPrimary === column.name}
								class:bg-blue-100={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:border-blue-400={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:shadow-md={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:bg-blue-800={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:border-blue-600={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:ring-blue-600={isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:bg-amber-50={selectedComparisonColumn &&
									!isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:border-amber-200={selectedComparisonColumn &&
									!isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:bg-amber-800={selectedComparisonColumn &&
									!isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:dark:border-amber-800={selectedComparisonColumn &&
									!isColumnSelected(column.name, 'primary') &&
									lastMatchedPrimary !== column.name}
								class:bg-white={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								class:border-gray-200={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								class:dark:bg-gray-800={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								class:dark:border-gray-600={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								class:hover:bg-gray-100={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								class:dark:hover:bg-gray-700={!isColumnSelected(column.name, 'primary') &&
									!selectedComparisonColumn &&
									lastMatchedPrimary !== column.name}
								onclick={() => selectColumn(column.name, 'primary')}
							>
								<div>
									<span class="font-medium text-gray-800 dark:text-white">{column.name}</span>
									{#if isColumnUsed(column.name, 'primary')}
										<span
											class="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
										>
											{getColumnUsageDescription(column.name, 'primary')}
										</span>
									{/if}
								</div>

								{#if lastMatchedPrimary === column.name}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-green-600 dark:text-green-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-green-500"></span>
									</div>
								{:else if isColumnSelected(column.name, 'primary')}
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
								class:bg-green-100={lastMatchedComparison === column.name}
								class:border-green-400={lastMatchedComparison === column.name}
								class:shadow-lg={lastMatchedComparison === column.name}
								class:ring-2={lastMatchedComparison === column.name ||
									(isColumnSelected(column.name, 'comparison') &&
										lastMatchedComparison !== column.name)}
								class:ring-green-300={lastMatchedComparison === column.name}
								class:ring-purple-300={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:bg-green-800={lastMatchedComparison === column.name}
								class:dark:border-green-600={lastMatchedComparison === column.name}
								class:dark:ring-green-600={lastMatchedComparison === column.name}
								class:bg-purple-100={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:border-purple-400={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:shadow-md={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:bg-purple-800={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:border-purple-600={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:ring-purple-600={isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:bg-amber-50={selectedPrimaryColumn &&
									!isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:border-amber-200={selectedPrimaryColumn &&
									!isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:bg-amber-800={selectedPrimaryColumn &&
									!isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:dark:border-amber-800={selectedPrimaryColumn &&
									!isColumnSelected(column.name, 'comparison') &&
									lastMatchedComparison !== column.name}
								class:bg-white={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								class:border-gray-200={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								class:dark:bg-gray-800={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								class:dark:border-gray-600={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								class:hover:bg-gray-100={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								class:dark:hover:bg-gray-700={!isColumnSelected(column.name, 'comparison') &&
									!selectedPrimaryColumn &&
									lastMatchedComparison !== column.name}
								onclick={() => selectColumn(column.name, 'comparison')}
							>
								<div class="flex items-center gap-2">
									<span class="font-medium text-gray-800 dark:text-white">{column.name}</span>
									{#if column.dataType}
										<span
											class="ml-2 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200"
										>
											{column.dataType}
										</span>
									{/if}
									{#if isColumnUsed(column.name, 'comparison')}
										<span
											class="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
										>
											{getColumnUsageDescription(column.name, 'comparison')}
										</span>
									{/if}
								</div>

								{#if lastMatchedComparison === column.name}
									<div class="flex items-center gap-1">
										<span class="text-xs font-bold text-green-600 dark:text-green-300">✓</span>
										<span class="h-3 w-3 animate-pulse rounded-full bg-green-500"></span>
									</div>
								{:else if isColumnSelected(column.name, 'comparison')}
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
														tooltip="Define how much difference is acceptable when matching: Exact match, within range (fixed amount), within percentage, or a custom formula."
													/>
												</div>
												<div class="space-y-3">
													<select
														onchange={(e) => {
															const value = e.currentTarget.value;
															if (value === '' || value === 'exact_match') {
																setExactMatchTolerance(index);
															} else if (value === 'within_range') {
																setNumericRangeTolerance(index, 0.01);
															} else if (value === 'within_range_percentage') {
																setNumericPercentageTolerance(index, 0.5);
															} else if (value === 'within_percentage_similarity') {
																setStringSimilarityTolerance(index, 0.9);
															} else if (value === 'custom') {
																setCustomTolerance(index, '');
															}
														}}
														class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
													>
														{#each getAllowedToleranceOptions(index) as opt}
															<option
																value={opt.value}
																selected={pair.tolerance?.type === opt.value}
															>
																{opt.label}
															</option>
														{/each}
													</select>

													{#if pair.tolerance?.type === 'within_range'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-value-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Tolerance Value
																</label>
																<InfoIcon
																	tooltip="Numbers: the difference can be up to this amount. Example: 0.01 allows amounts like $100.00 and $100.01 to match."
																/>
															</div>
															<input
																id="tolerance-value-{index}"
																type="number"
																step="0.01"
																placeholder="0.01"
																value={pair.tolerance.value || ''}
																onchange={(e) =>
																	setNumericRangeTolerance(
																		index,
																		parseFloat(e.currentTarget.value) || 0
																	)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
															/>
														</div>
													{:else if pair.tolerance?.type === 'within_range_percentage'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-percentage-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Percentage (%)
																</label>
																<InfoIcon
																	tooltip="Numbers: the difference can be up to this percentage of the primary value. Example: 0.05 (5%) means $100 can match with values between $95 and $105. For text similarity use the Similarity option."
																/>
															</div>
															<input
																id="tolerance-percentage-{index}"
																type="number"
																step="0.1"
																placeholder="0.5"
																value={pair.tolerance.percentage || ''}
																onchange={(e) =>
																	setNumericPercentageTolerance(
																		index,
																		parseFloat(e.currentTarget.value) || 0
																	)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
															/>
														</div>
													{:else if pair.tolerance?.type === 'within_percentage_similarity'}
														<div>
															<div class="flex items-center gap-2">
																<label
																	for="tolerance-similarity-{index}"
																	class="text-xs text-gray-600 dark:text-gray-400"
																>
																	Similarity (0-1)
																</label>
																<InfoIcon
																	tooltip="Text similarity score from 0 to 1 (e.g., 0.9 for 90% similarity)."
																/>
															</div>
															<input
																id="tolerance-similarity-{index}"
																type="number"
																step="0.01"
																placeholder="0.9"
																value={pair.tolerance.percentage || ''}
																onchange={(e) =>
																	setStringSimilarityTolerance(
																		index,
																		parseFloat(e.currentTarget.value) || 0
																	)}
																class="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
															/>
														</div>
													{:else if pair.tolerance?.type === 'custom'}
														<div>
															<div class="flex items-center gap-2">
																<label class="text-xs text-gray-600 dark:text-gray-400">
																	Formula Builder
																</label>
																<InfoIcon
																	tooltip="Use the template to build a formula. Select a comparison operator and enter an expression. Example: 'less than or equal' + '100' creates 'primaryColumnValue <= 100'"
																/>
															</div>
															<div
																class="mt-2 space-y-2 rounded-md border border-gray-300 bg-gray-50 p-3 dark:border-gray-500 dark:bg-gray-700"
															>
																<!-- Template display showing primaryColumnValue -->
																<div class="flex items-center gap-2">
																	<span
																		class="rounded bg-blue-100 px-2 py-1 font-mono text-xs font-medium text-blue-900 dark:bg-blue-900 dark:text-blue-100"
																	>
																		primaryColumnValue
																	</span>

																	<!-- Operator select -->
																	<select
																		onchange={(e) => {
																			const label = e.currentTarget.value;
																			const operator =
																				operatorMap[label as keyof typeof operatorMap];
																			const rhs = extractRHS(pair.tolerance?.formula || '');
																			setCustomTolerance(
																				index,
																				`primaryColumnValue${operator}${rhs}`
																			);
																		}}
																		class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
																	>
																		{#each Object.keys(operatorMap) as label}
																			<option
																				value={label}
																				selected={getOperatorLabel(
																					getOperator(pair.tolerance?.formula || '')
																				) === label}
																			>
																				{label}
																			</option>
																		{/each}
																	</select>

																	<!-- RHS expression input -->
																	<input
																		type="text"
																		placeholder="e.g. comparisonColumnValue * 1.05"
																		value={extractRHS(pair.tolerance?.formula || '')}
																		onchange={(e) => {
																			const operator = getOperator(pair.tolerance?.formula || '');
																			const rhs = e.currentTarget.value;
																			setCustomTolerance(
																				index,
																				`primaryColumnValue${operator}${rhs}`
																			);
																		}}
																		class="flex-1 rounded border border-gray-300 px-2 py-1 font-mono text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-300"
																	/>
																</div>
																<p class="text-xs text-gray-500 dark:text-gray-400">
																	<strong>Example:</strong> Choose 'less than or equal' and enter '100'
																	to create: primaryColumnValue &lt;= 100
																</p>
															</div>

															<!-- Optional: Show the full formula being generated -->
															<div class="mt-2 rounded-md bg-gray-100 p-2 dark:bg-gray-800">
																<p class="font-mono text-xs text-gray-600 dark:text-gray-400">
																	Formula: <strong
																		>{pair.tolerance.formula || 'primaryColumnValue = '}</strong
																	>
																</p>
															</div>
														</div>
													{/if}

													{#if pair.tolerance}
														<p
															class="rounded bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-200"
														>
															{#if pair.tolerance.type === 'exact_match'}
																✓ Exact match required
															{:else if pair.tolerance.type === 'within_range'}
																✓ Within fixed difference: {pair.tolerance.value}
															{:else if pair.tolerance.type === 'within_range_percentage'}
																✓ Within percentage difference: {pair.tolerance.percentage}
															{:else if pair.tolerance.type === 'within_percentage_similarity'}
																✓ Text similarity threshold: {pair.tolerance.percentage}
															{:else if pair.tolerance.type === 'custom'}
																✓ Custom formula enabled
															{/if}
														</p>
													{/if}

													<!-- Per-pair text comparison settings -->
													<div class="mt-3 flex items-center gap-4">
														<label class="inline-flex items-center text-sm">
															<input
																type="checkbox"
																checked={pair.settings?.caseSensitive}
																onchange={(e) =>
																	setPairCaseSensitive(index, e.currentTarget.checked)}
																class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
															/>
															<span class="ml-2 text-xs text-gray-700 dark:text-gray-300"
																>Case Sensitive</span
															>
														</label>

														<label class="inline-flex items-center text-sm">
															<input
																type="checkbox"
																checked={pair.settings?.trimValues}
																onchange={(e) => setPairTrimValues(index, e.currentTarget.checked)}
																class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
															/>
															<span class="ml-2 text-xs text-gray-700 dark:text-gray-300"
																>Trim Values</span
															>
														</label>
													</div>
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

					<!-- Per-pair text comparison settings -->
					<div
						class="rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/30"
					>
						Case sensitivity and trimming are configured per comparison pair. Edit each comparison
						pair to set "Case Sensitive" and "Trim Values" as needed.
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
