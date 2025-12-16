import Papa from 'papaparse';
import { getReconciliationDB, ReconciliationDatabase } from './database';
import type {
	IndexedDBConfig,
	FileDumpProgress,
	FileDumpResult,
	FileDumpProgressCallback,
	PrimaryFileRecord
} from './types';
import {
	updateComparisonProgress,
	updatePrimaryProgress,
	getFileProgress,
	getOrCreateFileProgress
} from './fileProgressTracker';

// Constants for controlled concurrency
const CONCURRENT_BULK_INSERTS_LIMIT: number = 4; // Limit to 4 parallel IndexedDB transactions/chunks
const CSV_CHUNK_SIZE: number = 50000;

// Define a type for the mutable state shared across steps
type DumpState = {
	total_records: number;
	inserted_records: number;
	failed_records: number;
	current_batch: Record<string, any>[];
	is_file_reading_complete: boolean;
	start_time: number;
	insertion_queue: Promise<number>[];
	current_row_index?: number; // absolute row index in the file (1-based)
	resume_from_row?: number; // if resuming, rows <= this have already been inserted
};

/**
 * 📚 Chapter 1: The Reporting Tool
 * Updates progress metrics and reports them via callback and console log.
 */
function report_dump_progress(
	store_name: string,
	state: DumpState,
	bulk_insert_complete: boolean,
	onProgress?: FileDumpProgressCallback
): void {
	const elapsed_milliseconds: number = Date.now() - state.start_time;
	const elapsed_seconds: number = elapsed_milliseconds / 1000;
	const records_per_second: number = state.inserted_records / elapsed_seconds || 0;

	const remaining_records: number = state.total_records - state.inserted_records;
	const estimated_remaining_milliseconds: number =
		remaining_records > 0 && records_per_second > 0
			? (remaining_records / records_per_second) * 1000
			: 0;

	const pending_insertions_count: number = state.insertion_queue.length;

	const progress: FileDumpProgress = {
		storeName: store_name,
		totalRecords: state.total_records,
		insertedRecords: state.inserted_records,
		percentage:
			state.total_records > 0
				? Math.min(100, Math.round((state.inserted_records / state.total_records) * 100))
				: 0,
		startTime: state.start_time,
		estimatedTimeRemaining: estimated_remaining_milliseconds,
		recordsPerSecond: Math.round(records_per_second),
		isFileReadingComplete: state.is_file_reading_complete,
		isBulkInsertionComplete: bulk_insert_complete
	};

	if (onProgress) {
		onProgress(progress);
	}

	console.log(
		`[IndexedDB Dump] Progress: ${progress.percentage}% (${state.inserted_records}/${state.total_records} records, ${progress.recordsPerSecond} rec/sec, ${state.failed_records} failed, file_reading=${state.is_file_reading_complete}, pending_insertions=${pending_insertions_count})`
	);
}

/**
 * Manages the queue for bulk insertions, limiting parallel transactions.
 */
async function process_and_queue_batch(
	db: ReconciliationDatabase,
	store_name: string,
	batch_to_insert: Record<string, any>[],
	config: IndexedDBConfig,
	state: DumpState,
	onProgress?: FileDumpProgressCallback,
	fileHash?: string,
	batchStartRow?: number
): Promise<void> {
	const bulk_insert_size: number = config.bulkInsertSize || 50000;

	// 1. Create the insertion promise
	const insertion_promise: Promise<number> = db.bulkInsertRecords(
		store_name,
		batch_to_insert,
		config.fileType,
		bulk_insert_size
	);

	// 2. Wrap the promise to handle update statistics and cleanup
	const wrapped_promise: Promise<number> = insertion_promise
		.then((inserted: number) => {
			// Update mutable state
			state.inserted_records += inserted;
			state.failed_records = state.total_records - state.inserted_records;

			// Report progress after a chunk completes
			report_dump_progress(store_name, state, false, onProgress);

			// If we have a fileHash and a batchStartRow, update the persisted progress
			if (fileHash && typeof batchStartRow === 'number') {
				const lastInsertedRow = batchStartRow + inserted - 1;
				try {
					if (config.fileType === 'comparison') {
						updateComparisonProgress(fileHash, lastInsertedRow).catch(() => {});
					} else {
						updatePrimaryProgress(fileHash, lastInsertedRow).catch(() => {});
					}
				} catch (err) {
					// swallow - non-critical
				}
			}

			return inserted;
		})
		.catch((error: any) => {
			// Non-recoverable error in bulkInsertRecords
			throw error;
		});

	// 3. Queue Management (Back-pressure)
	const pending_insertions_count: number = state.insertion_queue.length;

	if (pending_insertions_count >= CONCURRENT_BULK_INSERTS_LIMIT) {
		// Wait for the oldest promise to free up a slot (synchronous wait on the oldest promise chain)
		const oldest_promise = state.insertion_queue.shift();
		if (oldest_promise) {
			state.insertion_queue.push(oldest_promise.then(() => wrapped_promise));
			await oldest_promise; // Wait for the slot to actually free up before returning control to the parser
		}
	} else {
		// Add the new promise to the queue
		state.insertion_queue.push(wrapped_promise);
	}
}

/**
 * 📚 Chapter 3: The CSV Processor (Step)
 * Synchronously processes a chunk of CSV data, transforms records, and queues DB writes.
 */
async function handle_csv_chunk(
	results: Papa.ParseResult<any>,
	parser: Papa.Parser,
	db: ReconciliationDatabase,
	store_name: string,
	config: IndexedDBConfig,
	state: DumpState,
	onProgress?: FileDumpProgressCallback,
	fileHash?: string
): Promise<void> {
	const bulk_insert_size: number = config.bulkInsertSize || 50000;

	for (const row of results.data as Record<string, any>[]) {
		if (!row || Object.keys(row).length === 0) continue;

		// track absolute row index (1-based)
		state.current_row_index = (state.current_row_index || 0) + 1;

		// If resuming and this row is already inserted, skip it
		if (state.resume_from_row && state.current_row_index <= state.resume_from_row) {
			continue;
		}

		// --- Data Transformation ---
		const normalized_row: Record<string, any> = {};
		for (const [key, value] of Object.entries(row)) {
			const trimmed_key = key.trim();
			normalized_row[trimmed_key] = value === '' ? undefined : value;
		}

		const id_value = normalized_row[config.primaryKey];
		if (!id_value) {
			console.warn(
				`[IndexedDB Dump] Skipping row: missing primary key column "${config.primaryKey}"`
			);
			continue;
		}

		const record: Record<string, any> = {
			id: String(id_value).trim()
		};

		for (const column of config.columnsToInclude) {
			if (column !== config.primaryKey) {
				record[column] = normalized_row[column] ?? '';
			}
		}

		if (config.fileType === 'primary') {
			(record as PrimaryFileRecord).ReconciliationStatus = 'PENDING';
			(record as PrimaryFileRecord).ReconciliationReason = '';
		}
		// --- End Data Transformation ---

		state.current_batch.push(record);
		state.total_records++;

		// Check for immediate queuing
		if (state.current_batch.length >= bulk_insert_size) {
			const batch_to_insert = state.current_batch;
			state.current_batch = [];

			try {
				// Compute batch start row (absolute index)
				const batchStartRow = (state.current_row_index || 0) - batch_to_insert.length + 1;
				// Queue the insertion, respecting the concurrency limit
				await process_and_queue_batch(
					db,
					store_name,
					batch_to_insert,
					config,
					state,
					onProgress,
					fileHash,
					batchStartRow
				);
			} catch (error) {
				// Critical failure from the DB layer - stop parsing
				parser.abort();
				throw new Error(
					`Failed to insert batch to IndexedDB: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		}
	}
}

/**
 * 📚 Chapter 0: The Introduction/Overview
 * Dump a CSV file to IndexedDB using bulk inserts with controlled concurrency.
 */
export async function dumpCSVToIndexedDB(
	file: File,
	config: IndexedDBConfig,
	fileHash?: string,
	onProgress?: FileDumpProgressCallback
): Promise<FileDumpResult> {
	const db = await getReconciliationDB();

	// If a fileHash is provided, try to load existing progress so we can resume
	const existingProgress = fileHash ? await getFileProgress(fileHash) : undefined;

	// If the previous run already completed insertion for this file, short-circuit
	if (existingProgress) {
		const lastRow =
			config.fileType === 'comparison'
				? existingProgress.lastComparisonRowInserted
				: existingProgress.lastPrimaryRowInserted;
		if (lastRow === 'completed') {
			const existingStoreName =
				config.fileType === 'comparison'
					? existingProgress.comparisonStoreName
					: existingProgress.primaryStoreName;
			return {
				storeName: existingStoreName || db.generateLogicalStoreName(config.fileType, file.name),
				totalRecords: 0,
				insertedRecords: 0,
				failedRecords: 0,
				fileName: file.name,
				fileType: config.fileType,
				duration: 0
			};
		}
	}

	// Determine store name: reuse previous store if present so we continue inserting into same store
	const store_name: string = existingProgress
		? (config.fileType === 'comparison'
				? existingProgress.comparisonStoreName
				: existingProgress.primaryStoreName) ||
			db.generateLogicalStoreName(config.fileType, file.name)
		: db.generateLogicalStoreName(config.fileType, file.name);

	// Ensure a FileProgressTracker exists and set storeName if missing
	if (fileHash) {
		await getOrCreateFileProgress(file.name, file.size, file.name, file.size, [], {}).catch(
			() => {}
		);
		try {
			const table = db.getFileProgressTable();
			const progressRecord = await table.get(fileHash);
			if (progressRecord) {
				if (config.fileType === 'comparison' && !progressRecord.comparisonStoreName) {
					progressRecord.comparisonStoreName = store_name;
					progressRecord.updatedAt = Date.now();
					await table.put(progressRecord);
				}
				if (config.fileType === 'primary' && !progressRecord.primaryStoreName) {
					progressRecord.primaryStoreName = store_name;
					progressRecord.updatedAt = Date.now();
					await table.put(progressRecord);
				}
			}
		} catch (err) {
			// non-fatal
		}
	}

	const state: DumpState = {
		total_records: 0,
		inserted_records: 0,
		failed_records: 0,
		current_batch: [],
		is_file_reading_complete: false,
		start_time: Date.now(),
		insertion_queue: [],
		current_row_index: 0,
		resume_from_row: existingProgress
			? config.fileType === 'comparison'
				? existingProgress.lastComparisonRowInserted === 'completed'
					? undefined
					: (existingProgress.lastComparisonRowInserted as number)
				: existingProgress.lastPrimaryRowInserted === 'completed'
					? undefined
					: (existingProgress.lastPrimaryRowInserted as number)
			: undefined
	};

	console.log(`[IndexedDB Dump] Starting dump of ${config.fileType} file to store: ${store_name}`);

	return new Promise((resolve, reject) => {
		Papa.parse(file, {
			header: true,
			dynamicTyping: false,
			skipEmptyLines: true,
			worker: false,
			chunkSize: CSV_CHUNK_SIZE,

			chunk: async (results, parser) => {
				try {
					// Call the dedicated chunk handler
					await handle_csv_chunk(
						results,
						parser,
						db,
						store_name,
						config,
						state,
						onProgress,
						fileHash
					);
				} catch (error) {
					reject(error);
				}
			},

			complete: async () => {
				try {
					state.is_file_reading_complete = true;
					console.log(
						'[IndexedDB Dump] CSV file reading complete, queuing final batch and awaiting results...'
					);

					// Insert any remaining records (final batch)
					if (state.current_batch.length > 0) {
						const batchStartRow = (state.current_row_index || 0) - state.current_batch.length + 1;
						await process_and_queue_batch(
							db,
							store_name,
							state.current_batch,
							config,
							state,
							onProgress,
							fileHash,
							batchStartRow
						);
					}

					// Await all promises remaining in the queue (The Climax)
					const final_results = await Promise.allSettled(state.insertion_queue);

					const rejection_found = final_results.find((result) => result.status === 'rejected');
					if (rejection_found && rejection_found.status === 'rejected') {
						throw rejection_found.reason;
					}

					const duration: number = Date.now() - state.start_time;

					// Track progress if fileHash is provided
					if (fileHash) {
						const progressStatus =
							config.fileType === 'comparison' ? updateComparisonProgress : updatePrimaryProgress;
						await progressStatus(fileHash, 'completed');
					}

					// Final progress report
					report_dump_progress(store_name, state, true, onProgress);

					// Mark insertion complete in file progress table
					if (fileHash) {
						try {
							if (config.fileType === 'comparison') {
								await updateComparisonProgress(fileHash, 'completed');
							} else {
								await updatePrimaryProgress(fileHash, 'completed');
							}
						} catch (err) {
							// ignore
						}
					}

					console.log(
						`[IndexedDB Dump] Completed. Total records: ${state.total_records}, Inserted: ${state.inserted_records}, Failed: ${state.failed_records}, Duration: ${duration}ms`
					);

					resolve({
						storeName: store_name,
						totalRecords: state.total_records,
						insertedRecords: state.inserted_records,
						failedRecords: state.failed_records,
						fileName: file.name,
						fileType: config.fileType,
						duration
					});
				} catch (error) {
					reject(
						new Error(
							`Failed to complete dump: ${error instanceof Error ? error.message : String(error)}`
						)
					);
				}
			},

			error: (error: any) => {
				reject(
					new Error(
						`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`
					)
				);
			}
		});
	});
}
