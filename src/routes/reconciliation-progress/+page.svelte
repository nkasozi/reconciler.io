<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import type { ColumnPair } from '$lib/utils/reconciliation';
	import {
		reconcileData,
		reconcileDataStreaming,
		reconcileDataIndexedDB,
		clearReconciliationLogs,
		getReconciliationLogs
	} from '$lib/utils/reconciliation';
	import { BatchReconciler, type BatchReconciliationProgress } from '$lib/utils/batchReconciler';
	import { ReconciliationDatabase } from '$lib/utils/indexedDB/database';

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
	let stuckDetectionTimeout: ReturnType<typeof setTimeout> | null = null;
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
	let reverseStuckDetectionTimeout: ReturnType<typeof setTimeout> | null = null;
	let reverseHasFailures = $state(false); // Track if there are any failures
	let reverseFailureCount = $state(0); // Count of failures

	// Check if reverse reconciliation is enabled
	let isReverseReconciliationEnabled = $state(false);

	// File insertion progress state (shown while files are still being dumped to IndexedDB)
	let primaryInsertionProgress = $state({
		storeName: null as string | null,
		totalRecords: 0,
		insertedRecords: 0,
		percentage: 0,
		recordsPerSecond: 0,
		estimatedTimeRemaining: 0
	});

	let comparisonInsertionProgress = $state({
		storeName: null as string | null,
		totalRecords: 0,
		insertedRecords: 0,
		percentage: 0,
		recordsPerSecond: 0,
		estimatedTimeRemaining: 0
	});

	// Derived state to determine if files are still being inserted
	let isInsertingFiles = $derived(
		primaryInsertionProgress.percentage < 100 || comparisonInsertionProgress.percentage < 100
	);

	// Batch reconciliation state
	let useBatchReconciliation = $state(false); // Use IndexedDB batch reconciliation if store names are available
	let batchProgress = $state<BatchReconciliationProgress>({
		totalRecords: 0,
		processedRecords: 0,
		currentBatch: 0,
		percentage: 0,
		recordsPerSecond: 0,
		estimatedTimeRemaining: 0,
		mode: 'sequential',
		isActive: false
	});
	let batchReconciler: BatchReconciler | null = null;
	let reconciliationDatabase: ReconciliationDatabase | null = null;

	// Primary ID and comparison columns
	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: '',
		comparisonColumn: '',
		tolerance: {
			type: 'exact_match'
		},
		settings: {
			caseSensitive: false,
			trimValues: false
		}
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

	// For reconciliation results storage
	let reconciliationResults: Array<{
		row: Record<string, string>;
		matched: boolean;
		reasons: any[];
	} | null> = [];

	// For reverse reconciliation results storage
	let reverseReconciliationResults: Array<{
		row: Record<string, string>;
		matched: boolean;
		reasons: any[];
	} | null> = [];

	onMount(() => {
		console.log('[Reconciliation Progress] Component mounted - initializing');

		const unsubscribe = reconciliationStore.subscribe((state) => {
			console.log('[Reconciliation Progress] Store subscription triggered');
			if (!state.primaryFile) {
				// Redirect to upload page if data is missing
				console.warn('Missing Primary file data, redirecting to upload page');
				goto('/upload');
				return;
			}

			if (!state.comparisonFile) {
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
			primaryFileName = state.primaryFile.name || 'Primary File';
			comparisonFileName = state.comparisonFile.name || 'Comparison File';
			console.log(
				`[Reconciliation Progress] Files loaded: ${primaryFileName} vs ${comparisonFileName}`
			);

			// Store file data for metadata access
			primaryFileData = null;
			comparisonFileData = null;

			// Don't block on getting total rows - we'll update it as we process
			// Just set it to 0 and let the reconciliation update it as results come in
			totalRows = 0;
			console.log(
				'[Reconciliation Progress] Skipping blocking getTotalRowCount call - will track progress during reconciliation'
			);

			//primaryRows = state.primaryFileData.rows;

			// Get column mapping configuration
			primaryIdPair = state.reconciliationConfig.primaryIdPair;
			comparisonPairs = state.reconciliationConfig.comparisonPairs;
			console.log(
				`[Reconciliation Progress] Configuration loaded. Primary ID column: ${primaryIdPair.primaryColumn}, Comparison ID column: ${primaryIdPair.comparisonColumn}`
			);

			// Check if reverse reconciliation is enabled
			isReverseReconciliationEnabled = state.reconciliationConfig.reverseReconciliation === true;

			// Track file insertion progress from store
			if (state.primaryFileInsertionProgress) {
				primaryInsertionProgress = {
					storeName: state.primaryFileInsertionProgress.storeName,
					totalRecords: state.primaryFileInsertionProgress.totalRecords,
					insertedRecords: state.primaryFileInsertionProgress.insertedRecords,
					percentage: state.primaryFileInsertionProgress.percentage,
					recordsPerSecond: state.primaryFileInsertionProgress.recordsPerSecond,
					estimatedTimeRemaining: state.primaryFileInsertionProgress.estimatedTimeRemaining
				};
			}

			if (state.comparisonFileInsertionProgress) {
				comparisonInsertionProgress = {
					storeName: state.comparisonFileInsertionProgress.storeName,
					totalRecords: state.comparisonFileInsertionProgress.totalRecords,
					insertedRecords: state.comparisonFileInsertionProgress.insertedRecords,
					percentage: state.comparisonFileInsertionProgress.percentage,
					recordsPerSecond: state.comparisonFileInsertionProgress.recordsPerSecond,
					estimatedTimeRemaining: state.comparisonFileInsertionProgress.estimatedTimeRemaining
				};
			}

			// Only start reconciliation once files are fully inserted (comparison file must be at 100%)
			// Primary file can continue inserting while reconciliation proceeds
			if (comparisonInsertionProgress.percentage === 100 && !isReconciliationComplete) {
				console.log(
					'[Reconciliation Progress] Comparison file fully inserted. Starting reconciliation...'
				);
				// Start the reconciliation process now that comparison file is loaded
				startReconciliation();
			}

			// NOTE: Comparison map is now built internally by reconcileDataStreaming
			// This avoids redundant iteration and lets reconciliation start immediately
			console.log('[Reconciliation Progress] Monitoring file insertion progress...');

			// Check if reverse reconciliation is enabled and start it
			if (state.reconciliationConfig?.reverseReconciliation) {
				console.log('[Reconciliation Progress] Reverse reconciliation enabled');
				startReverseReconciliation();
			}
		});
		console.log('[Reconciliation Progress] onMount complete, subscriptions active');

		return () => {
			unsubscribe();
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

	// Helper function to format time estimates
	function formatTimeEstimate(seconds: number): string {
		if (!seconds || seconds < 0 || !isFinite(seconds)) {
			return 'calculating...';
		}
		if (seconds < 60) {
			return Math.round(seconds) + 's';
		}
		if (seconds < 3600) {
			return Math.round(seconds / 60) + 'm';
		}
		return Math.round(seconds / 3600) + 'h';
	}

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
		console.log('[Reconciliation Progress] startReconciliation() called');
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
		if (!primaryIdPair.primaryColumn || !primaryIdPair.comparisonColumn) {
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

		console.log('Store state on reconciliation start:', {
			hasPrimaryFile: !!storeState.primaryFile,
			hasComparisonFile: !!storeState.comparisonFile,
			hasConfig: !!storeState.reconciliationConfig,
			hasPrimaryParser: !!storeState.primaryFileParser,
			hasComparisonParser: !!storeState.comparisonFileParser
		});

		if (
			!storeState.primaryFile ||
			!storeState.comparisonFile ||
			!storeState.reconciliationConfig ||
			!storeState.primaryFileParser ||
			!storeState.comparisonFileParser
		) {
			console.error('Missing store data for reconciliation', {
				primaryFile: !!storeState.primaryFile,
				comparisonFile: !!storeState.comparisonFile,
				config: !!storeState.reconciliationConfig,
				primaryParser: !!storeState.primaryFileParser,
				comparisonParser: !!storeState.comparisonFileParser
			});
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

		// Perform the actual reconciliation using streaming or fallback
		try {
			console.log('Starting reconciliation...');

			// Check if IndexedDB stores are available (new architecture)
			const hasIndexedDBStores =
				storeState.primaryFileStoreName && storeState.comparisonFileStoreName;

			if (hasIndexedDBStores) {
				console.log('[Reconciliation] Using IndexedDB batch reconciliation...');
				console.log(`[Reconciliation] Primary store: ${storeState.primaryFileStoreName}`);
				console.log(`[Reconciliation] Comparison store: ${storeState.comparisonFileStoreName}`);
				useBatchReconciliation = true;

				// Initialize database and batch reconciler
				reconciliationDatabase = new ReconciliationDatabase();
				batchReconciler = new BatchReconciler({
					batchSize: 100,
					mode: 'sequential',
					concurrencyLimit: 2,
					onProgress: (progress: BatchReconciliationProgress) => {
						batchProgress = progress;
						processedRows = progress.processedRecords;
						matchingSpeed = progress.recordsPerSecond;
						estimatedTimeLeft = formatTimeEstimate(progress.estimatedTimeRemaining);

						if (processedRows % 500 === 0) {
							console.log(
								`[Batch Reconciliation] Progress: ${progress.percentage}% (${progress.processedRecords}/${progress.totalRecords})`
							);
						}
					}
				});

				// Use an async IIFE to properly await the async reconciliation
				(async () => {
					console.log('[Batch IIFE] Starting batch reconciliation...');
					try {
						console.log('[Batch IIFE] Calling performBatchReconciliation...');
						await performBatchReconciliation(storeState);
						console.log('[Batch IIFE] performBatchReconciliation completed');
					} catch (error) {
						console.error('[Batch IIFE] Batch reconciliation error:', error);
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
										primaryFileColumn: 'Batch Reconciliation Error',
										comparisonFileColumn: 'Details',
										primaryValue: error instanceof Error ? error.message : String(error),
										comparisonValue: 'See browser console for more details'
									}
								]
							}
						];
						finishReconciliation();
					}
				})();
			} else if (storeState.primaryFileParser && storeState.comparisonFileParser) {
				console.log('Using streaming reconciliation (fallback)...');
				console.log('Primary parser:', storeState.primaryFileParser);
				console.log('Comparison parser:', storeState.comparisonFileParser);
				// Use an async IIFE to properly await the async reconciliation
				(async () => {
					console.log('[ASYNC IIFE] Starting streaming reconciliation...');
					try {
						console.log('[ASYNC IIFE] Calling performStreamingReconciliation...');
						await performStreamingReconciliation(storeState);
						console.log('[ASYNC IIFE] performStreamingReconciliation completed');
					} catch (error) {
						console.error('[ASYNC IIFE] Streaming reconciliation error:', error);
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
										primaryFileColumn: 'Streaming Error',
										comparisonFileColumn: 'Details',
										primaryValue: error instanceof Error ? error.message : String(error),
										comparisonValue: 'See browser console for more details'
									}
								]
							}
						];
						finishReconciliation();
					}
				})();
			} else {
				console.log('Streaming parsers not available, using preview data reconciliation...');
				performPreviewReconciliation(storeState);
			}
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

	/**
	 * Perform batch reconciliation using IndexedDB stores with O(1) lookups
	 */
	async function performBatchReconciliation(storeState: any) {
		try {
			console.log('[performBatchReconciliation] Starting...');

			if (!batchReconciler || !reconciliationDatabase) {
				throw new Error('Batch reconciler or database not initialized');
			}

			const generator = batchReconciler.reconcileBatches(
				reconciliationDatabase,
				storeState.primaryFileStoreName,
				storeState.comparisonFileStoreName,
				storeState.reconciliationConfig
			);

			console.log('[performBatchReconciliation] Generator created, starting iteration...');

			let matchIndex = 0;
			for await (const result of generator) {
				matchIndex++;
				processedRows = matchIndex;

				if (matchIndex === 1) {
					console.log(
						'[performBatchReconciliation] *** FIRST RESULT RECEIVED - Batch reconciliation working! ***'
					);
					console.log('[performBatchReconciliation] First result:', result.idValues);
				}

				if (matchIndex % 500 === 0) {
					console.log(`[performBatchReconciliation] Progress: ${matchIndex} results processed`);
				}

				// Add log entry for this match
				const newLog: any = {
					timestamp: Date.now(),
					primaryId: result.idValues.primary,
					comparisonId: result.idValues.comparison,
					matched: result.matchScore === 100,
					reasons: Object.entries(result.comparisonResults).map(([column, compResult]) => {
						const pair = comparisonPairs.find((p) => p.primaryColumn === column);
						const primaryColumnName =
							primaryFileData?.columns?.find((c: any) => c.name === column)?.name || column;
						const comparisonColumnName =
							comparisonFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)
								?.name ||
							pair?.comparisonColumn ||
							column;

						return {
							primaryFileRow: `Batch Result ${matchIndex}`,
							comparisonFileRow: `Record ${result.idValues.comparison}`,
							primaryFileColumn: primaryColumnName,
							comparisonFileColumn: comparisonColumnName,
							primaryValue: String((compResult as any).primaryValue),
							comparisonValue: String((compResult as any).comparisonValue),
							reason: (compResult as any).reason,
							tolerance: pair?.tolerance,
							match: (compResult as any).match,
							status: (compResult as any).status
						};
					})
				};

				// Keep only last 100 logs
				matchingLogs = [newLog, ...matchingLogs.slice(0, 99)];

				// Track failures
				if (!result.matchScore || result.matchScore < 100) {
					failureCount++;
					hasFailures = true;
				}

				// Store result
				reconciliationResults.push({
					row: result.primaryRow,
					matched: result.matchScore === 100,
					reasons: Object.entries(result.comparisonResults).map(([column, compResult]) => {
						const pair = comparisonPairs.find((p) => p.primaryColumn === column);
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
							primaryValue: (compResult as any).primaryValue,
							comparisonValue: (compResult as any).comparisonValue,
							reason: (compResult as any).reason,
							tolerance: pair?.tolerance,
							match: (compResult as any).match,
							status: (compResult as any).status
						};
					})
				});
			}

			console.log(`[performBatchReconciliation] Completed. Total results: ${matchIndex}`);
			finishReconciliation();
		} catch (error) {
			console.error('[performBatchReconciliation] Error:', error);
			throw error;
		}
	}

	// Perform streaming reconciliation using file parsers
	async function performStreamingReconciliation(storeState: any) {
		try {
			console.log('[performStreamingReconciliation] Starting...');
			console.log(
				'[performStreamingReconciliation] Creating streaming reconciliation generator...'
			);
			console.log('[performStreamingReconciliation] Config:', storeState.reconciliationConfig);
			const generator = reconcileDataStreaming(
				storeState.primaryFileParser,
				storeState.comparisonFileParser,
				storeState.reconciliationConfig
			);
			console.log('[performStreamingReconciliation] Generator created:', generator);

			let matchIndex = 0;
			console.log('[performStreamingReconciliation] Starting for-await loop...');
			for await (const result of generator) {
				matchIndex++;
				processedRows = matchIndex;

				// Update totalRows on first result (since we're not blocking on it anymore)
				if (matchIndex === 1) {
					console.log(
						'[performStreamingReconciliation] *** FIRST RESULT RECEIVED - Reconciliation is working! ***'
					);
					console.log('[performStreamingReconciliation] First result:', result.idValues);
				}

				if (matchIndex % 100 === 0) {
					console.log(`[performStreamingReconciliation] Progress: ${matchIndex} results processed`);
				}

				console.log(
					`[performStreamingReconciliation] Processing result ${matchIndex}:`,
					result.idValues
				);

				// Add log entry for this match
				const newLog: any = {
					timestamp: Date.now(),
					primaryId: result.idValues.primary,
					comparisonId: result.idValues.comparison,
					matched: result.matchScore === 100,
					reasons: Object.entries(result.comparisonResults).map(([column, compResult]) => {
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
							primaryFileRow: `Match ${matchIndex}`,
							comparisonFileRow: `Record ${result.idValues.comparison}`,
							primaryFileColumn: primaryColumnName,
							comparisonFileColumn: comparisonColumnName,
							primaryValue: String((compResult as any).primaryValue),
							comparisonValue: String((compResult as any).comparisonValue),
							reason: (compResult as any).reason,
							tolerance: pair?.tolerance,
							match: (compResult as any).match,
							status: (compResult as any).status
						};
					})
				};

				// Keep only last 100 logs
				matchingLogs = [newLog, ...matchingLogs.slice(0, 99)];

				// Track failures
				if (!result.matchScore || result.matchScore < 100) {
					failureCount++;
					hasFailures = true;
				}

				// Store result
				reconciliationResults.push({
					row: result.primaryRow,
					matched: result.matchScore === 100,
					reasons: Object.entries(result.comparisonResults).map(([column, compResult]) => {
						const pair = comparisonPairs.find((p) => p.primaryColumn === column);
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
							primaryValue: (compResult as any).primaryValue,
							comparisonValue: (compResult as any).comparisonValue,
							reason: (compResult as any).reason,
							tolerance: pair?.tolerance,
							match: (compResult as any).match,
							status: (compResult as any).status
						};
					})
				});

				// Update speed and time estimate
				const elapsedSeconds = (Date.now() - startTime) / 1000;
				matchingSpeed = matchIndex / elapsedSeconds;
				const remainingRows = totalRows - matchIndex;
				const estimatedSecondsLeft = remainingRows / matchingSpeed;
				estimatedTimeLeft = formatTimeEstimate(estimatedSecondsLeft);
			}

			console.log(`For-await loop completed. Total results processed: ${matchIndex}`);
			finishReconciliation();
		} catch (error) {
			console.error('Streaming reconciliation error:', error);
			throw error;
		}
	}

	// Fallback to preview data reconciliation
	function performPreviewReconciliation(storeState: any) {
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
					comparisonFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)?.name ||
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
					comparisonFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)?.name ||
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
		// Reset the reverse state
		reverseProcessedRows = 0;
		reverseMatchingLogs = [];
		isReverseReconciliationComplete = false;
		reverseStartTime = Date.now();
		reverseLastLogTimestamp = reverseStartTime;

		// Clear any existing logs
		clearReconciliationLogs();

		// Start stuck detection for reverse
		if (reverseStuckDetectionTimeout) {
			clearTimeout(reverseStuckDetectionTimeout);
		}
		reverseStuckDetectionTimeout = setTimeout(() => checkForStuckProcess('reverse'), 3000);

		// Get the current store state
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

		// For reverse reconciliation, get total rows from parser if available
		if (storeState.comparisonFileParser) {
			storeState.comparisonFileParser
				.getTotalRowCount()
				.then((count: number) => {
					reverseTotalRows = count;
					console.log('Loaded comparison file row count for reverse:', count);
					performReverseReconciliation(storeState);
				})
				.catch((error: any) => {
					console.error('Error getting comparison row count:', error);
					// Fallback to preview data
					reverseTotalRows = storeState.comparisonFileData.rows.length;
					performReverseReconciliation(storeState);
				});
		} else {
			// Fallback to preview data if no parser
			reverseTotalRows = storeState.comparisonFileData.rows.length;
			performReverseReconciliation(storeState);
		}
	}

	// Perform reverse reconciliation
	function performReverseReconciliation(storeState: any) {
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
						comparisonValue: `Swapping files: Comparison as Primary, Primary as Comparison`
					}
				]
			}
		];
		reverseLastLogTimestamp = Date.now();

		// Perform the actual reverse reconciliation using the real reconciliation engine with swapped files
		try {
			console.log('Starting reverse reconciliation with tolerance evaluator...');

			// Create a swapped config for reverse reconciliation
			// Swap the ID pair columns
			const reverseIdPair: ColumnPair = {
				primaryColumn: storeState.reconciliationConfig.primaryIdPair.comparisonColumn,
				comparisonColumn: storeState.reconciliationConfig.primaryIdPair.primaryColumn,
				tolerance: storeState.reconciliationConfig.primaryIdPair.tolerance,
				settings: storeState.reconciliationConfig.primaryIdPair.settings
			};

			// Swap the comparison pairs (swap primary and comparison columns)
			const reverseComparisonPairs = storeState.reconciliationConfig.comparisonPairs.map(
				(pair: ColumnPair) => ({
					primaryColumn: pair.comparisonColumn,
					comparisonColumn: pair.primaryColumn,
					tolerance: pair.tolerance,
					settings: pair.settings
				})
			);

			// Create swapped config
			const reverseConfig = {
				primaryIdPair: reverseIdPair,
				comparisonPairs: reverseComparisonPairs,
				reverseReconciliation: false // Don't do reverse of reverse
			};

			// Call reconcileData with swapped files and swapped config
			const result = reconcileData(
				storeState.comparisonFileData, // Comparison becomes primary
				storeState.primaryFileData, // Primary becomes comparison
				reverseConfig
			);

			// Get the debug logs that were generated during reverse reconciliation
			const debugLogs = getReconciliationLogs();
			console.log('Reverse reconciliation complete! Generated', debugLogs.length, 'debug logs');

			// Convert the reverse reconciliation results into reverseMatchingLogs format
			const newLogs = result.matches.map((match, index) => ({
				timestamp: Date.now() + index,
				primaryId: match.idValues.primary,
				comparisonId: match.idValues.comparison,
				matched: match.matchScore === 100,
				reasons: Object.entries(match.comparisonResults).map(([column, compResult]) => {
					// Find the swapped column pair configuration for this column
					const pair = reverseComparisonPairs.find((p: ColumnPair) => p.primaryColumn === column);

					// Get display names from file metadata (swapped for reverse)
					const primaryColumnName =
						comparisonFileData?.columns?.find((c: any) => c.name === column)?.name || column;
					const comparisonColumnName =
						primaryFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)?.name ||
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
			reverseMatchingLogs = [...newLogs.slice(0, 100), ...reverseMatchingLogs];
			reverseProcessedRows = result.summary.totalPrimaryRows;
			reverseFailureCount =
				result.summary.unmatchedPrimaryRows + result.summary.unmatchedComparisonRows;
			reverseHasFailures = reverseFailureCount > 0;

			// Store results for later use
			reverseReconciliationResults = result.matches.map((match) => ({
				row: match.primaryRow,
				matched: match.matchScore === 100,
				reasons: Object.entries(match.comparisonResults).map(([column, compResult]) => {
					// Find the swapped column pair configuration for this column
					const pair = reverseComparisonPairs.find((p: ColumnPair) => p.primaryColumn === column);

					// Get display names from file metadata (swapped for reverse)
					const primaryColumnName =
						comparisonFileData?.columns?.find((c: any) => c.name === column)?.name || column;
					const comparisonColumnName =
						primaryFileData?.columns?.find((c: any) => c.name === pair?.comparisonColumn)?.name ||
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

			// Finish reverse reconciliation
			finishReverseReconciliation();
		} catch (error) {
			console.error('Reverse reconciliation error:', error);
			reverseMatchingLogs = [
				{
					timestamp: Date.now(),
					primaryId: 'ERROR',
					comparisonId: 'ERROR',
					matched: false,
					reasons: [
						{
							primaryFileRow: 'Error Log',
							comparisonFileRow: 'Error Log',
							primaryFileColumn: 'Reverse Reconciliation Error',
							comparisonFileColumn: 'Details',
							primaryValue: error instanceof Error ? error.message : String(error),
							comparisonValue: 'See browser console for more details'
						}
					]
				}
			];
			finishReverseReconciliation();
		}

		// Function to complete reverse reconciliation
		function finishReverseReconciliation() {
			isReverseReconciliationComplete = true;

			// Check reverse failures (already counted above)
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
				const comparisonResults: Record<string, any> = {};
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
		console.log('Download results clicked');

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

	function convertToCSV(results: any[]) {
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
		console.log('Download reverse results clicked');

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

	<div class="container mx-auto max-w-5xl px-2 py-2 sm:px-4 sm:py-4 md:py-8">
		<h1 class="mb-4 text-center text-2xl font-bold text-white sm:mb-6 sm:text-3xl">
			{#if isReconciliationComplete}
				<span class="text-blue-400">Reconciliation Complete</span>
			{:else if isInsertingFiles}
				<span class="text-yellow-400">Preparing Files for Reconciliation...</span>
			{:else}
				<span class="text-white">Reconciliation in Progress...</span>
			{/if}
		</h1>

		<!-- Files info -->
		<div class="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:gap-4 md:grid-cols-2">
			<div class="rounded-lg bg-gray-800 p-3 shadow-md shadow-gray-800 sm:p-4">
				<h2 class="mb-2 text-base font-semibold text-white sm:text-lg">Primary File</h2>
				<p class="truncate text-xs text-gray-300 sm:text-sm">{primaryFileName}</p>
			</div>

			<div class="rounded-lg bg-gray-800 p-3 shadow-md shadow-gray-800 sm:p-4">
				<h2 class="mb-2 text-base font-semibold text-white sm:text-lg">Comparison File</h2>
				<p class="truncate text-xs text-gray-300 sm:text-sm">{comparisonFileName}</p>
			</div>
		</div>

		<!-- File Insertion Progress Section (shown while files are being inserted) -->
		{#if isInsertingFiles}
			<div
				class="mb-4 rounded-lg border-l-4 border-yellow-500 bg-gray-800 p-3 shadow-md shadow-gray-800 sm:mb-6 sm:p-6"
			>
				<h2 class="mb-4 text-base font-semibold text-white sm:mb-6 sm:text-xl">
					File Insertion Progress
				</h2>

				<!-- Comparison File Progress (Critical) -->
				<div class="mb-6 sm:mb-8">
					<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0">
							<h3 class="text-sm font-medium text-gray-200 sm:text-base">Comparison File</h3>
							<p class="truncate text-xs text-gray-400 sm:text-sm">
								{comparisonInsertionProgress.insertedRecords.toLocaleString()} / {comparisonInsertionProgress.totalRecords.toLocaleString()}
								records
							</p>
						</div>
						<div class="text-right">
							<p class="text-xl font-bold text-yellow-400 sm:text-2xl">
								{comparisonInsertionProgress.percentage}%
							</p>
							{#if comparisonInsertionProgress.recordsPerSecond > 0}
								<p class="text-xs text-gray-400 sm:text-sm">
									{comparisonInsertionProgress.recordsPerSecond.toLocaleString()} records/sec
								</p>
							{/if}
							{#if comparisonInsertionProgress.estimatedTimeRemaining > 0 && comparisonInsertionProgress.percentage < 100}
								<p class="text-xs text-gray-400 sm:text-sm">
									{(comparisonInsertionProgress.estimatedTimeRemaining / 1000).toFixed(1)}s
									remaining
								</p>
							{/if}
						</div>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-700">
						<div
							class="h-full rounded-full bg-yellow-500 transition-all duration-500"
							style={`width: ${comparisonInsertionProgress.percentage}%`}
						></div>
					</div>
				</div>

				<!-- Primary File Progress (Concurrent) -->
				<div class="mb-4 sm:mb-8">
					<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div class="min-w-0">
							<h3 class="text-sm font-medium text-gray-200 sm:text-base">Primary File</h3>
							<p class="truncate text-xs text-gray-400 sm:text-sm">
								{primaryInsertionProgress.insertedRecords.toLocaleString()} / {primaryInsertionProgress.totalRecords.toLocaleString()}
								records
							</p>
						</div>
						<div class="text-right">
							<p class="text-xl font-bold text-green-400 sm:text-2xl">
								{primaryInsertionProgress.percentage}%
							</p>
							{#if primaryInsertionProgress.recordsPerSecond > 0}
								<p class="text-xs text-gray-400 sm:text-sm">
									{primaryInsertionProgress.recordsPerSecond.toLocaleString()} records/sec
								</p>
							{/if}
							{#if primaryInsertionProgress.estimatedTimeRemaining > 0 && primaryInsertionProgress.percentage < 100}
								<p class="text-xs text-gray-400 sm:text-sm">
									{(primaryInsertionProgress.estimatedTimeRemaining / 1000).toFixed(1)}s remaining
								</p>
							{/if}
						</div>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-700">
						<div
							class="h-full rounded-full bg-green-500 transition-all duration-500"
							style={`width: ${primaryInsertionProgress.percentage}%`}
						></div>
					</div>
				</div>

				<div class="rounded-md border border-yellow-700 bg-yellow-900/20 p-2 sm:p-3">
					<p class="text-xs text-yellow-200 sm:text-sm">
						<strong>Note:</strong> Reconciliation will start automatically once the comparison file is
						fully prepared. The primary file can continue loading while reconciliation proceeds.
					</p>
				</div>
			</div>
		{/if}

		<!-- Progress section -->
		{#if !isInsertingFiles}
			<div
				class="mb-4 rounded-lg border-l-4 border-blue-500 bg-gray-800 p-3 shadow-md shadow-gray-800 sm:mb-6 sm:p-6"
			>
				<div
					class="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<h2 class="text-base font-semibold text-white sm:text-xl">Reconciliation Progress</h2>
					<span class="text-lg font-bold text-blue-400 sm:text-lg">{progressPercentage}%</span>
				</div>

				<!-- Progress bar -->
				<div class="mb-3 h-5 overflow-hidden rounded-full bg-gray-700 sm:mb-4">
					<div
						class="h-full rounded-full bg-blue-500 transition-all duration-500 ease-out"
						style="width: {progressPercentage}%"
					></div>
				</div>

				<!-- Progress details -->
				<div class="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3">
					<div class="rounded bg-gray-700 p-2 sm:p-3">
						<p class="text-xs text-white sm:text-sm">Processed</p>
						<p class="text-base font-semibold text-gray-300 sm:text-xl">
							{processedRows.toLocaleString()} / {totalRows.toLocaleString()}
						</p>
					</div>

					<div class="rounded bg-gray-700 p-2 sm:p-3">
						<p class="text-xs text-white sm:text-sm">Speed</p>
						<p class="text-base font-semibold text-gray-300 sm:text-xl">
							{matchingSpeed} rows/sec
						</p>
					</div>

					<div class="rounded bg-gray-700 p-2 sm:p-3">
						<p class="text-xs text-white sm:text-sm">Estimated time remaining</p>
						<p class="text-base font-semibold text-gray-300 sm:text-xl">{estimatedTimeLeft}</p>
					</div>
				</div>
			</div>

			<!-- Reverse Progress section (if enabled) -->
			{#if isReverseReconciliationEnabled}
				<div
					class="mb-4 rounded-lg border-l-4 border-orange-500 bg-gray-800 p-3 shadow-md shadow-gray-800 sm:mb-6 sm:p-6"
				>
					<div
						class="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between"
					>
						<h2 class="text-base font-semibold text-white sm:text-xl">
							🔄 Reverse Reconciliation Progress
							<span class="block text-xs text-orange-400 sm:text-sm">Comparison → Primary</span>
						</h2>
						<span class="text-lg font-bold text-orange-400">{reverseProgressPercentage}%</span>
					</div>

					<!-- Reverse Progress bar -->
					<div class="mb-3 h-5 overflow-hidden rounded-full bg-gray-700 sm:mb-4">
						<div
							class="h-full rounded-full bg-orange-500 transition-all duration-500 ease-out"
							style="width: {reverseProgressPercentage}%"
						></div>
					</div>

					<!-- Reverse Progress details -->
					<div class="grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3">
						<div class="rounded bg-gray-700 p-2 sm:p-3">
							<p class="text-xs text-white sm:text-sm">Processed</p>
							<p class="text-base font-semibold text-gray-300 sm:text-xl">
								{reverseProcessedRows.toLocaleString()} / {reverseTotalRows.toLocaleString()}
							</p>
						</div>

						<div class="rounded bg-gray-700 p-2 sm:p-3">
							<p class="text-xs text-white sm:text-sm">Speed</p>
							<p class="text-base font-semibold text-gray-300 sm:text-xl">
								{reverseMatchingSpeed} rows/sec
							</p>
						</div>

						<div class="rounded bg-gray-700 p-2 sm:p-3">
							<p class="text-xs text-white sm:text-sm">Estimated time remaining</p>
							<p class="text-base font-semibold text-gray-300 sm:text-xl">
								{reverseEstimatedTimeLeft}
							</p>
						</div>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Real-time logs section -->
		<div
			class="mb-4 rounded-lg border-l-4 border-blue-500 bg-gray-800 p-3 shadow-md shadow-gray-800 sm:mb-6 sm:p-6"
		>
			<h2 class="mb-3 text-base font-semibold text-white sm:mb-4 sm:text-xl">Matching Log</h2>

			<div class="max-h-64 overflow-y-auto sm:max-h-96">
				{#if matchingLogs.length === 0}
					<p class="py-4 text-center text-xs text-gray-400 sm:text-sm">
						Reconciliation process starting...
					</p>
				{:else}
					<div class="space-y-2 sm:space-y-0">
						{#each matchingLogs as log, index (index)}
							<div class="rounded bg-gray-700 p-2 sm:p-3">
								<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
									<div class="flex flex-col gap-0.5 sm:gap-1">
										<div class="flex flex-wrap gap-2">
											<span class="rounded bg-blue-900/50 px-2 py-1 text-xs text-blue-200">
												{log.primaryId}
											</span>
											<span class="rounded bg-purple-900/50 px-2 py-1 text-xs text-purple-200">
												{log.comparisonId}
											</span>
										</div>
										{#if log.matched}
											<span
												class="w-fit rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-200"
											>
												✓ Match
											</span>
										{:else}
											<span
												class="w-fit rounded bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-200"
											>
												✗ No Match
											</span>
										{/if}
									</div>
									<div class="text-xs text-gray-400">
										{new Date(log.timestamp).toLocaleTimeString()}
									</div>
								</div>
								{#if log.reasons.length > 0}
									<div class="mt-2 border-t border-gray-600 pt-2 text-xs text-gray-300 sm:text-xs">
										<p class="line-clamp-2 sm:line-clamp-3">
											{log.reasons[0].primaryFileColumn}: {log.reasons[0].primaryValue}
										</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
			{#if isReconciliationComplete}
				<!-- Summary Title -->
				<div class="mb-3 mt-4 text-center sm:mb-4 sm:mt-6">
					<h3 class="mb-2 text-base font-semibold text-white sm:text-xl">
						Reconciliation Results Summary
					</h3>
					<p class="text-xs text-gray-300 sm:text-sm">
						{totalRows.toLocaleString()} total records processed.
						<span class="{hasFailures ? 'text-yellow-400' : 'text-green-400'} font-medium">
							{hasFailures
								? `${(totalRows - failureCount).toLocaleString()} matched successfully, ${failureCount.toLocaleString()} failures detected.`
								: 'All records matched successfully!'}
						</span>
					</p>
				</div>

				<div
					class="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:justify-center sm:gap-4 sm:space-x-4"
				>
					<button
						onclick={downloadResults}
						class="btn transform rounded-lg border-2 border-green-500 bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 hover:text-white sm:px-6 sm:py-3 sm:text-base"
					>
						Download Results
					</button>
					{#if hasFailures}
						<button
							onclick={analyzeFailures}
							class="btn transform rounded-lg border-2 border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:text-white sm:px-6 sm:py-3 sm:text-base"
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
				class="mb-4 rounded-lg border-l-4 border-orange-500 bg-gray-800 p-3 shadow-md shadow-gray-800 sm:mb-6 sm:p-6"
			>
				<h2 class="mb-3 text-base font-semibold text-white sm:mb-4 sm:text-xl">
					🔄 Reverse Matching Log
					<span class="block text-xs text-orange-400 sm:text-sm">Comparison → Primary</span>
				</h2>

				<div class="max-h-64 overflow-y-auto sm:max-h-96">
					{#if reverseMatchingLogs.length === 0}
						<p class="py-4 text-center text-xs text-gray-400 sm:text-sm">
							Reverse reconciliation process starting...
						</p>
					{:else}
						<div class="space-y-2 sm:space-y-0">
							{#each reverseMatchingLogs as log, index (index)}
								<div class="rounded bg-gray-700 p-2 sm:p-3">
									<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
										<div class="flex flex-col gap-0.5 sm:gap-1">
											<div class="flex flex-wrap gap-2">
												<span class="rounded bg-blue-900/50 px-2 py-1 text-xs text-blue-200">
													{log.primaryId} (R)
												</span>
												<span class="rounded bg-purple-900/50 px-2 py-1 text-xs text-purple-200">
													{log.comparisonId} (R)
												</span>
											</div>
											{#if log.matched}
												<span
													class="w-fit rounded bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-200"
												>
													✓ Match
												</span>
											{:else}
												<span
													class="w-fit rounded bg-red-900/50 px-2 py-0.5 text-xs font-medium text-red-200"
												>
													✗ No Match
												</span>
											{/if}
										</div>
										<div class="text-xs text-gray-400">
											{new Date(log.timestamp).toLocaleTimeString()}
										</div>
									</div>
									{#if log.reasons.length > 0}
										<div
											class="mt-2 border-t border-gray-600 pt-2 text-xs text-gray-300 sm:text-xs"
										>
											<p class="line-clamp-2 sm:line-clamp-3">
												{log.reasons[0].primaryFileColumn}: {log.reasons[0].primaryValue}
											</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				{#if isReverseReconciliationComplete}
					<!-- Reverse Summary Title -->
					<div class="mb-3 mt-4 text-center sm:mb-4 sm:mt-6">
						<h3 class="mb-2 text-base font-semibold text-white sm:text-xl">
							🔄 Reverse Reconciliation Results Summary
						</h3>
						<p class="text-xs text-gray-300 sm:text-sm">
							{reverseTotalRows.toLocaleString()} total records processed in reverse direction.
							<span class="{reverseHasFailures ? 'text-yellow-400' : 'text-green-400'} font-medium">
								{reverseHasFailures
									? `${(reverseTotalRows - reverseFailureCount).toLocaleString()} matched successfully, ${reverseFailureCount.toLocaleString()} failures detected.`
									: 'All reverse records matched successfully!'}
							</span>
						</p>
					</div>

					<div class="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:justify-center sm:gap-4">
						<button
							onclick={downloadReverseResults}
							class="btn transform rounded-lg border-2 border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-orange-600 hover:text-white sm:px-6 sm:py-3 sm:text-base"
						>
							Download Reverse Results
						</button>
						{#if reverseHasFailures}
							<button
								onclick={analyzeReverseFailures}
								class="btn transform rounded-lg border-2 border-blue-500 bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-blue-600 hover:text-white sm:px-6 sm:py-3 sm:text-base"
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
