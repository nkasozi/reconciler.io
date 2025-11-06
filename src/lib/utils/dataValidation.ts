import type { ParsedFileData } from './fileParser';
import type { DocumentScanResult } from './documentScanner';

export interface DataValidationResult {
	isValid: boolean;
	confidence: number;
	issues: ValidationIssue[];
	suggestions: string[];
	cleanedData?: ParsedFileData;
}

export interface ValidationIssue {
	type:
		| 'low_confidence'
		| 'inconsistent_format'
		| 'missing_data'
		| 'duplicate_headers'
		| 'empty_cells';
	severity: 'error' | 'warning' | 'info';
	message: string;
	affectedRows?: number[];
	affectedColumns?: string[];
	confidence?: number;
}

export interface CleanupOptions {
	removeEmptyRows?: boolean;
	trimWhitespace?: boolean;
	fixCommonOCRErrors?: boolean;
	standardizeFormats?: boolean;
	confidenceThreshold?: number;
}

/**
 * Validate and clean parsed data from OCR scanning
 */
export function validateAndCleanData(
	parsedData: ParsedFileData,
	scanResult?: DocumentScanResult,
	options: CleanupOptions = {}
): DataValidationResult {
	const {
		removeEmptyRows = true,
		trimWhitespace = true,
		fixCommonOCRErrors = true,
		standardizeFormats = true,
		confidenceThreshold = 70
	} = options;

	const issues: ValidationIssue[] = [];
	const suggestions: string[] = [];
	let confidence = scanResult?.confidence ?? 100;

	// Check overall OCR confidence
	if (scanResult?.confidence !== undefined && scanResult.confidence < confidenceThreshold) {
		issues.push({
			type: 'low_confidence',
			severity: 'warning',
			message: `OCR confidence is ${scanResult.confidence.toFixed(1)}%, below threshold of ${confidenceThreshold}%`,
			confidence: scanResult.confidence
		});
		suggestions.push('Consider rescanning with better lighting or higher resolution');
	}

	// Validate column headers
	const headerIssues = validateHeaders(parsedData.columns);
	issues.push(...headerIssues);

	// Validate data consistency
	const dataIssues = validateDataConsistency(parsedData);
	issues.push(...dataIssues);

	// Clean the data
	let cleanedData = { ...parsedData };

	if (trimWhitespace) {
		cleanedData = trimDataWhitespace(cleanedData);
	}

	if (fixCommonOCRErrors) {
		cleanedData = fixOCRErrors(cleanedData);
	}

	if (removeEmptyRows) {
		cleanedData = removeEmptyDataRows(cleanedData);
	}

	if (standardizeFormats) {
		cleanedData = standardizeDataFormats(cleanedData);
	}

	// Generate additional suggestions based on issues found
	if (issues.some((i) => i.type === 'missing_data')) {
		suggestions.push('Review and fill in missing data fields');
	}

	if (issues.some((i) => i.type === 'inconsistent_format')) {
		suggestions.push('Check data formats for consistency (dates, numbers, etc.)');
	}

	const errorCount = issues.filter((i) => i.severity === 'error').length;
	const warningCount = issues.filter((i) => i.severity === 'warning').length;

	// Adjust confidence based on issues found
	if (errorCount > 0) {
		confidence = Math.min(confidence, 40);
	} else if (warningCount > 2) {
		confidence = Math.min(confidence, 60);
	} else if (warningCount > 0) {
		confidence = Math.min(confidence, 80);
	}

	return {
		isValid: errorCount === 0,
		confidence,
		issues,
		suggestions,
		cleanedData
	};
}

/**
 * Validate column headers for common issues
 */
function validateHeaders(columns: string[]): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	// Check for duplicate headers
	const duplicates = columns.filter((col, index) => columns.indexOf(col) !== index);
	if (duplicates.length > 0) {
		issues.push({
			type: 'duplicate_headers',
			severity: 'error',
			message: `Duplicate column headers found: ${duplicates.join(', ')}`,
			affectedColumns: duplicates
		});
	}

	// Check for empty or very short headers
	const emptyHeaders = columns.filter((col) => !col || col.trim().length < 2);
	if (emptyHeaders.length > 0) {
		issues.push({
			type: 'missing_data',
			severity: 'warning',
			message: `${emptyHeaders.length} column(s) have missing or very short headers`,
			affectedColumns: emptyHeaders
		});
	}

	return issues;
}

/**
 * Validate data consistency across rows
 */
function validateDataConsistency(parsedData: ParsedFileData): ValidationIssue[] {
	const issues: ValidationIssue[] = [];

	if (parsedData.rows.length === 0) {
		issues.push({
			type: 'missing_data',
			severity: 'error',
			message: 'No data rows found'
		});
		return issues;
	}

	// Check for completely empty rows
	const emptyRows: number[] = [];
	parsedData.rows.forEach((row, index) => {
		const hasData = Object.values(row).some((value) => value && value.trim().length > 0);
		if (!hasData) {
			emptyRows.push(index);
		}
	});

	if (emptyRows.length > 0) {
		issues.push({
			type: 'empty_cells',
			severity: 'warning',
			message: `${emptyRows.length} completely empty rows found`,
			affectedRows: emptyRows
		});
	}

	// Check for missing data in key columns (first few columns)
	const keyColumns = parsedData.columns.slice(0, Math.min(3, parsedData.columns.length));
	for (const column of keyColumns) {
		const missingCount = parsedData.rows.filter(
			(row) => !row[column] || row[column].trim().length === 0
		).length;
		if (missingCount > parsedData.rows.length * 0.1) {
			// More than 10% missing
			issues.push({
				type: 'missing_data',
				severity: 'warning',
				message: `Column '${column}' has ${missingCount} missing values (${((missingCount / parsedData.rows.length) * 100).toFixed(1)}%)`,
				affectedColumns: [column]
			});
		}
	}

	return issues;
}

/**
 * Trim whitespace from all data fields
 */
function trimDataWhitespace(parsedData: ParsedFileData): ParsedFileData {
	return {
		...parsedData,
		columns: parsedData.columns.map((col) => col.trim()),
		rows: parsedData.rows.map((row) => {
			const trimmedRow: Record<string, string> = {};
			for (const [key, value] of Object.entries(row)) {
				trimmedRow[key] = value?.trim() || '';
			}
			return trimmedRow;
		})
	};
}

/**
 * Fix common OCR errors
 */
function fixOCRErrors(parsedData: ParsedFileData): ParsedFileData {
	const ocrFixes: Record<string, string> = {
		// Common OCR character substitutions
		'0': 'O', // Context dependent
		l: '1', // Context dependent
		I: '1', // Context dependent
		S: '5', // Context dependent
		Z: '2', // Context dependent
		'|': '1'
		// Add more OCR error patterns as needed
	};

	return {
		...parsedData,
		rows: parsedData.rows.map((row) => {
			const fixedRow: Record<string, string> = {};
			for (const [key, value] of Object.entries(row)) {
				let fixedValue = value || '';

				// Apply OCR fixes for numeric-looking fields
				if (fixedValue && /^[0-9|lISZ]+$/.test(fixedValue)) {
					for (const [error, fix] of Object.entries(ocrFixes)) {
						fixedValue = fixedValue.replace(new RegExp(error, 'g'), fix);
					}
				}

				fixedRow[key] = fixedValue;
			}
			return fixedRow;
		})
	};
}

/**
 * Remove completely empty rows
 */
function removeEmptyDataRows(parsedData: ParsedFileData): ParsedFileData {
	const nonEmptyRows = parsedData.rows.filter((row) => {
		return Object.values(row).some((value) => value && value.trim().length > 0);
	});

	return {
		...parsedData,
		rows: nonEmptyRows
	};
}

/**
 * Standardize common data formats
 */
function standardizeDataFormats(parsedData: ParsedFileData): ParsedFileData {
	return {
		...parsedData,
		rows: parsedData.rows.map((row) => {
			const standardizedRow: Record<string, string> = {};
			for (const [key, value] of Object.entries(row)) {
				let standardizedValue = value || '';

				// Standardize dates (basic patterns)
				standardizedValue = standardizedValue.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, '$3-$1-$2');

				// Standardize currency (remove symbols for processing)
				standardizedValue = standardizedValue.replace(/[$,]/g, '');

				// Standardize decimals
				standardizedValue = standardizedValue.replace(/(\d),(\d{3})/g, '$1$2');

				standardizedRow[key] = standardizedValue;
			}
			return standardizedRow;
		})
	};
}

/**
 * Generate a data quality score based on validation results
 */
export function calculateDataQualityScore(validationResult: DataValidationResult): number {
	const baseScore = validationResult.confidence;
	const errorPenalty = validationResult.issues.filter((i) => i.severity === 'error').length * 20;
	const warningPenalty = validationResult.issues.filter((i) => i.severity === 'warning').length * 5;

	return Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty));
}
