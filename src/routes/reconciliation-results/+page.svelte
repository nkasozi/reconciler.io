<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ColumnPair, RowMatchResult } from '$lib/utils/reconciliation';

	// Function to download reconciliation results as CSV
	function downloadResults() {
		// Get data from store
		const data = reconciliationStore.getSnapshot();
		if (!data || !data.reconciliationResults) {
			alert('No reconciliation data found');
			return;
		}

		// Prepare the results
		const primaryData = data.primaryFileData;
		if (!primaryData || !primaryData.rows) {
			alert('Primary file data is missing');
			return;
		}

		// Create results with status and reasons
		const results = primaryData.rows.map((row) => {
			// Find the reconciliation result for this row
			const idColumnName = data.reconciliationConfig?.primaryIdPair.primaryColumn;
			if (!idColumnName)
				return {
					...row,
					__ReconciliationStatus: 'Error',
					__ReconciliationReason: 'Missing configuration'
				};

			const id = row[idColumnName];
			const matchResult = data.reconciliationResults.matches.find((m) => m.idValues.primary === id);

			let status = 'Not Found';
			let reason = 'No matching record in comparison file';

			if (matchResult) {
				if (matchResult.matchScore === 100) {
					status = 'Match';
					reason = 'All fields match';
				} else {
					status = 'Partial Match';

					// Create detailed reason text
					const mismatchedColumns = [];
					for (const [col, result] of Object.entries(matchResult.comparisonResults)) {
						if (!result.match) {
							mismatchedColumns.push(`${col}: ${result.primaryValue} ≠ ${result.comparisonValue}`);
						}
					}

					reason = mismatchedColumns.join('; ');
				}
			}

			return {
				...row,
				__ReconciliationStatus: status,
				__ReconciliationReason: reason
			};
		});

		// Convert to CSV
		const headers = Object.keys(results[0]);
		let csvContent = headers.join(',') + '\n';

		results.forEach((row) => {
			const values = headers.map((header) => {
				const val = row[header] || '';
				// Escape values with commas or quotes
				if (val.toString().includes(',') || val.toString().includes('"')) {
					return `"${val.toString().replace(/"/g, '""')}"`;
				}
				return val;
			});
			csvContent += values.join(',') + '\n';
		});

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		// Set download attributes
		const fileName = `reconciled_results_${new Date().toISOString().slice(0, 10)}.csv`;
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';

		// Trigger download
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	// Record tracking state
	let currentFailureIndex = $state(0);
	let totalFailures = $state(0);
	let primaryData = $state<Record<string, string>[]>([]);
	let comparisonData = $state<Record<string, string>[]>([]);
	let reconciliationResults = $state<RowMatchResult[]>([]);
	let failureResults = $state<RowMatchResult[]>([]);
	let primaryIdColumn = $state<string | null>(null);
	let comparisonIdColumn = $state<string | null>(null);
	let comparisonPairs = $state<ColumnPair[]>([]);

	// UI state
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let activePrimaryRowId = $state<string | null>(null);
	let activeComparisonRowId = $state<string | null>(null);
	let activeColumnPair = $state<ColumnPair | null>(null);

	// Summary statistics
	let summaryStats = $state({
		totalRecords: 0,
		matchedRecords: 0,
		unmatchedRecords: 0,
		partialMatchRecords: 0,
		matchPercentage: 0
	});

	// Filter state
	let filterStatus = $state<string>('failures');

	onMount(async () => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			if (!state.primaryFileData || !state.comparisonFileData || !state.reconciliationConfig) {
				errorMessage = 'Required data is missing. Please go back and complete the previous steps.';
				setTimeout(() => {
					goto('/upload');
				}, 2000);
				return;
			}

			if (!state.reconciliationResult) {
				errorMessage = 'No reconciliation results found. Please perform reconciliation first.';
				setTimeout(() => {
					goto('/upload');
				}, 2000);
				return;
			}

			// Load the data and results
			primaryData = state.primaryFileData.rows;
			comparisonData = state.comparisonFileData.rows;
			primaryIdColumn = state.reconciliationConfig.primaryIdPair.primaryColumn;
			comparisonIdColumn = state.reconciliationConfig.primaryIdPair.comparisonColumn;
			comparisonPairs = state.reconciliationConfig.comparisonPairs;
			reconciliationResults = state.reconciliationResult.matches;

			// Calculate failure results
			failureResults = [
				...reconciliationResults.filter((result) => result.matchScore < 100), // Partial matches
				...state.reconciliationResult.unmatchedPrimary.map((row) => ({
					primaryRow: row,
					comparisonRow: null,
					idValues: {
						primary: row[primaryIdColumn],
						comparison: ''
					},
					comparisonResults: {},
					matchScore: 0
				}))
			];
			console.log(
				'Found failures:',
				failureResults.length,
				'out of',
				reconciliationResults.length,
				'total records'
			);
			totalFailures = failureResults.length;

			// Set the first failure as active if there are any
			if (totalFailures > 0) {
				navigateToFailure(0);
			}

			// Calculate summary statistics
			summaryStats = {
				totalRecords: state.reconciliationResult.summary.totalPrimaryRows,
				matchedRecords:
					state.reconciliationResult.summary.matchedRows -
					failureResults.filter((r) => r.matchScore < 100 && r.matchScore > 0).length,
				unmatchedRecords: state.reconciliationResult.summary.unmatchedPrimaryRows,
				partialMatchRecords: failureResults.filter((r) => r.matchScore < 100 && r.matchScore > 0)
					.length,
				matchPercentage: state.reconciliationResult.summary.matchPercentage
			};

			isLoading = false;
		});

		// Cleanup subscription
		return () => {
			unsubscribe();
		};
	});

	// Navigate to a specific failure
	function navigateToFailure(index: number) {
		if (failureResults.length === 0) return;

		// Ensure index is within bounds
		if (index < 0) index = 0;
		if (index >= failureResults.length) index = failureResults.length - 1;

		currentFailureIndex = index;
		const failure = failureResults[index];

		// Set active records for highlighting
		if (failure) {
			activePrimaryRowId = failure.idValues.primary;
			activeComparisonRowId = failure.idValues.comparison;

			// Find the first mismatched column pair
			for (const [columnName, comparison] of Object.entries(failure.comparisonResults)) {
				if (!comparison.match) {
					const pair = comparisonPairs.find((p) => p.primaryColumn === columnName);
					if (pair) {
						activeColumnPair = pair;
						break;
					}
				}
			}

			// Scroll to the primary row
			scrollToRow('primary-table', activePrimaryRowId);

			// Scroll to the comparison row if it exists
			if (activeComparisonRowId) {
				scrollToRow('comparison-table', activeComparisonRowId);
			}
		}
	}

	// Navigate to next failure
	function nextFailure() {
		navigateToFailure(currentFailureIndex + 1);
	}

	// Navigate to previous failure
	function prevFailure() {
		navigateToFailure(currentFailureIndex - 1);
	}

	// Scroll to a specific row
	function scrollToRow(tableId: string, rowId: string) {
		setTimeout(() => {
			const table = document.getElementById(tableId);
			const row = document.getElementById(`${tableId}-row-${rowId}`);
			if (table && row) {
				table.scrollTo({
					top: row.offsetTop - table.offsetTop - 50,
					behavior: 'smooth'
				});
			}
		}, 100);
	}

	// Format cell based on match status
	function getCellClass(rowId: string, columnName: string, isComparison: boolean = false) {
		if (!activePrimaryRowId || !activeColumnPair) return '';

		// Only highlight for the active row
		if (isComparison) {
			if (rowId !== activeComparisonRowId) return '';
		} else {
			if (rowId !== activePrimaryRowId) return '';
		}

		// Check if this is the highlighted column
		const columnToCheck = isComparison
			? activeColumnPair.comparisonColumn
			: activeColumnPair.primaryColumn;

		if (columnName === columnToCheck) {
			// This is the highlighted cell with more vibrant color
			return 'bg-red-500/30 text-red-200 font-bold';
		}

		return '';
	}

	// Check if a row is the active one
	function isActiveRow(rowId: string, isComparison: boolean = false) {
		return isComparison ? rowId === activeComparisonRowId : rowId === activePrimaryRowId;
	}
</script>

<div class="relative min-h-screen bg-gray-900 py-8 text-white">
	<!-- Desktop SVG illustrations (with lower opacity for background) -->
	<div class="hidden md:block">
		<img
			src="/images/details.svg"
			alt="Details illustration"
			class="absolute top-[60%] right-0 z-0 max-w-sm -translate-y-1/2 px-16 opacity-10"
		/>
	</div>

	<div class="hidden md:block">
		<img
			src="/images/reconcile.svg"
			alt="Reconcile illustration"
			class="absolute top-[60%] left-0 z-0 max-w-xs -translate-y-1/2 px-16 opacity-10"
		/>
	</div>

	<div class="container mx-auto max-w-7xl px-4 py-8">
		<h1 class="mb-6 text-center text-3xl font-bold text-white">Reconciliation Failure Analysis</h1>

		<!-- Loading state -->
		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="flex flex-col items-center">
					<div
						class="h-12 w-12 animate-spin rounded-full border-4 border-t-4 border-blue-500 border-t-transparent"
					></div>
					<p class="mt-4 text-gray-300">Loading reconciliation data...</p>
				</div>
			</div>
		{:else if errorMessage}
			<!-- Error state -->
			<div class="mx-auto mb-6 max-w-2xl">
				<div class="rounded-md bg-red-900/30 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-300">Error</h3>
							<div class="mt-2 text-sm text-red-200">
								<p>{errorMessage}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<!-- Results stats -->
			<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div class="rounded-lg bg-gray-800 p-4 shadow">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-blue-900/30 p-3">
							<svg
								class="h-6 w-6 text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								></path>
							</svg>
						</div>
						<div class="ml-5">
							<p class="text-sm font-medium text-gray-300">Total Records</p>
							<p class="mt-1 text-xl font-semibold text-white">
								{summaryStats.totalRecords}
							</p>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-gray-800 p-4 shadow">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-green-900/30 p-3">
							<svg
								class="h-6 w-6 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path>
							</svg>
						</div>
						<div class="ml-5">
							<p class="text-sm font-medium text-gray-300">Matched</p>
							<p class="mt-1 text-xl font-semibold text-white">
								{summaryStats.matchedRecords}
							</p>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-gray-800 p-4 shadow">
					<div class="flex items-center">
						<div class="flex-shrink-0 rounded-md bg-red-900/30 p-3">
							<svg
								class="h-6 w-6 text-red-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</div>
						<div class="ml-5">
							<p class="text-sm font-medium text-gray-300">Failures</p>
							<p class="mt-1 text-xl font-semibold text-white">
								{totalFailures}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Failure navigation -->
			{#if totalFailures > 0}
				<div class="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800 dark:shadow-gray-700">
					<div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
						<div class="flex items-center gap-3">
							<span class="text-lg font-medium text-gray-800 dark:text-gray-200"
								>Failure {currentFailureIndex + 1} of {totalFailures}</span
							>
							<div class="flex flex-1 gap-2">
								<button
									on:click={prevFailure}
									disabled={currentFailureIndex === 0}
									class="rounded bg-gray-400 px-3 py-1 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-400 dark:hover:bg-gray-600"
									aria-label="Previous failure"
								>
									<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
								<button
									on:click={nextFailure}
									disabled={currentFailureIndex === totalFailures - 1}
									class="rounded bg-gray-400 px-3 py-1 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-400 dark:hover:bg-gray-600"
									aria-label="Next failure"
								>
									<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							</div>
						</div>

						<div>
							<!-- Download results button -->
							<button
								on:click={downloadResults}
								class="btn-breathing transform rounded-lg border-2 border-green-500 bg-green-500 px-4 py-2 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600"
							>
								Download Results
							</button>
						</div>
					</div>

					<!-- Current failure details -->
					{#if currentFailureIndex >= 0 && currentFailureIndex < failureResults.length}
						{@const currentFailure = failureResults[currentFailureIndex]}
						{@const matchScore = currentFailure.matchScore}
						<div class="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
							<div class="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-800 dark:text-gray-200">
										{primaryIdColumn}: {currentFailure.idValues.primary}
									</h3>
									{#if currentFailure.comparisonRow}
										<p class="text-gray-600 dark:text-gray-400">
											Match Score: {matchScore}%
										</p>
									{:else}
										<p class="font-medium text-red-600 dark:text-red-400">
											No matching record found in comparison file
										</p>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if matchScore === 0}
										<span
											class="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300"
										>
											No Match
										</span>
									{:else if matchScore < 100}
										<span
											class="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
										>
											Partial Match
										</span>
									{/if}
								</div>
							</div>

							<!-- Failure reasons -->
							{#if currentFailure.comparisonRow && Object.keys(currentFailure.comparisonResults).length > 0}
								<div
									class="mb-4 max-h-60 overflow-auto rounded border border-gray-200 dark:border-gray-700"
								>
									<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead class="bg-gray-50 dark:bg-gray-800">
											<tr>
												<th
													class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
													>Primary Column</th
												>
												<th
													class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
													>Primary Value</th
												>
												<th
													class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
													>Comparison Column</th
												>
												<th
													class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
													>Comparison Value</th
												>
												<th
													class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
													>Match</th
												>
											</tr>
										</thead>
										<tbody
											class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
										>
											{#each Object.entries(currentFailure.comparisonResults) as [column, result], i}
												<tr
													class={i % 2 === 0
														? 'bg-white dark:bg-gray-900'
														: 'bg-gray-50 dark:bg-gray-800'}
												>
													<td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-200"
														>{column}</td
													>
													<td class="px-3 py-2 text-sm text-gray-700 dark:text-gray-400"
														>{result.primaryValue}</td
													>
													<td class="px-3 py-2 text-sm text-gray-900 dark:text-gray-200">
														{comparisonPairs.find((p) => p.primaryColumn === column)
															?.comparisonColumn || ''}
													</td>
													<td class="px-3 py-2 text-sm text-gray-700 dark:text-gray-400"
														>{result.comparisonValue}</td
													>
													<td class="px-3 py-2 text-sm">
														{#if result.match}
															<span
																class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
															>
																Match
															</span>
														{:else}
															<span
																class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300"
															>
																Mismatch
															</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div class="mb-6 rounded-lg bg-green-50 p-4 text-center shadow dark:bg-green-900/20">
					<svg
						class="mx-auto mb-2 h-12 w-12 text-green-500 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
						></path>
					</svg>
					<h2 class="text-xl font-semibold text-green-800 dark:text-green-300">
						No Failures Found
					</h2>
					<p class="mt-2 text-green-600 dark:text-green-400">All records matched successfully!</p>
					<div class="mt-4">
						<button
							on:click={downloadResults}
							class="btn-breathing transform rounded-lg border-2 border-green-500 bg-green-500 px-4 py-2 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600"
						>
							Download Results
						</button>
					</div>
				</div>
			{/if}

			<!-- Data tables -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				<!-- Primary table -->
				<div
					class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 dark:shadow-gray-700"
				>
					<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
						<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
							Primary File Data
						</h2>
					</div>
					<div id="primary-table" class="max-h-[600px] overflow-auto">
						{#if primaryData.length > 0 && primaryIdColumn}
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
									<tr>
										{#each Object.keys(primaryData[0]) as column}
											<th
												class="px-3 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase dark:text-gray-400"
											>
												{column}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#each primaryData as row, i}
										{@const rowId = row[primaryIdColumn]}
										<tr
											id="primary-table-row-{rowId}"
											class="{i % 2 === 0
												? 'bg-white dark:bg-gray-900'
												: 'bg-gray-50 dark:bg-gray-800'} 
										{isActiveRow(rowId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
										>
											{#each Object.entries(row) as [column, value]}
												<td
													class="px-3 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400 {getCellClass(
														rowId,
														column
													)}"
												>
													{value}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						{:else}
							<div class="p-4 text-center text-gray-600 dark:text-gray-400">
								No primary data available.
							</div>
						{/if}
					</div>
				</div>

				<!-- Comparison table -->
				<div
					class="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 dark:shadow-gray-700"
				>
					<div class="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
						<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
							Comparison File Data
						</h2>
					</div>
					<div id="comparison-table" class="max-h-[600px] overflow-auto">
						{#if comparisonData.length > 0 && comparisonIdColumn}
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
									<tr>
										{#each Object.keys(comparisonData[0]) as column}
											<th
												class="px-3 py-3 text-left text-xs font-medium tracking-wider whitespace-nowrap text-gray-500 uppercase dark:text-gray-400"
											>
												{column}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#each comparisonData as row, i}
										{@const rowId = row[comparisonIdColumn]}
										<tr
											id="comparison-table-row-{rowId}"
											class="{i % 2 === 0
												? 'bg-white dark:bg-gray-900'
												: 'bg-gray-50 dark:bg-gray-800'} 
										{isActiveRow(rowId, true) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
										>
											{#each Object.entries(row) as [column, value]}
												<td
													class="px-3 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400 {getCellClass(
														rowId,
														column,
														true
													)}"
												>
													{value}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						{:else}
							<div class="p-4 text-center text-gray-600 dark:text-gray-400">
								No comparison data available.
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Button animation */
	@keyframes btn-breathing {
		0% {
			transform: scale(1);
			box-shadow: 0 5px 15px rgba(46, 213, 115, 0.2);
		}
		50% {
			transform: scale(1.03);
			box-shadow: 0 10px 20px rgba(46, 213, 115, 0.4);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 5px 15px rgba(46, 213, 115, 0.2);
		}
	}

	.btn-breathing {
		animation: btn-breathing 4s ease-in-out infinite;
		box-shadow: 0 5px 15px rgba(46, 213, 115, 0.3);
	}

	/* Add smooth scrolling to tables */
	#primary-table,
	#comparison-table {
		scroll-behavior: smooth;
	}
</style>
