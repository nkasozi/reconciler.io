<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import { reconcileData } from '$lib/utils/reconciliation';
	import type {
		ReconciliationResult,
		ComparisonMatch,
		MatchedRecordResult
	} from '$lib/utils/reconciliation';
	import type { ParsedFileData } from '$lib/utils/fileParser';

	// Reconciliation state
	let primaryFileData: ParsedFileData | null = null;
	let comparisonFileData: ParsedFileData | null = null;
	let reconciliationConfig = null;
	let reconciliationResult: ReconciliationResult | null = null;
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);

	// Simplified view of reconciliation results for display
	type ReconciliationStatus = 'success' | 'failure' | 'partial';

	interface ReconciliationRow {
		primaryId: string;
		status: ReconciliationStatus;
		primaryRecord: Record<string, string>;
		comparisonRecord: Record<string, string> | null;
		failureReason?: string;
		comparisonMatches: ComparisonMatch[];
	}

	let reconciliationRows = $state<ReconciliationRow[]>([]);

	// Summary statistics
	let summaryStats = $state({
		totalRecords: 0,
		matchedRecords: 0,
		unmatchedRecords: 0,
		partialMatchRecords: 0,
		matchPercentage: 0
	});

	// Filter state
	let filterStatus = $state<ReconciliationStatus | 'all'>('all');

	// Filtered results
	let filteredResults = $derived(
		filterStatus === 'all'
			? reconciliationRows
			: reconciliationRows.filter((row) => row.status === filterStatus)
	);

	onMount(async () => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			primaryFileData = state.primaryFileData;
			comparisonFileData = state.comparisonFileData;
			reconciliationConfig = state.reconciliationConfig;
			reconciliationResult = state.reconciliationResult;

			// Check if we have all the data we need
			if (!primaryFileData || !comparisonFileData || !reconciliationConfig) {
				errorMessage = 'Required data is missing. Please go back and complete the previous steps.';
				setTimeout(() => {
					goto('/upload');
				}, 2000);
				return;
			}

			// Perform reconciliation if we don't already have results
			if (!reconciliationResult) {
				performReconciliation();
			} else {
				// Use existing results
				processReconciliationResults(reconciliationResult);
				isLoading = false;
			}
		});

		// Cleanup subscription
		return () => {
			unsubscribe();
		};
	});

	async function performReconciliation() {
		isLoading = true;
		errorMessage = null;

		try {
			if (!primaryFileData || !comparisonFileData || !reconciliationConfig) {
				throw new Error('Missing required data for reconciliation');
			}

			// Perform the reconciliation
			const result = reconcileData(primaryFileData, comparisonFileData, reconciliationConfig);

			// Store result in the global store
			reconciliationStore.setResults(result);

			// Process results for display
			processReconciliationResults(result);
		} catch (error) {
			// Handle error
			if (error instanceof Error) {
				errorMessage = `Error performing reconciliation: ${error.message}`;
			} else {
				errorMessage = 'An unknown error occurred during reconciliation';
			}
			console.error('Reconciliation error:', error);
		} finally {
			isLoading = false;
		}
	}

	function processReconciliationResults(result: ReconciliationResult) {
		if (!reconciliationConfig || !primaryFileData) return;

		const primaryIdColumn = reconciliationConfig.primaryIdPair.primaryColumn;
		if (!primaryIdColumn) return;

		// Process matched records
		const matchedRows = result.matchedRecords.map((match) => {
			return createReconciliationRow(match, primaryIdColumn);
		});

		// Process unmatched primary records
		const unmatchedRows = result.unmatchedPrimaryRecords.map((record) => {
			return {
				primaryId: record[primaryIdColumn] || 'Unknown',
				status: 'failure' as ReconciliationStatus,
				primaryRecord: record,
				comparisonRecord: null,
				failureReason: 'No matching record found',
				comparisonMatches: []
			};
		});

		// Combine all rows
		reconciliationRows = [...matchedRows, ...unmatchedRows];

		// Update summary stats
		summaryStats = {
			totalRecords: result.summary.totalRecords,
			matchedRecords: result.summary.matchedRecords - result.summary.partiallyMatchedRecords,
			unmatchedRecords: result.summary.unmatchedRecords,
			partialMatchRecords: result.summary.partiallyMatchedRecords,
			matchPercentage: result.summary.matchPercentage
		};
	}

	function createReconciliationRow(
		match: MatchedRecordResult,
		primaryIdColumn: string
	): ReconciliationRow {
		return {
			primaryId: match.primaryRecord[primaryIdColumn] || 'Unknown',
			status: match.allMatch ? 'success' : 'partial',
			primaryRecord: match.primaryRecord,
			comparisonRecord: match.comparisonRecord,
			comparisonMatches: match.matches
		};
	}

	// Export to CSV
	function exportToCsv() {
		if (!reconciliationResult) return;

		const headers = [
			'Primary ID',
			'Status',
			'Primary Column',
			'Primary Value',
			'Comparison Column',
			'Comparison Value',
			'Matches'
		];

		const rows = reconciliationRows.flatMap((row) => {
			if (row.comparisonMatches.length === 0) {
				return [[row.primaryId, row.status, '', '', '', '', '']];
			}

			return row.comparisonMatches.map((comparison, index) => {
				if (index === 0) {
					return [
						row.primaryId,
						row.status,
						comparison.primaryColumn,
						comparison.primaryValue,
						comparison.comparisonColumn,
						comparison.comparisonValue,
						comparison.matches ? 'Yes' : 'No'
					];
				} else {
					return [
						'',
						'',
						comparison.primaryColumn,
						comparison.primaryValue,
						comparison.comparisonColumn,
						comparison.comparisonValue,
						comparison.matches ? 'Yes' : 'No'
					];
				}
			});
		});

		// Escape commas and quotes in CSV fields
		const escapeCsvField = (field: string) => {
			if (field === null || field === undefined) return '';
			const str = String(field);
			if (str.includes(',') || str.includes('"') || str.includes('\n')) {
				return `"${str.replace(/"/g, '""')}"`;
			}
			return str;
		};

		const csvContent =
			'data:text/csv;charset=utf-8,' +
			[headers.join(','), ...rows.map((row) => row.map(escapeCsvField).join(','))].join('\n');

		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', 'reconciliation_results.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="text-foreground dark:text-dark-foreground mb-6 text-center text-3xl font-bold">
		Reconciliation Results
	</h1>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="flex flex-col items-center">
				<div
					class="border-primary dark:border-dark-primary h-12 w-12 animate-spin rounded-full border-4 border-t-4 border-t-transparent dark:border-t-transparent"
				></div>
				<p class="mt-4 text-gray-600 dark:text-gray-400">Processing reconciliation...</p>
			</div>
		</div>
	{:else if errorMessage}
		<!-- Error state -->
		<div class="mx-auto mb-6 max-w-2xl">
			<div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
						<div class="mt-2 text-sm text-red-700 dark:text-red-300">
							<p>{errorMessage}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<!-- Results stats -->
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow dark:shadow-gray-800">
				<div class="flex items-center">
					<div class="flex-shrink-0 rounded-md bg-blue-100 p-3 dark:bg-blue-900/30">
						<svg
							class="h-6 w-6 text-blue-600 dark:text-blue-400"
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
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Records</p>
						<p class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
							{summaryStats.totalRecords}
						</p>
					</div>
				</div>
			</div>

			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow dark:shadow-gray-800">
				<div class="flex items-center">
					<div class="flex-shrink-0 rounded-md bg-green-100 p-3 dark:bg-green-900/30">
						<svg
							class="h-6 w-6 text-green-600 dark:text-green-400"
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
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Matched</p>
						<p class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
							{summaryStats.matchedRecords}
						</p>
					</div>
				</div>
			</div>

			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow dark:shadow-gray-800">
				<div class="flex items-center">
					<div class="flex-shrink-0 rounded-md bg-yellow-100 p-3 dark:bg-yellow-900/30">
						<svg
							class="h-6 w-6 text-yellow-600 dark:text-yellow-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							></path>
						</svg>
					</div>
					<div class="ml-5">
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Partial Matches</p>
						<p class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
							{summaryStats.partialMatchRecords}
						</p>
					</div>
				</div>
			</div>

			<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow dark:shadow-gray-800">
				<div class="flex items-center">
					<div class="flex-shrink-0 rounded-md bg-red-100 p-3 dark:bg-red-900/30">
						<svg
							class="h-6 w-6 text-red-600 dark:text-red-400"
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
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Unmatched</p>
						<p class="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-50">
							{summaryStats.unmatchedRecords}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Results controls -->
		<div class="mb-4 flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
			<div class="w-full md:w-1/3">
				<label for="filter" class="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">
					Filter by status:
				</label>
				<select
					id="filter"
					class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
					bind:value={filterStatus}
				>
					<option value="all">All Results</option>
					<option value="success">Matched</option>
					<option value="partial">Partially Matched</option>
					<option value="failure">Unmatched</option>
				</select>
			</div>

			<div>
				<button
					type="button"
					onclick={() => exportToCsv()}
					class="border-primary bg-primary hover:bg-primary-hover dark:border-dark-primary dark:bg-dark-primary dark:hover:bg-dark-primary-hover rounded border px-4 py-2 font-semibold text-white"
				>
					Export to CSV
				</button>
			</div>
		</div>

		<!-- Results table -->
		{#if filteredResults.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-800">
						<tr>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
							>
								Primary ID
							</th>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
							>
								Status
							</th>
							<th
								scope="col"
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
							>
								Details
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
						{#each filteredResults as row, rowIndex}
							<tr
								class={rowIndex % 2 === 0
									? 'bg-white dark:bg-gray-900'
									: 'bg-gray-50 dark:bg-gray-800'}
							>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
									{row.primaryId}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									{#if row.status === 'success'}
										<span
											class="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 font-semibold text-green-800 dark:bg-green-900/50 dark:text-green-400"
										>
											Matched
										</span>
									{:else if row.status === 'partial'}
										<span
											class="inline-flex rounded-full bg-yellow-100 px-2 text-xs leading-5 font-semibold text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400"
										>
											Partial Match
										</span>
									{:else}
										<span
											class="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 font-semibold text-red-800 dark:bg-red-900/50 dark:text-red-400"
										>
											Unmatched
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
									<button
										class="text-accent hover:text-accent-hover dark:text-dark-accent dark:hover:text-dark-accent-hover focus:outline-none"
										data-toggle="modal"
										data-target="modal-{rowIndex}"
										onclick={() => {
											const modal = document.getElementById(`modal-${rowIndex}`);
											if (modal) modal.classList.remove('hidden');
										}}
									>
										View Details
									</button>

									<!-- Modal for record details -->
									<div
										id="modal-{rowIndex}"
										class="fixed inset-0 z-50 hidden overflow-y-auto"
										aria-modal="true"
										role="dialog"
									>
										<div
											class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
										>
											<!-- Background overlay -->
											<div
												class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
												aria-hidden="true"
												onclick={() => {
													const modal = document.getElementById(`modal-${rowIndex}`);
													if (modal) modal.classList.add('hidden');
												}}
											></div>

											<!-- Modal panel -->
											<div
												class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle dark:bg-gray-800"
											>
												<div class="bg-white px-4 pt-5 pb-4 sm:p-6 dark:bg-gray-800">
													<div class="mb-3 flex justify-between">
														<h3
															class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
														>
															Record Details
														</h3>
														<button
															type="button"
															class="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
															onclick={() => {
																const modal = document.getElementById(`modal-${rowIndex}`);
																if (modal) modal.classList.add('hidden');
															}}
														>
															<span class="sr-only">Close</span>
															<svg
																class="h-6 w-6"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M6 18L18 6M6 6l12 12"
																/>
															</svg>
														</button>
													</div>

													<!-- Comparison details -->
													{#if row.comparisonRecord}
														<div class="mt-2">
															<h4 class="font-semibold text-gray-700 dark:text-gray-200">
																Comparison Results
															</h4>
															<div
																class="mt-2 overflow-hidden overflow-x-auto border border-gray-200 dark:border-gray-700"
															>
																<table
																	class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
																>
																	<thead class="bg-gray-50 dark:bg-gray-700">
																		<tr>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Primary Column
																			</th>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Primary Value
																			</th>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Comparison Column
																			</th>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Comparison Value
																			</th>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Match
																			</th>
																		</tr>
																	</thead>
																	<tbody
																		class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
																	>
																		{#each row.comparisonMatches as match, matchIndex}
																			<tr
																				class={matchIndex % 2 === 0
																					? 'bg-white dark:bg-gray-900'
																					: 'bg-gray-50 dark:bg-gray-800'}
																			>
																				<td
																					class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																				>
																					{match.primaryColumn}
																				</td>
																				<td
																					class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																				>
																					{match.primaryValue}
																				</td>
																				<td
																					class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																				>
																					{match.comparisonColumn}
																				</td>
																				<td
																					class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																				>
																					{match.comparisonValue}
																				</td>
																				<td class="px-4 py-2 text-sm whitespace-nowrap">
																					{#if match.matches}
																						<span
																							class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-400"
																						>
																							Yes
																						</span>
																					{:else}
																						<span
																							class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-400"
																						>
																							No
																						</span>
																					{/if}
																				</td>
																			</tr>
																		{/each}
																	</tbody>
																</table>
															</div>
														</div>
													{:else}
														<div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
															<div class="flex">
																<div class="flex-shrink-0">
																	<svg
																		class="h-5 w-5 text-red-400"
																		viewBox="0 0 20 20"
																		fill="currentColor"
																	>
																		<path
																			fill-rule="evenodd"
																			d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
																			clip-rule="evenodd"
																		/>
																	</svg>
																</div>
																<div class="ml-3">
																	<p class="text-sm text-red-700 dark:text-red-300">
																		{row.failureReason ||
																			'No matching record found in comparison file.'}
																	</p>
																</div>
															</div>
														</div>
													{/if}

													<!-- Primary Record Data -->
													<div class="mt-4">
														<h4 class="font-semibold text-gray-700 dark:text-gray-200">
															Primary Record Data
														</h4>
														<div
															class="mt-2 overflow-hidden overflow-x-auto border border-gray-200 dark:border-gray-700"
														>
															<table
																class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
															>
																<thead class="bg-gray-50 dark:bg-gray-700">
																	<tr>
																		<th
																			scope="col"
																			class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																		>
																			Column
																		</th>
																		<th
																			scope="col"
																			class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																		>
																			Value
																		</th>
																	</tr>
																</thead>
																<tbody
																	class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
																>
																	{#each Object.entries(row.primaryRecord) as [key, value], index}
																		<tr
																			class={index % 2 === 0
																				? 'bg-white dark:bg-gray-900'
																				: 'bg-gray-50 dark:bg-gray-800'}
																		>
																			<td
																				class="px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100"
																			>
																				{key}
																			</td>
																			<td
																				class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																			>
																				{value}
																			</td>
																		</tr>
																	{/each}
																</tbody>
															</table>
														</div>
													</div>

													<!-- Comparison Record Data (if exists) -->
													{#if row.comparisonRecord}
														<div class="mt-4">
															<h4 class="font-semibold text-gray-700 dark:text-gray-200">
																Comparison Record Data
															</h4>
															<div
																class="mt-2 overflow-hidden overflow-x-auto border border-gray-200 dark:border-gray-700"
															>
																<table
																	class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
																>
																	<thead class="bg-gray-50 dark:bg-gray-700">
																		<tr>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Column
																			</th>
																			<th
																				scope="col"
																				class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
																			>
																				Value
																			</th>
																		</tr>
																	</thead>
																	<tbody
																		class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800"
																	>
																		{#each Object.entries(row.comparisonRecord) as [key, value], index}
																			<tr
																				class={index % 2 === 0
																					? 'bg-white dark:bg-gray-900'
																					: 'bg-gray-50 dark:bg-gray-800'}
																			>
																				<td
																					class="px-4 py-2 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100"
																				>
																					{key}
																				</td>
																				<td
																					class="px-4 py-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300"
																				>
																					{value}
																				</td>
																			</tr>
																		{/each}
																	</tbody>
																</table>
															</div>
														</div>
													{/if}
												</div>
												<div
													class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700"
												>
													<button
														type="button"
														class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
														onclick={() => {
															const modal = document.getElementById(`modal-${rowIndex}`);
															if (modal) modal.classList.add('hidden');
														}}
													>
														Close
													</button>
												</div>
											</div>
										</div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div
				class="dark:bg-dark-background rounded-lg bg-white p-8 text-center shadow dark:shadow-gray-800"
			>
				<p class="text-gray-600 dark:text-gray-400">No results match the current filter.</p>
			</div>
		{/if}
	{/if}
</div>
