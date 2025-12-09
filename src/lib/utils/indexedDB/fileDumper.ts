import Papa from 'papaparse';
import { getReconciliationDB } from './database';
import type {
	IndexedDBConfig,
	FileDumpProgress,
	FileDumpResult,
	FileDumpProgressCallback,
	ComparisonFileRecord,
	PrimaryFileRecord
} from './types';

/**
 * Dump a CSV file to IndexedDB using bulk inserts
 * Uses Papa.parse chunks mode for memory efficiency
 */
export async function dumpCSVToIndexedDB(
	file: File,
	config: IndexedDBConfig,
	onProgress?: FileDumpProgressCallback
): Promise<FileDumpResult> {
	const startTime = Date.now();
	const db = await getReconciliationDB();

	// Generate store name
	const storeName = db.generateStoreName(config.fileType, file.name);

	console.log(`[IndexedDB Dump] Starting dump of ${config.fileType} file to store: ${storeName}`);
	console.log(`[IndexedDB Dump] Primary key column: ${config.primaryKey}`);
	console.log(`[IndexedDB Dump] Columns to include: ${config.columnsToInclude.join(', ')}`);

	// Create the appropriate store
	if (config.fileType === 'comparison') {
		await db.createComparisonFileStore(storeName, config.columnsToInclude);
	} else {
		await db.createPrimaryFileStore(storeName, config.columnsToInclude);
	}

	let totalRecords = 0;
	let insertedRecords = 0;
	let currentBatch: Record<string, any>[] = [];
	const bulkInsertSize = config.bulkInsertSize || 10000;

	return new Promise((resolve, reject) => {
		Papa.parse(file, {
			header: true,
			dynamicTyping: false,
			skipEmptyLines: true,
			worker: false, // Disable worker - run in main thread synchronously
			// Use chunk mode instead of step for better performance
			chunkSize: 50000, // Process 50k rows at a time
			chunk: async (results, parser) => {
				// Process this chunk
				for (const row of results.data as Record<string, any>[]) {
					if (!row || Object.keys(row).length === 0) continue;

					// Normalize row keys (trim whitespace)
					const normalizedRow: Record<string, any> = {};
					for (const [key, value] of Object.entries(row)) {
						const trimmedKey = key.trim();
						normalizedRow[trimmedKey] = value === '' ? undefined : value;
					}

					// Get the primary key value
					const idValue = normalizedRow[config.primaryKey];
					if (!idValue) {
						console.warn(
							`[IndexedDB Dump] Skipping row: missing primary key column "${config.primaryKey}"`
						);
						continue;
					}

					// Build the record with only the specified columns
					const record: Record<string, any> = {
						id: String(idValue).trim()
					};

					// Add specified columns
					for (const column of config.columnsToInclude) {
						if (column !== config.primaryKey) {
							// Don't duplicate the ID
							record[column] = normalizedRow[column] ?? '';
						}
					}

					// For primary file, add reconciliation columns
					if (config.fileType === 'primary') {
						(record as PrimaryFileRecord).ReconciliationStatus = 'PENDING';
						(record as PrimaryFileRecord).ReconciliationReason = '';
					}

					currentBatch.push(record);
					totalRecords++;

					// When batch is full, insert it
					if (currentBatch.length >= bulkInsertSize) {
						const batchToInsert = currentBatch;
						currentBatch = [];

						db.bulkInsertRecords(storeName, batchToInsert, bulkInsertSize)
							.then((inserted: number) => {
								insertedRecords += inserted;

								const elapsed = Date.now() - startTime;
								const seconds = elapsed / 1000;
								const recordsPerSecond = insertedRecords / seconds;
								const estimatedRemaining =
									totalRecords > insertedRecords
										? ((totalRecords - insertedRecords) / recordsPerSecond) * 1000
										: 0;

								const progress: FileDumpProgress = {
									storeName,
									totalRecords,
									insertedRecords,
									percentage: Math.min(100, Math.round((insertedRecords / totalRecords) * 100)),
									startTime,
									estimatedTimeRemaining: estimatedRemaining,
									recordsPerSecond: Math.round(recordsPerSecond)
								};

								if (onProgress) {
									onProgress(progress);
								}

								console.log(
									`[IndexedDB Dump] Progress: ${progress.percentage}% (${insertedRecords}/${totalRecords} records, ${progress.recordsPerSecond} rec/sec)`
								);
							})
							.catch((error: any) => {
								parser.abort();
								reject(
									new Error(
										`Failed to insert batch to IndexedDB: ${error instanceof Error ? error.message : String(error)}`
									)
								);
							});
					}
				}
			},
			complete: async () => {
				try {
					// Insert any remaining records
					if (currentBatch.length > 0) {
						const inserted = await db.bulkInsertRecords(storeName, currentBatch, bulkInsertSize);
						insertedRecords += inserted;

						const progress: FileDumpProgress = {
							storeName,
							totalRecords,
							insertedRecords,
							percentage: 100,
							startTime,
							estimatedTimeRemaining: 0,
							recordsPerSecond: Math.round(insertedRecords / ((Date.now() - startTime) / 1000))
						};

						if (onProgress) {
							onProgress(progress);
						}
					}

					const duration = Date.now() - startTime;
					console.log(
						`[IndexedDB Dump] Completed. Total records: ${insertedRecords}, Duration: ${duration}ms`
					);

					resolve({
						storeName,
						totalRecords: insertedRecords,
						insertedRecords,
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
