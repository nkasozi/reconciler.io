/**
 * ============================================================================
 * EXPORT MANAGER - QUERY AND EXPORT RECONCILIATION RESULTS
 * ============================================================================
 *
 * Provides functionality to:
 * - Query reconciliation results from IndexedDB stores
 * - Aggregate results with primary/comparison metadata
 * - Track export progress
 * - Support filtering and formatting for CSV export
 */

import Dexie from 'dexie';

export interface ExportOptions {
	/** Filter by reconciliation status */
	statusFilter?: string | string[];
	/** Only export records with errors */
	onlyErrors?: boolean;
	/** Only export matched records */
	onlyMatched?: boolean;
	/** Custom record formatter before export */
	formatRecord?: (record: any) => Record<string, any>;
	/** Progress callback for each batch */
	onProgress?: (progress: ExportProgress) => void;
	/** Batch size for querying */
	batchSize?: number;
}

export interface ExportProgress {
	/** Records processed so far */
	processedRecords: number;
	/** Total records to export */
	totalRecords: number;
	/** Percentage complete (0-100) */
	percentage: number;
	/** Records per second */
	recordsPerSecond: number;
	/** Estimated time remaining in seconds */
	estimatedTimeRemaining: number;
}

/**
 * Manager for exporting reconciliation results
 */
export class ExportManager {
	private db: Dexie | null = null;

	constructor(db?: Dexie) {
		console.log('[ExportManager] Initialized');
		this.db = db || new Dexie('ReconciliationDB');
	}

	/**
	 * Set the database instance
	 */
	setDatabase(db: Dexie): void {
		this.db = db;
	}

	/**
	 * Export reconciliation results to array of records
	 * Supports pagination and progress tracking
	 */
	async exportResults(
		resultStoreName: string,
		primaryStoreName: string,
		comparisonStoreName: string,
		options: ExportOptions = {}
	): Promise<Record<string, any>[]> {
		if (!this.db) {
			throw new Error('[ExportManager] Database not initialized');
		}

		console.log(`[ExportManager] Starting export from "${resultStoreName}" with options:`, options);

		const {
			statusFilter,
			onlyErrors = false,
			onlyMatched = false,
			formatRecord,
			onProgress,
			batchSize = 1000
		} = options;

		const resultTable = this.db.table(resultStoreName);
		const primaryTable = this.db.table(primaryStoreName);
		const comparisonTable = this.db.table(comparisonStoreName);

		// Get total count for progress tracking
		const totalCount = await resultTable.count();
		console.log(`[ExportManager] Total records to export: ${totalCount}`);

		const records: Record<string, any>[] = [];
		let processedRecords = 0;
		const startTime = Date.now();

		try {
			// Query all results (with filtering)
			let query = resultTable.toCollection();

			// Apply status filter
			if (statusFilter) {
				const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
				query = query.filter((record: any) => record.status && statuses.includes(record.status));
			}

			// Apply error filter
			if (onlyErrors) {
				query = query.filter((record: any) => record.error !== undefined && record.error !== null);
			}

			// Apply matched filter
			if (onlyMatched) {
				query = query.filter((record: any) => record.matched === true);
			}

			// Process records in batches
			let batch: any[] = [];
			await query.each(async (result: any) => {
				// Get primary record
				const primaryId = result.primaryId;
				const primaryRecord = await primaryTable.where('id').equals(primaryId).first();

				// Get comparison record(s)
				let comparisonRecords: Record<string, any>[] = [];
				if (result.comparisonIds) {
					const ids = Array.isArray(result.comparisonIds)
						? result.comparisonIds
						: [result.comparisonIds];
					comparisonRecords = await comparisonTable.where('id').anyOf(ids).toArray();
				}

				// Build export record
				const exportRecord = this.buildExportRecord(result, primaryRecord || {}, comparisonRecords);

				// Apply custom formatter if provided
				const formattedRecord = formatRecord ? formatRecord(exportRecord) : exportRecord;

				batch.push(formattedRecord);
				processedRecords++;

				// Flush batch when threshold reached
				if (batch.length >= batchSize) {
					records.push(...batch);
					batch = [];

					// Report progress
					if (onProgress) {
						const elapsedSeconds = (Date.now() - startTime) / 1000;
						const recordsPerSecond = processedRecords / elapsedSeconds;
						const remainingRecords = totalCount - processedRecords;
						const estimatedTimeRemaining = remainingRecords / recordsPerSecond;

						onProgress({
							processedRecords,
							totalRecords: totalCount,
							percentage: Math.round((processedRecords / totalCount) * 100),
							recordsPerSecond: Math.round(recordsPerSecond * 100) / 100,
							estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
						});
					}
				}
			});

			// Flush remaining records
			if (batch.length > 0) {
				records.push(...batch);
			}

			// Final progress update
			if (onProgress) {
				const elapsedSeconds = (Date.now() - startTime) / 1000;
				const recordsPerSecond = processedRecords / elapsedSeconds;

				onProgress({
					processedRecords,
					totalRecords: totalCount,
					percentage: 100,
					recordsPerSecond: Math.round(recordsPerSecond * 100) / 100,
					estimatedTimeRemaining: 0
				});
			}

			console.log(
				`[ExportManager] Export complete: ${records.length} records, ${Math.round((Date.now() - startTime) / 1000)}s elapsed`
			);

			return records;
		} catch (error) {
			console.error('[ExportManager] Error during export:', error);
			throw error;
		}
	}

	/**
	 * Build export record from reconciliation result and source records
	 */
	private buildExportRecord(
		result: any,
		primaryRecord: Record<string, any>,
		comparisonRecords: Record<string, any>[]
	): Record<string, any> {
		const record: Record<string, any> = {};

		// Add primary record fields with prefix
		for (const [key, value] of Object.entries(primaryRecord)) {
			if (key !== 'id' && !key.startsWith('_')) {
				record[`primary_${key}`] = value;
			}
		}

		// Add comparison record fields (flatten if single record, prefix if multiple)
		if (comparisonRecords.length === 1) {
			const compRecord = comparisonRecords[0];
			for (const [key, value] of Object.entries(compRecord)) {
				if (key !== 'id' && !key.startsWith('_')) {
					record[`comparison_${key}`] = value;
				}
			}
		} else if (comparisonRecords.length > 1) {
			// Multiple matches - stringify as JSON
			const compData = comparisonRecords.map((r) => {
				const obj: Record<string, any> = {};
				for (const [key, value] of Object.entries(r)) {
					if (key !== 'id' && !key.startsWith('_')) {
						obj[key] = value;
					}
				}
				return obj;
			});
			record['comparison_records_json'] = JSON.stringify(compData);
		}

		// Add reconciliation metadata
		record['reconciliation_status'] = result.status || 'unknown';
		if (result.error) {
			record['reconciliation_error'] = result.error;
		}
		if (result.matchCount !== undefined) {
			record['match_count'] = result.matchCount;
		}
		if (result.confidence !== undefined) {
			record['confidence_score'] = result.confidence;
		}
		if (result.timestamp) {
			record['reconciliation_timestamp'] = new Date(result.timestamp).toISOString();
		}

		return record;
	}

	/**
	 * Get summary statistics for export
	 */
	async getExportSummary(resultStoreName: string): Promise<ExportSummary> {
		if (!this.db) {
			throw new Error('[ExportManager] Database not initialized');
		}

		try {
			const resultTable = this.db.table(resultStoreName);

			const allResults = await resultTable.toArray();

			const summary: ExportSummary = {
				totalRecords: allResults.length,
				matchedRecords: 0,
				unmatchedRecords: 0,
				errorRecords: 0,
				byStatus: {}
			};

			for (const result of allResults) {
				// Count by match status
				if (result.error) {
					summary.errorRecords++;
				} else if (result.matched === true) {
					summary.matchedRecords++;
				} else {
					summary.unmatchedRecords++;
				}

				// Count by reconciliation status
				const status = result.status || 'unknown';
				summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
			}

			console.log('[ExportManager] Export summary:', summary);

			return summary;
		} catch (error) {
			console.error('[ExportManager] Error getting export summary:', error);
			throw error;
		}
	}
}

export interface ExportSummary {
	totalRecords: number;
	matchedRecords: number;
	unmatchedRecords: number;
	errorRecords: number;
	byStatus: Record<string, number>;
}

/**
 * Create and return singleton export manager
 */
let exportManagerInstance: ExportManager | null = null;

export function getExportManager(): ExportManager {
	if (!exportManagerInstance) {
		exportManagerInstance = new ExportManager();
	}
	return exportManagerInstance;
}
