import { writable } from 'svelte/store';
import type { ParsedFileData } from '../utils/fileParser';
import type { ReconciliationConfig, ReconciliationResult } from '../utils/reconciliation';

// Define contact information type
export interface ContactInfo {
	email: string;
	phone?: string;
}

// Initial state of the store
const initialState = {
	// Files data
	primaryFileData: null as ParsedFileData | null,
	comparisonFileData: null as ParsedFileData | null,

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
const { subscribe, set, update } = writable(initialState);

// Create the store object with helper methods
export const reconciliationStore = {
	subscribe,

	// Set primary file data
	setPrimaryFileData: (data: ParsedFileData) => {
		update((state) => ({ ...state, primaryFileData: data }));
	},

	// Set comparison file data
	setComparisonFileData: (data: ParsedFileData) => {
		update((state) => ({ ...state, comparisonFileData: data }));
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
		ignoreBlankValues?: boolean;
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
		let currentState = initialState;
		const unsubscribe = subscribe((state) => {
			currentState = state;
		});
		unsubscribe();
		return currentState;
	}
};
