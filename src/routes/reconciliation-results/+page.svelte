<script lang="ts">
	import { onMount } from 'svelte';

	// Types for reconciliation results
	type ReconciliationStatus = 'success' | 'failure';

	interface ReconciliationRow {
		primaryRowIndex: number;
		comparisonRowIndex: number | null;
		primaryId: string;
		status: ReconciliationStatus;
		failureReason?: string;
		comparisonResults: {
			primaryColumn: string;
			comparisonColumn: string;
			primaryValue: string;
			comparisonValue: string;
			matches: boolean;
		}[];
	}

	// Mock reconciliation results
	let reconciliationResults = $state<ReconciliationRow[]>([
		{
			primaryRowIndex: 0,
			comparisonRowIndex: 0,
			primaryId: 'TX001',
			status: 'success',
			comparisonResults: [
				{
					primaryColumn: 'Date',
					comparisonColumn: 'Payment Date',
					primaryValue: '2023-01-01',
					comparisonValue: '01/01/2023',
					matches: true
				},
				{
					primaryColumn: 'Amount',
					comparisonColumn: 'Payment Amount',
					primaryValue: '$100.00',
					comparisonValue: '100.00',
					matches: true
				}
			]
		},
		{
			primaryRowIndex: 1,
			comparisonRowIndex: 1,
			primaryId: 'TX002',
			status: 'failure',
			failureReason: 'Amount mismatch',
			comparisonResults: [
				{
					primaryColumn: 'Date',
					comparisonColumn: 'Payment Date',
					primaryValue: '2023-01-02',
					comparisonValue: '01/02/2023',
					matches: true
				},
				{
					primaryColumn: 'Amount',
					comparisonColumn: 'Payment Amount',
					primaryValue: '$250.50',
					comparisonValue: '251.50',
					matches: false
				}
			]
		},
		{
			primaryRowIndex: 2,
			comparisonRowIndex: null,
			primaryId: 'TX003',
			status: 'failure',
			failureReason: 'No matching row found in comparison file',
			comparisonResults: []
		}
	]);

	// Summary statistics
	let totalRows = $state(0);
	let successCount = $state(0);
	let failureCount = $state(0);
	let successRate = $state(0);

	// UI state
	let selectedFilter = $state<'all' | 'success' | 'failure'>('all');
	let searchTerm = $state('');
	let filteredResults = $state<ReconciliationRow[]>([]);

	// Apply filters and calculate statistics
	$effect(() => {
		// Filter results based on selected filter and search term
		filteredResults = reconciliationResults.filter((row) => {
			const matchesFilter = selectedFilter === 'all' || row.status === selectedFilter;

			const matchesSearch =
				!searchTerm ||
				row.primaryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
				(row.failureReason && row.failureReason.toLowerCase().includes(searchTerm.toLowerCase()));

			return matchesFilter && matchesSearch;
		});

		// Calculate statistics
		totalRows = reconciliationResults.length;
		successCount = reconciliationResults.filter((row) => row.status === 'success').length;
		failureCount = reconciliationResults.filter((row) => row.status === 'failure').length;
		successRate = totalRows > 0 ? Math.round((successCount / totalRows) * 100) : 0;
	});

	// Download results as CSV
	function downloadResults() {
		// Create CSV content
		let csvContent = 'data:text/csv;charset=utf-8,';

		// Headers
		csvContent +=
			'Primary ID,Status,Failure Reason,Primary Columns,Comparison Columns,Primary Values,Comparison Values,Match\n';

		// Data rows
		reconciliationResults.forEach((row) => {
			if (row.comparisonResults.length > 0) {
				// Rows with comparison results
				row.comparisonResults.forEach((comp, index) => {
					if (index === 0) {
						// First comparison for this row
						csvContent += `"${row.primaryId}","${row.status}"`;
						csvContent += row.failureReason ? `,"${row.failureReason}"` : ',';
					} else {
						// Additional comparisons for the same row
						csvContent += `,,`;
					}

					csvContent += `,"${comp.primaryColumn}","${comp.comparisonColumn}","${comp.primaryValue}","${comp.comparisonValue}","${comp.matches}"\n`;
				});
			} else {
				// Rows without comparison results (like missing match)
				csvContent += `"${row.primaryId}","${row.status}","${row.failureReason || ''}",,,,,\n`;
			}
		});

		// Create download link
		const encodedUri = encodeURI(csvContent);
		const link = document.createElement('a');
		link.setAttribute('href', encodedUri);
		link.setAttribute('download', 'reconciliation_results.csv');
		document.body.appendChild(link);

		// Trigger download
		link.click();

		// Clean up
		document.body.removeChild(link);
	}

	// Handle filter changes
	function setFilter(filter: 'all' | 'success' | 'failure') {
		selectedFilter = filter;
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">Reconciliation Results</h1>

	<!-- Stats summary cards -->
	<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
		<div class="rounded-lg bg-white p-4 shadow-md">
			<h3 class="text-sm font-medium text-gray-500">Total Rows</h3>
			<p class="text-2xl font-bold text-gray-800">{totalRows}</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-md">
			<h3 class="text-sm font-medium text-gray-500">Successful Matches</h3>
			<p class="text-2xl font-bold text-green-600">{successCount}</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-md">
			<h3 class="text-sm font-medium text-gray-500">Failed Matches</h3>
			<p class="text-2xl font-bold text-red-600">{failureCount}</p>
		</div>

		<div class="rounded-lg bg-white p-4 shadow-md">
			<h3 class="text-sm font-medium text-gray-500">Success Rate</h3>
			<p class="text-2xl font-bold text-blue-600">{successRate}%</p>
		</div>
	</div>

	<!-- Controls section -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
		<div class="mb-4 flex flex-col items-center justify-between md:flex-row">
			<div class="mb-4 flex space-x-2 md:mb-0">
				<button
					on:click={() => setFilter('all')}
					class="rounded-md px-4 py-2 text-sm font-medium focus:outline-none"
					class:bg-blue-100={selectedFilter === 'all'}
					class:text-blue-800={selectedFilter === 'all'}
					class:bg-gray-100={selectedFilter !== 'all'}
					class:text-gray-800={selectedFilter !== 'all'}
				>
					All
				</button>
				<button
					on:click={() => setFilter('success')}
					class="rounded-md px-4 py-2 text-sm font-medium focus:outline-none"
					class:bg-green-100={selectedFilter === 'success'}
					class:text-green-800={selectedFilter === 'success'}
					class:bg-gray-100={selectedFilter !== 'success'}
					class:text-gray-800={selectedFilter !== 'success'}
				>
					Success
				</button>
				<button
					on:click={() => setFilter('failure')}
					class="rounded-md px-4 py-2 text-sm font-medium focus:outline-none"
					class:bg-red-100={selectedFilter === 'failure'}
					class:text-red-800={selectedFilter === 'failure'}
					class:bg-gray-100={selectedFilter !== 'failure'}
					class:text-gray-800={selectedFilter !== 'failure'}
				>
					Failures
				</button>
			</div>

			<div class="flex w-full space-x-2 md:w-auto">
				<input
					type="text"
					placeholder="Search by ID or failure reason..."
					bind:value={searchTerm}
					class="w-full rounded-md border px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none md:w-64"
				/>

				<button
					on:click={downloadResults}
					class="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
				>
					Download CSV
				</button>
			</div>
		</div>
	</div>

	<!-- Results table -->
	<div class="overflow-hidden rounded-lg bg-white shadow-md">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Primary ID
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Status
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Failure Reason
						</th>
						<th
							scope="col"
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
						>
							Details
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each filteredResults as row}
						<tr>
							<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
								{row.primaryId}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap">
								{#if row.status === 'success'}
									<span
										class="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 font-semibold text-green-800"
									>
										Success
									</span>
								{:else}
									<span
										class="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 font-semibold text-red-800"
									>
										Failure
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{row.failureReason || '-'}
							</td>
							<td class="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
								<details class="text-left">
									<summary class="cursor-pointer text-blue-600 hover:text-blue-900">
										View Details
									</summary>
									<div class="mt-2 rounded bg-gray-50 p-3">
										{#if row.comparisonResults.length > 0}
											<table class="min-w-full divide-y divide-gray-200">
												<thead class="bg-gray-100">
													<tr>
														<th
															scope="col"
															class="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
														>
															Primary Column
														</th>
														<th
															scope="col"
															class="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
														>
															Comparison Column
														</th>
														<th
															scope="col"
															class="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
														>
															Primary Value
														</th>
														<th
															scope="col"
															class="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
														>
															Comparison Value
														</th>
														<th
															scope="col"
															class="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
														>
															Match
														</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-gray-200 bg-white">
													{#each row.comparisonResults as comp}
														<tr>
															<td class="px-3 py-2 text-sm whitespace-nowrap"
																>{comp.primaryColumn}</td
															>
															<td class="px-3 py-2 text-sm whitespace-nowrap"
																>{comp.comparisonColumn}</td
															>
															<td class="px-3 py-2 text-sm whitespace-nowrap"
																>{comp.primaryValue}</td
															>
															<td class="px-3 py-2 text-sm whitespace-nowrap"
																>{comp.comparisonValue}</td
															>
															<td class="px-3 py-2 text-sm whitespace-nowrap">
																{#if comp.matches}
																	<span class="text-green-600">✓</span>
																{:else}
																	<span class="text-red-600">✗</span>
																{/if}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{:else}
											<p class="text-sm text-gray-500">No comparison data available.</p>
										{/if}
									</div>
								</details>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">
								No results found matching your filter criteria.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Back to home button -->
	<div class="mt-8 flex justify-center">
		<a
			href="/"
			class="rounded-md bg-gray-600 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:outline-none"
		>
			Back to Home
		</a>
	</div>
</div>
