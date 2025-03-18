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
	let hasFailures = $state(false); // Track if there are any failures
	let failureCount = $state(0); // Count of failures

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
	
	// For chunked processing
	let chunks: Record<string, string>[][] = [];
	let completedChunks = $state(0);
	let reconciliationResults: Array<{row: Record<string, string>, matched: boolean, reasons: any[]} | null> = [];

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

		// Use web workers to parallelize the reconciliation process
		const CHUNK_SIZE = 50; // Number of rows per chunk
		const MAX_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 8); // Maximum number of workers
		
		// Creating a simplified processing function that we'll run directly
		function processChunk(chunk, startIndex) {
			const results = [];
			const logs = [];
			
			// Process each row in the chunk
			chunk.forEach((primaryRow, index) => {
				const currentIndex = startIndex + index;
				if (!primaryIdPair.primaryColumn) {
					console.error('Primary ID column is not defined');
					return;
				}
				
				const primaryId = primaryRow[primaryIdPair.primaryColumn];
				
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
						primaryFileColumn: primaryIdPair.primaryColumn,
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
							
							// Normalize values for comparison
							const normalizedPrimaryValue = (primaryValue || '').toString().trim().toLowerCase();
							const normalizedComparisonValue = (comparisonValue || '').toString().trim().toLowerCase();
							
							// If values are different, add a reason
							if (normalizedPrimaryValue !== normalizedComparisonValue) {
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
				
				// Save result
				results.push({
					row: primaryRow,
					matched: idMatched && reasons.length === 0,
					reasons
				});
				
				// Only log interesting entries (with differences, or every 10th entry)
				const shouldLog = reasons.length > 0 || currentIndex % 10 === 0;
				
				if (shouldLog) {
					logs.push({
						rowIndex: currentIndex,
						primaryId: primaryId || `Row ${currentIndex + 1}`,
						comparisonId: idMatched
							? comparisonRow[primaryIdPair.comparisonColumn] || '(ID found but empty)'
							: '(Not found)',
						matched: idMatched && reasons.length === 0,
						reasons
					});
				}
			});
			
			return { results, logs };
		}
		
		// Divide data into chunks
		chunks = [];
		for (let i = 0; i < primaryRows.length; i += CHUNK_SIZE) {
			chunks.push(primaryRows.slice(i, i + CHUNK_SIZE));
		}
		
		// Reset progress tracking
		completedChunks = 0;
		// Reset the results array with the correct size
		reconciliationResults = new Array(primaryRows.length);
		
		// Log startup information
		const startupLog = {
			timestamp: Date.now() + Math.random(),
			primaryId: 'SYSTEM',
			comparisonId: 'INFO',
			matched: true,
			reasons: [
				{
					primaryFileRow: 'System Log',
					comparisonFileRow: 'Strategy Log',
					primaryFileColumn: 'Batch Processing',
					comparisonFileColumn: 'Configuration',
					primaryValue: `Using chunk size of ${CHUNK_SIZE}`,
					comparisonValue: `${chunks.length} chunks to process`
				}
			]
		};
		
		// Update reactively
		matchingLogs = [startupLog];
		lastLogTimestamp = Date.now();
		console.log("Added startup log, matchingLogs length:", matchingLogs.length);
		
		// Process chunks in batches
		const processNextChunks = () => {
			// Get the current chunk index
			const chunkIndex = completedChunks;
			if (chunkIndex >= chunks.length) {
				// All chunks are processed
				finishReconciliation();
				return;
			}
			
			const startIndex = chunkIndex * CHUNK_SIZE;
			const chunk = chunks[chunkIndex];
			
			// Process the chunk
			const { results, logs } = processChunk(chunk, startIndex);
			
			// Update UI with logs
			const newLogs = logs.map((log, i) => ({
				timestamp: Date.now() + i + Math.random(), // Ensure uniqueness with offset + random
				primaryId: log.primaryId,
				comparisonId: log.comparisonId,
				matched: log.matched,
				reasons: log.reasons
			}));
			
			// Update the logs reactively 
			if (newLogs.length > 0) {
				// timestamps are already unique from the mapping above
				matchingLogs = [...newLogs, ...matchingLogs];
				
				// Limit the log to the most recent 100 entries
				if (matchingLogs.length > 100) {
					matchingLogs = matchingLogs.slice(0, 100);
				}
				console.log("Updated logs:", matchingLogs.length, "entries");
			}
			
			// Store results
			results.forEach((result, i) => {
				reconciliationResults[startIndex + i] = result;
			});
			
			// Update progress (using the global completedChunks state variable)
			completedChunks++;
			processedRows = Math.min(completedChunks * CHUNK_SIZE, totalRows);
			
			// Calculate matching speed
			const elapsedSeconds = (Date.now() - startTime) / 1000;
			// Ensure we don't divide by zero or very small numbers
			if (elapsedSeconds > 0.1) {
				matchingSpeed = Math.round(processedRows / elapsedSeconds);
				
				// Estimate time left
				const remainingRows = totalRows - processedRows;
				// Ensure we have a reasonable speed before calculating
				if (matchingSpeed > 0) {
					const secondsLeft = remainingRows / matchingSpeed;
					estimatedTimeLeft = formatTime(secondsLeft);
				} else {
					// If speed is zero but we've processed some rows, show a message
					estimatedTimeLeft = processedRows > 0 ? 
						"calculating based on current progress..." : 
						"starting reconciliation...";
				}
			} else {
				// In the first moment, just show a starting message
				estimatedTimeLeft = "starting reconciliation...";
			}
			
			// Add progress log if needed
			if (Date.now() - lastLogTimestamp > 1000) {
				const progressLog = {
					timestamp: Date.now() + Math.random(),
					primaryId: 'PROGRESS',
					comparisonId: 'UPDATE',
					matched: true,
					reasons: [
						{
							primaryFileRow: 'Progress Log',
							comparisonFileRow: 'Update Log',
							primaryFileColumn: 'Processing',
							comparisonFileColumn: 'Status',
							primaryValue: `${processedRows} of ${totalRows} rows (Chunk ${completedChunks}/${chunks.length})`,
							comparisonValue: `${progressPercentage}% complete`
						}
					]
				};
				
				// Update reactively
				matchingLogs = [progressLog, ...matchingLogs];
				lastLogTimestamp = Date.now();
				console.log("Added progress log");
			}
			
			// Process the next chunk after a short delay
			setTimeout(processNextChunks, 0);
		};
		
		// Function to complete reconciliation
		function finishReconciliation() {
			isReconciliationComplete = true;
			
			// Check if there are any failures in the results and count them
			hasFailures = false;
			failureCount = 0;
			for (const result of reconciliationResults) {
				if (result && !result.matched) {
					hasFailures = true;
					failureCount++;
				}
			}
			
			// Add completion log
			const completionLog = {
				timestamp: Date.now() + Math.random(),
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
						comparisonValue: hasFailures 
							? 'Some mismatches found. You can download the results or analyze failures.'
							: 'All records match! Click "Download Results" to download the reconciled file'
					}
				]
			};
			
			// Update reactively
			matchingLogs = [completionLog, ...matchingLogs];
			lastLogTimestamp = Date.now();
			console.log("Added completion log, hasFailures:", hasFailures);
			
			// Clear stuck detection timeout
			if (stuckDetectionTimeout) {
				clearTimeout(stuckDetectionTimeout);
			}
		}
		
		// Start processing chunks
		processNextChunks();
		
		// For backward compatibility with the rest of the code, keep a simulation interval
		// that just checks if we're done
		simulationInterval = setInterval(() => {
			// This is just a fallback check - the actual processing is done by workers
			if (isReconciliationComplete) {
				clearInterval(simulationInterval);
			}
		}, 250); // Check every 250ms
	}

	// Get the count of failures in the reconciliation results
	function getFailureCount(): number {
		return failureCount;
	}
	
	function formatTime(seconds: number): string {
		// Handle invalid or very small values
		if (!isFinite(seconds) || seconds <= 0) {
			return 'calculating...';
		}
		
		// Cap extremely large values to avoid unrealistic estimates
		if (seconds > 24 * 3600) {
			return 'over 24 hours';
		}

		// Format the time
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else if (secs > 0) {
			return `${secs}s`;
		} else {
			// For very small values (less than 1 second)
			return 'less than 1s';
		}
	}

	function analyzeFailures() {
		console.log("Analyze failures clicked");
		
		// If the reconciliation is not fully complete, warn the user
		if (chunks && completedChunks < chunks.length) {
			alert(`Reconciliation is only ${Math.round((completedChunks / chunks.length) * 100)}% complete. Analysis will be partial.`);
		}
		
		// Prepare the reconciliation results for the analysis page
		// We need to properly format matched and unmatched records
		const matches = [];
		const unmatchedPrimary = [];
		
		// Process all reconciliation results
		for (let i = 0; i < reconciliationResults.length; i++) {
			const result = reconciliationResults[i];
			if (!result) continue;
			
			const primaryId = result.row[primaryIdPair.primaryColumn];
			const comparisonRow = comparisonMap.get(primaryId);
			
			if (comparisonRow) {
				// Found a matching ID - check if all mapped columns match
				const comparisonResults = {};
				let matchCount = 0;
				
				// Process each mapped column pair
				for (const pair of comparisonPairs) {
					if (pair.primaryColumn && pair.comparisonColumn) {
						const primaryValue = result.row[pair.primaryColumn];
						const comparisonValue = comparisonRow[pair.comparisonColumn];
						
						// Normalize and compare values
						const normalizedPrimaryValue = (primaryValue || '').toString().trim().toLowerCase();
						const normalizedComparisonValue = (comparisonValue || '').toString().trim().toLowerCase();
						const isMatch = normalizedPrimaryValue === normalizedComparisonValue;
						
						comparisonResults[pair.primaryColumn] = {
							primaryValue: primaryValue || '',
							comparisonValue: comparisonValue || '',
							match: isMatch,
							difference: isMatch ? '' : 'Values differ'
						};
						
						if (isMatch) matchCount++;
					}
				}
				
				// Calculate match score - percentage of matching columns
				const matchScore = comparisonPairs.length > 0
					? Math.round((matchCount / comparisonPairs.length) * 100)
					: 100;
				
				matches.push({
					primaryRow: result.row,
					comparisonRow,
					idValues: {
						primary: primaryId,
						comparison: comparisonRow[primaryIdPair.comparisonColumn]
					},
					comparisonResults,
					matchScore
				});
			} else {
				// No matching ID found
				unmatchedPrimary.push(result.row);
			}
		}
		
		console.log("Prepared results:", {
			totalRows: reconciliationResults.length,
			matches: matches.length,
			unmatchedPrimary: unmatchedPrimary.length,
			partialMatches: matches.filter(m => m.matchScore < 100).length,
			perfectMatches: matches.filter(m => m.matchScore === 100).length
		});
		
		// Save the properly formatted results to the store
		reconciliationStore.setResults({
			matches,
			unmatchedPrimary,
			unmatchedComparison: [],
			config: {
				primaryIdPair,
				comparisonPairs
			},
			summary: {
				totalPrimaryRows: totalRows,
				totalComparisonRows: comparisonMap.size,
				matchedRows: matches.filter(m => m.matchScore === 100).length,
				unmatchedPrimaryRows: unmatchedPrimary.length,
				unmatchedComparisonRows: 0,
				matchPercentage: Math.round((matches.filter(m => m.matchScore === 100).length / totalRows) * 100)
			}
		});
		
		// Navigate to the analysis page
		goto('/reconciliation-results');
	}
	
	function downloadResults() {
		console.log("Download results clicked, completedChunks:", completedChunks, "total chunks:", chunks?.length);
		
		// If the reconciliation is not fully complete, warn the user
		if (chunks && completedChunks < chunks.length) {
			alert(`Reconciliation is only ${Math.round((completedChunks / chunks.length) * 100)}% complete. Results will be partial.`);
		}
		
		// Prepare the results file with added columns for status and reasons
		const results = prepareResultsFile();
		console.log("Prepared results:", results.length, "rows");
		
		// Convert to CSV
		const csvContent = convertToCSV(results);
		console.log("CSV content length:", csvContent.length);
		
		// Create a download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		
		// Set download attributes
		const fileName = `reconciled_${primaryFileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0,10)}.csv`;
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';
		
		// Trigger download
		document.body.appendChild(link);
		console.log("Triggering download of", fileName);
		link.click();
		document.body.removeChild(link);
		
		// Clean up URL object
		setTimeout(() => {
			URL.revokeObjectURL(url);
			console.log("URL object released");
		}, 100);
	}
	
	function prepareResultsFile() {
		console.log("Preparing results file, total rows:", primaryRows.length);
		
		// Make sure reconciliationResults is properly filled
		// If the process is still running, some results might be missing
		const results = [];
		
		// Process each row from the primary file
		for (let index = 0; index < primaryRows.length; index++) {
			const originalRow = primaryRows[index];
			const result = reconciliationResults[index];
			
			if (!result) {
				// If this row hasn't been processed yet
				console.log(`Row ${index} hasn't been processed yet`);
				results.push({
					...originalRow,
					'__ReconciliationStatus': 'Not Processed',
					'__ReconciliationReason': 'Row has not been processed yet'
				});
				continue;
			}
			
			const { row, matched, reasons } = result;
			
			// Create status and reason text
			let status = matched ? 'Match' : (reasons.length > 0 && reasons[0].comparisonValue !== '(No matching record found)' ? 'Partial Match' : 'Not Found');
			
			// Format the reason text
			let reasonText = matched ? 
				`Primary File (${result.reasons && result.reasons[0] ? result.reasons[0].primaryFileRow : 'Row'}) and Comparison File match perfectly for all mapped columns` : 
				'';
			if (!matched) {
				if (reasons.length === 0) {
					reasonText = 'Unknown reason';
				} else if (reasons[0].comparisonValue === '(No matching record found)') {
					reasonText = `Primary File (${reasons[0].primaryFileRow}) ID column "${reasons[0].primaryFileColumn}" with value "${reasons[0].primaryValue}" has no matching record in comparison file`;
				} else {
					// Create a detailed formatted string of all differences
					reasonText = reasons.map(reason => 
						`Primary File (${reason.primaryFileRow}) column "${reason.primaryFileColumn}" value "${reason.primaryValue}" ≠ Comparison File (${reason.comparisonFileRow}) column "${reason.comparisonFileColumn}" value "${reason.comparisonValue}"`
					).join('; ');
				}
			}
			
			// Create a new row with all existing fields plus status and reason
			results.push({
				...row,
				'__ReconciliationStatus': status,
				'__ReconciliationReason': reasonText
			});
		}
		
		console.log("Finished preparing results, total:", results.length);
		return results;
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

<div class="min-h-screen bg-gray-900 text-white py-8 relative">
<!-- Desktop SVG illustrations (with lower opacity for background) -->
<div class="hidden md:block">
	<img
		src="/images/details.svg"
		alt="Details illustration"
		class="absolute top-[60%] right-0 -translate-y-1/2 max-w-sm px-16 opacity-10 z-0"
	/>
</div>

<div class="hidden md:block">
	<img
		src="/images/reconcile.svg"
		alt="Reconcile illustration"
		class="absolute top-[60%] left-0 -translate-y-1/2 max-w-xs px-16 opacity-10 z-0"
	/>
</div>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<h1 class="mb-6 text-center text-3xl font-bold text-white">
		{#if isReconciliationComplete}
			<span class="text-blue-400">Reconciliation Complete</span>
		{:else}
			<span class="text-white">Reconciliation in Progress...</span>
		{/if}
	</h1>

	<!-- Files info -->
	<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
		<div class="rounded-lg bg-gray-800 p-4 shadow-md shadow-gray-800">
			<h2 class="mb-2 text-lg font-semibold text-white">Primary File</h2>
			<p class="text-sm text-gray-300">{primaryFileName}</p>
		</div>

		<div class="rounded-lg bg-gray-800 p-4 shadow-md shadow-gray-800">
			<h2 class="mb-2 text-lg font-semibold text-white">Comparison File</h2>
			<p class="text-sm text-gray-300">{comparisonFileName}</p>
		</div>
	</div>

	<!-- Progress section -->
	<div class="mb-6 rounded-lg bg-gray-800 p-6 shadow-md shadow-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-white">
				Reconciliation Progress
			</h2>
			<span class="text-lg font-bold text-blue-400">{progressPercentage}%</span>
		</div>

		<!-- Progress bar -->
		<div class="mb-4 h-5 overflow-hidden rounded-full bg-gray-700">
			<div
				class="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
				style="width: {progressPercentage}%"
			></div>
		</div>

		<!-- Progress details -->
		<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
			<div class="text-center">
				<p class="text-sm text-white">Processed</p>
				<p class="text-xl font-semibold text-gray-300">
					{processedRows.toLocaleString()} / {totalRows.toLocaleString()}
				</p>
			</div>

			<div class="text-center">
				<p class="text-sm text-white">Speed</p>
				<p class="text-xl font-semibold text-gray-300">
					{matchingSpeed} rows/sec
				</p>
			</div>

			<div class="text-center">
				<p class="text-sm text-white">Estimated time remaining</p>
				<p class="text-xl font-semibold text-gray-300">{estimatedTimeLeft}</p>
			</div>
		</div>
	</div>

	<!-- Real-time logs section -->
	<div class="rounded-lg bg-gray-800 p-6 shadow-md shadow-gray-800">
		<h2 class="mb-4 text-xl font-semibold text-white">Matching Log</h2>

		<div class="max-h-96 overflow-y-auto">
			{#if matchingLogs.length === 0}
				<p class="py-4 text-center text-gray-400">
					Reconciliation process starting...
				</p>
			{:else}
				<table class="min-w-full divide-y divide-gray-700">
					<thead class="bg-gray-700">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase"
							>
								Primary ID
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase"
							>
								Comparison ID
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-300 uppercase"
							>
								Reason
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-700 bg-gray-800">
						{#each matchingLogs as log, index (index)}
							<tr class="hover:bg-gray-700">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-200">
									{log.primaryId}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-200">
									{log.comparisonId}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									{#if log.matched}
										<span
											class="rounded-full bg-green-900 px-2 py-1 text-xs font-semibold text-green-200"
										>
											Matched
										</span>
									{:else}
										<span
											class="rounded-full bg-red-900 px-2 py-1 text-xs font-semibold text-red-200"
										>
											Differences
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-gray-200">
									{#if log.reasons.length > 0}
										<details>
											<summary class="cursor-pointer text-blue-400">
												{log.reasons.length}
												{log.reasons.length === 1 ? 'reason' : 'reasons'}
											</summary>
											<div class="mt-2">
												{#each log.reasons as reason}
													<div class="mb-1 rounded bg-gray-700 p-2">
														<p class="font-semibold">
															{reason.primaryFileColumn} / {reason.comparisonFileColumn}
														</p>
														<div class="mt-1 grid grid-cols-1 gap-2">
															<div>
																<span class="text-xs text-gray-400"
																	>Primary Row:</span
																>
																<span class="ml-1 text-sm">{reason.primaryFileRow}</span>
															</div>
															<div>
																<span class="text-xs text-gray-400"
																	>Comparison Row:</span
																>
																<span class="ml-1 text-sm">{reason.comparisonFileRow}</span>
															</div>
															<div>
																<span class="text-xs text-gray-400"
																	>Primary Value:</span
																>
																<span class="ml-1 text-sm">{reason.primaryValue}</span>
															</div>
															<div>
																<span class="text-xs text-gray-400"
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
										<span class="text-gray-400">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
		{#if isReconciliationComplete}
			<!-- Summary Title -->
			<div class="mt-6 mb-4 text-center">
				<h3 class="text-xl font-semibold text-white mb-2">Reconciliation Results Summary</h3>
				<p class="text-gray-300">
					{totalRows.toLocaleString()} total records processed. 
					<span class="{hasFailures ? 'text-yellow-400' : 'text-green-400'} font-medium">
						{hasFailures ? 
							`${(totalRows - failureCount).toLocaleString()} matched successfully, ${failureCount.toLocaleString()} failures detected.` : 
							'All records matched successfully!'}
					</span>
				</p>
			</div>
			
			<div class="mt-4 flex justify-center space-x-4">
				<button
					on:click={downloadResults}
					class="btn-breathing rounded-lg border-2 border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:bg-green-600 hover:text-white"
				>
					Download Results
				</button>
				{#if hasFailures}
				<button
					on:click={analyzeFailures}
					class="btn-breathing rounded-lg border-2 border-blue-500 bg-blue-500 px-6 py-3 font-semibold text-white transition-all duration-300 transform hover:scale-105 hover:bg-blue-600 hover:text-white"
				>
					Analyze Failures
				</button>
				{/if}
			</div>
		{/if}
	</div>
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
