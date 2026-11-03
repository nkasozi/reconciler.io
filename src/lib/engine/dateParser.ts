export type DateOrder = 'day_first' | 'month_first';

export type ParsedDate = { isValidDate: true; isoDate: string; dayNumber: number } | { isValidDate: false };

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
	jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
	jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
};
const MILLISECONDS_PER_DAY = 86_400_000;
const EXCEL_EPOCH_OFFSET_IN_DAYS = 25569;

const YEAR_FIRST_PATTERN = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/;
const NUMERIC_DAY_MONTH_YEAR_PATTERN = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/;
const COMPACT_YYYYMMDD_PATTERN = /^(\d{4})(\d{2})(\d{2})(?:\d{0,6})(?:\.\d+)?(?:\[.*\])?$/;
const DAY_MONTHNAME_YEAR_PATTERN = /^(\d{1,2})(?:st|nd|rd|th)?[\s\-/.]+([a-z]{3,9})[\s\-/.,]+(\d{4}|\d{2})(?!\d)/i;
const MONTHNAME_DAY_YEAR_PATTERN = /^([a-z]{3,9})[\s\-/.]+(\d{1,2})(?:st|nd|rd|th)?[\s,\-/.]+(\d{4}|\d{2})(?!\d)/i;

export function parseFlexibleDate(rawValue: unknown, dateOrder: DateOrder = 'day_first'): ParsedDate {
	if (rawValue instanceof Date) return buildParsedDateFromDateObject(rawValue);
	const textValue = rawValue == null ? '' : String(rawValue).trim();
	if (textValue === '') return { isValidDate: false };

	const yearFirstMatch = textValue.match(YEAR_FIRST_PATTERN);
	if (yearFirstMatch) return buildParsedDate(+yearFirstMatch[1], +yearFirstMatch[2], +yearFirstMatch[3]);

	const numericMatch = textValue.match(NUMERIC_DAY_MONTH_YEAR_PATTERN);
	if (numericMatch) return parseNumericDayMonthYear(numericMatch, dateOrder);

	const compactMatch = textValue.match(COMPACT_YYYYMMDD_PATTERN);
	if (compactMatch) return buildParsedDate(+compactMatch[1], +compactMatch[2], +compactMatch[3]);

	const dayMonthNameMatch = textValue.match(DAY_MONTHNAME_YEAR_PATTERN);
	if (dayMonthNameMatch) {
		return buildParsedDateFromMonthName(dayMonthNameMatch[2], +dayMonthNameMatch[1], dayMonthNameMatch[3]);
	}

	const monthNameDayMatch = textValue.match(MONTHNAME_DAY_YEAR_PATTERN);
	if (monthNameDayMatch) {
		return buildParsedDateFromMonthName(monthNameDayMatch[1], +monthNameDayMatch[2], monthNameDayMatch[3]);
	}

	return { isValidDate: false };
}

export function convertExcelSerialToDate(excelSerialNumber: number): ParsedDate {
	const isPlausibleSerial = excelSerialNumber > 20000 && excelSerialNumber < 80000;
	if (!isPlausibleSerial) return { isValidDate: false };
	const millisecondsSinceEpoch = (Math.floor(excelSerialNumber) - EXCEL_EPOCH_OFFSET_IN_DAYS) * MILLISECONDS_PER_DAY;
	return buildParsedDateFromDateObject(new Date(millisecondsSinceEpoch));
}

export function detectDateOrderFromSamples(sampleValues: string[]): DateOrder | 'ambiguous' {
	let dayFirstEvidenceCount = 0;
	let monthFirstEvidenceCount = 0;
	for (const sampleValue of sampleValues) {
		const numericMatch = String(sampleValue ?? '').trim().match(NUMERIC_DAY_MONTH_YEAR_PATTERN);
		if (!numericMatch) continue;
		const firstNumber = +numericMatch[1];
		const secondNumber = +numericMatch[2];
		if (firstNumber > 12 && secondNumber <= 12) dayFirstEvidenceCount++;
		if (secondNumber > 12 && firstNumber <= 12) monthFirstEvidenceCount++;
	}
	switch (true) {
		case dayFirstEvidenceCount > monthFirstEvidenceCount:
			return 'day_first';
		case monthFirstEvidenceCount > dayFirstEvidenceCount:
			return 'month_first';
		default:
			return 'ambiguous';
	}
}

function parseNumericDayMonthYear(numericMatch: RegExpMatchArray, dateOrder: DateOrder): ParsedDate {
	const firstNumber = +numericMatch[1];
	const secondNumber = +numericMatch[2];
	const fullYear = expandTwoDigitYear(numericMatch[3]);
	const mustBeDayFirst = firstNumber > 12;
	const mustBeMonthFirst = secondNumber > 12;
	const useDayFirst = mustBeDayFirst || (!mustBeMonthFirst && dateOrder === 'day_first');
	return useDayFirst
		? buildParsedDate(fullYear, secondNumber, firstNumber)
		: buildParsedDate(fullYear, firstNumber, secondNumber);
}

function buildParsedDateFromMonthName(monthNameText: string, dayOfMonth: number, yearText: string): ParsedDate {
	const monthNumber = MONTH_NAME_TO_NUMBER[monthNameText.slice(0, 4).toLowerCase()] ??
		MONTH_NAME_TO_NUMBER[monthNameText.slice(0, 3).toLowerCase()];
	if (!monthNumber) return { isValidDate: false };
	return buildParsedDate(expandTwoDigitYear(yearText), monthNumber, dayOfMonth);
}

function expandTwoDigitYear(yearText: string): number {
	const yearNumber = +yearText;
	if (yearText.length === 4) return yearNumber;
	return yearNumber >= 70 ? 1900 + yearNumber : 2000 + yearNumber;
}

function buildParsedDateFromDateObject(dateObject: Date): ParsedDate {
	if (Number.isNaN(dateObject.getTime())) return { isValidDate: false };
	return buildParsedDate(dateObject.getUTCFullYear(), dateObject.getUTCMonth() + 1, dateObject.getUTCDate());
}

function buildParsedDate(fullYear: number, monthNumber: number, dayOfMonth: number): ParsedDate {
	const isInRange = monthNumber >= 1 && monthNumber <= 12 && dayOfMonth >= 1 && dayOfMonth <= 31;
	if (!isInRange || fullYear < 1900 || fullYear > 2200) return { isValidDate: false };
	const utcMilliseconds = Date.UTC(fullYear, monthNumber - 1, dayOfMonth);
	const roundTripDate = new Date(utcMilliseconds);
	if (roundTripDate.getUTCDate() !== dayOfMonth) return { isValidDate: false };
	const isoDate = `${fullYear}-${String(monthNumber).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
	return { isValidDate: true, isoDate, dayNumber: Math.round(utcMilliseconds / MILLISECONDS_PER_DAY) };
}
