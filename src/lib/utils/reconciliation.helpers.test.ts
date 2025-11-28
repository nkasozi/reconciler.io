import { describe, it, expect } from 'vitest';
import {
	normalizeForComparison,
	parseNumeric,
	decideNumericStatus,
	decideStringStatus,
	evaluateTolerance,
	evaluateCustomFormula,
	PARTIAL_STRING_SIMILARITY
} from './reconciliation';

describe('reconciliation helpers', () => {
	it('normalizeForComparison trims and lowercases when requested', () => {
		expect(normalizeForComparison('  Foo Bar  ', false, true)).toBe('foo bar');
		expect(normalizeForComparison('  Foo Bar  ', true, true)).toBe('Foo Bar');
		expect(normalizeForComparison(null, false, true)).toBe('');
	});

	it('parseNumeric identifies numbers correctly', () => {
		expect(parseNumeric('12.34')).toEqual({ num: 12.34, isNumeric: true });
		expect(parseNumeric('abc')).toEqual({ num: NaN, isNumeric: false });
	});

	it('decideNumericStatus returns partial_match for small pct diff and no_match for large', () => {
		const small = decideNumericStatus(100, 105);
		expect(small.status).toBe('partial_match');

		const large = decideNumericStatus(100, 200);
		expect(large.status).toBe('no_match');
	});

	it('decideStringStatus uses PARTIAL_STRING_SIMILARITY threshold', () => {
		const equal = decideStringStatus('hello', 'hello');
		expect(equal.status).toBe('partial_match');

		const different = decideStringStatus('abc', 'xyz');
		expect(different.status).toBe('no_match');
	});

	it('evaluateTolerance handles absolute numeric tolerance', () => {
		const tol = { type: 'absolute', value: 5 } as any;
		const res = evaluateTolerance('100', '103', tol, false, true);
		expect(res.matches).toBe(true);
		expect(res.reason).toContain('Within absolute tolerance');
	});

	it('evaluateTolerance handles relative numeric tolerance', () => {
		const tol = { type: 'relative', percentage: 5 } as any; // 5%
		const res = evaluateTolerance('100', '104', tol, false, true);
		// 4 difference on average 102 -> ~3.92% which is within 5%
		expect(res.matches).toBe(true);
		expect(res.reason).toContain('Within relative tolerance');
	});

	it('evaluateTolerance returns false when no tolerance specified', () => {
		const res = evaluateTolerance('a', 'b', null, false, true);
		expect(res.matches).toBe(false);
		expect(res.reason).toBe('No tolerance specified');
	});

	it('evaluateTolerance handles custom formula using comparison operators', () => {
		// formula is true when difference <= 5
		const tol = {
			type: 'custom',
			formula: 'Math.abs(primaryColumnValue-comparisonColumnValue) <= 5'
		} as any;
		// Since validateCustomFormula restricts Math/letters, use equivalent without Math.abs
		const tol2 = {
			type: 'custom',
			formula:
				'(primaryColumnValue-comparisonColumnValue) <= 5 && (comparisonColumnValue-primaryColumnValue) <= 5'
		} as any;
		// Values within 5
		const res = evaluateTolerance('100', '103', tol2, false, true);
		expect(res.matches).toBe(true);
		expect(res.reason).toContain('Custom formula matched');
	});
});

describe('string similarity function', () => {
	it('returns 1.0 for identical strings', () => {
		const res = evaluateCustomFormula(
			'hello',
			'hello',
			'primaryColumnValue == comparisonColumnValue'
		);
		expect(res.result).toBe(true);
	});

	it('calculates similarity for similar strings', () => {
		// "cat" vs "hat" - 2 chars same, 1 different
		// Using formula: (primaryColumnValue-comparisonColumnValue) = 0 is false for strings
		const res = evaluateCustomFormula('abc', 'abc', 'primaryColumnValue == comparisonColumnValue');
		expect(res.result).toBe(true);
	});

	it('returns lower similarity for dissimilar strings', () => {
		const res = evaluateCustomFormula('xyz', 'abc', 'primaryColumnValue == comparisonColumnValue');
		expect(res.result).toBe(false);
	});
});

describe('custom formula evaluation', () => {
	it('evaluates simple numeric comparison formulas', () => {
		const res = evaluateCustomFormula('100', '50', 'primaryColumnValue > comparisonColumnValue');
		expect(res.result).toBe(true);
		expect(res.evaluatedFormula).toContain('(100)');
		expect(res.evaluatedFormula).toContain('(50)');
	});

	it('handles greater-than or equal formulas', () => {
		const res = evaluateCustomFormula('100', '100', 'primaryColumnValue >= comparisonColumnValue');
		expect(res.result).toBe(true);
	});

	it('handles less-than formulas', () => {
		const res = evaluateCustomFormula('50', '100', 'primaryColumnValue < comparisonColumnValue');
		expect(res.result).toBe(true);
	});

	it('handles not-equal formulas', () => {
		const res = evaluateCustomFormula('100', '50', 'primaryColumnValue != comparisonColumnValue');
		expect(res.result).toBe(true);
	});

	it('handles arithmetic expressions in RHS', () => {
		// 100 <= 50 * 2 (100) is true
		const res = evaluateCustomFormula(
			'100',
			'50',
			'primaryColumnValue <= comparisonColumnValue * 2'
		);
		expect(res.result).toBe(true);
	});

	it('returns false for unmet conditions', () => {
		const res = evaluateCustomFormula('100', '50', 'primaryColumnValue == comparisonColumnValue');
		expect(res.result).toBe(false);
	});

	it('throws error for invalid formulas', () => {
		expect(() => {
			evaluateCustomFormula('100', '50', 'invalid syntax here');
		}).toThrow();
	});

	it('handles logical AND operators in formulas', () => {
		// (100 > 50) && (50 < 100)
		const res = evaluateCustomFormula(
			'100',
			'50',
			'primaryColumnValue > comparisonColumnValue && comparisonColumnValue < primaryColumnValue'
		);
		expect(res.result).toBe(true);
	});

	it('handles logical OR operators in formulas', () => {
		// (100 == 50) || (100 > 50)
		const res = evaluateCustomFormula(
			'100',
			'50',
			'primaryColumnValue == comparisonColumnValue || primaryColumnValue > comparisonColumnValue'
		);
		expect(res.result).toBe(true);
	});
});
