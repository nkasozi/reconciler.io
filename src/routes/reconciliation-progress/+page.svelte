<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ColumnPair } from '$lib/utils/reconciliation';

	// Reconciliation state
	let primaryFileName = $state('');
	let comparisonFileName = $state('');
	let totalRows = $state(0);
	let processedRows = $state(0);
	let progressPercentage = $derived(
		totalRows ? Math.min(100, Math.round((processedRows / totalRows) * 100)) : 0
	);
	let isReconciliationComplete = $state(false);
	let matchingLogs = $state<MatchLog[]>([]);
	let matchingSpeed = $state(0); // rows per second
	let estimatedTimeLeft = $state('');
	let startTime = $state(0);
	let lastLogTimestamp = $state(0);
	let stuckDetectionTimeout: number | null = null;

	// Primary ID and comparison columns
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});
	let comparisonPairs = $state<ColumnPair[]>([]);

	// For displaying log entries
	type MatchLog = {
		timestamp: number;
		primaryId: string;
		comparisonId: string;
		matched: boolean;
		reasons: {
			primaryFileRow: string;
			comparisonFileRow: string;
			primaryFileColumn: string;
			comparisonFileColumn: string;
			primaryValue: string;
			comparisonValue: string;
		}[];
	};

	// Timer for simulation
	let simulationInterval: number | null = null;
	let primaryRows: Record<string, string>[] = [];
	let comparisonMap = new Map<string, Record<string, string>>();

	onMount(() => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			if (!state.primaryFileData || !state.comparisonFileData || !state.reconciliationConfig) {
				// Redirect to upload page if data is missing
				goto('/upload');
				return;
			}

			// Set file names
			primaryFileName = state.primaryFileData.fileName || 'Primary File';
			comparisonFileName = state.comparisonFileData.fileName || 'Comparison File';

			// Set total rows (from primary file)
			totalRows = state.primaryFileData.rows.length;
			primaryRows = state.primaryFileData.rows;

			// Get column mapping configuration
			primaryIdPair = state.reconciliationConfig.primaryIdPair;
			comparisonPairs = state.reconciliationConfig.comparisonPairs;

			// Create lookup map for comparison data
			if (state.comparisonFileData && primaryIdPair.comparisonColumn) {
				const comparisonIdColumn = primaryIdPair.comparisonColumn;
				comparisonMap.clear();
				state.comparisonFileData.rows.forEach((row) => {
					const id = row[comparisonIdColumn];
					if (id) {
						comparisonMap.set(id, row);
					}
				});
			}
		});

		// Start the reconciliation process
		startReconciliation();

		return unsubscribe;
	});

	onDestroy(() => {
		// Clean up any timers when component is destroyed
		if (simulationInterval) {
			clearInterval(simulationInterval);
		}
		if (stuckDetectionTimeout) {
			clearTimeout(stuckDetectionTimeout);
		}
	});

	// Check if the process might be stuck
	function checkForStuckProcess() {
		const currentTime = Date.now();
		// If no log entries for 3 seconds and process is still running, add a diagnostic entry
		if (
			currentTime - lastLogTimestamp > 3000 &&
			processedRows < totalRows &&
			!isReconciliationComplete
		) {
			matchingLogs.unshift({
				timestamp: currentTime,
				primaryId: 'SYSTEM',
				comparisonId: 'DIAGNOSTIC',
				matched: false,
				reasons: [
					{
						primaryFileRow: 'System Log',
						comparisonFileRow: 'Diagnostic Log',
						primaryFileColumn: 'Process Status',
						comparisonFileColumn: 'Diagnostic',
						primaryValue: `Processed ${processedRows} of ${totalRows} rows (${progressPercentage}%)`,
						comparisonValue: 'Processing continues but no new matches to display'
					}
				]
			});
			// Update the logs reactively
			matchingLogs = [...matchingLogs];
			lastLogTimestamp = currentTime;
		}

		// Continue checking every 3 seconds
		stuckDetectionTimeout = setTimeout(checkForStuckProcess, 3000);
	}

	function startReconciliation() {
		// Reset the state
		processedRows = 0;
		matchingLogs = [];
		isReconciliationComplete = false;
		startTime = Date.now();
		lastLogTimestamp = startTime;

		// Start stuck detection
		if (stuckDetectionTimeout) {
			clearTimeout(stuckDetectionTimeout);
		}
		stuckDetectionTimeout = setTimeout(checkForStuckProcess, 3000);

		// Make sure we have the required configuration
		if (
			!primaryIdPair.primaryColumn ||
			!primaryIdPair.comparisonColumn ||
			primaryRows.length === 0
		) {
			console.error('Missing required data for reconciliation');

			// Add error log entry so it doesn't appear stuck
			matchingLogs = [
				{
					timestamp: Date.now(),
					primaryId: 'ERROR',
					comparisonId: 'ERROR',
					matched: false,
					reasons: [
						{
							primaryFileRow: 'Error Log',
							comparisonFileRow: 'Error Log',
							primaryFileColumn: 'Configuration Error',
							comparisonFileColumn: 'Configuration Error',
							primaryValue: 'Missing required configuration',
							comparisonValue: 'Please go back and ensure all settings are configured'
						}
					]
				}
			];
			return;
		}

		// Add a starting log entry
		matchingLogs = [
			{
				timestamp: Date.now(),
				primaryId: 'SYSTEM',
				comparisonId: 'INFO',
				matched: true,
				reasons: [
					{
						primaryFileRow: 'System Log',
						comparisonFileRow: 'Info Log',
						primaryFileColumn: 'Reconciliation Started',
						comparisonFileColumn: 'Configuration',
						primaryValue: `Processing ${totalRows} rows`,
						comparisonValue: `Primary ID: ${primaryIdPair.primaryColumn}, Comparison ID: ${primaryIdPair.comparisonColumn}`
					}
				]
			}
		];
		lastLogTimestamp = Date.now();

		// In a real implementation, this would actually process the data
		// For now, we'll simulate the process with a timer
		simulationInterval = setInterval(() => {
			if (processedRows >= totalRows) {
				// Reconciliation complete
				clearInterval(simulationInterval);
				isReconciliationComplete = true;

				// Add completion log
				matchingLogs.unshift({
					timestamp: Date.now(),
					primaryId: 'COMPLETE',
					comparisonId: 'COMPLETE',
					matched: true,
					reasons: [
						{
							primaryFileRow: 'Complete Log',
							comparisonFileRow: 'Complete Log',
							primaryFileColumn: 'Reconciliation Complete',
							comparisonFileColumn: 'Summary',
							primaryValue: `Processed ${totalRows} rows in ${formatTime((Date.now() - startTime) / 1000)}`,
							comparisonValue: 'Click "Download Results" to download the reconciled file'
						}
					]
				});
				lastLogTimestamp = Date.now();

				// Clear stuck detection timeout
				if (stuckDetectionTimeout) {
					clearTimeout(stuckDetectionTimeout);
				}
				return;
			}

			// Simulate processing 1-5 rows per interval
			const rowsToProcess = Math.min(Math.floor(Math.random() * 5) + 1, totalRows - processedRows);
			let logEntryCreated = false;

			for (let i = 0; i < rowsToProcess; i++) {
				// Get a real row from the primary data
				const currentIndex = processedRows + i;
				if (currentIndex >= primaryRows.length) break;

				const primaryRow = primaryRows[currentIndex];
				const primaryIdColumn = primaryIdPair.primaryColumn;
				const primaryId = primaryRow[primaryIdColumn];

				// Try to find a matching comparison row
				const comparisonRow = comparisonMap.get(primaryId);
				const idMatched = !!comparisonRow;

				// Check for differences in comparison columns
				const reasons = [];

				if (!idMatched) {
					// No matching ID found in comparison file
					reasons.push({
						primaryFileRow: `Row ${currentIndex + 1}`,
						comparisonFileRow: '(Not found)',
						primaryFileColumn: primaryIdColumn,
						comparisonFileColumn: primaryIdPair.comparisonColumn,
						primaryValue: primaryId || '(empty)',
						comparisonValue: '(No matching record found)'
					});
				} else if (comparisonPairs.length > 0) {
					// Check each mapped column pair for differences
					comparisonPairs.forEach((pair) => {
						if (pair.primaryColumn && pair.comparisonColumn) {
							const primaryValue = primaryRow[pair.primaryColumn];
							const comparisonValue = comparisonRow[pair.comparisonColumn];

							// If values are different, add a reason
							if (primaryValue !== comparisonValue) {
								reasons.push({
									primaryFileRow: `Row ${currentIndex + 1}`,
									comparisonFileRow: `Row ${Array.from(comparisonMap.keys()).findIndex(id => id === primaryId) + 1}`,
									primaryFileColumn: pair.primaryColumn,
									comparisonFileColumn: pair.comparisonColumn,
									primaryValue: primaryValue || '(empty)',
									comparisonValue: comparisonValue || '(empty)'
								});
							}
						}
					});
				}

				// Only log interesting entries (with differences, or every 10th entry)
				// to avoid overwhelming the UI with thousands of identical log entries
				const shouldLog = reasons.length > 0 || currentIndex % 10 === 0;

				if (shouldLog) {
					// Add to logs - a record is matched only if ID matches AND there are no differences
					matchingLogs.unshift({
						timestamp: Date.now(),
						primaryId: primaryId || `Row ${currentIndex + 1}`,
						comparisonId: idMatched
							? comparisonRow[primaryIdPair.comparisonColumn] || '(ID found but empty)'
							: '(Not found)',
						matched: idMatched && reasons.length === 0,
						reasons
					});

					// Limit the log to the most recent 100 entries
					if (matchingLogs.length > 100) {
						matchingLogs = matchingLogs.slice(0, 100);
					}

					lastLogTimestamp = Date.now();
					logEntryCreated = true;
				}
			}

			// If we processed rows but didn't create any log entries, add a progress entry
			if (rowsToProcess > 0 && !logEntryCreated) {
				// We need to periodically show status even if no interesting logs
				if (Date.now() - lastLogTimestamp > 1000) {
					matchingLogs.unshift({
						timestamp: Date.now(),
						primaryId: 'PROGRESS',
						comparisonId: 'UPDATE',
						matched: true,
						reasons: [
							{
								primaryFileRow: 'Progress Log',
								comparisonFileRow: 'Update Log',
								primaryFileColumn: 'Processing',
								comparisonFileColumn: 'Status',
								primaryValue: `Row ${processedRows + 1} to ${processedRows + rowsToProcess}`,
								comparisonValue: `${progressPercentage}% complete`
							}
						]
					});

					// Limit the log to the most recent 100 entries
					if (matchingLogs.length > 100) {
						matchingLogs = matchingLogs.slice(0, 100);
					}

					lastLogTimestamp = Date.now();
				}
			}

			// Update processed rows count
			processedRows += rowsToProcess;

			// Calculate matching speed (rows per second)
			const elapsedSeconds = (Date.now() - startTime) / 1000;
			matchingSpeed = Math.round(processedRows / elapsedSeconds);

			// Estimate time left
			const remainingRows = totalRows - processedRows;
			if (matchingSpeed > 0) {
				const secondsLeft = remainingRows / matchingSpeed;
				estimatedTimeLeft = formatTime(secondsLeft);
			}
		}, 100); // Update every 100ms
	}

	function formatTime(seconds: number): string {
		if (!isFinite(seconds) || seconds <= 0) {
			return 'calculating...';
		}

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}

	function downloadResults() {
		// Prepare the results file with added columns for status and reasons
		const results = prepareResultsFile();
		
		// Convert to CSV
		const csvContent = convertToCSV(results);
		
		// Create a download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		
		// Set download attributes
		link.setAttribute('href', url);
		link.setAttribute('download', `reconciled_${primaryFileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0,10)}.csv`);
		link.style.visibility = 'hidden';
		
		// Trigger download
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		
		// Optional: Also navigate to results page after download
		goto('/reconciliation-results');
	}
	
	function prepareResultsFile() {
		// Create a copy of primary rows with added status and reason columns
		return primaryRows.map((row, index) => {
			const primaryId = row[primaryIdPair.primaryColumn];
			const comparisonRow = comparisonMap.get(primaryId);
			const matched = !!comparisonRow;
			
			// Create status and reason data
			let status = 'Not Found';
			let reasonText = 'No matching record in comparison file';
			
			if (matched) {
				// Check for differences in mapped columns
				const differences = [];
				let allColumnsMatch = true;
				
				comparisonPairs.forEach(pair => {
					if (pair.primaryColumn && pair.comparisonColumn) {
						const primaryValue = row[pair.primaryColumn] || '';
						const comparisonValue = comparisonRow[pair.comparisonColumn] || '';
						
						if (primaryValue.toString().trim().toLowerCase() !== comparisonValue.toString().trim().toLowerCase()) {
							allColumnsMatch = false;
							differences.push(`${pair.primaryColumn}: ${primaryValue} ≠ ${comparisonValue}`);
						}
					}
				});
				
				status = allColumnsMatch ? 'Match' : 'Partial Match';
				reasonText = allColumnsMatch ? 'All columns match' : differences.join('; ');
			}
			
			// Create a new row with all existing fields plus status and reason
			return {
				...row,
				'__ReconciliationStatus': status,
				'__ReconciliationReason': reasonText
			};
		});
	}
	
	function convertToCSV(results) {
		if (results.length === 0) return '';
		
		// Get all headers including our added ones
		const headers = Object.keys(results[0]);
		
		// Create CSV header row
		let csv = headers.join(',') + '\n';
		
		// Add data rows
		results.forEach(row => {
			const values = headers.map(header => {
				const value = row[header] || '';
				// Escape values that contain commas, quotes, or newlines
				if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
					return `"${value.toString().replace(/"/g, '""')}"`;
				}
				return value;
			});
			csv += values.join(',') + '\n';
		});
		
		return csv;
	}
</script>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<h1 class="text-foreground dark:text-dark-foreground mb-6 text-center text-3xl font-bold">
		Reconciliation in Progress
	</h1>

	<!-- Files info -->
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow-md dark:shadow-gray-800">
			<h2 class="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">Primary File</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">{primaryFileName}</p>
		</div>

		<div class="dark:bg-dark-background rounded-lg bg-white p-4 shadow-md dark:shadow-gray-800">
			<h2 class="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">Comparison File</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">{comparisonFileName}</p>
		</div>
	</div>

	<!-- Progress section -->
	<div class="dark:bg-dark-background mb-6 rounded-lg bg-white p-6 shadow-md dark:shadow-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-700 dark:text-gray-200">
				Reconciliation Progress
			</h2>
			<span class="text-lg font-bold text-blue-600 dark:text-blue-400">{progressPercentage}%</span>
		</div>

		<!-- Progress bar -->
		<div class="mb-4 h-5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
			<div
				class="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out dark:bg-blue-600"
				style="width: {progressPercentage}%"
			></div>
		</div>

		<!-- Progress details -->
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="text-center">
				<p class="text-sm text-gray-600 dark:text-gray-400">Processed</p>
				<p class="text-xl font-semibold text-gray-800 dark:text-gray-200">
					{processedRows.toLocaleString()} / {totalRows.toLocaleString()}
				</p>
			</div>

			<div class="text-center">
				<p class="text-sm text-gray-600 dark:text-gray-400">Speed</p>
				<p class="text-xl font-semibold text-gray-800 dark:text-gray-200">
					{matchingSpeed} rows/sec
				</p>
			</div>

			<div class="text-center">
				<p class="text-sm text-gray-600 dark:text-gray-400">Estimated time remaining</p>
				<p class="text-xl font-semibold text-gray-800 dark:text-gray-200">{estimatedTimeLeft}</p>
			</div>
		</div>

		{#if isReconciliationComplete}
			<div class="mt-6 flex justify-center">
				<button
					on:click={downloadResults}
					class="rounded border border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-green-600 hover:text-white dark:border-green-600 dark:bg-green-600 dark:hover:bg-green-700"
				>
					Download Results
				</button>
			</div>
		{/if}
	</div>

	<!-- Real-time logs section -->
	<div class="dark:bg-dark-background rounded-lg bg-white p-6 shadow-md dark:shadow-gray-800">
		<h2 class="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Matching Log</h2>

		<div class="max-h-96 overflow-y-auto">
			{#if matchingLogs.length === 0}
				<p class="py-4 text-center text-gray-500 dark:text-gray-400">
					Reconciliation process starting...
				</p>
			{:else}
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-700">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
							>
								Primary ID
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
							>
								Comparison ID
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
							>
								Reason
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
						{#each matchingLogs as log (log.timestamp)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
									{log.primaryId}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-800 dark:text-gray-200">
									{log.comparisonId}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									{#if log.matched}
										<span
											class="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200"
										>
											Matched
										</span>
									{:else}
										<span
											class="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200"
										>
											Differences
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
									{#if log.reasons.length > 0}
										<details>
											<summary class="cursor-pointer text-blue-600 dark:text-blue-400">
												{log.reasons.length}
												{log.reasons.length === 1 ? 'reason' : 'reasons'}
											</summary>
											<div class="mt-2">
												{#each log.reasons as reason}
													<div class="mb-1 rounded bg-gray-50 p-2 dark:bg-gray-700">
														<p class="font-semibold">
															{reason.primaryFileColumn} / {reason.comparisonFileColumn}
														</p>
														<div class="mt-1 grid grid-cols-1 gap-2">
															<div>
																<span class="text-xs text-gray-500 dark:text-gray-400"
																	>Primary Row:</span
																>
																<span class="ml-1 text-sm">{reason.primaryFileRow}</span>
															</div>
															<div>
																<span class="text-xs text-gray-500 dark:text-gray-400"
																	>Comparison Row:</span
																>
																<span class="ml-1 text-sm">{reason.comparisonFileRow}</span>
															</div>
															<div>
																<span class="text-xs text-gray-500 dark:text-gray-400"
																	>Primary Value:</span
																>
																<span class="ml-1 text-sm">{reason.primaryValue}</span>
															</div>
															<div>
																<span class="text-xs text-gray-500 dark:text-gray-400"
																	>Comparison Value:</span
																>
																<span class="ml-1 text-sm">{reason.comparisonValue}</span>
															</div>
														</div>
													</div>
												{/each}
											</div>
										</details>
									{:else}
										<span class="text-gray-500 dark:text-gray-400">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Animation for progress bar */
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
