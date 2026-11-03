import { formatAmountForDisplay, parseAccountingAmount, roundToCents } from './amountParser';
import { parseFlexibleDate, type DateOrder } from './dateParser';
import { calculateTextSimilarityPercent, normalizeReferenceForMatching, normalizeTextForMatching } from './textNormalization';
import type { AmountSignMode, ColumnSource, FieldRule, FileSide, RuleOutcome } from './types';

export type RowReadContext = { row: string[]; side: FileSide; dateOrder: DateOrder };

export function readRawSourceText(row: string[], source: ColumnSource): string {
	switch (source.sourceKind) {
		case 'column':
			return row[source.columnIndex] ?? '';
		case 'debit_minus_credit': {
			const netAmount = readSourceAmount(row, source);
			return netAmount === null ? '' : formatAmountForDisplay(netAmount);
		}
	}
}

export function readSourceAmount(row: string[], source: ColumnSource): number | null {
	switch (source.sourceKind) {
		case 'column': {
			const parsedAmount = parseAccountingAmount(row[source.columnIndex]);
			return parsedAmount.isValidAmount ? parsedAmount.amountValue : null;
		}
		case 'debit_minus_credit': {
			const parsedDebit = parseAccountingAmount(row[source.debitColumnIndex]);
			const parsedCredit = parseAccountingAmount(row[source.creditColumnIndex]);
			if (!parsedDebit.isValidAmount && !parsedCredit.isValidAmount) return null;
			const debitAmount = parsedDebit.isValidAmount ? Math.abs(parsedDebit.amountValue) : 0;
			const creditAmount = parsedCredit.isValidAmount ? Math.abs(parsedCredit.amountValue) : 0;
			return roundToCents(debitAmount - creditAmount);
		}
	}
}

export function applyAmountSignMode(amountValue: number, side: FileSide, amountSignMode: AmountSignMode): number {
	switch (amountSignMode) {
		case 'same_sign':
			return amountValue;
		case 'opposite_sign':
			return side === 'right' ? -amountValue : amountValue;
		case 'ignore_sign':
			return Math.abs(amountValue);
	}
}

export function readComparableAmount(context: RowReadContext, rule: FieldRule): number | null {
	const source = context.side === 'left' ? rule.leftSource : rule.rightSource;
	const rawAmount = readSourceAmount(context.row, source);
	return rawAmount === null ? null : applyAmountSignMode(rawAmount, context.side, rule.amountSignMode);
}

export function readComparableDayNumber(context: RowReadContext, rule: FieldRule): number | null {
	const source = context.side === 'left' ? rule.leftSource : rule.rightSource;
	const parsedDate = parseFlexibleDate(readRawSourceText(context.row, source), context.dateOrder);
	return parsedDate.isValidDate ? parsedDate.dayNumber : null;
}

export function buildNormalizedKeyPart(context: RowReadContext, rule: FieldRule): string {
	const source = context.side === 'left' ? rule.leftSource : rule.rightSource;
	switch (rule.fieldKind) {
		case 'reference':
			return normalizeReferenceForMatching(readRawSourceText(context.row, source));
		case 'text':
			return normalizeTextForMatching(readRawSourceText(context.row, source));
		case 'amount': {
			const comparableAmount = readComparableAmount(context, rule);
			return comparableAmount === null ? '' : String(Math.round(comparableAmount * 100));
		}
		case 'date': {
			const dayNumber = readComparableDayNumber(context, rule);
			return dayNumber === null ? '' : String(dayNumber);
		}
	}
}

export function evaluateRuleForPair(rule: FieldRule, leftContext: RowReadContext, rightContext: RowReadContext): RuleOutcome {
	const leftDisplayValue = buildFriendlyDisplayValue(leftContext, rule);
	const rightDisplayValue = buildFriendlyDisplayValue(rightContext, rule);
	const baseOutcome = { ruleId: rule.ruleId, leftDisplayValue, rightDisplayValue };

	switch (rule.fieldKind) {
		case 'amount':
			return { ...baseOutcome, ...compareAmounts(readComparableAmount(leftContext, rule), readComparableAmount(rightContext, rule), rule.amountTolerance) };
		case 'date':
			return { ...baseOutcome, ...compareDates(readComparableDayNumber(leftContext, rule), readComparableDayNumber(rightContext, rule), rule.dateToleranceDays) };
		case 'reference': {
			const isMatch = buildNormalizedKeyPart(leftContext, rule) === buildNormalizedKeyPart(rightContext, rule);
			return { ...baseOutcome, isMatch, differenceDescription: isMatch ? '' : 'Different reference' };
		}
		case 'text':
			return { ...baseOutcome, ...compareTexts(leftDisplayValue, rightDisplayValue, rule.textSimilarityPercent) };
	}
}

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildFriendlyDisplayValue(context: RowReadContext, rule: FieldRule): string {
	const source = context.side === 'left' ? rule.leftSource : rule.rightSource;
	const rawText = readRawSourceText(context.row, source);
	switch (rule.fieldKind) {
		case 'amount': {
			const comparableAmount = readComparableAmount(context, rule);
			return comparableAmount === null ? rawText : formatAmountForDisplay(comparableAmount);
		}
		case 'date': {
			const parsedDate = parseFlexibleDate(rawText, context.dateOrder);
			if (!parsedDate.isValidDate) return rawText;
			const [yearText, monthText, dayText] = parsedDate.isoDate.split('-');
			return `${Number(dayText)} ${MONTH_ABBREVIATIONS[Number(monthText) - 1]} ${yearText}`;
		}
		default:
			return rawText;
	}
}

function compareAmounts(leftAmount: number | null, rightAmount: number | null, amountTolerance: number): { isMatch: boolean; differenceDescription: string } {
	if (leftAmount === null && rightAmount === null) return { isMatch: true, differenceDescription: '' };
	if (leftAmount === null || rightAmount === null) {
		return { isMatch: false, differenceDescription: leftAmount === null ? 'Missing in first file' : 'Missing in second file' };
	}
	const absoluteDifference = roundToCents(Math.abs(leftAmount - rightAmount));
	const isMatch = absoluteDifference <= amountTolerance + 1e-9;
	return { isMatch, differenceDescription: isMatch ? '' : `Off by ${formatAmountForDisplay(roundToCents(leftAmount - rightAmount))}` };
}

function compareDates(leftDay: number | null, rightDay: number | null, dateToleranceDays: number): { isMatch: boolean; differenceDescription: string } {
	if (leftDay === null && rightDay === null) return { isMatch: true, differenceDescription: '' };
	if (leftDay === null || rightDay === null) {
		return { isMatch: false, differenceDescription: leftDay === null ? 'Missing in first file' : 'Missing in second file' };
	}
	const dayGap = Math.abs(leftDay - rightDay);
	const isMatch = dayGap <= dateToleranceDays;
	return { isMatch, differenceDescription: isMatch ? '' : `${dayGap} day${dayGap === 1 ? '' : 's'} apart` };
}

function compareTexts(leftText: string, rightText: string, requiredSimilarityPercent: number): { isMatch: boolean; differenceDescription: string } {
	const similarityPercent = calculateTextSimilarityPercent(leftText, rightText);
	const isMatch = similarityPercent >= requiredSimilarityPercent;
	return { isMatch, differenceDescription: isMatch ? '' : `${similarityPercent}% similar` };
}
