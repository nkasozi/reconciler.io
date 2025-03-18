import { describe, test, expect } from 'vitest';
import { reconcileData, type ColumnPair, type ReconciliationConfig } from './reconciliation';
import type { ParsedFileData } from './fileParser';

describe('reconciliation', () => {
  describe('reconcileData', () => {
    // Test data
    const primaryData: ParsedFileData = {
      columns: ['ID', 'Name', 'Amount', 'Date'],
      rows: [
        { ID: '1', Name: 'John Doe', Amount: '100', Date: '2023-01-01' },
        { ID: '2', Name: 'Jane Smith', Amount: '200', Date: '2023-01-02' },
        { ID: '3', Name: 'Bob Johnson', Amount: '300', Date: '2023-01-03' },
        { ID: '4', Name: 'Alice Brown', Amount: '400', Date: '2023-01-04' }
      ],
      fileName: 'primary.csv',
      fileType: 'csv'
    };
    
    const comparisonData: ParsedFileData = {
      columns: ['ID', 'FullName', 'Value', 'TransactionDate'],
      rows: [
        { ID: '1', FullName: 'John Doe', Value: '100', TransactionDate: '2023-01-01' },
        { ID: '2', FullName: 'Jane Smith', Value: '250', TransactionDate: '2023-01-02' }, // Amount mismatch
        { ID: '5', FullName: 'Eve Williams', Value: '500', TransactionDate: '2023-01-05' } // Not in primary
      ],
      fileName: 'comparison.csv',
      fileType: 'csv'
    };
    
    const config: ReconciliationConfig = {
      primaryIdPair: {
        primaryColumn: 'ID',
        comparisonColumn: 'ID'
      },
      comparisonPairs: [
        { primaryColumn: 'Name', comparisonColumn: 'FullName' },
        { primaryColumn: 'Amount', comparisonColumn: 'Value' },
        { primaryColumn: 'Date', comparisonColumn: 'TransactionDate' }
      ]
    };
    
    test('should properly reconcile data between primary and comparison files', () => {
      const result = reconcileData(primaryData, comparisonData, config);
      
      // Check summary statistics
      expect(result.summary.totalPrimaryRows).toBe(4);
      expect(result.summary.totalComparisonRows).toBe(3);
      expect(result.summary.matchedRows).toBe(2);
      expect(result.summary.unmatchedPrimaryRows).toBe(2);
      expect(result.summary.unmatchedComparisonRows).toBe(1);
      expect(result.summary.matchPercentage).toBe(50); // 2/4 = 50%
      
      // Check matches
      expect(result.matches.length).toBe(2);
      
      // First row should be a perfect match
      const match1 = result.matches.find(m => m.idValues.primary === '1');
      expect(match1).toBeDefined();
      expect(match1?.matchScore).toBe(100);
      expect(Object.values(match1!.comparisonResults).every(r => r.match)).toBe(true);
      
      // Second row should be a partial match (Amount/Value mismatch)
      const match2 = result.matches.find(m => m.idValues.primary === '2');
      expect(match2).toBeDefined();
      expect(match2?.matchScore).toBe(67); // 2/3 = ~67%
      expect(match2?.comparisonResults['Name'].match).toBe(true);
      expect(match2?.comparisonResults['Amount'].match).toBe(false);
      expect(match2?.comparisonResults['Date'].match).toBe(true);
      
      // Check unmatched primary rows
      expect(result.unmatchedPrimary.length).toBe(2);
      expect(result.unmatchedPrimary.some(row => row.ID === '3')).toBe(true);
      expect(result.unmatchedPrimary.some(row => row.ID === '4')).toBe(true);
      
      // Check unmatched comparison rows
      expect(result.unmatchedComparison.length).toBe(1);
      expect(result.unmatchedComparison[0].ID).toBe('5');
    });
    
    test('should handle empty data sets', () => {
      const emptyPrimary: ParsedFileData = {
        columns: ['ID', 'Name', 'Amount', 'Date'],
        rows: [],
        fileName: 'empty.csv',
        fileType: 'csv'
      };
      
      const emptyComparison: ParsedFileData = {
        columns: ['ID', 'FullName', 'Value', 'TransactionDate'],
        rows: [],
        fileName: 'empty.csv',
        fileType: 'csv'
      };
      
      const result = reconcileData(emptyPrimary, emptyComparison, config);
      
      expect(result.summary.totalPrimaryRows).toBe(0);
      expect(result.summary.totalComparisonRows).toBe(0);
      expect(result.summary.matchedRows).toBe(0);
      expect(result.summary.unmatchedPrimaryRows).toBe(0);
      expect(result.summary.unmatchedComparisonRows).toBe(0);
      // When there are 0 rows, the match percentage should be 0
      expect(result.summary.matchPercentage).toBe(0);
      
      expect(result.matches.length).toBe(0);
      expect(result.unmatchedPrimary.length).toBe(0);
      expect(result.unmatchedComparison.length).toBe(0);
    });
    
    test('should throw error when ID columns are not specified', () => {
      const invalidConfig: ReconciliationConfig = {
        primaryIdPair: {
          primaryColumn: null,
          comparisonColumn: 'ID'
        },
        comparisonPairs: []
      };
      
      expect(() => reconcileData(primaryData, comparisonData, invalidConfig)).toThrow('ID columns must be specified');
    });
    
    test('should handle case where no comparison columns are specified', () => {
      const configWithNoComparisonPairs: ReconciliationConfig = {
        primaryIdPair: {
          primaryColumn: 'ID',
          comparisonColumn: 'ID'
        },
        comparisonPairs: []
      };
      
      const result = reconcileData(primaryData, comparisonData, configWithNoComparisonPairs);
      
      // With no comparison columns, all matches should be 100% by ID only
      expect(result.matches.length).toBe(2);
      expect(result.matches.every(m => m.matchScore === 100)).toBe(true);
    });
  });
});