import type { ParsedFileData } from './fileParser';

// Define tolerance configuration types
export type AbsoluteTolerance = {
	type: 'absolute';
	value: number; // Fixed difference threshold
};

export type RelativeTolerance = {
	type: 'relative';
	percentage: number; // Percentage threshold (e.g., 0.5 for 0.5%)
};

export type CustomTolerance = {
	type: 'custom';
	formula: string; // Mathematical expression with primaryColumnValue and comparisonColumnValue variables
};

export type Tolerance = AbsoluteTolerance | RelativeTolerance | CustomTolerance | null;

// Define the column pair type for mapping columns between files
export type ColumnPair = {
	primaryColumn: string | null;
	comparisonColumn: string | null;
	// Tolerance configuration for comparisons
	tolerance?: Tolerance;
};

// Define reconciliation configuration
export type ReconciliationConfig = {
	primaryIdPair: ColumnPair;
	comparisonPairs: ColumnPair[];
	contactEmail?: string;
	// Reconciliation options
	reverseReconciliation: boolean;
	caseSensitive: boolean;
	trimValues: boolean;
};

// Define the result of a comparison between two values
export type ComparisonResult = {
	primaryValue: string | number | null;
	comparisonValue: string | number | null;
	match: boolean;
	difference?: number | string;
	reason?: string; // Clear explanation of why it matched or didn't match
	status?: 'exact_match' | 'within_tolerance' | 'partial_match' | 'no_match' | 'missing';
	tolerance?: Tolerance; // The tolerance that was applied (if any)
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
	// Handle reverse reconciliation by swapping files and flipping column mappings
	let actualPrimaryData = primaryData;
	let actualComparisonData = comparisonData;
	let actualConfig = config;

	if (config.reverseReconciliation) {
		// Swap the files
		actualPrimaryData = comparisonData;
		actualComparisonData = primaryData;

		// Flip the column mappings
		actualConfig = {
			...config,
			primaryIdPair: {
				primaryColumn: config.primaryIdPair.comparisonColumn,
				comparisonColumn: config.primaryIdPair.primaryColumn
			},
			comparisonPairs: config.comparisonPairs.map((pair) => ({
				primaryColumn: pair.comparisonColumn,
				comparisonColumn: pair.primaryColumn
			}))
		};
	}

	// Extract columns for matching
	const primaryIdColumn = actualConfig.primaryIdPair.primaryColumn;
	const comparisonIdColumn = actualConfig.primaryIdPair.comparisonColumn;

	if (!primaryIdColumn || !comparisonIdColumn) {
		throw new Error('ID columns must be specified for reconciliation');
	}

	// Create lookup maps for fast matching
	const primaryRowsMap = new Map<string, Record<string, string>>();
	const comparisonRowsMap = new Map<string, Record<string, string>>();

	// Index the primary rows by ID
	for (const row of actualPrimaryData.rows) {
		const idValue = row[primaryIdColumn];
		if (idValue) {
			const keyValue = actualConfig.caseSensitive
				? idValue.toString().trim()
				: idValue.toString().trim().toLowerCase();
			primaryRowsMap.set(keyValue, row);
		}
	}

	// Index the comparison rows by ID
	for (const row of actualComparisonData.rows) {
		const idValue = row[comparisonIdColumn];
		if (idValue) {
			const keyValue = actualConfig.caseSensitive
				? idValue.toString().trim()
				: idValue.toString().trim().toLowerCase();
			comparisonRowsMap.set(keyValue, row);
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
			for (const pair of actualConfig.comparisonPairs) {
				if (pair.primaryColumn && pair.comparisonColumn) {
					const primaryValue = primaryRow[pair.primaryColumn];
					const comparisonValue = comparisonRow[pair.comparisonColumn];

					// Compare the values using the configuration options
					const isExactMatch = compareValues(
						primaryValue,
						comparisonValue,
						actualConfig.caseSensitive,
						actualConfig.trimValues
					);

					// Check if within tolerance if exact match failed
					const isWithinToleranceMatch =
						!isExactMatch && isWithinTolerance(primaryValue, comparisonValue, pair.tolerance);

					const isMatch = isExactMatch || isWithinToleranceMatch;

					// Generate detailed status and reason for the match or mismatch
					const { status, reason } = generateMatchStatusAndReason(
						primaryValue,
						comparisonValue,
						isMatch,
						isExactMatch,
						pair.tolerance,
						actualConfig.caseSensitive,
						actualConfig.trimValues
					);

					comparisonResults[pair.primaryColumn] = {
						primaryValue,
						comparisonValue,
						match: isMatch,
						difference: calculateDifference(primaryValue, comparisonValue),
						reason,
						status,
						tolerance: pair.tolerance
					};

					if (isMatch) {
						matchCount++;
					}
				}
			}

			// Calculate match score - percentage of matching columns
			const matchScore =
				actualConfig.comparisonPairs.length > 0
					? Math.round((matchCount / actualConfig.comparisonPairs.length) * 100)
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
		totalPrimaryRows: actualPrimaryData.rows.length,
		totalComparisonRows: actualComparisonData.rows.length,
		matchedRows: matches.length,
		unmatchedPrimaryRows: unmatchedPrimary.length,
		unmatchedComparisonRows: unmatchedComparison.length,
		matchPercentage:
			actualPrimaryData.rows.length > 0
				? Math.round((matches.length / actualPrimaryData.rows.length) * 100)
				: 0 // Handle division by zero for empty datasets
	};

	return {
		matches,
		unmatchedPrimary,
		unmatchedComparison,
		config: actualConfig, // Return the actual config used (might be flipped for reverse reconciliation)
		summary
	};
}

/**
 * Generate a detailed reason for why values match or don't match
 */
/**
 * Generate a detailed status and reason for why values match or don't match
 * Returns an object with status and human-readable reason. Status values:
 * - exact_match
 * - within_tolerance
 * - partial_match
 * - no_match
 * - missing
 */
type MatchStatus = 'exact_match' | 'within_tolerance' | 'partial_match' | 'no_match' | 'missing';

function generateMatchStatusAndReason(
	primaryValue: string | number | null | undefined,
	comparisonValue: string | number | null | undefined,
	match: boolean,
	isExactMatch: boolean,
	tolerance: Tolerance | undefined,
	caseSensitive: boolean,
	trimValues: boolean
): { status: MatchStatus; reason: string } {
	// Handle null/empty values
	if (!primaryValue && !comparisonValue) {
		return { status: 'missing', reason: match ? 'Both values are empty' : 'Values are different' };
	}

	if (!primaryValue) return { status: 'missing', reason: 'Primary value is empty' };
	if (!comparisonValue) return { status: 'missing', reason: 'Comparison value is empty' };

	const pVal = primaryValue.toString();
	const cVal = comparisonValue.toString();
	const num1 = parseFloat(pVal);
	const num2 = parseFloat(cVal);

	if (isExactMatch) {
		return { status: 'exact_match', reason: `Exact match: '${pVal}'` };
	}

	if (match && tolerance) {
		// Match by tolerance
		if (tolerance.type === 'absolute') {
			if (!isNaN(num1) && !isNaN(num2)) {
				const diff = Math.abs(num1 - num2);
				return {
					status: 'within_tolerance',
					reason: `Within absolute tolerance ${tolerance.value}: |${num1} - ${num2}| = ${diff.toFixed(4)}`
				};
			} else {
				const similarity = calculateStringSimilarity(pVal, cVal);
				const threshold = tolerance.value > 1 ? tolerance.value / 100 : tolerance.value;
				return {
					status: 'within_tolerance',
					reason: `String similarity ${(similarity * 100).toFixed(1)}% >= threshold ${(threshold * 100).toFixed(1)}% (${pVal} vs ${cVal})`
				};
			}
		} else if (tolerance.type === 'relative') {
			if (!isNaN(num1) && !isNaN(num2)) {
				const difference = Math.abs(num1 - num2);
				const average = Math.abs((num1 + num2) / 2);
				const percentDiff = average !== 0 ? (difference / average) * 100 : 0;
				return {
					status: 'within_tolerance',
					reason: `Within relative tolerance ${tolerance.percentage}%: actual difference ${percentDiff.toFixed(2)}% (${num1} vs ${num2})`
				};
			} else {
				const similarity = calculateStringSimilarity(pVal, cVal);
				const threshold = tolerance.percentage;
				return {
					status: 'within_tolerance',
					reason: `String similarity ${(similarity * 100).toFixed(1)}% >= threshold ${threshold}% (${pVal} vs ${cVal})`
				};
			}
		} else if (tolerance.type === 'custom') {
			return { status: 'within_tolerance', reason: 'Matches custom formula' };
		}
	}

	// No tolerance match - construct partial or no match explanations
	if (!isNaN(num1) && !isNaN(num2)) {
		const diff = Math.abs(num1 - num2);
		// If numeric and percent diff is small, call it partial_match (but not within tolerance)
		const average = Math.abs((num1 + num2) / 2);
		const percentDiff = average !== 0 ? (diff / average) * 100 : 0;
		const status: MatchStatus = percentDiff <= 10 ? 'partial_match' : 'no_match';
		return {
			status,
			reason: `Values differ by ${diff.toFixed(4)} (${percentDiff.toFixed(2)}% of average) - ${pVal} vs ${cVal}`
		};
	} else {
		const similarity = calculateStringSimilarity(pVal, cVal);
		const percent = (similarity * 100).toFixed(1);
		const status: MatchStatus = similarity >= 0.8 ? 'partial_match' : 'no_match';
		return { status, reason: `${percent}% similar (${pVal} vs ${cVal})` };
	}
}

/**
 * Compare two values and determine if they match
 */
function compareValues(
	value1: string | undefined,
	value2: string | undefined,
	caseSensitive: boolean = false,
	trimValues: boolean = true
): boolean {
	// Handle null/undefined values
	if (!value1 && !value2) return true;
	if (!value1 || !value2) return false;

	// Convert to strings for comparison
	let stringValue1 = value1.toString();
	let stringValue2 = value2.toString();

	// Apply trimming if enabled
	if (trimValues) {
		stringValue1 = stringValue1.trim();
		stringValue2 = stringValue2.trim();
	}

	// Handle empty values after trimming
	if (!stringValue1 && !stringValue2) return true;
	if (!stringValue1 || !stringValue2) return false;

	// Apply case sensitivity
	const normalizedValue1 = caseSensitive ? stringValue1 : stringValue1.toLowerCase();
	const normalizedValue2 = caseSensitive ? stringValue2 : stringValue2.toLowerCase();

	return normalizedValue1 === normalizedValue2;
}

/**
 * Validate a custom tolerance formula to ensure it's safe
 * Only allows: numbers, primaryColumnValue, comparisonColumnValue, basic math operators (+, -, *, /, %), and parentheses
 * @throws Error if formula contains invalid syntax or dangerous code
 */
export function validateCustomFormula(formula: string): void {
	// Remove whitespace
	const cleaned = formula.replace(/\s/g, '');

	// Only allow specific patterns: variables, numbers, operators, and parentheses
	const allowedPattern = /^[0-9+\-*/%().,primaryColumnValuecomparisonColumnValue]+$/;

	if (!allowedPattern.test(cleaned)) {
		throw new Error(
			'Formula contains invalid characters. Only numbers, operators (+, -, *, /, %), parentheses, and the variables primaryColumnValue and comparisonColumnValue are allowed.'
		);
	}

	// Check for variable names - they should only appear as whole words
	const variablePattern = /primaryColumnValue|comparisonColumnValue/g;
	const variables = new Set(cleaned.match(variablePattern) || []);

	if (variables.size === 0) {
		throw new Error(
			'Formula must contain at least one of: primaryColumnValue or comparisonColumnValue'
		);
	}

	// Check for balanced parentheses
	let parenCount = 0;
	for (const char of cleaned) {
		if (char === '(') parenCount++;
		if (char === ')') parenCount--;
		if (parenCount < 0) {
			throw new Error('Formula has unbalanced parentheses');
		}
	}
	if (parenCount !== 0) {
		throw new Error('Formula has unbalanced parentheses');
	}
}

/**
 * Calculate string similarity (0 to 1, where 1 is identical)
 * Uses Levenshtein distance normalized to 0-1 range
 */
function calculateStringSimilarity(str1: string, str2: string): number {
	const longer = str1.length > str2.length ? str1 : str2;
	const shorter = str1.length > str2.length ? str2 : str1;

	if (longer.length === 0) {
		return 1.0;
	}

	const editDistance = getLevenshteinDistance(longer, shorter);
	return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getLevenshteinDistance(s1: string, s2: string): number {
	const costs: number[] = [];

	for (let i = 0; i <= s1.length; i++) {
		let lastValue = i;
		for (let j = 0; j <= s2.length; j++) {
			if (i === 0) {
				costs[j] = j;
			} else if (j > 0) {
				let newValue = costs[j - 1];
				if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
					newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
				}
				costs[j - 1] = lastValue;
				lastValue = newValue;
			}
		}
		if (i > 0) costs[s2.length] = lastValue;
	}

	return costs[s2.length];
}

/**
 * Check if two values are within a specified tolerance
 * Handles three tolerance types:
 * 1. absolute: fixed difference threshold
 * 2. relative: percentage-based threshold
 * 3. custom: user-defined mathematical formula
 */
export function isWithinTolerance(
	value1: string | undefined,
	value2: string | undefined,
	tolerance: Tolerance | undefined
): boolean {
	// If no tolerance is specified, return false (exact match already checked)
	if (!tolerance) {
		return false;
	}

	// Handle undefined or empty values
	if (!value1 && !value2) return true;
	if (!value1 || !value2) return false;

	if (tolerance.type === 'absolute') {
		return checkAbsoluteTolerance(value1, value2, tolerance.value);
	} else if (tolerance.type === 'relative') {
		return checkRelativeTolerance(value1, value2, tolerance.percentage);
	} else if (tolerance.type === 'custom') {
		return checkCustomTolerance(value1, value2, tolerance.formula);
	}

	return false;
}

/**
 * Check absolute tolerance: difference <= constant value
 * For numbers: checks if |num1 - num2| <= constant
 * For strings: checks if similarity >= (1 - constant)
 * For other types: throws an error
 */
function checkAbsoluteTolerance(value1: string, value2: string, constant: number): boolean {
	const num1 = parseFloat(value1);
	const num2 = parseFloat(value2);

	// Try numeric comparison first
	if (!isNaN(num1) && !isNaN(num2)) {
		const difference = Math.abs(num1 - num2);
		return difference <= constant;
	}

	// Try string similarity
	if (typeof value1 === 'string' && typeof value2 === 'string') {
		const similarity = calculateStringSimilarity(value1, value2);
		// For strings, if constant is 0-1, treat it as a similarity threshold
		const threshold = constant > 1 ? constant / 100 : constant;
		return similarity >= 1 - threshold;
	}

	// For other types, absolute tolerance doesn't apply
	throw new Error(
		`Absolute tolerance cannot be applied to non-numeric and non-string values: ${typeof value1} and ${typeof value2}`
	);
}

/**
 * Check relative tolerance: difference within percentage of the value
 * For numbers: checks if |num1 - num2| <= (percentage% of average)
 * For strings: checks if similarity >= (1 - percentage%)
 * For other types: throws an error
 */
function checkRelativeTolerance(value1: string, value2: string, percentage: number): boolean {
	const num1 = parseFloat(value1);
	const num2 = parseFloat(value2);

	// Try numeric comparison first
	if (!isNaN(num1) && !isNaN(num2)) {
		const difference = Math.abs(num1 - num2);
		const average = Math.abs((num1 + num2) / 2);
		const toleranceAmount = (percentage / 100) * average;
		return difference <= toleranceAmount;
	}

	// Try string similarity
	if (typeof value1 === 'string' && typeof value2 === 'string') {
		const similarity = calculateStringSimilarity(value1, value2);
		const threshold = 1 - percentage / 100;
		return similarity >= threshold;
	}

	// For other types, relative tolerance doesn't apply
	throw new Error(
		`Relative tolerance cannot be applied to non-numeric and non-string values: ${typeof value1} and ${typeof value2}`
	);
}

/**
 * Check custom tolerance using user-defined formula
 * Formula can reference primaryColumnValue and comparisonColumnValue
 * Returns true if formula evaluates to a truthy value
 */
function checkCustomTolerance(value1: string, value2: string, formula: string): boolean {
	// Validate formula once
	try {
		validateCustomFormula(formula);
	} catch (error) {
		throw new Error(
			`Invalid custom tolerance formula: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	// Parse numeric values
	const primaryNum = parseFloat(value1);
	const comparisonNum = parseFloat(value2);

	// Try to create a safe evaluation function
	// Replace variable names with actual values
	let evaluableFormula = formula
		.replace(/primaryColumnValue/g, `(${primaryNum})`)
		.replace(/comparisonColumnValue/g, `(${comparisonNum})`);

	try {
		// Use Function constructor in a sandbox-like way (more restricted than eval)
		// eslint-disable-next-line no-new-func
		const result = new Function(`return ${evaluableFormula}`)();

		// For numbers, check if result is <= some threshold (typically 0 for "difference <= 0")
		// For the formula, we expect it to return a boolean or truthy value
		return Boolean(result);
	} catch (error) {
		throw new Error(
			`Error evaluating custom tolerance formula: ${error instanceof Error ? error.message : String(error)}`
		);
	}
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
