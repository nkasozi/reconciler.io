import type { ParsedFileData } from './fileParser';

// Types for reconciliation
export type ColumnPair = {
  primaryColumn: string | null;
  comparisonColumn: string | null;
};

export type ReconciliationConfig = {
  primaryIdPair: ColumnPair;
  comparisonPairs: ColumnPair[];
  contactEmail: string;
};

export type ReconciliationResult = {
  matchedRecords: MatchedRecordResult[];
  unmatchedPrimaryRecords: Record<string, string>[];
  unmatchedComparisonRecords: Record<string, string>[];
  reconciliationDate: string;
  summary: ReconciliationSummary;
};

export type MatchedRecordResult = {
  primaryRecord: Record<string, string>;
  comparisonRecord: Record<string, string>;
  matches: ComparisonMatch[];
  allMatch: boolean;
};

export type ComparisonMatch = {
  primaryColumn: string;
  comparisonColumn: string;
  primaryValue: string;
  comparisonValue: string;
  matches: boolean;
};

export type ReconciliationSummary = {
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  partiallyMatchedRecords: number;
  matchPercentage: number;
};

/**
 * Perform reconciliation between two data sets
 */
export function reconcileData(
  primaryData: ParsedFileData,
  comparisonData: ParsedFileData,
  config: ReconciliationConfig
): ReconciliationResult {
  // Validate required config
  if (!config.primaryIdPair.primaryColumn || !config.primaryIdPair.comparisonColumn) {
    throw new Error('Primary ID columns must be specified');
  }

  const primaryIdColumn = config.primaryIdPair.primaryColumn;
  const comparisonIdColumn = config.primaryIdPair.comparisonColumn;

  // Create lookup maps for faster matching
  const primaryMap = new Map<string, Record<string, string>>();
  const comparisonMap = new Map<string, Record<string, string>>();

  // Populate primary map
  primaryData.rows.forEach(row => {
    const idValue = row[primaryIdColumn];
    if (idValue) {
      primaryMap.set(idValue, row);
    }
  });

  // Populate comparison map
  comparisonData.rows.forEach(row => {
    const idValue = row[comparisonIdColumn];
    if (idValue) {
      comparisonMap.set(idValue, row);
    }
  });

  const matchedRecords: MatchedRecordResult[] = [];
  const unmatchedPrimaryRecords: Record<string, string>[] = [];
  const unmatchedComparisonRecords: Record<string, string>[] = [];

  // Find matches and perform comparisons
  primaryData.rows.forEach(primaryRow => {
    const primaryId = primaryRow[primaryIdColumn];
    
    if (!primaryId) {
      unmatchedPrimaryRecords.push(primaryRow);
      return;
    }

    const comparisonRow = comparisonMap.get(primaryId);
    
    if (!comparisonRow) {
      unmatchedPrimaryRecords.push(primaryRow);
      return;
    }

    // We found a match - now compare the specified columns
    const matches: ComparisonMatch[] = [];
    let allFieldsMatch = true;

    config.comparisonPairs.forEach(pair => {
      if (!pair.primaryColumn || !pair.comparisonColumn) return;

      const primaryValue = primaryRow[pair.primaryColumn] || '';
      const comparisonValue = comparisonRow[pair.comparisonColumn] || '';
      const valuesMatch = compareValues(primaryValue, comparisonValue);

      matches.push({
        primaryColumn: pair.primaryColumn,
        comparisonColumn: pair.comparisonColumn,
        primaryValue,
        comparisonValue,
        matches: valuesMatch
      });

      if (!valuesMatch) {
        allFieldsMatch = false;
      }
    });

    matchedRecords.push({
      primaryRecord: primaryRow,
      comparisonRecord: comparisonRow,
      matches,
      allMatch: allFieldsMatch
    });

    // Remove from comparison map to track unmatched comparison records
    comparisonMap.delete(primaryId);
  });

  // Any remaining items in comparisonMap are unmatched
  comparisonMap.forEach(row => {
    unmatchedComparisonRecords.push(row);
  });

  // Calculate summary statistics
  const totalRecords = primaryData.rows.length;
  const matchedCount = matchedRecords.length;
  const fullMatchCount = matchedRecords.filter(record => record.allMatch).length;
  const partialMatchCount = matchedCount - fullMatchCount;

  const summary: ReconciliationSummary = {
    totalRecords,
    matchedRecords: matchedCount,
    unmatchedRecords: unmatchedPrimaryRecords.length,
    partiallyMatchedRecords: partialMatchCount,
    matchPercentage: totalRecords > 0 ? (fullMatchCount / totalRecords) * 100 : 0
  };

  return {
    matchedRecords,
    unmatchedPrimaryRecords,
    unmatchedComparisonRecords,
    reconciliationDate: new Date().toISOString(),
    summary
  };
}

/**
 * Compare two string values, with normalization for common variations
 */
function compareValues(value1: string, value2: string): boolean {
  // Basic case - exact match
  if (value1 === value2) return true;

  // Normalize and compare
  const normalized1 = normalizeValue(value1);
  const normalized2 = normalizeValue(value2);

  return normalized1 === normalized2;
}

/**
 * Normalize a value for comparison
 * - Trim whitespace
 * - Remove currency symbols
 * - Standardize numbers
 */
function normalizeValue(value: string): string {
  // Handle empty values
  if (!value) return '';

  // Convert to string if not already
  let result = String(value);

  // Trim whitespace
  result = result.trim();

  // Remove currency symbols and formatting
  result = result.replace(/[$£€¥]/g, '');

  // Try to parse as number and standardize format
  const numericValue = parseFloat(result.replace(/,/g, ''));
  if (!isNaN(numericValue)) {
    return numericValue.toString();
  }

  // For dates, try to standardize format
  const dateValue = new Date(result);
  if (!isNaN(dateValue.getTime())) {
    return dateValue.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Lowercase for general string comparison
  return result.toLowerCase();
}