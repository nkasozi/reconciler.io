import { writable, get } from 'svelte/store';
import type { ParsedFileData, StreamingFileParser } from '../utils/fileParser';
import type { ReconciliationConfig, ReconciliationResult } from '../utils/reconciliation';

// Define contact information type
export interface ContactInfo {
	email: string;
	phone?: string;
}

// Initial state of the store
const initialState = {
	// File references (not parsed data!)
	primaryFile: null as File | null,
	comparisonFile: null as File | null,

	// File parsers (these handle caching internally)
	primaryFileParser: null as StreamingFileParser | null,
	comparisonFileParser: null as StreamingFileParser | null,

	// Configuration
	reconciliationConfig: null as ReconciliationConfig | null,

	// Results
	reconciliationResult: null as ReconciliationResult | null,

	// Contact Information
	contactInfo: null as ContactInfo | null,

	// IndexedDB store names for file data
	primaryFileStoreName: null as string | null,
	comparisonFileStoreName: null as string | null,

	// Insertion progress tracking
	primaryFileInsertionProgress: {
		storeName: null as string | null,
		totalRecords: 0,
		insertedRecords: 0,
		percentage: 0,
		recordsPerSecond: 0,
		estimatedTimeRemaining: 0
	},
	comparisonFileInsertionProgress: {
		storeName: null as string | null,
		totalRecords: 0,
		insertedRecords: 0,
		percentage: 0,
		recordsPerSecond: 0,
		estimatedTimeRemaining: 0
	},

	// CSV export progress tracking
	csvExportProgress: {
		isExporting: false,
		totalRecords: 0,
		exportedRecords: 0,
		currentChunk: 0,
		estimatedTotalChunks: 0,
		percentage: 0,
		currentChunkSize: 0,
		totalExportedSize: 0
	},

	// Failure analysis state
	failureAnalysisState: {
		isAnalyzing: false,
		failures: [] as any[],
		summary: null as any
	},

	// IndexedDB result store name
	resultStoreName: null as string | null,

	// Status flags
	isProcessing: false,
	error: null as string | null
};

// Create the writable store
const store = writable(initialState);
const { subscribe, set, update } = store;

// Create the store object with helper methods
export const reconciliationStore = {
	subscribe,

	// Set primary file (File object only, no parsed data)
	setPrimaryFile: (file: File) => {
		update((state) => ({ ...state, primaryFile: file }));
	},

	// Set comparison file (File object only, no parsed data)
	setComparisonFile: (file: File) => {
		update((state) => ({ ...state, comparisonFile: file }));
	},

	// Set primary file parser
	setPrimaryFileParser: (parser: StreamingFileParser) => {
		update((state) => ({ ...state, primaryFileParser: parser }));
	},

	// Set comparison file parser
	setComparisonFileParser: (parser: StreamingFileParser) => {
		update((state) => ({ ...state, comparisonFileParser: parser }));
	},

	// Set reconciliation configuration
	setConfig: (config: ReconciliationConfig) => {
		update((state) => ({ ...state, reconciliationConfig: config }));
	},

	// Set reconciliation results
	setResults: (results: ReconciliationResult) => {
		update((state) => ({ ...state, reconciliationResult: results }));
	},

	// Set processing state
	setProcessing: (isProcessing: boolean) => {
		update((state) => ({ ...state, isProcessing, error: null }));
	},

	// Set error state
	setError: (error: string) => {
		update((state) => ({ ...state, error, isProcessing: false }));
	},

	// Reset the store to initial state
	reset: () => {
		set(initialState);
	},

	// Reset just the results
	resetResults: () => {
		update((state) => ({ ...state, reconciliationResult: null, error: null }));
	},

	// Set contact information
	setContactInfo: (info: ContactInfo) => {
		update((state) => ({ ...state, contactInfo: info }));
	},

	// Set IndexedDB store names
	setIndexedDBStoreNames: (primaryStoreName: string, comparisonStoreName: string) => {
		update((state) => ({
			...state,
			primaryFileStoreName: primaryStoreName,
			comparisonFileStoreName: comparisonStoreName
		}));
	},

	// Update primary file insertion progress
	updatePrimaryFileInsertionProgress: (progress: {
		storeName?: string;
		totalRecords?: number;
		insertedRecords?: number;
		percentage?: number;
		recordsPerSecond?: number;
		estimatedTimeRemaining?: number;
	}) => {
		update((state) => ({
			...state,
			primaryFileInsertionProgress: {
				...state.primaryFileInsertionProgress,
				...progress
			}
		}));
	},

	// Update comparison file insertion progress
	updateComparisonFileInsertionProgress: (progress: {
		storeName?: string;
		totalRecords?: number;
		insertedRecords?: number;
		percentage?: number;
		recordsPerSecond?: number;
		estimatedTimeRemaining?: number;
	}) => {
		update((state) => ({
			...state,
			comparisonFileInsertionProgress: {
				...state.comparisonFileInsertionProgress,
				...progress
			}
		}));
	},

	// Update CSV export progress
	updateCSVExportProgress: (progress: {
		isExporting?: boolean;
		totalRecords?: number;
		exportedRecords?: number;
		currentChunk?: number;
		estimatedTotalChunks?: number;
		percentage?: number;
		currentChunkSize?: number;
		totalExportedSize?: number;
	}) => {
		update((state) => ({
			...state,
			csvExportProgress: {
				...state.csvExportProgress,
				...progress
			}
		}));
	},

	// Set result store name
	setResultStoreName: (storeName: string) => {
		update((state) => ({ ...state, resultStoreName: storeName }));
	},

	// Update failure analysis
	updateFailureAnalysis: (failures: any[], summary: any) => {
		update((state) => ({
			...state,
			failureAnalysisState: {
				isAnalyzing: false,
				failures,
				summary
			}
		}));
	},

	// Set failure analysis analyzing state
	setFailureAnalysisAnalyzing: (isAnalyzing: boolean) => {
		update((state) => ({
			...state,
			failureAnalysisState: {
				...state.failureAnalysisState,
				isAnalyzing
			}
		}));
	},

	// Set reconciliation options
	setReconciliationOptions: (options: {
		reverseReconciliation?: boolean;
		caseSensitive?: boolean;
		trimValues?: boolean;
	}) => {
		update((state) => ({
			...state,
			reconciliationConfig: state.reconciliationConfig
				? { ...state.reconciliationConfig, ...options }
				: null
		}));
	},

	// Get current snapshot of the store state
	getSnapshot: () => {
		return get(store);
	}
};
