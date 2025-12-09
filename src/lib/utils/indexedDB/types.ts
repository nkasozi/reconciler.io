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
}

export interface FileDumpResult {
	storeName: string;
	totalRecords: number;
	insertedRecords: number;
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
