import Dexie, { type IndexableType, type Table } from 'dexie';
import type { PrimaryFileRecord } from './types';

// Constants for permanent store names
const PRIMARY_STORE_NAME: string = 'primary_records_store';
const COMPARISON_STORE_NAME: string = 'comparison_records_store';
const FAILED_UPLOADS_STORE_NAME: string = 'failed_uploads_store';
const FILE_PROGRESS_STORE_NAME: string = 'file_progress_tracker';
const PRIMARY_KEY_SEPARATOR: string = '-';

// Define the type for passing failed records and their specific errors
type FailedRecordItem = {
	record: Record<string, any>;
	error_message: string;
};

// Helper function to create the composite ID
function create_composite_record_id(logical_store_name: string, record_id: string): string {
	return `${logical_store_name}${PRIMARY_KEY_SEPARATOR}${record_id}`;
}

// Helper function to extract the original record ID from the composite ID
function extract_original_record_id(composite_id: string): string {
	return composite_id.substring(composite_id.indexOf(PRIMARY_KEY_SEPARATOR) + 1);
}

export class ReconciliationDatabase {
	private db: Dexie | null = null;
	private current_database_version: number = 1;

	async initializeDatabase(): Promise<Dexie> {
		if (this.db) {
			console.log('[ReconciliationDatabase] Database already initialized');
			return this.db;
		}

		console.log('[ReconciliationDatabase] Initializing permanent database schema');
		this.db = new Dexie('ReconciliationDB');
		this.db.version(1).stores({
			[PRIMARY_STORE_NAME]: `&[logicalStoreName+id], logicalStoreName, ReconciliationStatus`,
			[COMPARISON_STORE_NAME]: `&[logicalStoreName+id], logicalStoreName`,
			[FAILED_UPLOADS_STORE_NAME]: '++dbId, logicalStoreName, recordId, fileType',
			[FILE_PROGRESS_STORE_NAME]: '&fileHash, updatedAt'
		});

		// This is necessary to ensure Dexie opens the database with the current schema
		await this.db.open();
		return this.db;
	}

	/**
	 * Generate a store name for a file
	 * Format: [fileType]-[first10CharsOfFileName]-[timestamp]
	 */
	generateStoreName(
		fileType: 'comparison' | 'primary',
		fileName: string,
		timestamp?: number
	): string {
		// Remove extension and get first 10 chars
		const nameWithoutExt = fileName.split('.').slice(0, -1).join('.');
		const first10Chars = nameWithoutExt.substring(0, 10).replace(/[^a-zA-Z0-9_-]/g, '_');
		const ts = timestamp || Date.now();
		return `${fileType}-${first10Chars}-${ts}`;
	}

	private get_primary_table(): Table<any, IndexableType, string> {
		if (!this.db) {
			throw new Error('Database connection not initialized.');
		}
		return this.db.table(PRIMARY_STORE_NAME);
	}

	private get_comparison_table(): Table<any, IndexableType, string> {
		if (!this.db) {
			throw new Error('Database connection not initialized.');
		}
		return this.db.table(COMPARISON_STORE_NAME);
	}

	private get_failed_uploads_table(): Table<any, number> {
		if (!this.db) {
			throw new Error('Database connection not initialized.');
		}
		return this.db.table(FAILED_UPLOADS_STORE_NAME);
	}

	private get_file_progress_table(): Table<any, string> {
		if (!this.db) {
			throw new Error('Database connection not initialized.');
		}
		return this.db.table(FILE_PROGRESS_STORE_NAME);
	}

	/**
	 * Public accessor for the file progress table
	 */
	public getFileProgressTable(): Table<any, string> {
		return this.get_file_progress_table();
	}

	generateLogicalStoreName(
		fileType: 'comparison' | 'primary',
		fileName: string,
		timestamp?: number
	): string {
		const nameWithoutFileExtension: string = fileName.split('.').slice(0, -1).join('.');
		const first_ten_characters_of_file_name: string = nameWithoutFileExtension
			.substring(0, 10)
			.replace(/[^a-zA-Z0-9_-]/g, '_');
		const current_timestamp: number = timestamp || Date.now();
		return `${fileType}-${first_ten_characters_of_file_name}-${current_timestamp}`;
	}

	private async handleFailedBulkInsert(
		failedRecordsWithReasons: FailedRecordItem[], // NEW SIGNATURE
		targetTable: Table<any, string>,
		failedUploadsTable: Table<any, number>,
		logical_store_name: string
	): Promise<void> {
		const target_table_name: string = targetTable.name;
		const file_type: 'comparison' | 'primary' =
			target_table_name === PRIMARY_STORE_NAME ? 'primary' : 'comparison';

		const records_to_log: any[] = [];

		console.log(
			`[IndexedDB] Preparing to log ${failedRecordsWithReasons.length} records that failed bulk insertion...`
		);

		// 1. Collect all failure records into an array
		for (const failed_item of failedRecordsWithReasons) {
			const record_to_insert = failed_item.record;
			// USE THE DYNAMIC ERROR MESSAGE HERE
			const failure_reason: string = failed_item.error_message;
			const original_record_id: string = record_to_insert.id;

			console.warn(
				`[IndexedDB] Record with ID "${original_record_id}" failed bulk insert. Reason: ${failure_reason}`
			);

			records_to_log.push({
				logicalStoreName: logical_store_name,
				recordId: original_record_id,
				fileName: logical_store_name,
				fileType: file_type,
				failureReason: failure_reason, // DYNAMIC REASON
				failureTimestamp: Date.now(),
				recordData: record_to_insert
			});
		}

		// 2. Perform a single bulk insertion into the failed table
		try {
			await failedUploadsTable.bulkAdd(records_to_log);
			console.debug(
				`[IndexedDB] Successfully bulk logged ${records_to_log.length} failed records to ${FAILED_UPLOADS_STORE_NAME}.`
			);
		} catch (error) {
			console.error(
				`[IndexedDB] CRITICAL: Failed to bulk log records into ${FAILED_UPLOADS_STORE_NAME}. Records may be lost.`,
				error
			);
			throw error;
		}
	}

	private async executeSingleBulkChunkInsert(
		chunkOfRecords: Record<string, any>[],
		targetTable: Table<any, string>,
		failedUploadsTable: Table<any, number>,
		logical_store_name: string,
		insertedCountReference: { value: number }
	): Promise<boolean> {
		const chunk_length: number = chunkOfRecords.length;
		const target_table_name: string = targetTable.name;

		const records_with_composite_id: Record<string, any>[] = chunkOfRecords.map(
			(record: Record<string, any>) => ({
				...record,
				id: create_composite_record_id(logical_store_name, record.id),
				logicalStoreName: logical_store_name
			})
		);

		console.debug(
			`[IndexedDB] Attempting bulk insert for ${chunk_length} records into permanent table ${target_table_name}...`
		);

		try {
			await targetTable.bulkAdd(records_with_composite_id, { allKeys: true });
			insertedCountReference.value += chunk_length;
			console.debug(
				`[IndexedDB] Successfully bulk inserted ${chunk_length} records into ${target_table_name}.`
			);
			return true;
		} catch (bulk_operation_error: any) {
			console.debug(
				`[IndexedDB] Bulk insert operation caught an error: ${bulk_operation_error.name || 'UnknownError'}.`
			);

			if (!bulk_operation_error.failures) {
				throw bulk_operation_error;
			}

			// --- STORY CHAPTER: Extracting the specific errors for logging ---
			const failed_records_with_reasons: FailedRecordItem[] = [];

			if (bulk_operation_error.failuresByPos) {
				for (const posString of Object.keys(bulk_operation_error.failuresByPos)) {
					const index: number = Number(posString);
					const specific_error: Error = bulk_operation_error.failuresByPos[posString];

					const detailed_error_message: string =
						specific_error.message || specific_error.name || 'Unknown Constraint Error';

					failed_records_with_reasons.push({
						record: chunkOfRecords[index],
						error_message: detailed_error_message
					});
				}
			} else {
				console.error(
					`[IndexedDB] BulkError encountered but no 'failuresByPos' was found. Cannot proceed with surgical error handling.`,
					bulk_operation_error
				);
				throw bulk_operation_error;
			}
			// ----------------------------------------------------------------

			const successful_bulk_inserts: number = chunk_length - failed_records_with_reasons.length;
			insertedCountReference.value += successful_bulk_inserts;

			console.debug(
				`[IndexedDB] ${successful_bulk_inserts} records were successfully bulk inserted. Logging ${failed_records_with_reasons.length} failed records.`
			);

			await this.handleFailedBulkInsert(
				failed_records_with_reasons, // Pass the new structure
				targetTable,
				failedUploadsTable,
				logical_store_name
			);
			return false;
		}
	}

	private async attemptBulkInsertTransaction(
		targetTable: Table<any, IndexableType, string>,
		failedUploadsTable: Table<any, number>,
		records_for_transaction_batch: Record<string, any>[],
		bulk_chunk_size: number,
		logical_store_name: string,
		transaction_batch_start_index: number,
		insertedCountReference: { value: number }
	): Promise<boolean> {
		const BULK_INSERT_MAX_RETRIES: number = 1;
		const target_table_name: string = targetTable.name;
		const records_count_in_batch: number = records_for_transaction_batch.length;

		console.debug(
			`[IndexedDB] Starting transaction attempt for batch at index ${transaction_batch_start_index} (${records_count_in_batch} records) into ${target_table_name} using logical name ${logical_store_name}.`
		);

		for (let retry_count: number = 0; retry_count <= BULK_INSERT_MAX_RETRIES; retry_count++) {
			try {
				const database_instance: Dexie = await this.initializeDatabase();
				const current_target_table = database_instance.table(target_table_name);

				await database_instance.transaction(
					'rw',
					current_target_table,
					this.get_failed_uploads_table(),
					async () => {
						console.debug(
							`[IndexedDB] Transaction started for ${target_table_name}, Retry count: ${retry_count}`
						);
						for (
							let chunk_start_index: number = 0;
							chunk_start_index < records_count_in_batch;
							chunk_start_index += bulk_chunk_size
						) {
							const chunk_of_records: Record<string, any>[] = records_for_transaction_batch.slice(
								chunk_start_index,
								chunk_start_index + bulk_chunk_size
							);

							await this.executeSingleBulkChunkInsert(
								chunk_of_records,
								current_target_table as Table<any, string>,
								failedUploadsTable,
								logical_store_name,
								insertedCountReference
							);
						}
					}
				);
				console.debug(
					`[IndexedDB] Transaction completed successfully for batch at index ${transaction_batch_start_index}.`
				);
				return true;
			} catch (transaction_error: any) {
				const error_name: string = transaction_error.name || '';
				const is_database_closed_error: boolean = error_name === 'DatabaseClosedError';

				if (!is_database_closed_error || retry_count >= BULK_INSERT_MAX_RETRIES) {
					console.error(
						`[IndexedDB] Transaction failed for ${target_table_name} after ${retry_count + 1} attempts. Re-throwing error:`,
						transaction_error
					);
					throw transaction_error;
				}

				console.log(
					'[IndexedDB] DatabaseClosedError encountered. Re-opening the db connection and retrying...'
				);

				try {
					await this.db?.close();
					console.debug('[IndexedDB] Closed existing database connection.');
				} catch (closing_error) {
					console.debug('[IndexedDB] Error closing database connection (ignored).');
				}
				this.db = null;
			}
		}
		return false;
	}

	async bulkInsertRecords(
		logicalStoreName: string,
		records: Record<string, any>[],
		fileType: 'comparison' | 'primary',
		bulkSize: number = 1000,
		onProgress?: (inserted: number, total: number) => void
	): Promise<number> {
		const TRANSACTION_BATCH_FACTOR: number = 20;
		const database_instance: Dexie = await this.initializeDatabase();

		const target_table: Table<any, IndexableType, string> =
			fileType === 'primary' ? this.get_primary_table() : this.get_comparison_table();
		const failed_uploads_table: Table<any, number> = this.get_failed_uploads_table();

		const inserted_count_reference: { value: number } = { value: 0 };
		const transaction_record_limit: number = bulkSize * TRANSACTION_BATCH_FACTOR;
		const total_records_count: number = records.length;

		console.log(
			`[IndexedDB] Starting bulk insertion of ${total_records_count} records into ${target_table.name} (Logical: ${logicalStoreName}).`
		);

		for (
			let transaction_batch_start_index: number = 0;
			transaction_batch_start_index < total_records_count;
			transaction_batch_start_index += transaction_record_limit
		) {
			const transaction_batch_end_index: number = Math.min(
				transaction_batch_start_index + transaction_record_limit,
				total_records_count
			);

			const current_batch_records: Record<string, any>[] = records.slice(
				transaction_batch_start_index,
				transaction_batch_end_index
			);

			try {
				await this.attemptBulkInsertTransaction(
					target_table,
					failed_uploads_table,
					current_batch_records,
					bulkSize,
					logicalStoreName,
					transaction_batch_start_index,
					inserted_count_reference
				);
			} catch (error) {
				console.error(
					`[IndexedDB] Critical failure in transaction batch starting at index ${transaction_batch_start_index}.`,
					error
				);
				throw error;
			}

			if (onProgress) {
				onProgress(inserted_count_reference.value, total_records_count);
				console.debug(
					`[IndexedDB] Progress Update: Inserted ${inserted_count_reference.value}/${total_records_count} records.`
				);
			}
		}

		console.log(
			`[IndexedDB] Bulk insertion completed. Total records inserted: ${inserted_count_reference.value}.`
		);
		return inserted_count_reference.value;
	}

	async getRecordById(
		logicalStoreName: string,
		recordId: string,
		isPrimaryFile: boolean
	): Promise<Record<string, any> | undefined> {
		const target_table: Table<any, IndexableType, string> = isPrimaryFile
			? this.get_primary_table()
			: this.get_comparison_table();
		const composite_id: string = create_composite_record_id(logicalStoreName, recordId);

		const record_data: Record<string, any> | undefined = await target_table.get(composite_id);

		if (!record_data) return undefined;

		// Restore original ID for the consuming function
		const original_id: string = extract_original_record_id(record_data.id);

		return {
			...record_data,
			id: original_id
		};
	}

	async getPendingRecords(
		logicalStoreName: string,
		limit_count: number = 1000,
		offset_count: number = 0
	): Promise<PrimaryFileRecord[]> {
		const target_table = this.get_primary_table();

		const pending_records: PrimaryFileRecord[] = await target_table
			.where('logicalStoreName')
			.equals(logicalStoreName)
			.and((record: PrimaryFileRecord) => record.ReconciliationStatus === 'PENDING')
			.offset(offset_count)
			.limit(limit_count)
			.toArray();

		return pending_records.map((record: PrimaryFileRecord) => ({
			...record,
			id: extract_original_record_id(record.id)
		}));
	}

	async countPendingRecords(logicalStoreName: string): Promise<number> {
		const target_table = this.get_primary_table();

		return target_table
			.where('logicalStoreName')
			.equals(logicalStoreName)
			.and((record: PrimaryFileRecord) => record.ReconciliationStatus === 'PENDING')
			.count();
	}

	async updateRecordStatus(
		logicalStoreName: string,
		record_id: string,
		status: 'MATCHED' | 'PARTIAL_MATCH' | 'UNMATCHED' | 'ERROR',
		reason?: string
	): Promise<void> {
		const target_table = this.get_primary_table();
		const composite_id: string = create_composite_record_id(logicalStoreName, record_id);

		await target_table.update(composite_id, {
			ReconciliationStatus: status,
			ReconciliationReason: reason || ''
		});
	}

	async bulkUpdateStatus(
		logicalStoreName: string,
		updates: Array<{
			id: string;
			status: PrimaryFileRecord['ReconciliationStatus'];
			reason?: string;
		}>
	): Promise<number> {
		const target_table = this.get_primary_table();
		const db = await this.initializeDatabase();
		let update_successful_count: number = 0;

		const updates_with_composite_id: Array<{
			composite_id: string;
			status: PrimaryFileRecord['ReconciliationStatus'];
			reason?: string;
		}> = updates.map((update) => ({
			composite_id: create_composite_record_id(logicalStoreName, update.id),
			status: update.status,
			reason: update.reason
		}));

		await db.transaction('rw', target_table, async () => {
			for (const update_data of updates_with_composite_id) {
				await target_table.update(update_data.composite_id, {
					ReconciliationStatus: update_data.status,
					ReconciliationReason: update_data.reason || ''
				});
				update_successful_count++;
			}
		});

		return update_successful_count;
	}

	async getFailedUploads(logicalStoreName?: string): Promise<any[]> {
		const failed_uploads_table = this.get_failed_uploads_table();

		if (!logicalStoreName) {
			return failed_uploads_table.toArray();
		}

		return failed_uploads_table.where('logicalStoreName').equals(logicalStoreName).toArray();
	}

	async clearFailedUploads(logicalStoreName?: string): Promise<void> {
		const failed_uploads_table = this.get_failed_uploads_table();

		if (!logicalStoreName) {
			await failed_uploads_table.clear();
			return;
		}

		await failed_uploads_table.where('logicalStoreName').equals(logicalStoreName).delete();
	}

	async deleteStore(logicalStoreName: string): Promise<boolean> {
		const primary_table = this.get_primary_table();
		const comparison_table = this.get_comparison_table();

		let deleted_count: number = 0;

		await this.db?.transaction('rw', primary_table, comparison_table, async () => {
			deleted_count += await primary_table
				.where('logicalStoreName')
				.equals(logicalStoreName)
				.delete();
			deleted_count += await comparison_table
				.where('logicalStoreName')
				.equals(logicalStoreName)
				.delete();
		});

		// Also clear failed uploads for this logical store
		await this.clearFailedUploads(logicalStoreName);

		console.log(
			`[IndexedDB] Successfully deleted ${deleted_count} records associated with logical store: ${logicalStoreName}.`
		);
		return deleted_count > 0;
	}

	async getRecordCount(logicalStoreName: string, isPrimaryFile: boolean): Promise<number> {
		const target_table: Table<any, IndexableType, string> = isPrimaryFile
			? this.get_primary_table()
			: this.get_comparison_table();
		return target_table.where('logicalStoreName').equals(logicalStoreName).count();
	}

	async *getBatchedRecords(
		logicalStoreName: string,
		isPrimaryFile: boolean,
		batch_size: number = 1000
	): AsyncGenerator<PrimaryFileRecord[]> {
		const target_table: Table<any, IndexableType, string> = isPrimaryFile
			? this.get_primary_table()
			: this.get_comparison_table();
		const total_count = await target_table
			.where('logicalStoreName')
			.equals(logicalStoreName)
			.count();

		for (let offset_start: number = 0; offset_start < total_count; offset_start += batch_size) {
			const batch = await target_table
				.where('logicalStoreName')
				.equals(logicalStoreName)
				.offset(offset_start)
				.limit(batch_size)
				.toArray();

			if (batch.length > 0) {
				const cleaned_batch: PrimaryFileRecord[] = batch.map((record: PrimaryFileRecord) => ({
					...record,
					id: extract_original_record_id(record.id)
				}));
				yield cleaned_batch;
			}
		}
	}

	async getStorageEstimate(): Promise<{
		usage_bytes: number;
		quota_bytes: number;
		usage_percentage: number;
	}> {
		if (!navigator.storage?.estimate) {
			return { usage_bytes: 0, quota_bytes: 0, usage_percentage: 0 };
		}

		const storage_estimate = await navigator.storage.estimate();
		const usage_bytes: number = storage_estimate.usage || 0;
		const quota_bytes: number = storage_estimate.quota || 0;
		const usage_percentage: number = quota_bytes > 0 ? (usage_bytes / quota_bytes) * 100 : 0;

		return { usage_bytes, quota_bytes, usage_percentage };
	}

	static isAvailable(): boolean {
		return typeof indexedDB !== 'undefined' && typeof Dexie !== 'undefined';
	}
}

let dbInstance: ReconciliationDatabase | null = null;

export async function getReconciliationDB(): Promise<ReconciliationDatabase> {
	if (!dbInstance) {
		dbInstance = new ReconciliationDatabase();
		await dbInstance.initializeDatabase();
	}
	return dbInstance;
}
