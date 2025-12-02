import type { ParsedFileData, ColumnDataType } from './fileParser';

/**
 * Export ParsedFileData for test convenience
 */
export type { ParsedFileData };

/**
 * Tolerance types for numeric columns
 */
export type NumericTolerance =
	| { type: 'exact_match' }
	| { type: 'absolute'; value: number } // Fixed difference threshold
	| { type: 'relative'; percentage: number } // Percentage threshold (e.g., 0.5 for 0.5%)
	| { type: 'custom'; formula: string }; // Mathematical expression with primaryColumnValue and comparisonColumnValue

/**
 * Tolerance types for string columns
 */
export type StringTolerance =
	| { type: 'exact_match' }
	| { type: 'within_percentage_similarity'; percentage: number } // String similarity percentage (0-100)
	| { type: 'custom'; formula: string };

/**
 * Union of all tolerance types
 */
export type Tolerance = NumericTolerance | StringTolerance;

/**
 * Comparison settings for a column pair
 */
export type ColumnPairSettings = {
	caseSensitive: boolean;
	trimValues: boolean;
};

/**
 * Define the column pair type for mapping columns between files
 */
export type ColumnPair = {
	primaryColumn: string | null;
	comparisonColumn: string | null;
	// Tolerance configuration for comparisons
	tolerance: Tolerance; // Always required - default is exact_match
	// Per-pair comparison settings
	settings: ColumnPairSettings;
};

/**
 * Define reconciliation configuration
 */
export type ReconciliationConfig = {
	primaryIdPair: ColumnPair;
	comparisonPairs: ColumnPair[];
	contactEmail?: string;
	// Reconciliation mode
	reverseReconciliation?: boolean;
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
				comparisonColumn: config.primaryIdPair.primaryColumn,
				tolerance: config.primaryIdPair.tolerance,
				settings: config.primaryIdPair.settings
			},
			comparisonPairs: config.comparisonPairs.map((pair) => ({
				primaryColumn: pair.comparisonColumn,
				comparisonColumn: pair.primaryColumn,
				tolerance: pair.tolerance,
				settings: pair.settings
			}))
		};
	}

	// Extract columns for matching
	const primaryIdColumn = actualConfig.primaryIdPair.primaryColumn;
	const comparisonIdColumn = actualConfig.primaryIdPair.comparisonColumn;
	const idPairSettings = actualConfig.primaryIdPair.settings;

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
			const keyValue = normalizeForComparison(
				idValue,
				idPairSettings.caseSensitive,
				idPairSettings.trimValues
			);
			primaryRowsMap.set(keyValue, row);
		}
	}

	// Index the comparison rows by ID
	for (const row of actualComparisonData.rows) {
		const idValue = row[comparisonIdColumn];
		if (idValue) {
			const keyValue = normalizeForComparison(
				idValue,
				idPairSettings.caseSensitive,
				idPairSettings.trimValues
			);
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

					// Compare the values using per-pair settings
					const isExactMatch = compareValues(
						primaryValue,
						comparisonValue,
						pair.settings.caseSensitive,
						pair.settings.trimValues
					);

					// Check if within tolerance if exact match failed
					const isWithinToleranceMatch =
						!isExactMatch &&
						isWithinTolerance(primaryValue, comparisonValue, pair.tolerance, pair.settings);

					const isMatch = isExactMatch || isWithinToleranceMatch;

					// Generate detailed status and reason for the match or mismatch
					const { status, reason } = generateMatchStatusAndReason(
						primaryValue,
						comparisonValue,
						isMatch,
						isExactMatch,
						pair.tolerance,
						pair.settings
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

// Configurable threshold for string partial-match classification (0..1)
export const PARTIAL_STRING_SIMILARITY = 0.5;

/**
 * Normalize a value for comparison according to trim and case options.
 * Returns a string suitable for string-equality and similarity checks.
 */
export function normalizeForComparison(
	value: string | number | null | undefined,
	caseSensitive: boolean,
	trimValues: boolean
): string {
	let s = value == null ? '' : String(value);
	if (trimValues) s = s.trim();
	return caseSensitive ? s : s.toLowerCase();
}

export function parseNumeric(value: string): { num: number; isNumeric: boolean } {
	const n = parseFloat(value);
	return { num: n, isNumeric: !isNaN(n) };
}

/**
 * Decide status and reason for two numeric values when no tolerance or when tolerance does not apply
 */
export function decideNumericStatus(
	num1: number,
	num2: number
): { status: MatchStatus; reason: string } {
	const diff = Math.abs(num1 - num2);
	const average = Math.abs((num1 + num2) / 2);
	const percentDiff = average !== 0 ? (diff / average) * 100 : 0;
	const status: MatchStatus = percentDiff <= 10 ? 'partial_match' : 'no_match';
	return {
		status,
		reason: `Values differ by ${diff.toFixed(4)} (${percentDiff.toFixed(2)}% of average) - ${num1} vs ${num2}`
	};
}

/**
 * Decide status and reason for two strings when no tolerance applies
 */
export function decideStringStatus(
	pStr: string,
	cStr: string
): { status: MatchStatus; reason: string } {
	const similarity = calculateStringSimilarity(pStr, cStr);
	const percent = (similarity * 100).toFixed(1);
	const status: MatchStatus =
		similarity >= PARTIAL_STRING_SIMILARITY ? 'partial_match' : 'no_match';
	return { status, reason: `${percent}% similar (${pStr} vs ${cStr})` };
}

/**
 * Evaluate a tolerance configuration for two values and produce whether they match under that tolerance and a human-readable reason.
 */
export function evaluateTolerance(
	primaryValue: string | number | null | undefined,
	comparisonValue: string | number | null | undefined,
	tolerance: Tolerance,
	settings: ColumnPairSettings
): { matches: boolean; reason: string } {
	const rawP = settings.trimValues
		? (primaryValue?.toString().trim() ?? '')
		: (primaryValue?.toString() ?? '');
	const rawC = settings.trimValues
		? (comparisonValue?.toString().trim() ?? '')
		: (comparisonValue?.toString() ?? '');

	const pNorm = normalizeForComparison(rawP, settings.caseSensitive, false);
	const cNorm = normalizeForComparison(rawC, settings.caseSensitive, false);
	const { num: num1, isNumeric: isNum1 } = parseNumeric(rawP);
	const { num: num2, isNumeric: isNum2 } = parseNumeric(rawC);

	switch (tolerance.type) {
		case 'exact_match': {
			const matches = compareValues(rawP, rawC, settings.caseSensitive, settings.trimValues);
			const reason = matches ? 'Exact match' : `Values do not match: ${rawP} != ${rawC}`;
			return { matches, reason };
		}

		case 'absolute': {
			if (isNum1 && isNum2) {
				const diff = Math.abs(num1 - num2);
				const matches = diff <= tolerance.value;
				const reason = matches
					? `Within absolute tolerance ${tolerance.value}: |${num1} - ${num2}| = ${diff.toFixed(4)}`
					: `Outside absolute tolerance ${tolerance.value}: |${num1} - ${num2}| = ${diff.toFixed(4)}`;
				return { matches, reason };
			}
			return {
				matches: false,
				reason: 'Cannot apply absolute tolerance to non-numeric values'
			};
		}

		case 'relative': {
			if (isNum1 && isNum2) {
				const difference = Math.abs(num1 - num2);
				const average = Math.abs((num1 + num2) / 2);
				const toleranceAmount = (tolerance.percentage / 100) * average;
				const percentDiff = average !== 0 ? (difference / average) * 100 : 0;
				const matches = difference <= toleranceAmount;
				const reason = matches
					? `Within ${tolerance.percentage}% relative tolerance: ${percentDiff.toFixed(2)}% difference (${num1} vs ${num2})`
					: `Outside ${tolerance.percentage}% relative tolerance: ${percentDiff.toFixed(2)}% difference (${num1} vs ${num2})`;
				return { matches, reason };
			}
			return {
				matches: false,
				reason: 'Cannot apply relative tolerance to non-numeric values'
			};
		}

		case 'within_percentage_similarity': {
			const similarity = calculateStringSimilarity(pNorm, cNorm);
			const threshold = tolerance.percentage / 100;
			const matches = similarity >= threshold;
			const reason = matches
				? `String similarity ${(similarity * 100).toFixed(1)}% >= ${tolerance.percentage}% (${pNorm} vs ${cNorm})`
				: `String similarity ${(similarity * 100).toFixed(1)}% < ${tolerance.percentage}% (${pNorm} vs ${cNorm})`;
			return { matches, reason };
		}

		case 'custom': {
			try {
				const { result, evaluatedFormula } = evaluateCustomFormula(rawP, rawC, tolerance.formula);
				const reason = result
					? `Custom formula matched: ${tolerance.formula}`
					: `Custom formula did not match: ${tolerance.formula} (primaryValue: ${primaryValue}, comparisonValue: ${comparisonValue})`;
				return { matches: result, reason };
			} catch (err) {
				return {
					matches: false,
					reason: `Custom formula error: ${err instanceof Error ? err.message : String(err)}`
				};
			}
		}

		default: {
			const exhaustiveCheck: never = tolerance;
			return exhaustiveCheck;
		}
	}
}

/**
 * Generate match status and detailed reason for a comparison
 */
/**
 * Generate match status and detailed reason for a comparison
 */
function generateMatchStatusAndReason(
	primaryValue: string | number | null | undefined,
	comparisonValue: string | number | null | undefined,
	match: boolean,
	isExactMatch: boolean,
	tolerance: Tolerance,
	settings: ColumnPairSettings
): { status: MatchStatus; reason: string } {
	// Handle null/empty values
	if (!primaryValue && !comparisonValue) {
		return { status: 'missing', reason: match ? 'Both values are empty' : 'Values are different' };
	}

	if (!primaryValue) return { status: 'missing', reason: 'Primary value is empty' };
	if (!comparisonValue) return { status: 'missing', reason: 'Comparison value is empty' };

	// Normalize values according to options
	const pNorm = normalizeForComparison(primaryValue, settings.caseSensitive, settings.trimValues);
	const cNorm = normalizeForComparison(
		comparisonValue,
		settings.caseSensitive,
		settings.trimValues
	);

	// For numeric parsing we use the trimmed strings (case does not affect numbers)
	const rawP = settings.trimValues
		? (primaryValue?.toString().trim() ?? '')
		: (primaryValue?.toString() ?? '');
	const rawC = settings.trimValues
		? (comparisonValue?.toString().trim() ?? '')
		: (comparisonValue?.toString() ?? '');
	const { num: num1, isNumeric: isNum1 } = parseNumeric(rawP);
	const { num: num2, isNumeric: isNum2 } = parseNumeric(rawC);

	if (isExactMatch) {
		// Use normalized display value for reason
		return { status: 'exact_match', reason: `Exact match: '${pNorm}'` };
	}

	if (match) {
		const { matches: tolMatches, reason: tolReason } = evaluateTolerance(
			primaryValue,
			comparisonValue,
			tolerance,
			settings
		);
		if (tolMatches) {
			return { status: 'within_tolerance', reason: tolReason };
		}
		// If tolerance evaluation didn't match (unexpected since `match` was true), fall-through to partial/no match logic
	}

	// No tolerance match - construct partial or no match explanations using switch
	switch (true) {
		case isNum1 && isNum2: {
			const diff = Math.abs(num1 - num2);
			const average = Math.abs((num1 + num2) / 2);
			const percentDiff = average !== 0 ? (diff / average) * 100 : 0;
			const status: MatchStatus = percentDiff <= 10 ? 'partial_match' : 'no_match';
			return {
				status,
				reason: `Values differ by ${diff.toFixed(4)} (${percentDiff.toFixed(2)}% of average) - ${num1} vs ${num2}`
			};
		}

		default: {
			const similarity = calculateStringSimilarity(pNorm, cNorm);
			const percent = (similarity * 100).toFixed(1);
			const status: MatchStatus =
				similarity >= PARTIAL_STRING_SIMILARITY ? 'partial_match' : 'no_match';
			return { status, reason: `${percent}% similar (${pNorm} vs ${cNorm})` };
		}
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

	// Only allow specific patterns: variables, numbers, operators, comparisons, logical operators, and parentheses
	// Allow comparison operators: < > = ! (so <=, >=, ==, != are possible)
	// Allow logical operators: & | (so && and || are possible)
	const allowedPattern = /^[0-9+\-*/%().,<>!=&|primaryColumnValuecomparisonColumnValue]+$/;

	if (!allowedPattern.test(cleaned)) {
		throw new Error(
			'Formula contains invalid characters. Only numbers, operators (+, -, *, /, %), comparisons (<, >, =, !), logical operators (&, |), parentheses, and the variables primaryColumnValue and comparisonColumnValue are allowed.'
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
 * Handles multiple tolerance types using switch statement
 */
export function isWithinTolerance(
	value1: string | undefined,
	value2: string | undefined,
	tolerance: Tolerance,
	settings: ColumnPairSettings
): boolean {
	// Handle undefined or empty values
	if (!value1 && !value2) return true;
	if (!value1 || !value2) return false;

	const rawValue1 = settings.trimValues ? value1.trim() : value1;
	const rawValue2 = settings.trimValues ? value2.trim() : value2;

	switch (tolerance.type) {
		case 'exact_match':
			return compareValues(rawValue1, rawValue2, settings.caseSensitive, settings.trimValues);

		case 'absolute': {
			const { num: num1, isNumeric: isNum1 } = parseNumeric(rawValue1);
			const { num: num2, isNumeric: isNum2 } = parseNumeric(rawValue2);
			if (isNum1 && isNum2) {
				const diff = Math.abs(num1 - num2);
				return diff <= tolerance.value;
			}
			return false;
		}

		case 'relative': {
			const { num: num1, isNumeric: isNum1 } = parseNumeric(rawValue1);
			const { num: num2, isNumeric: isNum2 } = parseNumeric(rawValue2);
			if (isNum1 && isNum2) {
				const difference = Math.abs(num1 - num2);
				const average = Math.abs((num1 + num2) / 2);
				const toleranceAmount = (tolerance.percentage / 100) * average;
				return difference <= toleranceAmount;
			}
			return false;
		}

		case 'within_percentage_similarity': {
			const norm1 = normalizeForComparison(rawValue1, settings.caseSensitive, false);
			const norm2 = normalizeForComparison(rawValue2, settings.caseSensitive, false);
			const similarity = calculateStringSimilarity(norm1, norm2);
			return similarity >= tolerance.percentage / 100;
		}

		case 'custom':
			return checkCustomTolerance(rawValue1, rawValue2, tolerance.formula);

		default: {
			const exhaustiveCheck: never = tolerance;
			return exhaustiveCheck;
		}
	}
}

/**
 * Check custom tolerance using user-defined formula
 * Formula can reference primaryColumnValue and comparisonColumnValue
 * Returns true if formula evaluates to a truthy value
 */
export function evaluateCustomFormula(
	value1: string,
	value2: string,
	formula: string
): { result: boolean; evaluatedFormula: string } {
	// Validate formula once
	try {
		validateCustomFormula(formula);
	} catch (error) {
		throw new Error(
			`Invalid custom tolerance formula: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	// Parse numeric values and prepare substitution values
	const primaryNum = parseFloat(value1);
	const comparisonNum = parseFloat(value2);

	// Use numeric values if they're valid numbers, otherwise use string literals (quoted)
	const primarySubst = isNaN(primaryNum) ? `"${value1}"` : `(${primaryNum})`;
	const comparisonSubst = isNaN(comparisonNum) ? `"${value2}"` : `(${comparisonNum})`;

	// Try to create a safe evaluation function
	// Replace variable names with actual values
	let evaluableFormula = formula
		.replace(/primaryColumnValue/g, primarySubst)
		.replace(/comparisonColumnValue/g, comparisonSubst);

	try {
		// Use Function constructor in a sandbox-like way (more restricted than eval)
		// eslint-disable-next-line no-new-func
		const result = new Function(`return ${evaluableFormula}`)();

		// For numbers, check if result is <= some threshold (typically 0 for "difference <= 0")
		// For the formula, we expect it to return a boolean or truthy value
		return { result: Boolean(result), evaluatedFormula: evaluableFormula };
	} catch (error) {
		throw new Error(
			`Error evaluating custom tolerance formula: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Check custom tolerance using user-defined formula
 * Formula can reference primaryColumnValue and comparisonColumnValue
 * Returns true if formula evaluates to a truthy value
 */
function checkCustomTolerance(value1: string, value2: string, formula: string): boolean {
	const { result } = evaluateCustomFormula(value1, value2, formula);
	return result;
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
