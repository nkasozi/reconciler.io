<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ColumnPair } from '$lib/utils/reconciliation';
	import {
		reconcileData,
		clearReconciliationLogs,
		getReconciliationLogs
	} from '$lib/utils/reconciliation';

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
	let stuckDetectionTimeout: number;
	let hasFailures = $state(false); // Track if there are any failures
	let failureCount = $state(0); // Count of failures

	// Reverse reconciliation state variables
	let reverseProcessedRows = $state(0);
	let reverseTotalRows = $state(0);
	let reverseProgressPercentage = $derived(
		reverseTotalRows
			? Math.min(100, Math.round((reverseProcessedRows / reverseTotalRows) * 100))
			: 0
	);
	let isReverseReconciliationComplete = $state(false);
	let reverseMatchingLogs = $state<MatchLog[]>([]);
	let reverseMatchingSpeed = $state(0); // rows per second
	let reverseEstimatedTimeLeft = $state('');
	let reverseStartTime = $state(0);
	let reverseLastLogTimestamp = $state(0);
	let reverseStuckDetectionTimeout: number | null = null;
	let reverseHasFailures = $state(false); // Track if there are any failures
	let reverseFailureCount = $state(0); // Count of failures

	// Check if reverse reconciliation is enabled
	let isReverseReconciliationEnabled = $state(false);

	// Primary ID and comparison columns
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});
	let comparisonPairs = $state<ColumnPair[]>([]);

	// File metadata for getting column display names
	let primaryFileData: any = null;
	let comparisonFileData: any = null;

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
			reason?: string;
			tolerance?: any;
			match?: boolean;
			status?: string;
		}[];
	};

	// Timer for simulation
	let simulationInterval: number | null = null;
	let primaryRows: Record<string, string>[] = [];
	let comparisonMap = new Map<string, Record<string, string>>();

	// For chunked processing
	let chunks: Record<string, string>[][] = [];
	let completedChunks = $state(0);
	let reconciliationResults: Array<{
		row: Record<string, string>;
		matched: boolean;
		reasons: any[];
	} | null> = [];

	// For reverse reconciliation chunked processing
	let reverseChunks: Record<string, string>[][] = [];
	let reverseCompletedChunks = $state(0);
	let reverseReconciliationResults: Array<{
		row: Record<string, string>;
		matched: boolean;
		reasons: any[];
	} | null> = [];

	onMount(() => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			if (!state.primaryFileData) {
				// Redirect to upload page if data is missing
				console.warn('Missing Primary file data, redirecting to upload page');
				goto('/upload');
				return;
			}

			if (!state.comparisonFileData) {
				// Redirect to upload page if data is missing
				console.warn('Missing Comparison file data, redirecting to upload page');
				goto('/upload');
				return;
			}

			if (!state.reconciliationConfig) {
				// Redirect to upload page if data is missing
				console.warn('Missing Reconciliation configuration, redirecting to upload page');
				goto('/upload');
				return;
			}

			// Set file names
			primaryFileName = state.primaryFileData.fileName || 'Primary File';
			comparisonFileName = state.comparisonFileData.fileName || 'Comparison File';

			// Store file data for metadata access
			primaryFileData = state.primaryFileData;
			comparisonFileData = state.comparisonFileData;

			// Set total rows (from primary file)
			totalRows = state.primaryFileData.rows.length;
			primaryRows = state.primaryFileData.rows;

			// Get column mapping configuration
			primaryIdPair = state.reconciliationConfig.primaryIdPair;
			comparisonPairs = state.reconciliationConfig.comparisonPairs;

			// Check if reverse reconciliation is enabled
			isReverseReconciliationEnabled = state.reconciliationConfig.reverseReconciliation === true;

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

		// Check if reverse reconciliation is enabled and start it too
		const unsubscribeStore = reconciliationStore.subscribe((state) => {
			if (state.reconciliationConfig?.reverseReconciliation) {
				startReverseReconciliation();
			}
		});

		return () => {
			unsubscribe();
			unsubscribeStore();
		};
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
	function checkForStuckProcess(type: 'normal' | 'reverse' = 'normal') {
		const currentTime = Date.now();

		if (type === 'reverse') {
			// Check reverse reconciliation for stuck process
			if (
				currentTime - reverseLastLogTimestamp > 3000 &&
				reverseProcessedRows < reverseTotalRows &&
				!isReverseReconciliationComplete
			) {
				reverseMatchingLogs.unshift({
					timestamp: currentTime,
					primaryId: 'REVERSE-SYSTEM',
					comparisonId: 'DIAGNOSTIC',
					matched: false,
					reasons: [
						{
							primaryFileRow: 'Reverse System Log',
							comparisonFileRow: 'Diagnostic Log',
							primaryFileColumn: 'Reverse Process Status',
							comparisonFileColumn: 'Diagnostic',
							primaryValue: `Processed ${reverseProcessedRows} of ${reverseTotalRows} rows (${reverseProgressPercentage}%)`,
							comparisonValue: 'Reverse processing continues but no new matches to display'
						}
					]
				});
				// Update the logs reactively
				reverseMatchingLogs = [...reverseMatchingLogs];
				reverseLastLogTimestamp = currentTime;
			}
			// Continue checking every 3 seconds for reverse
			reverseStuckDetectionTimeout = setTimeout(() => checkForStuckProcess('reverse'), 3000);
		} else {
			// Check normal reconciliation for stuck process
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
	}

	function startReconciliation() {
		// Reset the state
		processedRows = 0;
		matchingLogs = [];
		isReconciliationComplete = false;
		startTime = Date.now();
		lastLogTimestamp = startTime;

		// Clear any existing logs
		clearReconciliationLogs();

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

		// Get the actual store state with all data
		let storeState: any = null;
		const unsubscribe = reconciliationStore.subscribe((state) => {
			storeState = state;
		});
		unsubscribe();

		if (
			!storeState.primaryFileData ||
			!storeState.comparisonFileData ||
			!storeState.reconciliationConfig
		) {
			console.error('Missing store data for reconciliation');
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

		// Perform the actual reconciliation using the real reconciliation engine
		try {
			console.log('Starting reconciliation with tolerance evaluator...');
			const result = reconcileData(
				storeState.primaryFileData,
				storeState.comparisonFileData,
				storeState.reconciliationConfig
			);

			// Get the debug logs that were generated during reconciliation
			const debugLogs = getReconciliationLogs();
			console.log('Reconciliation complete! Generated', debugLogs.length, 'debug logs');

			// Convert the reconciliation results into matchingLogs format
			const newLogs = result.matches.map((match, index) => ({
				timestamp: Date.now() + index,
				primaryId: match.idValues.primary,
				comparisonId: match.idValues.comparison,
				matched: match.matchScore === 100,
				reasons: Object.entries(match.comparisonResults).map(([column, compResult]) => {
					// Find the column pair configuration for this column
					const pair = comparisonPairs.find((p) => p.primaryColumn === column);

					// Get display names from file metadata
					const primaryColumnName =
						primaryFileData?.columns?.find((c: any) => c.name === column)?.name || column;
					const comparisonColumnName =
						comparisonFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)
							?.name ||
						pair?.comparisonColumn ||
						column;

					return {
						primaryFileRow: `Match ${index + 1}`,
						comparisonFileRow: `Record ${match.idValues.comparison}`,
						primaryFileColumn: primaryColumnName,
						comparisonFileColumn: comparisonColumnName,
						primaryValue: String(compResult.primaryValue),
						comparisonValue: String(compResult.comparisonValue),
						reason: compResult.reason,
						tolerance: pair?.tolerance,
						match: compResult.match,
						status: compResult.status
					};
				})
			}));

			// Update logs and results
			matchingLogs = [...newLogs.slice(0, 100), ...matchingLogs];
			processedRows = result.summary.totalPrimaryRows;
			failureCount = result.summary.unmatchedPrimaryRows + result.summary.unmatchedComparisonRows;
			hasFailures = failureCount > 0;

			// Store results for later use
			reconciliationResults = result.matches.map((match) => ({
				row: match.primaryRow,
				matched: match.matchScore === 100,
				reasons: Object.entries(match.comparisonResults).map(([column, compResult]) => {
					// Find the column pair configuration for this column
					const pair = comparisonPairs.find((p) => p.primaryColumn === column);

					// Get display names from file metadata
					const primaryColumnName =
						primaryFileData?.columns?.find((c: any) => c.name === column)?.name || column;
					const comparisonColumnName =
						comparisonFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)
							?.name ||
						pair?.comparisonColumn ||
						column;

					return {
						primaryFileColumn: primaryColumnName,
						comparisonFileColumn: comparisonColumnName,
						primaryValue: compResult.primaryValue,
						comparisonValue: compResult.comparisonValue,
						reason: compResult.reason,
						tolerance: pair?.tolerance,
						match: compResult.match,
						status: compResult.status
					};
				})
			}));

			// Finish reconciliation
			finishReconciliation();
		} catch (error) {
			console.error('Reconciliation error:', error);
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
							primaryFileColumn: 'Reconciliation Error',
							comparisonFileColumn: 'Details',
							primaryValue: error instanceof Error ? error.message : String(error),
							comparisonValue: 'See browser console for more details'
						}
					]
				}
			];
			finishReconciliation();
		}
	}

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
		console.log('Added completion log, hasFailures:', hasFailures);

		// Clear stuck detection timeout
		if (stuckDetectionTimeout) {
			clearTimeout(stuckDetectionTimeout);
		}
	}

	// Get the count of failures in the reconciliation results
	function getFailureCount(): number {
		return failureCount;
	}

	// Start reverse reconciliation (comparison file as primary)
	function startReverseReconciliation() {
		// We need to get the current store state
		let storeState: any = null;
		const unsubscribe = reconciliationStore.subscribe((state) => {
			storeState = state;
		});
		unsubscribe();

		if (
			!storeState.primaryFileData ||
			!storeState.comparisonFileData ||
			!storeState.reconciliationConfig
		) {
			console.error('Missing required data for reverse reconciliation');
			return;
		}

		// Reset the reverse state
		reverseProcessedRows = 0;
		reverseMatchingLogs = [];
		isReverseReconciliationComplete = false;
		reverseStartTime = Date.now();
		reverseLastLogTimestamp = reverseStartTime;

		// For reverse reconciliation, swap the files
		const reversePrimaryRows = storeState.comparisonFileData.rows;
		reverseTotalRows = reversePrimaryRows.length;

		// Create reverse lookup map (primary file becomes comparison)
		const reversePrimaryIdColumn = storeState.reconciliationConfig.primaryIdPair.primaryColumn;
		const reverseComparisonMap = new Map<string, Record<string, string>>();

		if (reversePrimaryIdColumn) {
			storeState.primaryFileData.rows.forEach((row) => {
				const id = row[reversePrimaryIdColumn];
				if (id) {
					reverseComparisonMap.set(id, row);
				}
			});
		}

		// Start stuck detection for reverse
		if (reverseStuckDetectionTimeout) {
			clearTimeout(reverseStuckDetectionTimeout);
		}
		reverseStuckDetectionTimeout = setTimeout(() => checkForStuckProcess('reverse'), 3000);

		// Add a starting log entry for reverse
		reverseMatchingLogs = [
			{
				timestamp: Date.now(),
				primaryId: 'REVERSE-SYSTEM',
				comparisonId: 'INFO',
				matched: true,
				reasons: [
					{
						primaryFileRow: 'Reverse System Log',
						comparisonFileRow: 'Info Log',
						primaryFileColumn: 'Reverse Reconciliation Started',
						comparisonFileColumn: 'Configuration',
						primaryValue: `Processing ${reverseTotalRows} rows in reverse`,
						comparisonValue: `Comparison ID: ${storeState.reconciliationConfig.primaryIdPair.comparisonColumn}, Primary ID: ${storeState.reconciliationConfig.primaryIdPair.primaryColumn}`
					}
				]
			}
		];
		reverseLastLogTimestamp = Date.now();

		// Use the same chunk processing approach
		const CHUNK_SIZE = 50;

		// Divide reverse data into chunks
		reverseChunks = [];
		for (let i = 0; i < reversePrimaryRows.length; i += CHUNK_SIZE) {
			reverseChunks.push(reversePrimaryRows.slice(i, i + CHUNK_SIZE));
		}

		// Reset reverse progress tracking
		reverseCompletedChunks = 0;
		reverseReconciliationResults = new Array(reversePrimaryRows.length);

		// Process reverse chunks
		const processNextReverseChunks = () => {
			const chunkIndex = reverseCompletedChunks;
			if (chunkIndex >= reverseChunks.length) {
				finishReverseReconciliation();
				return;
			}

			const startIndex = chunkIndex * CHUNK_SIZE;
			const chunk = reverseChunks[chunkIndex];

			// Process the reverse chunk (similar to normal processing but with swapped files)
			const { results, logs } = processReverseChunk(
				chunk,
				startIndex,
				reverseComparisonMap,
				storeState.reconciliationConfig
			);

			// Update UI with reverse logs
			const newLogs = logs.map((log, i) => ({
				timestamp: Date.now() + i + Math.random(),
				primaryId: log.primaryId,
				comparisonId: log.comparisonId,
				matched: log.matched,
				reasons: log.reasons
			}));

			if (newLogs.length > 0) {
				reverseMatchingLogs = [...newLogs, ...reverseMatchingLogs];
				if (reverseMatchingLogs.length > 100) {
					reverseMatchingLogs = reverseMatchingLogs.slice(0, 100);
				}
			}

			// Store reverse results
			results.forEach((result, i) => {
				reverseReconciliationResults[startIndex + i] = result;
			});

			// Update reverse progress
			reverseCompletedChunks++;
			reverseProcessedRows = Math.min(reverseCompletedChunks * CHUNK_SIZE, reverseTotalRows);

			// Calculate reverse matching speed
			const elapsedSeconds = (Date.now() - reverseStartTime) / 1000;
			if (elapsedSeconds > 0.1) {
				reverseMatchingSpeed = Math.round(reverseProcessedRows / elapsedSeconds);
				const remainingRows = reverseTotalRows - reverseProcessedRows;
				if (reverseMatchingSpeed > 0) {
					const secondsLeft = remainingRows / reverseMatchingSpeed;
					reverseEstimatedTimeLeft = formatTime(secondsLeft);
				} else {
					reverseEstimatedTimeLeft = reverseProcessedRows > 0 ? 'calculating...' : 'starting...';
				}
			} else {
				reverseEstimatedTimeLeft = 'starting reverse reconciliation...';
			}

			// Add reverse progress log if needed
			if (Date.now() - reverseLastLogTimestamp > 1000) {
				const progressLog = {
					timestamp: Date.now() + Math.random(),
					primaryId: 'REVERSE-PROGRESS',
					comparisonId: 'UPDATE',
					matched: true,
					reasons: [
						{
							primaryFileRow: 'Reverse Progress Log',
							comparisonFileRow: 'Update Log',
							primaryFileColumn: 'Processing',
							comparisonFileColumn: 'Status',
							primaryValue: `${reverseProcessedRows} of ${reverseTotalRows} rows (Reverse Chunk ${reverseCompletedChunks}/${reverseChunks.length})`,
							comparisonValue: `${reverseProgressPercentage}% complete`
						}
					]
				};
				reverseMatchingLogs = [progressLog, ...reverseMatchingLogs];
				reverseLastLogTimestamp = Date.now();
			}

			// Process the next reverse chunk
			setTimeout(processNextReverseChunks, 50); // Slightly offset from normal processing
		};

		// Function to complete reverse reconciliation
		function finishReverseReconciliation() {
			isReverseReconciliationComplete = true;

			// Check reverse failures
			reverseHasFailures = false;
			reverseFailureCount = 0;
			for (const result of reverseReconciliationResults) {
				if (result && !result.matched) {
					reverseHasFailures = true;
					reverseFailureCount++;
				}
			}

			// Add reverse completion log
			const completionLog = {
				timestamp: Date.now() + Math.random(),
				primaryId: 'REVERSE-COMPLETE',
				comparisonId: 'COMPLETE',
				matched: true,
				reasons: [
					{
						primaryFileRow: 'Reverse Complete Log',
						comparisonFileRow: 'Complete Log',
						primaryFileColumn: 'Reverse Reconciliation Complete',
						comparisonFileColumn: 'Summary',
						primaryValue: `Processed ${reverseTotalRows} rows in ${formatTime((Date.now() - reverseStartTime) / 1000)}`,
						comparisonValue: reverseHasFailures
							? 'Some reverse mismatches found. You can download the reverse results.'
							: 'All reverse records match! Click "Download Reverse Results" to download.'
					}
				]
			};

			reverseMatchingLogs = [completionLog, ...reverseMatchingLogs];
			reverseLastLogTimestamp = Date.now();

			if (reverseStuckDetectionTimeout) {
				clearTimeout(reverseStuckDetectionTimeout);
			}
		}

		// Start reverse processing
		processNextReverseChunks();
	}

	// Process reverse chunk function
	function processReverseChunk(chunk, startIndex, reverseComparisonMap, config) {
		const results = [];
		const logs = [];

		chunk.forEach((primaryRow, index) => {
			const currentIndex = startIndex + index;
			const reverseComparisonIdColumn = config.primaryIdPair.comparisonColumn;

			if (!reverseComparisonIdColumn) {
				console.error('Reverse comparison ID column is not defined');
				return;
			}

			const primaryId = primaryRow[reverseComparisonIdColumn];
			const comparisonRow = reverseComparisonMap.get(primaryId);
			const idMatched = !!comparisonRow;

			const reasons = [];

			if (!idMatched) {
				reasons.push({
					primaryFileRow: `Reverse Row ${currentIndex + 1}`,
					comparisonFileRow: '(Not found)',
					primaryFileColumn: reverseComparisonIdColumn,
					comparisonFileColumn: config.primaryIdPair.primaryColumn,
					primaryValue: primaryId || '(empty)',
					comparisonValue: '(No matching record found in reverse)'
				});
			} else if (config.comparisonPairs.length > 0) {
				// Check each mapped column pair for differences (with swapped columns)
				config.comparisonPairs.forEach((pair) => {
					if (pair.primaryColumn && pair.comparisonColumn) {
						// Swap the columns for reverse reconciliation
						const primaryValue = primaryRow[pair.comparisonColumn];
						const comparisonValue = comparisonRow[pair.primaryColumn];

						const normalizedPrimaryValue = (primaryValue || '').toString().trim().toLowerCase();
						const normalizedComparisonValue = (comparisonValue || '')
							.toString()
							.trim()
							.toLowerCase();

						if (normalizedPrimaryValue !== normalizedComparisonValue) {
							reasons.push({
								primaryFileRow: `Reverse Row ${currentIndex + 1}`,
								comparisonFileRow: `Original Row ${Array.from(reverseComparisonMap.keys()).findIndex((id) => id === primaryId) + 1}`,
								primaryFileColumn: pair.comparisonColumn, // Swapped
								comparisonFileColumn: pair.primaryColumn, // Swapped
								primaryValue: primaryValue || '(empty)',
								comparisonValue: comparisonValue || '(empty)'
							});
						}
					}
				});
			}

			results.push({
				row: primaryRow,
				matched: idMatched && reasons.length === 0,
				reasons
			});

			const shouldLog = reasons.length > 0 || currentIndex % 10 === 0;
			if (shouldLog) {
				logs.push({
					rowIndex: currentIndex,
					primaryId: primaryId || `Reverse Row ${currentIndex + 1}`,
					comparisonId: idMatched
						? comparisonRow[config.primaryIdPair.primaryColumn] || '(ID found but empty)'
						: '(Not found)',
					matched: idMatched && reasons.length === 0,
					reasons
				});
			}
		});

		return { results, logs };
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
		console.log('Analyze failures clicked');

		// If the reconciliation is not fully complete, warn the user
		if (chunks && completedChunks < chunks.length) {
			alert(
				`Reconciliation is only ${Math.round((completedChunks / chunks.length) * 100)}% complete. Analysis will be partial.`
			);
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
						const normalizedComparisonValue = (comparisonValue || '')
							.toString()
							.trim()
							.toLowerCase();
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
				const matchScore =
					comparisonPairs.length > 0
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

		console.log('Prepared results:', {
			totalRows: reconciliationResults.length,
			matches: matches.length,
			unmatchedPrimary: unmatchedPrimary.length,
			partialMatches: matches.filter((m) => m.matchScore < 100).length,
			perfectMatches: matches.filter((m) => m.matchScore === 100).length
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
				matchedRows: matches.filter((m) => m.matchScore === 100).length,
				unmatchedPrimaryRows: unmatchedPrimary.length,
				unmatchedComparisonRows: 0,
				matchPercentage: Math.round(
					(matches.filter((m) => m.matchScore === 100).length / totalRows) * 100
				)
			}
		});

		// Navigate to the analysis page in the same tab
		goto('/reconciliation-results');
	}

	function downloadResults() {
		console.log(
			'Download results clicked, completedChunks:',
			completedChunks,
			'total chunks:',
			chunks?.length
		);

		// If the reconciliation is not fully complete, warn the user
		if (chunks && completedChunks < chunks.length) {
			alert(
				`Reconciliation is only ${Math.round((completedChunks / chunks.length) * 100)}% complete. Results will be partial.`
			);
		}

		// Prepare the results file with added columns for status and reasons
		const results = prepareResultsFile();
		console.log('Prepared results:', results.length, 'rows');

		// Convert to CSV
		const csvContent = convertToCSV(results);
		console.log('CSV content length:', csvContent.length);

		// Create a download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		// Set download attributes
		const fileName = `reconciled_${primaryFileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`;
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';

		// Trigger download
		document.body.appendChild(link);
		console.log('Triggering download of', fileName);
		link.click();
		document.body.removeChild(link);

		// Clean up URL object
		setTimeout(() => {
			URL.revokeObjectURL(url);
			console.log('URL object released');
		}, 100);
	}

	function prepareResultsFile() {
		console.log('Preparing results file, total rows:', primaryRows.length);

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
					__ReconciliationStatus: 'Not Processed',
					__ReconciliationReason: 'Row has not been processed yet'
				});
				continue;
			}

			const { row, matched, reasons } = result;

			// Create status and reason text
			let status = matched
				? 'Match'
				: reasons.length > 0 && reasons[0].comparisonValue !== '(No matching record found)'
					? 'Partial Match'
					: 'Not Found';

			// Format the reason text
			let reasonText = matched
				? `Primary File and Comparison File match perfectly for all mapped columns`
				: '';
			if (!matched) {
				if (reasons.length === 0) {
					reasonText = 'Unknown reason';
				} else if (reasons[0].comparisonValue === '(No matching record found)') {
					reasonText = `No matching record found in comparison file for ID value "${reasons[0].primaryValue}"`;
				} else {
					// Create detailed formatted reasons using all available information
					reasonText = reasons
						.map((reason) => {
							let msg = `Column "${reason.primaryFileColumn}": Primary value "${reason.primaryValue}"`;

							// Add comparison value
							msg += `, Comparison value "${reason.comparisonValue}"`;

							// Add tolerance information if available
							if (reason.tolerance) {
								if (reason.tolerance.type === 'exact_match') {
									msg += ` [Expected: exact match]`;
								} else if (reason.tolerance.type === 'absolute') {
									msg += ` [Expected: within ±${reason.tolerance.value}]`;
								} else if (reason.tolerance.type === 'relative') {
									msg += ` [Expected: within ${reason.tolerance.percentage}%]`;
								} else if (reason.tolerance.type === 'custom') {
									msg += ` [Formula: ${reason.tolerance.formula}]`;
								} else if (reason.tolerance.type === 'within_percentage_similarity') {
									msg += ` [Expected: ${reason.tolerance.percentage}% similar]`;
								}
							}

							// Add the evaluation reason from the tolerance evaluator
							if (reason.reason) {
								msg += ` — ${reason.reason}`;
							}

							return msg;
						})
						.join('; ');
				}
			}

			// Create a new row with all existing fields plus status and reason
			results.push({
				...row,
				__ReconciliationStatus: status,
				__ReconciliationReason: reasonText
			});
		}

		console.log('Finished preparing results, total:', results.length);
		return results;
	}

	function convertToCSV(results) {
		if (results.length === 0) return '';

		// Get all headers including our added ones
		const headers = Object.keys(results[0]);

		// Create CSV header row
		let csv = headers.join(',') + '\n';

		// Add data rows
		results.forEach((row) => {
			const values = headers.map((header) => {
				const value = row[header] || '';
				// Escape values that contain commas, quotes, or newlines
				if (
					value.toString().includes(',') ||
					value.toString().includes('"') ||
					value.toString().includes('\n')
				) {
					return `"${value.toString().replace(/"/g, '""')}"`;
				}
				return value;
			});
			csv += values.join(',') + '\n';
		});

		return csv;
	}

	// Download reverse reconciliation results
	function downloadReverseResults() {
		console.log(
			'Download reverse results clicked, reverseCompletedChunks:',
			reverseCompletedChunks,
			'total reverse chunks:',
			reverseChunks?.length
		);

		// If the reverse reconciliation is not fully complete, warn the user
		if (reverseChunks && reverseCompletedChunks < reverseChunks.length) {
			alert(
				`Reverse reconciliation is only ${Math.round((reverseCompletedChunks / reverseChunks.length) * 100)}% complete. Results will be partial.`
			);
		}

		// Prepare the reverse results file
		const results = prepareReverseResultsFile();
		console.log('Prepared reverse results:', results.length, 'rows');

		// Convert to CSV
		const csvContent = convertToCSV(results);
		console.log('Reverse CSV content length:', csvContent.length);

		// Create a download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		// Set download attributes
		const fileName = `reverse_reconciled_${comparisonFileName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0, 10)}.csv`;
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';

		// Trigger download
		document.body.appendChild(link);
		console.log('Triggering download of', fileName);
		link.click();
		document.body.removeChild(link);

		// Clean up URL object
		setTimeout(() => {
			URL.revokeObjectURL(url);
			console.log('Reverse URL object released');
		}, 100);
	}

	function prepareReverseResultsFile() {
		console.log('Preparing reverse results file, total rows:', reverseTotalRows);

		const results = [];
		// Get the current store state
		let storeState: any = null;
		const unsubscribe = reconciliationStore.subscribe((state) => {
			storeState = state;
		});
		unsubscribe();

		const reverseRows = storeState.comparisonFileData?.rows || [];

		// Process each row from the comparison file (which is primary in reverse)
		for (let index = 0; index < reverseRows.length; index++) {
			const originalRow = reverseRows[index];
			const result = reverseReconciliationResults[index];

			if (!result) {
				// If this row hasn't been processed yet
				console.log(`Reverse row ${index} hasn't been processed yet`);
				results.push({
					...originalRow,
					__ReverseReconciliationStatus: 'Not Processed',
					__ReverseReconciliationReason: 'Row has not been processed yet'
				});
				continue;
			}

			const { row, matched, reasons } = result;

			// Create status and reason text for reverse
			let status = matched
				? 'Match'
				: reasons.length > 0 &&
					  reasons[0].comparisonValue !== '(No matching record found in reverse)'
					? 'Partial Match'
					: 'Not Found';

			// Format the reason text for reverse
			let reasonText = matched
				? `Comparison File (${result.reasons && result.reasons[0] ? result.reasons[0].primaryFileRow : 'Row'}) and Primary File match perfectly for all mapped columns in reverse direction`
				: '';
			if (!matched) {
				if (reasons.length === 0) {
					reasonText = 'Unknown reason';
				} else if (reasons[0].comparisonValue === '(No matching record found in reverse)') {
					reasonText = `Comparison File (${reasons[0].primaryFileRow}) ID column "${reasons[0].primaryFileColumn}" with value "${reasons[0].primaryValue}" has no matching record in primary file`;
				} else {
					// Create a detailed formatted string of all differences for reverse
					reasonText = reasons
						.map(
							(reason) =>
								`Comparison File (${reason.primaryFileRow}) column "${reason.primaryFileColumn}" value "${reason.primaryValue}" ≠ Primary File (${reason.comparisonFileRow}) column "${reason.comparisonFileColumn}" value "${reason.comparisonValue}"`
						)
						.join('; ');
				}
			}

			// Create a new row with all existing fields plus status and reason
			results.push({
				...row,
				__ReverseReconciliationStatus: status,
				__ReverseReconciliationReason: reasonText
			});
		}

		console.log('Finished preparing reverse results, total:', results.length);
		return results;
	}

	// Analyze reverse reconciliation failures
	function analyzeReverseFailures() {
		console.log('Analyze reverse failures clicked');

		// If the reverse reconciliation is not fully complete, warn the user
		if (reverseChunks && reverseCompletedChunks < reverseChunks.length) {
			alert(
				`Reverse reconciliation is only ${Math.round((reverseCompletedChunks / reverseChunks.length) * 100)}% complete. Analysis will be partial.`
			);
		}

		// For reverse analysis, we could either:
		// 1. Create a dedicated reverse results page, or
		// 2. Navigate to the regular results page with reverse data
		// For now, let's show information about reverse analysis
		alert(
			'Reverse reconciliation analysis would show detailed comparison of mismatched records from the reverse perspective (Comparison → Primary). This feature is coming soon!'
		);
	}
</script>

<div class="relative min-h-screen bg-gray-900 py-2 text-white md:py-8">
	<!-- Desktop SVG illustrations (with lower opacity for background) -->
	<div class="hidden md:block">
		<img
			src="/images/details.svg"
			alt="Details illustration"
			class="absolute right-0 top-[60%] z-0 max-w-sm -translate-y-1/2 px-16 opacity-10"
		/>
	</div>

	<div class="hidden md:block">
		<img
			src="/images/reconcile.svg"
			alt="Reconcile illustration"
			class="absolute left-0 top-[60%] z-0 max-w-xs -translate-y-1/2 px-16 opacity-10"
		/>
	</div>

	<div class="container mx-auto max-w-5xl px-4 py-4 md:py-8">
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
		<div
			class="mb-6 rounded-lg border-l-4 border-blue-500 bg-gray-800 p-6 shadow-md shadow-gray-800"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">Reconciliation Progress</h2>
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

		<!-- Reverse Progress section (if enabled) -->
		{#if isReverseReconciliationEnabled}
			<div
				class="mb-6 rounded-lg border-l-4 border-orange-500 bg-gray-800 p-6 shadow-md shadow-gray-800"
			>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">
						🔄 Reverse Reconciliation Progress
						<span class="block text-sm text-orange-400">Comparison → Primary</span>
					</h2>
					<span class="text-lg font-bold text-orange-400">{reverseProgressPercentage}%</span>
				</div>

				<!-- Reverse Progress bar -->
				<div class="mb-4 h-5 overflow-hidden rounded-full bg-gray-700">
					<div
						class="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
						style="width: {reverseProgressPercentage}%"
					></div>
				</div>

				<!-- Reverse Progress details -->
				<div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="text-center">
						<p class="text-sm text-white">Processed</p>
						<p class="text-xl font-semibold text-gray-300">
							{reverseProcessedRows.toLocaleString()} / {reverseTotalRows.toLocaleString()}
						</p>
					</div>

					<div class="text-center">
						<p class="text-sm text-white">Speed</p>
						<p class="text-xl font-semibold text-gray-300">
							{reverseMatchingSpeed} rows/sec
						</p>
					</div>

					<div class="text-center">
						<p class="text-sm text-white">Estimated time remaining</p>
						<p class="text-xl font-semibold text-gray-300">{reverseEstimatedTimeLeft}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Real-time logs section -->
		<div
			class="mb-6 rounded-lg border-l-4 border-blue-500 bg-gray-800 p-6 shadow-md shadow-gray-800"
		>
			<h2 class="mb-4 text-xl font-semibold text-white">Matching Log</h2>

			<div class="max-h-96 overflow-y-auto">
				{#if matchingLogs.length === 0}
					<p class="py-4 text-center text-gray-400">Reconciliation process starting...</p>
				{:else}
					<table class="min-w-full divide-y divide-gray-700">
						<thead class="bg-gray-700">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
								>
									Primary ID
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
								>
									Comparison ID
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
								>
									Status
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
								>
									Reason
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-700 bg-gray-800">
							{#each matchingLogs as log, index (index)}
								<tr class="hover:bg-gray-700">
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-200">
										{log.primaryId}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-200">
										{log.comparisonId}
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-sm">
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
																	<span class="text-xs text-gray-400">Primary Row:</span>
																	<span class="ml-1 text-sm">{reason.primaryFileRow}</span>
																</div>
																<div>
																	<span class="text-xs text-gray-400">Comparison Row:</span>
																	<span class="ml-1 text-sm">{reason.comparisonFileRow}</span>
																</div>
																<div>
																	<span class="text-xs text-gray-400">Primary Value:</span>
																	<span class="ml-1 text-sm">{reason.primaryValue}</span>
																</div>
																<div>
																	<span class="text-xs text-gray-400">Comparison Value:</span>
																	<span class="ml-1 text-sm">{reason.comparisonValue}</span>
																</div>
																{#if reason.tolerance}
																	<div>
																		<span class="text-xs text-gray-400">Tolerance Type:</span>
																		<span class="ml-1 text-sm">{reason.tolerance.type}</span>
																	</div>
																	{#if reason.tolerance.type === 'custom' && reason.tolerance.formula}
																		<div>
																			<span class="text-xs text-gray-400">Formula:</span>
																			<span class="ml-1 text-sm">{reason.tolerance.formula}</span>
																		</div>
																	{:else if reason.tolerance.type === 'absolute' && reason.tolerance.value}
																		<div>
																			<span class="text-xs text-gray-400">Threshold:</span>
																			<span class="ml-1 text-sm">±{reason.tolerance.value}</span>
																		</div>
																	{:else if reason.tolerance.type === 'relative' && reason.tolerance.percentage}
																		<div>
																			<span class="text-xs text-gray-400">Tolerance:</span>
																			<span class="ml-1 text-sm"
																				>{reason.tolerance.percentage}%</span
																			>
																		</div>
																	{:else if reason.tolerance.type === 'within_percentage_similarity' && reason.tolerance.percentage}
																		<div>
																			<span class="text-xs text-gray-400">Similarity:</span>
																			<span class="ml-1 text-sm"
																				>{reason.tolerance.percentage}%</span
																			>
																		</div>
																	{/if}
																{/if}
																{#if reason.reason}
																	<div>
																		<span class="text-xs text-gray-400">Evaluation Result:</span>
																		<span class="ml-1 text-sm">{reason.reason}</span>
																	</div>
																{/if}
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
				<div class="mb-4 mt-6 text-center">
					<h3 class="mb-2 text-xl font-semibold text-white">Reconciliation Results Summary</h3>
					<p class="text-gray-300">
						{totalRows.toLocaleString()} total records processed.
						<span class="{hasFailures ? 'text-yellow-400' : 'text-green-400'} font-medium">
							{hasFailures
								? `${(totalRows - failureCount).toLocaleString()} matched successfully, ${failureCount.toLocaleString()} failures detected.`
								: 'All records matched successfully!'}
						</span>
					</p>
				</div>

				<div class="mt-4 flex justify-center space-x-4">
					<button
						onclick={downloadResults}
						class="btn transform rounded-lg border-2 border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 hover:text-white"
					>
						Download Results
					</button>
					{#if hasFailures}
						<button
							onclick={analyzeFailures}
							class="btn transform rounded-lg border-2 border-blue-500 bg-blue-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:text-white"
						>
							Analyze Failures
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Reverse Real-time logs section (if enabled) -->
		{#if isReverseReconciliationEnabled}
			<div
				class="rounded-lg border-l-4 border-orange-500 bg-gray-800 p-6 shadow-md shadow-gray-800"
			>
				<h2 class="mb-4 text-xl font-semibold text-white">
					🔄 Reverse Matching Log
					<span class="block text-sm text-orange-400">Comparison → Primary</span>
				</h2>

				<div class="max-h-96 overflow-y-auto">
					{#if reverseMatchingLogs.length === 0}
						<p class="py-4 text-center text-gray-400">Reverse reconciliation process starting...</p>
					{:else}
						<table class="min-w-full divide-y divide-gray-700">
							<thead class="bg-gray-700">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
									>
										Primary ID (Reverse)
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
									>
										Comparison ID (Reverse)
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
									>
										Status
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300"
									>
										Reason
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-700 bg-gray-800">
								{#each reverseMatchingLogs as log, index (index)}
									<tr class="hover:bg-gray-700">
										<td class="whitespace-nowrap px-6 py-4 text-sm text-orange-200">
											{log.primaryId}
										</td>
										<td class="whitespace-nowrap px-6 py-4 text-sm text-orange-200">
											{log.comparisonId}
										</td>
										<td class="whitespace-nowrap px-6 py-4 text-sm">
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
										<td class="px-6 py-4 text-sm text-orange-200">
											{#if log.reasons.length > 0}
												<details>
													<summary class="cursor-pointer text-orange-400">
														{log.reasons.length}
														{log.reasons.length === 1 ? 'reason' : 'reasons'}
													</summary>
													<div class="mt-2">
														{#each log.reasons as reason}
															<div class="mb-1 rounded bg-gray-700 p-2">
																<p class="font-semibold text-orange-300">
																	{reason.primaryFileColumn} / {reason.comparisonFileColumn}
																</p>
																<div class="mt-1 grid grid-cols-1 gap-2">
																	<div>
																		<span class="text-xs text-gray-400">Primary Row:</span>
																		<span class="ml-1 text-sm">{reason.primaryFileRow}</span>
																	</div>
																	<div>
																		<span class="text-xs text-gray-400">Comparison Row:</span>
																		<span class="ml-1 text-sm">{reason.comparisonFileRow}</span>
																	</div>
																	<div>
																		<span class="text-xs text-gray-400">Primary Value:</span>
																		<span class="ml-1 text-sm">{reason.primaryValue}</span>
																	</div>
																	<div>
																		<span class="text-xs text-gray-400">Comparison Value:</span>
																		<span class="ml-1 text-sm">{reason.comparisonValue}</span>
																	</div>
																	{#if reason.tolerance}
																		<div>
																			<span class="text-xs text-gray-400">Tolerance Type:</span>
																			<span class="ml-1 text-sm">{reason.tolerance.type}</span>
																		</div>
																		{#if reason.tolerance.type === 'custom' && reason.tolerance.formula}
																			<div>
																				<span class="text-xs text-gray-400">Formula:</span>
																				<span class="ml-1 text-sm">{reason.tolerance.formula}</span>
																			</div>
																		{:else if reason.tolerance.type === 'absolute' && reason.tolerance.value}
																			<div>
																				<span class="text-xs text-gray-400">Threshold:</span>
																				<span class="ml-1 text-sm">±{reason.tolerance.value}</span>
																			</div>
																		{:else if reason.tolerance.type === 'relative' && reason.tolerance.percentage}
																			<div>
																				<span class="text-xs text-gray-400">Tolerance:</span>
																				<span class="ml-1 text-sm"
																					>{reason.tolerance.percentage}%</span
																				>
																			</div>
																		{:else if reason.tolerance.type === 'within_percentage_similarity' && reason.tolerance.percentage}
																			<div>
																				<span class="text-xs text-gray-400">Similarity:</span>
																				<span class="ml-1 text-sm"
																					>{reason.tolerance.percentage}%</span
																				>
																			</div>
																		{/if}
																	{/if}
																	{#if reason.reason}
																		<div>
																			<span class="text-xs text-gray-400">Evaluation Result:</span>
																			<span class="ml-1 text-sm">{reason.reason}</span>
																		</div>
																	{/if}
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
				{#if isReverseReconciliationComplete}
					<!-- Reverse Summary Title -->
					<div class="mb-4 mt-6 text-center">
						<h3 class="mb-2 text-xl font-semibold text-white">
							🔄 Reverse Reconciliation Results Summary
						</h3>
						<p class="text-gray-300">
							{reverseTotalRows.toLocaleString()} total records processed in reverse direction.
							<span class="{reverseHasFailures ? 'text-yellow-400' : 'text-green-400'} font-medium">
								{reverseHasFailures
									? `${(reverseTotalRows - reverseFailureCount).toLocaleString()} matched successfully, ${reverseFailureCount.toLocaleString()} failures detected.`
									: 'All reverse records matched successfully!'}
							</span>
						</p>
					</div>

					<div class="mt-4 flex justify-center space-x-4">
						<button
							onclick={downloadReverseResults}
							class="btn transform rounded-lg border-2 border-orange-500 bg-orange-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-orange-600 hover:text-white"
						>
							Download Reverse Results
						</button>
						{#if reverseHasFailures}
							<button
								onclick={analyzeReverseFailures}
								class="btn transform rounded-lg border-2 border-blue-500 bg-blue-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:text-white"
							>
								Analyze Reverse Failures
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
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
</style>
