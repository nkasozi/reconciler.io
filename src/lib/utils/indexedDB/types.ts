/**
 * Types for IndexedDB operations using Dexie.js
 */

export type FileType = 'primary' | 'comparison';

export interface IndexedDBConfig {
	primaryKey: string; // The ID column name
	columnsToInclude: string[]; // Which columns to actually store
	bulkInsertSize?: number; // Default 10000
	fileType: FileType;
	fileName: string;
}

export interface FileDumpProgress {
	storeName: string;
	totalRecords: number;
	insertedRecords: number;
	percentage: number;
	startTime: number;
	estimatedTimeRemaining?: number;
	recordsPerSecond?: number;
	isFileReadingComplete?: boolean; // Indicates if CSV reading is done
	isBulkInsertionComplete?: boolean; // Indicates if all bulk insertions are done
}

export interface FileDumpResult {
	storeName: string;
	totalRecords: number;
	insertedRecords: number;
	failedRecords: number; // Number of records that failed to insert
	fileName: string;
	fileType: FileType;
	duration: number; // milliseconds
}

/**
 * Schema for a record in the comparison file store
 */
export interface ComparisonFileRecord {
	id: string; // Primary key from the ID column
	[key: string]: any; // Other columns as specified in columnsToInclude
}

/**
 * Schema for a record in the primary file store
 */
export interface PrimaryFileRecord {
	id: string; // Primary key from the ID column
	ReconciliationStatus: 'PENDING' | 'MATCHED' | 'PARTIAL_MATCH' | 'UNMATCHED' | 'ERROR';
	ReconciliationReason?: string;
	[key: string]: any; // Other columns as specified in columnsToInclude
}

/**
 * Schema for tracking failed record uploads
 */
export interface FailedUploadRecord {
	id: string; // Unique ID for this failure record (auto-generated)
	recordId: string; // The ID that failed to insert
	fileName: string; // Name of the file containing the record
	fileType: FileType; // 'primary' or 'comparison'
	failureReason: string; // Description of why the record failed to insert
	failureTimestamp: number; // When the failure occurred
	recordData?: Record<string, any>; // Optional: the full record that failed
}

/**
 * Schema for tracking file insertion and reconciliation progress
 * Uses a hash of fileName + fileSize + columnPairs + reconciliationConfig as the key
 */
export interface FileProgressTracker {
	fileHash: string; // Primary key: hash of fileName + fileSize + columnPairs + reconciliationConfig
	lastComparisonRowInserted: number | 'completed'; // 0 = not started, 'completed' = done, number = last row index
	lastPrimaryRowInserted: number | 'completed'; // 0 = not started, 'completed' = done, number = last row index
	reconciliationProgress: 'not_started' | 'ongoing' | 'completed'; // Reconciliation state
	primaryFileName: string; // For reference
	comparisonFileName: string; // For reference
	primaryFileSize: number; // For reference
	comparisonFileSize: number; // For reference
	// Optional: store names used for insertion so resumable dumps continue to the same store
	primaryStoreName?: string | null;
	comparisonStoreName?: string | null;
	createdAt: number; // When tracking was created
	updatedAt: number; // When it was last updated
}

/**
 * Progress callback for file dumping operations
 */
export type FileDumpProgressCallback = (progress: FileDumpProgress) => void;

/**
 * Error type for IndexedDB operations
 */
export class IndexedDBError extends Error {
	constructor(
		message: string,
		public readonly operation: string,
		public readonly cause?: any
	) {
		super(message);
		this.name = 'IndexedDBError';
	}
}
