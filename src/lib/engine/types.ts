import type { DateOrder } from './dateParser';
import type { StageRowStatus } from './workflowTypes';

export type FileSide = 'left' | 'right';

export type DataTable = {
	fileName: string;
	sheetName: string | null;
	columnNames: string[];
	rows: string[][];
	skippedRowCount: number;
	detectedSystemName: string | null;
	dateOrder: DateOrder;
	rowStatuses?: StageRowStatus[];
};

export type FieldKind = 'reference' | 'amount' | 'date' | 'text';

export type ColumnSource =
	| { sourceKind: 'column'; columnIndex: number }
	| { sourceKind: 'debit_minus_credit'; debitColumnIndex: number; creditColumnIndex: number };

export type AmountSignMode = 'same_sign' | 'opposite_sign' | 'ignore_sign';

export type FieldRule = {
	ruleId: string;
	fieldKind: FieldKind;
	leftSource: ColumnSource;
	rightSource: ColumnSource;
	amountTolerance: number;
	dateToleranceDays: number;
	textSimilarityPercent: number;
	amountSignMode: AmountSignMode;
};

export type FallbackMatchingSettings = {
	isEnabled: boolean;
	amountRuleId: string | null;
	dateRuleId: string | null;
	dateWindowDays: number;
};

export type MatchPlan = {
	keyRules: FieldRule[];
	compareRules: FieldRule[];
	fallbackMatching: FallbackMatchingSettings;
};

export type RuleOutcome = {
	ruleId: string;
	isMatch: boolean;
	leftDisplayValue: string;
	rightDisplayValue: string;
	differenceDescription: string;
};

export type PairedRowStatus = 'matched' | 'matched_with_differences';
export type MatchMethod = 'exact_key' | 'amount_and_date';

export type PairedRow = {
	leftRowIndex: number;
	rightRowIndex: number;
	pairStatus: PairedRowStatus;
	matchMethod: MatchMethod;
	ruleOutcomes: RuleOutcome[];
	amountDifference: number;
};

export type UnpairedRow = {
	rowIndex: number;
	unpairedReason: 'key_not_found' | 'key_is_blank' | 'extra_duplicate';
};

export type SideTotals = {
	rowCount: number;
	amountTotal: number;
};

export type ReconciliationSummary = {
	leftTotals: SideTotals;
	rightTotals: SideTotals;
	matchedCount: number;
	matchedWithDifferencesCount: number;
	matchedByFallbackCount: number;
	onlyInLeftCount: number;
	onlyInRightCount: number;
	onlyInLeftAmountTotal: number;
	onlyInRightAmountTotal: number;
	pairedAmountDifferenceTotal: number;
	unexplainedDifference: number;
	duplicateKeyCountLeft: number;
	duplicateKeyCountRight: number;
	hasAmountRule: boolean;
	durationInMilliseconds: number;
};

export type ReconciliationOutcome = {
	pairedRows: PairedRow[];
	onlyInLeft: UnpairedRow[];
	onlyInRight: UnpairedRow[];
	summary: ReconciliationSummary;
};
