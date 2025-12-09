/**
 * ============================================================================
 * FAILURE ANALYZER - DETAILED ANALYSIS OF RECONCILIATION FAILURES
 * ============================================================================
 *
 * Analyzes reconciliation failures to provide:
 * - Categorization of failure types (missing, mismatch, error)
 * - Detailed failure reasons and suggestions
 * - Statistical summaries by failure type
 * - Exportable failure reports
 */

import Dexie from 'dexie';

export type FailureType =
	| 'missing_in_comparison'
	| 'missing_in_primary'
	| 'mismatch'
	| 'error'
	| 'unknown';

export interface FailureReason {
	/** Type of failure */
	type: FailureType;
	/** Specific reason for the failure */
	reason: string;
	/** Suggestion for remediation */
	suggestion: string;
	/** Column(s) involved in the failure */
	columns?: string[];
}

export interface FailureRecord {
	/** ID of the primary record */
	primaryId: string;
	/** Primary record data */
	primaryData: Record<string, any>;
	/** ID(s) of comparison record(s) */
	comparisonIds?: string | string[];
	/** Comparison record data */
	comparisonData?: Record<string, any> | Record<string, any>[];
	/** Reason for failure */
	reason: FailureReason;
	/** When the failure was recorded */
	timestamp: number;
}

export interface FailureAnalysisSummary {
	/** Total failures */
	totalFailures: number;
	/** Failures by type */
	byType: Record<FailureType, number>;
	/** Most common failure reasons */
	topReasons: Array<{
		reason: string;
		count: number;
		percentage: number;
	}>;
	/** Affected columns in mismatches */
	affectedColumns: Record<string, number>;
}

/**
 * Analyzer for reconciliation failures
 */
export class FailureAnalyzer {
	private db: Dexie | null = null;

	constructor(db?: Dexie) {
		this.db = db || new Dexie('ReconciliationDB');
	}

	setDatabase(db: Dexie): void {
		this.db = db;
	}

	/**
	 * Analyze reconciliation failures
	 */
	async analyzeFailures(
		resultStoreName: string,
		primaryStoreName: string,
		comparisonStoreName: string
	): Promise<FailureRecord[]> {
		if (!this.db) {
			throw new Error('[FailureAnalyzer] Database not initialized');
		}

		console.log(`[FailureAnalyzer] Analyzing failures in "${resultStoreName}"`);

		const resultTable = this.db.table(resultStoreName);
		const primaryTable = this.db.table(primaryStoreName);
		const comparisonTable = this.db.table(comparisonStoreName);

		const failures: FailureRecord[] = [];

		try {
			// Find all failed/unmatched records
			await resultTable.each(async (result: any) => {
				// Skip successful matches
				if (result.matched === true && !result.error) {
					return;
				}

				let failureReason: FailureReason | null = null;

				// Determine failure type and reason
				if (result.error) {
					failureReason = this.analyzeError(result.error);
				} else if (!result.comparisonIds || result.comparisonIds.length === 0) {
					failureReason = {
						type: 'missing_in_comparison',
						reason: 'No matching record found in comparison file',
						suggestion:
							'Verify that the record exists in the comparison file with matching ID or key columns',
						columns: result.matchColumns
					};
				} else if (result.matched === false) {
					failureReason = await this.analyzeMismatch(result, primaryStoreName, comparisonStoreName);
				} else {
					failureReason = {
						type: 'unknown',
						reason: 'Unknown reconciliation failure',
						suggestion: 'Review the reconciliation configuration and data',
						columns: result.matchColumns
					};
				}

				// Get primary record
				const primaryRecord = await primaryTable.where('id').equals(result.primaryId).first();

				// Get comparison record(s)
				let comparisonData: Record<string, any> | Record<string, any>[] | undefined;
				if (result.comparisonIds) {
					const ids = Array.isArray(result.comparisonIds)
						? result.comparisonIds
						: [result.comparisonIds];

					if (ids.length === 1) {
						comparisonData = await comparisonTable.where('id').equals(ids[0]).first();
					} else if (ids.length > 1) {
						comparisonData = await comparisonTable.where('id').anyOf(ids).toArray();
					}
				}

				failures.push({
					primaryId: result.primaryId,
					primaryData: primaryRecord || {},
					comparisonIds: result.comparisonIds,
					comparisonData,
					reason: failureReason,
					timestamp: Date.now()
				});
			});

			console.log(`[FailureAnalyzer] Analysis complete: ${failures.length} failures identified`);

			return failures;
		} catch (error) {
			console.error('[FailureAnalyzer] Error during failure analysis:', error);
			throw error;
		}
	}

	/**
	 * Analyze error reason
	 */
	private analyzeError(errorMessage: string): FailureReason {
		if (errorMessage.includes('timeout') || errorMessage.includes('exceeded')) {
			return {
				type: 'error',
				reason: 'Reconciliation timeout',
				suggestion: 'Increase timeout limit or reduce batch size',
				columns: []
			};
		}

		if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
			return {
				type: 'error',
				reason: 'Memory/resource error',
				suggestion: 'Reduce batch size or process in smaller chunks',
				columns: []
			};
		}

		if (errorMessage.includes('parse') || errorMessage.includes('format')) {
			return {
				type: 'error',
				reason: 'Data format error',
				suggestion: 'Verify data encoding and format compatibility',
				columns: []
			};
		}

		return {
			type: 'error',
			reason: `Reconciliation error: ${errorMessage}`,
			suggestion: 'Review error details and reconciliation configuration',
			columns: []
		};
	}

	/**
	 * Analyze mismatch between primary and comparison records
	 */
	private async analyzeMismatch(
		result: any,
		primaryStoreName: string,
		comparisonStoreName: string
	): Promise<FailureReason> {
		if (!this.db) {
			throw new Error('[FailureAnalyzer] Database not initialized');
		}

		const primaryTable = this.db.table(primaryStoreName);
		const comparisonTable = this.db.table(comparisonStoreName);

		try {
			// Get the records to compare
			const primaryRecord = await primaryTable.where('id').equals(result.primaryId).first();

			let comparisonRecord: Record<string, any> | null = null;
			if (result.comparisonIds) {
				const firstId = Array.isArray(result.comparisonIds)
					? result.comparisonIds[0]
					: result.comparisonIds;
				comparisonRecord = await comparisonTable.where('id').equals(firstId).first();
			}

			if (!primaryRecord || !comparisonRecord) {
				return {
					type: 'mismatch',
					reason: 'Unable to retrieve records for comparison',
					suggestion: 'Verify record data integrity',
					columns: result.matchColumns
				};
			}

			// Find the columns that differ
			const diffColumns: string[] = [];
			const matchColumns = result.matchColumns || [];

			for (const column of matchColumns) {
				const primaryValue = primaryRecord[column];
				const comparisonValue = comparisonRecord[column];

				if (primaryValue !== comparisonValue) {
					diffColumns.push(column);
				}
			}

			if (diffColumns.length === 0) {
				return {
					type: 'mismatch',
					reason: 'Records match but marked as mismatched',
					suggestion: 'Review reconciliation configuration and matching rules',
					columns: matchColumns
				};
			}

			return {
				type: 'mismatch',
				reason: `Values differ in column(s): ${diffColumns.join(', ')}`,
				suggestion: `Verify data in these columns matches or adjust reconciliation rules for these columns`,
				columns: diffColumns
			};
		} catch (error) {
			console.error('[FailureAnalyzer] Error analyzing mismatch:', error);
			return {
				type: 'mismatch',
				reason: 'Error during mismatch analysis',
				suggestion: 'Review error logs for more details',
				columns: result.matchColumns
			};
		}
	}

	/**
	 * Generate failure analysis summary
	 */
	generateSummary(failures: FailureRecord[]): FailureAnalysisSummary {
		const summary: FailureAnalysisSummary = {
			totalFailures: failures.length,
			byType: {
				missing_in_comparison: 0,
				missing_in_primary: 0,
				mismatch: 0,
				error: 0,
				unknown: 0
			},
			topReasons: [],
			affectedColumns: {}
		};

		// Count by type and reason
		const reasonCounts: Record<string, number> = {};

		for (const failure of failures) {
			const type = failure.reason.type;
			summary.byType[type]++;

			// Count reasons
			const reasonKey = failure.reason.reason;
			reasonCounts[reasonKey] = (reasonCounts[reasonKey] || 0) + 1;

			// Track affected columns
			if (failure.reason.columns) {
				for (const column of failure.reason.columns) {
					summary.affectedColumns[column] = (summary.affectedColumns[column] || 0) + 1;
				}
			}
		}

		// Get top 10 reasons
		summary.topReasons = Object.entries(reasonCounts)
			.map(([reason, count]) => ({
				reason,
				count,
				percentage: Math.round((count / failures.length) * 100)
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		console.log('[FailureAnalyzer] Summary:', summary);

		return summary;
	}

	/**
	 * Export failures to CSV format
	 */
	exportToCSV(failures: FailureRecord[]): string {
		const headers = [
			'Primary ID',
			'Failure Type',
			'Reason',
			'Affected Columns',
			'Suggestion',
			'Timestamp'
		];

		const rows: string[] = [headers.map((h) => `"${h}"`).join(',')];

		for (const failure of failures) {
			const row = [
				this.escapeCsv(failure.primaryId),
				this.escapeCsv(failure.reason.type),
				this.escapeCsv(failure.reason.reason),
				this.escapeCsv((failure.reason.columns || []).join('; ')),
				this.escapeCsv(failure.reason.suggestion),
				new Date(failure.timestamp).toISOString()
			];
			rows.push(row.map((v) => `"${v}"`).join(','));
		}

		return rows.join('\n');
	}

	/**
	 * Escape CSV special characters
	 */
	private escapeCsv(value: string): string {
		if (value == null) return '';
		const str = String(value);
		return str.replace(/"/g, '""');
	}
}

/**
 * Create and return singleton failure analyzer
 */
let analyzerInstance: FailureAnalyzer | null = null;

export function getFailureAnalyzer(db?: Dexie): FailureAnalyzer {
	if (!analyzerInstance) {
		analyzerInstance = new FailureAnalyzer(db);
	} else if (db) {
		analyzerInstance.setDatabase(db);
	}
	return analyzerInstance;
}
