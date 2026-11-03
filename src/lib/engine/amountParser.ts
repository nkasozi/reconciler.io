export type ParsedAmount = { isValidAmount: true; amountValue: number } | { isValidAmount: false };

const CURRENCY_SYMBOLS_AND_CODES_PATTERN =
	/[$€£¥₹₦₵₱₩₪₫฿₴₸₺₼₽]|\b(?:USD|EUR|GBP|UGX|KES|TZS|RWF|NGN|GHS|ZAR|INR|JPY|CNY|CAD|AUD|NZD|CHF|AED|SAR|ZMW|MWK|ETB|XOF|XAF)\b|\b(?:Ksh|KSh|KES|USh|Ush|Shs?)(?=[\s\d.])|\bR(?=\s)/g;
const CREDIT_SUFFIX_PATTERN = /\s*(?:CR|Cr|cr)\.?$/;
const DEBIT_SUFFIX_PATTERN = /\s*(?:DR|Dr|dr)\.?$/;
const DIGITS_SEPARATORS_AND_SIGN_PATTERN = /^[+-]?[\d.,'\s]*\d[\d.,'\s]*$/;

export function parseAccountingAmount(rawValue: unknown): ParsedAmount {
	if (typeof rawValue === 'number') {
		return Number.isFinite(rawValue)
			? { isValidAmount: true, amountValue: rawValue }
			: { isValidAmount: false };
	}
	const textValue = rawValue == null ? '' : String(rawValue).trim();
	if (textValue === '' || textValue === '-' || textValue === '—') return { isValidAmount: false };

	const signAndBody = extractSignAndNumericBody(textValue);
	if (!DIGITS_SEPARATORS_AND_SIGN_PATTERN.test(signAndBody.numericBody)) {
		return { isValidAmount: false };
	}
	const unsignedAmount = convertNumericBodyToNumber(signAndBody.numericBody);
	if (unsignedAmount === null) return { isValidAmount: false };

	return { isValidAmount: true, amountValue: signAndBody.isNegative ? -unsignedAmount : unsignedAmount };
}

export function isAccountingAmount(rawValue: unknown): boolean {
	return parseAccountingAmount(rawValue).isValidAmount;
}

function extractSignAndNumericBody(textValue: string): { isNegative: boolean; numericBody: string } {
	let workingText = textValue.replace(CURRENCY_SYMBOLS_AND_CODES_PATTERN, '').trim();
	let negativeMarkerCount = 0;

	const isWrappedInParentheses = /^\(.*\)$/.test(workingText);
	if (isWrappedInParentheses) {
		negativeMarkerCount++;
		workingText = workingText.slice(1, -1).trim();
	}
	if (CREDIT_SUFFIX_PATTERN.test(workingText)) {
		negativeMarkerCount++;
		workingText = workingText.replace(CREDIT_SUFFIX_PATTERN, '');
	}
	workingText = workingText.replace(DEBIT_SUFFIX_PATTERN, '').trim();
	if (workingText.endsWith('-')) {
		negativeMarkerCount++;
		workingText = workingText.slice(0, -1).trim();
	}
	if (workingText.startsWith('-')) {
		negativeMarkerCount++;
		workingText = workingText.slice(1).trim();
	}
	if (workingText.startsWith('+')) workingText = workingText.slice(1).trim();
	workingText = workingText.replace(CURRENCY_SYMBOLS_AND_CODES_PATTERN, '').trim();

	return { isNegative: negativeMarkerCount % 2 === 1, numericBody: workingText };
}

function convertNumericBodyToNumber(numericBody: string): number | null {
	const compactBody = numericBody.replace(/[\s']/g, '');
	const decimalSeparator = detectDecimalSeparator(compactBody);
	const normalizedBody = removeGroupingSeparators(compactBody, decimalSeparator);
	if (!/^\d*\.?\d+$|^\d+\.$/.test(normalizedBody)) return null;
	const parsedNumber = Number(normalizedBody);
	return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

function removeGroupingSeparators(
	compactBody: string,
	decimalSeparator: '.' | ',' | 'none'
): string {
	switch (decimalSeparator) {
		case ',':
			return compactBody.replace(/\./g, '').replace(',', '.');
		case '.':
			return compactBody.replace(/,/g, '');
		case 'none':
			return compactBody.replace(/[.,]/g, '');
	}
}

function detectDecimalSeparator(compactBody: string): '.' | ',' | 'none' {
	const lastDotIndex = compactBody.lastIndexOf('.');
	const lastCommaIndex = compactBody.lastIndexOf(',');
	const hasDot = lastDotIndex !== -1;
	const hasComma = lastCommaIndex !== -1;

	switch (true) {
		case hasDot && hasComma:
			return lastCommaIndex > lastDotIndex ? ',' : '.';
		case hasComma: {
			const commaCount = compactBody.split(',').length - 1;
			const digitsAfterLastComma = compactBody.length - lastCommaIndex - 1;
			return commaCount === 1 && digitsAfterLastComma !== 3 ? ',' : 'none';
		}
		case hasDot: {
			const dotCount = compactBody.split('.').length - 1;
			return dotCount === 1 ? '.' : 'none';
		}
		default:
			return 'none';
	}
}

export function roundToCents(amountValue: number): number {
	return Math.round((amountValue + Number.EPSILON) * 100) / 100;
}

export function formatAmountForDisplay(amountValue: number): string {
	return amountValue.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
