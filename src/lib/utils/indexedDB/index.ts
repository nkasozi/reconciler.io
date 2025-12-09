/**
 * IndexedDB utilities for reconciliation
 * Provides Dexie.js wrapper, file dumping, type definitions, and checkpoint management
 */

export { ReconciliationDatabase, getReconciliationDB } from './database';
export { dumpCSVToIndexedDB } from './fileDumper';
export { CheckpointManager, getCheckpointManager, type Checkpoint } from './checkpointManager';
export {
	ExportManager,
	getExportManager,
	type ExportOptions,
	type ExportProgress,
	type ExportSummary
} from './exportManager';
export type {
	FileType,
	IndexedDBConfig,
	FileDumpProgress,
	FileDumpResult,
	ComparisonFileRecord,
	PrimaryFileRecord,
	FileDumpProgressCallback
} from './types';
export { IndexedDBError } from './types';
