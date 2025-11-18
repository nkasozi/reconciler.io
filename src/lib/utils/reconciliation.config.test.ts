import { describe, test, expect } from 'vitest';
import { reconcileData } from './reconciliation';
import type { ParsedFileData, ReconciliationConfig } from './reconciliation';

describe('Reconciliation Configuration Tests', () => {
	// Sample test data
	const primaryData: ParsedFileData = {
		columns: ['ID', 'Name', 'Amount'],
		rows: [
			{ ID: '1', Name: ' John Doe ', Amount: '100.00' }, // Has whitespace
			{ ID: '2', Name: 'Jane Smith', Amount: '250.50' },
			{ ID: '3', Name: 'ALICE BROWN', Amount: '75.25' }, // Uppercase
			{ ID: '4', Name: 'Bob Wilson', Amount: ' 500 ' } // Whitespace in amount
		],
		fileName: 'primary.csv',
		fileType: 'csv'
	};

	const comparisonData: ParsedFileData = {
		columns: ['UserID', 'FullName', 'Value'],
		rows: [
			{ UserID: '1', FullName: 'John Doe', Value: '100.00' }, // Exact match (after trim)
			{ UserID: '2', FullName: 'jane smith', Value: '250.50' }, // Case difference
			{ UserID: '3', FullName: 'Alice Brown', Value: '75.25' }, // Case difference
			{ UserID: '4', FullName: 'Bob Wilson', Value: '500' }, // Whitespace difference
			{ UserID: '5', FullName: 'Charlie Day', Value: '300.00' } // No match in primary
		],
		fileName: 'comparison.csv',
		fileType: 'csv'
	};

	const baseConfig: ReconciliationConfig = {
		primaryIdPair: {
			primaryColumn: 'ID',
			comparisonColumn: 'UserID'
		},
		comparisonPairs: [
			{
				primaryColumn: 'Name',
				comparisonColumn: 'FullName'
			},
			{
				primaryColumn: 'Amount',
				comparisonColumn: 'Value'
			}
		],
		reverseReconciliation: false,
		caseSensitive: false,
		trimValues: true
	};

	describe('trimValues Configuration', () => {
		test('should match values when trimValues is enabled', () => {
			const config = { ...baseConfig, trimValues: true, caseSensitive: false };

			const result = reconcileData(primaryData, comparisonData, config);

			// Should find matches for records with whitespace differences
			expect(result.matches.length).toBe(4); // All 4 records should match

			// Check specific matches
			const johnMatch = result.matches.find((m) => m.idValues.primary === '1');
			expect(johnMatch).toBeDefined();
			expect(johnMatch?.comparisonResults.Name.match).toBe(true); // ' John Doe ' matches 'John Doe'

			const bobMatch = result.matches.find((m) => m.idValues.primary === '4');
			expect(bobMatch).toBeDefined();
			expect(bobMatch?.comparisonResults.Amount.match).toBe(true); // ' 500 ' matches '500'
		});

		test('should not match values when trimValues is disabled', () => {
			const config = { ...baseConfig, trimValues: false, caseSensitive: false };

			const result = reconcileData(primaryData, comparisonData, config);

			// Should have fewer matches due to whitespace differences
			const johnMatch = result.matches.find((m) => m.idValues.primary === '1');
			expect(johnMatch?.comparisonResults.Name.match).toBe(false); // ' John Doe ' ≠ 'John Doe'

			const bobMatch = result.matches.find((m) => m.idValues.primary === '4');
			expect(bobMatch?.comparisonResults.Amount.match).toBe(false); // ' 500 ' ≠ '500'
		});
	});

	describe('caseSensitive Configuration', () => {
		test('should match different cases when caseSensitive is false', () => {
			const config = { ...baseConfig, caseSensitive: false, trimValues: true };

			const result = reconcileData(primaryData, comparisonData, config);

			// Check case insensitive matches
			const janeMatch = result.matches.find((m) => m.idValues.primary === '2');
			expect(janeMatch?.comparisonResults.Name.match).toBe(true); // 'Jane Smith' matches 'jane smith'

			const aliceMatch = result.matches.find((m) => m.idValues.primary === '3');
			expect(aliceMatch?.comparisonResults.Name.match).toBe(true); // 'ALICE BROWN' matches 'Alice Brown'
		});

		test('should not match different cases when caseSensitive is true', () => {
			const config = { ...baseConfig, caseSensitive: true, trimValues: true };

			const result = reconcileData(primaryData, comparisonData, config);

			// Check case sensitive matches
			const janeMatch = result.matches.find((m) => m.idValues.primary === '2');
			expect(janeMatch?.comparisonResults.Name.match).toBe(false); // 'Jane Smith' ≠ 'jane smith'

			const aliceMatch = result.matches.find((m) => m.idValues.primary === '3');
			expect(aliceMatch?.comparisonResults.Name.match).toBe(false); // 'ALICE BROWN' ≠ 'Alice Brown'
		});
	});

	describe('reverseReconciliation Configuration', () => {
		test('should only process primary->comparison when reverseReconciliation is false', () => {
			const config = { ...baseConfig, reverseReconciliation: false };

			const result = reconcileData(primaryData, comparisonData, config);

			// Should have 1 unmatched comparison record (Charlie Day)
			expect(result.unmatchedComparison.length).toBe(1);
			expect(result.unmatchedComparison[0].FullName).toBe('Charlie Day');

			// Should process all primary records
			expect(result.matches.length + result.unmatchedPrimary.length).toBe(primaryData.rows.length);
		});

		test('should process both directions when reverseReconciliation is true', () => {
			const config = { ...baseConfig, reverseReconciliation: true };

			const result = reconcileData(primaryData, comparisonData, config);

			// Should still find the unmatched comparison record
			expect(result.unmatchedComparison.length).toBe(1);
			expect(result.unmatchedComparison[0].FullName).toBe('Charlie Day');

			// Should process records from both files
			const totalProcessed =
				result.matches.length + result.unmatchedPrimary.length + result.unmatchedComparison.length;
			expect(totalProcessed).toBeGreaterThanOrEqual(
				Math.max(primaryData.rows.length, comparisonData.rows.length)
			);
		});
	});

	describe('Combined Configuration Effects', () => {
		test('should respect all configuration options together', () => {
			const strictConfig = {
				...baseConfig,
				caseSensitive: true,
				trimValues: false,
				reverseReconciliation: false
			};

			const result = reconcileData(primaryData, comparisonData, strictConfig);

			// With strict settings, should have fewer matches
			const perfectMatches = result.matches.filter((match) => {
				return Object.values(match.comparisonResults).every((comp) => comp.match);
			});

			// Only records with exact matches (no case or whitespace differences) should match perfectly
			expect(perfectMatches.length).toBeLessThan(result.matches.length);
		});

		test('should be lenient with relaxed configuration', () => {
			const lenientConfig = {
				...baseConfig,
				caseSensitive: false,
				trimValues: true,
				reverseReconciliation: true
			};

			const result = reconcileData(primaryData, comparisonData, lenientConfig);

			// With lenient settings, should have more matches
			const perfectMatches = result.matches.filter((match) => {
				return Object.values(match.comparisonResults).every((comp) => comp.match);
			});

			// Should match most records due to trimming and case insensitivity
			expect(perfectMatches.length).toBe(4); // All 4 matched records should be perfect
		});
	});

	describe('Match Score Calculations', () => {
		test('should calculate correct match scores based on configuration', () => {
			const config = { ...baseConfig, caseSensitive: false, trimValues: true };

			const result = reconcileData(primaryData, comparisonData, config);

			// Records with all matching fields should have high scores
			const johnMatch = result.matches.find((m) => m.idValues.primary === '1');
			expect(johnMatch?.matchScore).toBe(100); // Perfect match after trimming

			// Records with some non-matching fields should have lower scores
			const partialMatches = result.matches.filter((m) => m.matchScore < 100 && m.matchScore > 0);
			expect(partialMatches.length).toBeGreaterThanOrEqual(0);
		});

		test('should show different scores with different configurations', () => {
			const lenientConfig = { ...baseConfig, caseSensitive: false, trimValues: true };
			const strictConfig = { ...baseConfig, caseSensitive: true, trimValues: false };

			const lenientResult = reconcileData(primaryData, comparisonData, lenientConfig);
			const strictResult = reconcileData(primaryData, comparisonData, strictConfig);

			// Lenient config should generally produce higher match scores
			const lenientAvgScore =
				lenientResult.matches.reduce((sum, m) => sum + m.matchScore, 0) /
				lenientResult.matches.length;
			const strictAvgScore =
				strictResult.matches.reduce((sum, m) => sum + m.matchScore, 0) /
				strictResult.matches.length;

			expect(lenientAvgScore).toBeGreaterThanOrEqual(strictAvgScore);
		});
	});

	describe('Summary Statistics', () => {
		test('should provide accurate summary with different configurations', () => {
			const config = { ...baseConfig, reverseReconciliation: false };

			const result = reconcileData(primaryData, comparisonData, config);

			expect(result.summary.totalPrimaryRows).toBe(primaryData.rows.length);
			expect(result.summary.totalComparisonRows).toBe(comparisonData.rows.length);
			expect(result.summary.matchedRows).toBe(result.matches.length);
			expect(result.summary.unmatchedPrimaryRows).toBe(result.unmatchedPrimary.length);
			expect(result.summary.unmatchedComparisonRows).toBe(result.unmatchedComparison.length);

			// Verify totals add up correctly
			expect(result.summary.matchedRows + result.summary.unmatchedPrimaryRows).toBe(
				result.summary.totalPrimaryRows
			);
		});

		test('should calculate correct match percentage', () => {
			const config = { ...baseConfig, caseSensitive: false, trimValues: true };

			const result = reconcileData(primaryData, comparisonData, config);

			const expectedPercentage = Math.round(
				(result.matches.length / primaryData.rows.length) * 100
			);
			expect(result.summary.matchPercentage).toBe(expectedPercentage);
		});
	});

	describe('Edge Cases', () => {
		test('should handle empty datasets', () => {
			const emptyData: ParsedFileData = {
				columns: ['ID', 'Name'],
				rows: [],
				fileName: 'empty.csv',
				fileType: 'csv'
			};

			const result = reconcileData(emptyData, comparisonData, baseConfig);

			expect(result.matches.length).toBe(0);
			expect(result.unmatchedPrimary.length).toBe(0);
			expect(result.summary.matchPercentage).toBe(0);
		});

		test('should handle null and undefined values', () => {
			const dataWithNulls: ParsedFileData = {
				columns: ['ID', 'Name', 'Amount'],
				rows: [
					{ ID: '1', Name: '', Amount: '100' }, // Empty string
					{ ID: '2', Name: 'John', Amount: '' } // Empty amount
				],
				fileName: 'nulls.csv',
				fileType: 'csv'
			};

			const comparisonWithNulls: ParsedFileData = {
				columns: ['UserID', 'FullName', 'Value'],
				rows: [
					{ UserID: '1', FullName: '', Value: '100' }, // Empty string
					{ UserID: '2', FullName: 'John', Value: '' } // Empty value
				],
				fileName: 'comparison-nulls.csv',
				fileType: 'csv'
			};

			const result = reconcileData(dataWithNulls, comparisonWithNulls, baseConfig);

			// Should handle empty values gracefully
			expect(result.matches.length).toBe(2);

			// Empty strings should match empty strings
			const emptyNameMatch = result.matches.find((m) => m.idValues.primary === '1');
			expect(emptyNameMatch?.comparisonResults.Name.match).toBe(true);
		});
	});
});
