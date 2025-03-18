import { describe, test, expect, beforeEach } from 'vitest';
import { reconciliationStore } from './reconciliationStore';
import type { ParsedFileData } from '../utils/fileParser';
import type { ReconciliationConfig, ReconciliationResult } from '../utils/reconciliation';

describe('reconciliationStore', () => {
  let samplePrimaryData: ParsedFileData;
  let sampleComparisonData: ParsedFileData;
  let sampleConfig: ReconciliationConfig;
  let sampleResults: ReconciliationResult;
  
  beforeEach(() => {
    // Reset the store
    reconciliationStore.reset();
    
    // Create test data
    samplePrimaryData = {
      headers: ['ID', 'Name', 'Amount'],
      rows: [
        { ID: '1', Name: 'John', Amount: '100' },
        { ID: '2', Name: 'Jane', Amount: '200' }
      ]
    };
    
    sampleComparisonData = {
      headers: ['ID', 'FullName', 'Value'],
      rows: [
        { ID: '1', FullName: 'John', Value: '100' },
        { ID: '3', FullName: 'Bob', Value: '300' }
      ]
    };
    
    sampleConfig = {
      primaryIdPair: {
        primaryColumn: 'ID',
        comparisonColumn: 'ID'
      },
      comparisonPairs: [
        { primaryColumn: 'Name', comparisonColumn: 'FullName' },
        { primaryColumn: 'Amount', comparisonColumn: 'Value' }
      ]
    };
    
    sampleResults = {
      matches: [
        {
          primaryRow: { ID: '1', Name: 'John', Amount: '100' },
          comparisonRow: { ID: '1', FullName: 'John', Value: '100' },
          idValues: {
            primary: '1',
            comparison: '1'
          },
          comparisonResults: {
            'Name': {
              primaryValue: 'John',
              comparisonValue: 'John',
              match: true
            },
            'Amount': {
              primaryValue: '100',
              comparisonValue: '100',
              match: true
            }
          },
          matchScore: 100
        }
      ],
      unmatchedPrimary: [
        { ID: '2', Name: 'Jane', Amount: '200' }
      ],
      unmatchedComparison: [
        { ID: '3', FullName: 'Bob', Value: '300' }
      ],
      config: sampleConfig,
      summary: {
        totalPrimaryRows: 2,
        totalComparisonRows: 2,
        matchedRows: 1,
        unmatchedPrimaryRows: 1,
        unmatchedComparisonRows: 1,
        matchPercentage: 50
      }
    };
  });
  
  test('should have correct initial state', () => {
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.primaryFileData).toBeNull();
    expect(state.comparisonFileData).toBeNull();
    expect(state.reconciliationConfig).toBeNull();
    expect(state.reconciliationResult).toBeNull();
    expect(state.contactInfo).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();
    
    unsubscribe();
  });

  test('should set primary file data', () => {
    reconciliationStore.setPrimaryFileData(samplePrimaryData);
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.primaryFileData).toEqual(samplePrimaryData);
    unsubscribe();
  });
  
  test('should set comparison file data', () => {
    reconciliationStore.setComparisonFileData(sampleComparisonData);
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.comparisonFileData).toEqual(sampleComparisonData);
    unsubscribe();
  });
  
  test('should set reconciliation configuration', () => {
    reconciliationStore.setConfig(sampleConfig);
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.reconciliationConfig).toEqual(sampleConfig);
    unsubscribe();
  });
  
  test('should set reconciliation results', () => {
    reconciliationStore.setResults(sampleResults);
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.reconciliationResult).toEqual(sampleResults);
    unsubscribe();
  });
  
  test('should set processing state', () => {
    reconciliationStore.setProcessing(true);
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.isProcessing).toBe(true);
    expect(state.error).toBeNull(); // Error should be cleared when processing
    
    unsubscribe();
  });
  
  test('should set error state', () => {
    reconciliationStore.setError('Test error');
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.error).toBe('Test error');
    expect(state.isProcessing).toBe(false); // Processing should be false when error
    
    unsubscribe();
  });
  
  test('should reset store to initial state', () => {
    // First set some values
    reconciliationStore.setPrimaryFileData(samplePrimaryData);
    reconciliationStore.setComparisonFileData(sampleComparisonData);
    reconciliationStore.setConfig(sampleConfig);
    reconciliationStore.setResults(sampleResults);
    
    // Then reset
    reconciliationStore.reset();
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.primaryFileData).toBeNull();
    expect(state.comparisonFileData).toBeNull();
    expect(state.reconciliationConfig).toBeNull();
    expect(state.reconciliationResult).toBeNull();
    expect(state.isProcessing).toBe(false);
    expect(state.error).toBeNull();
    
    unsubscribe();
  });
  
  test('should reset just the results', () => {
    // First set some values
    reconciliationStore.setPrimaryFileData(samplePrimaryData);
    reconciliationStore.setComparisonFileData(sampleComparisonData);
    reconciliationStore.setConfig(sampleConfig);
    reconciliationStore.setResults(sampleResults);
    reconciliationStore.setError('Test error');
    
    // Then reset just the results
    reconciliationStore.resetResults();
    
    let state;
    const unsubscribe = reconciliationStore.subscribe(s => {
      state = s;
    });
    
    expect(state.primaryFileData).toEqual(samplePrimaryData); // Should remain
    expect(state.comparisonFileData).toEqual(sampleComparisonData); // Should remain
    expect(state.reconciliationConfig).toEqual(sampleConfig); // Should remain
    expect(state.reconciliationResult).toBeNull(); // Should be reset
    expect(state.error).toBeNull(); // Should be reset
    
    unsubscribe();
  });
});