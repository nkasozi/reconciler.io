import type { ParsedFileData } from './fileParser';

// Define the column pair type for mapping columns between files
export type ColumnPair = {
	primaryColumn: string | null;
	comparisonColumn: string | null;
};

// Define reconciliation configuration
export type ReconciliationConfig = {
	primaryIdPair: ColumnPair;
	comparisonPairs: ColumnPair[];
	contactEmail?: string;
};

// Define the result of a comparison between two values
export type ComparisonResult = {
	primaryValue: string | number | null;
	comparisonValue: string | number | null;
	match: boolean;
	difference?: number | string;
};

// Define a row matching result
export type RowMatchResult = {
	primaryRow: Record<string, string>;
	comparisonRow: Record<string, string>;
	idValues: {
		primary: string;
		comparison: string;
	};
	comparisonResults: Record<string, ComparisonResult>;
	matchScore: number; // Overall score between 0-100
};

// Define reconciliation results
export type ReconciliationResult = {
	matches: RowMatchResult[];
	unmatchedPrimary: Record<string, string>[];
	unmatchedComparison: Record<string, string>[];
	config: ReconciliationConfig;
	summary: {
		totalPrimaryRows: number;
		totalComparisonRows: number;
		matchedRows: number;
		unmatchedPrimaryRows: number;
		unmatchedComparisonRows: number;
		matchPercentage: number;
	};
};

/**
 * Perform reconciliation between primary and comparison data sets
 */
export function reconcileData(
	primaryData: ParsedFileData,
	comparisonData: ParsedFileData,
	config: ReconciliationConfig
): ReconciliationResult {
	// Extract columns for matching
	const primaryIdColumn = config.primaryIdPair.primaryColumn;
	const comparisonIdColumn = config.primaryIdPair.comparisonColumn;

	if (!primaryIdColumn || !comparisonIdColumn) {
		throw new Error('ID columns must be specified for reconciliation');
	}

	// Create lookup maps for fast matching
	const primaryRowsMap = new Map<string, Record<string, string>>();
	const comparisonRowsMap = new Map<string, Record<string, string>>();

	// Index the primary rows by ID
	for (const row of primaryData.rows) {
		const idValue = row[primaryIdColumn];
		if (idValue) {
			primaryRowsMap.set(idValue.toString().trim().toLowerCase(), row);
		}
	}

	// Index the comparison rows by ID
	for (const row of comparisonData.rows) {
		const idValue = row[comparisonIdColumn];
		if (idValue) {
			comparisonRowsMap.set(idValue.toString().trim().toLowerCase(), row);
		}
	}

	// Results containers
	const matches: RowMatchResult[] = [];
	const unmatchedPrimary: Record<string, string>[] = [];
	const unmatchedComparison: Record<string, string>[] = [];

	// Process the primary rows and find matches
	for (const [idValue, primaryRow] of primaryRowsMap.entries()) {
		const comparisonRow = comparisonRowsMap.get(idValue);

		if (comparisonRow) {
			// We found a match by ID
			const comparisonResults: Record<string, ComparisonResult> = {};
			let matchCount = 0;

			// Compare all the mapped column pairs
			for (const pair of config.comparisonPairs) {
				if (pair.primaryColumn && pair.comparisonColumn) {
					const primaryValue = primaryRow[pair.primaryColumn];
					const comparisonValue = comparisonRow[pair.comparisonColumn];

					// Compare the values
					const isMatch = compareValues(primaryValue, comparisonValue);

					comparisonResults[pair.primaryColumn] = {
						primaryValue,
						comparisonValue,
						match: isMatch,
						difference: calculateDifference(primaryValue, comparisonValue)
					};

					if (isMatch) {
						matchCount++;
					}
				}
			}

			// Calculate match score - percentage of matching columns
			const matchScore =
				config.comparisonPairs.length > 0
					? Math.round((matchCount / config.comparisonPairs.length) * 100)
					: 100; // If no comparison columns, then it's a 100% match by ID

			matches.push({
				primaryRow,
				comparisonRow,
				idValues: {
					primary: primaryRow[primaryIdColumn],
					comparison: comparisonRow[comparisonIdColumn]
				},
				comparisonResults,
				matchScore
			});

			// Remove from comparison map to track unmatched comparison rows
			comparisonRowsMap.delete(idValue);
		} else {
			// No match found for this primary row
			unmatchedPrimary.push(primaryRow);
		}
	}

	// All remaining comparison rows are unmatched
	for (const row of comparisonRowsMap.values()) {
		unmatchedComparison.push(row);
	}

	// Calculate summary statistics
	const summary = {
		totalPrimaryRows: primaryData.rows.length,
		totalComparisonRows: comparisonData.rows.length,
		matchedRows: matches.length,
		unmatchedPrimaryRows: unmatchedPrimary.length,
		unmatchedComparisonRows: unmatchedComparison.length,
		matchPercentage: Math.round((matches.length / primaryData.rows.length) * 100)
	};

	return {
		matches,
		unmatchedPrimary,
		unmatchedComparison,
		config,
		summary
	};
}

/**
 * Compare two values and determine if they match
 */
function compareValues(value1: string | undefined, value2: string | undefined): boolean {
	// Handle undefined or empty values
	if (!value1 && !value2) return true;
	if (!value1 || !value2) return false;

	// Normalize strings for comparison
	const normalizedValue1 = value1.toString().trim().toLowerCase();
	const normalizedValue2 = value2.toString().trim().toLowerCase();

	return normalizedValue1 === normalizedValue2;
}

/**
 * Calculate the difference between two values
 * For numbers, it returns the numerical difference
 * For strings, it returns a string describing the difference
 */
function calculateDifference(
	value1: string | undefined,
	value2: string | undefined
): number | string {
	// Handle undefined or empty values
	if (!value1 && !value2) return 0;
	if (!value1) return 'Missing in primary';
	if (!value2) return 'Missing in comparison';

	// Try to parse as numbers
	const num1 = parseFloat(value1);
	const num2 = parseFloat(value2);

	if (!isNaN(num1) && !isNaN(num2)) {
		// Numerical difference
		return num1 - num2;
	}

	// String difference
	if (value1 === value2) return 'No difference';

	return 'Text differs';
}
