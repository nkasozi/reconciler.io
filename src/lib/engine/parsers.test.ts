import { describe, expect, it } from 'vitest';
import { parseAccountingAmount } from './amountParser';
import { detectDateOrderFromSamples, parseFlexibleDate, convertExcelSerialToDate } from './dateParser';
import { calculateTextSimilarityPercent, normalizeReferenceForMatching } from './textNormalization';

function amountOf(rawValue: string): number | null {
	const parsedAmount = parseAccountingAmount(rawValue);
	return parsedAmount.isValidAmount ? parsedAmount.amountValue : null;
}

function isoDateOf(rawValue: string, dateOrder: 'day_first' | 'month_first' = 'day_first'): string | null {
	const parsedDate = parseFlexibleDate(rawValue, dateOrder);
	return parsedDate.isValidDate ? parsedDate.isoDate : null;
}

describe('parseAccountingAmount', () => {
	it.each([
		['100', 100],
		['1,234.56', 1234.56],
		['$1,234.56', 1234.56],
		['UGX 1,500,000', 1500000],
		['(250.00)', -250],
		['-250.00', -250],
		['250.00-', -250],
		['250.00 CR', -250],
		['250.00 DR', 250],
		['1.234,56', 1234.56],
		['1 234 567,89', 1234567.89],
		["1'234.50", 1234.5],
		['€ -12,50', -12.5],
		['1.234.567', 1234567],
		['KSh 2,000', 2000],
		['R 150.00', 150],
		['USD 5', 5],
		['+45', 45],
		['0.5', 0.5],
		['.75', 0.75]
	])('parses %s as %d', (rawValue, expectedAmount) => {
		expect(amountOf(rawValue)).toBeCloseTo(expectedAmount, 6);
	});

	it.each(['', '-', 'abc', 'INV-001', '12/03/2024', '2024-01-01', 'N/A', 'r100', 'R100', 'SKU1'])('rejects %s', (rawValue) => {
		expect(amountOf(rawValue)).toBeNull();
	});
});

describe('parseFlexibleDate', () => {
	it.each([
		['2024-03-15', '2024-03-15'],
		['2024-03-15T10:22:00Z', '2024-03-15'],
		['2024/3/5', '2024-03-05'],
		['15/03/2024', '2024-03-15'],
		['15-03-24', '2024-03-15'],
		['15.03.2024', '2024-03-15'],
		['05/03/2024', '2024-03-05'],
		['15 Mar 2024', '2024-03-15'],
		['15-Mar-2024', '2024-03-15'],
		['March 15, 2024', '2024-03-15'],
		['Sept 1 2024', '2024-09-01'],
		['20240315', '2024-03-15'],
		['20240315120000[0:GMT]', '2024-03-15']
	])('parses %s day-first as %s', (rawValue, expectedIsoDate) => {
		expect(isoDateOf(rawValue)).toBe(expectedIsoDate);
	});

	it('respects month-first order for ambiguous dates', () => {
		expect(isoDateOf('05/03/2024', 'month_first')).toBe('2024-05-03');
		expect(isoDateOf('03/15/2024', 'day_first')).toBe('2024-03-15');
	});

	it('rejects impossible dates', () => {
		expect(isoDateOf('31/02/2024')).toBeNull();
		expect(isoDateOf('hello')).toBeNull();
	});

	it('converts excel serial numbers', () => {
		const parsedDate = convertExcelSerialToDate(45366);
		expect(parsedDate.isValidDate && parsedDate.isoDate).toBe('2024-03-15');
	});

	it('detects date order from sample values', () => {
		expect(detectDateOrderFromSamples(['01/02/2024', '25/02/2024'])).toBe('day_first');
		expect(detectDateOrderFromSamples(['01/02/2024', '02/25/2024'])).toBe('month_first');
		expect(detectDateOrderFromSamples(['01/02/2024'])).toBe('ambiguous');
	});
});

describe('text normalization', () => {
	it('normalizes references so formatting differences do not block a match', () => {
		expect(normalizeReferenceForMatching(' inv-00123 ')).toBe('INV00123');
		expect(normalizeReferenceForMatching('000123')).toBe('123');
		expect(normalizeReferenceForMatching('123.0')).toBe('123');
		expect(normalizeReferenceForMatching('INV 123')).toBe(normalizeReferenceForMatching('inv/123'));
	});

	it('scores similar descriptions highly', () => {
		expect(calculateTextSimilarityPercent('ACME Ltd', 'acme ltd')).toBe(100);
		expect(calculateTextSimilarityPercent('Payment to ACME Ltd', 'ACME Ltd payment')).toBeGreaterThanOrEqual(60);
		expect(calculateTextSimilarityPercent('Rent', 'Salaries')).toBeLessThan(40);
	});
});
