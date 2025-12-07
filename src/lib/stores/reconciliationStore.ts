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
