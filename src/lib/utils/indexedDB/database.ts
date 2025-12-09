import Dexie, { type Table } from 'dexie';
import type { ComparisonFileRecord, PrimaryFileRecord } from './types';

/**
 * Dexie database wrapper for reconciliation stores
 * Dynamically creates tables for each file (comparison and primary)
 * Tables are named: [fileType]-[first10CharsOfFileName]-[timestamp]
 */
export class ReconciliationDatabase {
	private db: Dexie | null = null;
	private storeNames: Set<string> = new Set();
	private versioning = 1; // Track versions for dynamic schema updates

	/**
	 * Initialize or get existing database
	 */
	async initializeDatabase(): Promise<Dexie> {
		if (this.db) {
			return this.db;
		}

		this.db = new Dexie('ReconciliationDB');
		// Set initial version to 1
		this.db.version(1).stores({});
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

	/**
	 * Create a store for comparison file records
	 * Store schema: {id, ...columns}
	 */
	async createComparisonFileStore(
		storeName: string,
		columnsToInclude: string[]
	): Promise<Table<ComparisonFileRecord>> {
		let db = await this.initializeDatabase();

		// Only update schema if table doesn't exist
		if (!db.tables.some((t: any) => t.name === storeName)) {
			// Must close db before calling version() on an open database
			await db.close();
			this.db = null;

			db = new Dexie('ReconciliationDB');
			this.versioning++;

			// Get all existing stores and add the new one
			const allStores: { [key: string]: string } = {};
			this.storeNames.forEach((store) => {
				allStores[store] = '&id';
			});
			allStores[storeName] = '&id';

			db.version(this.versioning).stores(allStores);
			this.db = db;
		}

		this.storeNames.add(storeName);
		return db.table<ComparisonFileRecord>(storeName);
	}

	/**
	 * Create a store for primary file records
	 * Store schema: {id, ReconciliationStatus, ReconciliationReason, ...columns}
	 */
	async createPrimaryFileStore(
		storeName: string,
		columnsToInclude: string[]
	): Promise<Table<PrimaryFileRecord>> {
		let db = await this.initializeDatabase();

		// Only update schema if table doesn't exist
		if (!db.tables.some((t: any) => t.name === storeName)) {
			// Must close db before calling version() on an open database
			await db.close();
			this.db = null;

			db = new Dexie('ReconciliationDB');
			this.versioning++;

			// Get all existing stores and add the new one
			const allStores: { [key: string]: string } = {};
			this.storeNames.forEach((store) => {
				allStores[store] = '&id';
			});
			allStores[storeName] = '&id, ReconciliationStatus';

			db.version(this.versioning).stores(allStores);
			this.db = db;
		}

		this.storeNames.add(storeName);
		return db.table<PrimaryFileRecord>(storeName);
	}

	/**
	 * Bulk insert records into a store with progress callback
	 */
	async bulkInsertRecords(
		storeName: string,
		records: Record<string, any>[],
		bulkSize: number = 1000,
		onProgress?: (inserted: number, total: number) => void
	): Promise<number> {
		const db = await this.initializeDatabase();
		const table = db.table(storeName);

		let insertedCount = 0;

		// Insert in chunks
		for (let i = 0; i < records.length; i += bulkSize) {
			const chunk = records.slice(i, i + bulkSize);
			await table.bulkAdd(chunk, { allKeys: true });
			insertedCount += chunk.length;

			if (onProgress) {
				onProgress(insertedCount, records.length);
			}

			// Yield to prevent blocking
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		return insertedCount;
	}

	/**
	 * Get record by ID (O(1) lookup)
	 */
	async getRecordById(storeName: string, id: string): Promise<Record<string, any> | undefined> {
		const db = await this.initializeDatabase();
		const table = db.table(storeName);
		return table.get(id) as Promise<Record<string, any> | undefined>;
	}

	/**
	 * Query pending records from primary file store
	 */
	async getPendingRecords(
		storeName: string,
		limit: number = 1000,
		offset: number = 0
	): Promise<PrimaryFileRecord[]> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);

		return table
			.where('ReconciliationStatus')
			.equals('PENDING')
			.offset(offset)
			.limit(limit)
			.toArray();
	}

	/**
	 * Count pending records
	 */
	async countPendingRecords(storeName: string): Promise<number> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);

		return table.where('ReconciliationStatus').equals('PENDING').count();
	}

	/**
	 * Update reconciliation status and reason for a record
	 */
	async updateRecordStatus(
		storeName: string,
		id: string,
		status: 'MATCHED' | 'PARTIAL_MATCH' | 'UNMATCHED' | 'ERROR',
		reason?: string
	): Promise<void> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);

		await table.update(id, {
			ReconciliationStatus: status,
			ReconciliationReason: reason || ''
		});
	}

	/**
	 * Bulk update reconciliation status for multiple records
	 */
	async bulkUpdateStatus(
		storeName: string,
		updates: Array<{
			id: string;
			status: PrimaryFileRecord['ReconciliationStatus'];
			reason?: string;
		}>
	): Promise<number> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);

		let updateCount = 0;
		for (const update of updates) {
			await table.update(update.id, {
				ReconciliationStatus: update.status,
				ReconciliationReason: update.reason || ''
			});
			updateCount++;
		}

		return updateCount;
	}

	/**
	 * Get total record count in a store
	 */
	async getRecordCount(storeName: string): Promise<number> {
		const db = await this.initializeDatabase();
		const table = db.table(storeName);
		return table.count();
	}

	/**
	 * Query records with a specific status
	 */
	async getRecordsByStatus(
		storeName: string,
		status: string,
		limit?: number
	): Promise<PrimaryFileRecord[]> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);

		let query = table.where('ReconciliationStatus').equals(status);

		if (limit) {
			query = query.limit(limit);
		}

		return query.toArray();
	}

	/**
	 * Get all records in batches (for export)
	 */
	async *getBatchedRecords(
		storeName: string,
		batchSize: number = 1000
	): AsyncGenerator<PrimaryFileRecord[]> {
		const db = await this.initializeDatabase();
		const table = db.table<PrimaryFileRecord>(storeName);
		const totalCount = await table.count();

		for (let offset = 0; offset < totalCount; offset += batchSize) {
			const batch = await table.offset(offset).limit(batchSize).toArray();
			if (batch.length > 0) {
				yield batch;
			}
		}
	}

	/**
	 * Delete a store and its data
	 */
	async deleteStore(storeName: string): Promise<void> {
		const db = await this.initializeDatabase();

		if (db.tables.some((t: any) => t.name === storeName)) {
			this.versioning++;
			db.version(this.versioning).stores({
				[storeName]: null // null deletes the table
			});
		}

		this.storeNames.delete(storeName);
	}

	/**
	 * List all stores
	 */
	async listStores(): Promise<string[]> {
		const db = await this.initializeDatabase();
		return db.tables.map((t: any) => t.name);
	}

	/**
	 * Get IndexedDB storage size estimate
	 */
	async getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number }> {
		if (!navigator.storage?.estimate) {
			return { usage: 0, quota: 0, percentage: 0 };
		}

		const estimate = await navigator.storage.estimate();
		const usage = estimate.usage || 0;
		const quota = estimate.quota || 0;
		const percentage = quota > 0 ? (usage / quota) * 100 : 0;

		return { usage, quota, percentage };
	}

	/**
	 * Check if IndexedDB is available
	 */
	static isAvailable(): boolean {
		return typeof indexedDB !== 'undefined' && typeof Dexie !== 'undefined';
	}
}

/**
 * Singleton instance
 */
let dbInstance: ReconciliationDatabase | null = null;

/**
 * Get or create the reconciliation database instance
 */
export async function getReconciliationDB(): Promise<ReconciliationDatabase> {
	if (!dbInstance) {
		dbInstance = new ReconciliationDatabase();
		await dbInstance.initializeDatabase();
	}
	return dbInstance;
}
