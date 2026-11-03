import type { ColumnSource, MatchPlan } from './types';

export type TableId = string;

export type StageRowStatus = 'matched' | 'different' | 'paired_by_amount_and_date' | 'only_left' | 'only_right';

export type RowFilter = 'all_rows' | 'paired_rows' | 'matched_rows' | 'rows_needing_review' | 'only_left' | 'only_right' | 'all_unmatched';

export type SummarizeSpec = {
	groupByColumnIndexes: number[];
	sumColumnIndexes: number[];
};

export type StageInput = {
	tableId: TableId;
	rowFilter: RowFilter;
	summarize: SummarizeSpec | null;
	stackedTableIds?: TableId[];
};

export function listInputTableIds(stageInput: StageInput): TableId[] {
	return [stageInput.tableId, ...(stageInput.stackedTableIds ?? [])];
}

export type ResultField = 'status' | 'differences';

export type OutputColumn =
	| { outputName: string; sourceSide: 'left' | 'right'; columnSource: ColumnSource }
	| { outputName: string; sourceSide: 'result'; resultField: ResultField };

export type WorkflowStage = {
	stageId: string;
	stageNumber: number;
	leftInput: StageInput;
	rightInput: StageInput;
	plan: MatchPlan;
	outputColumns: OutputColumn[] | null;
};

export type TableLabels = { leftLabel: string; rightLabel: string };

export function buildStageOutputTableId(stageId: string): TableId {
	return `stage:${stageId}`;
}

export function isStageOutputTableId(tableId: TableId): boolean {
	return tableId.startsWith('stage:');
}

export const ROW_FILTER_LABELS: Record<RowFilter, string> = {
	all_rows: 'All rows',
	paired_rows: 'Rows found in both',
	matched_rows: 'Exact matches only',
	rows_needing_review: 'Rows that need a look',
	only_left: 'Only in the first input',
	only_right: 'Only in the second input',
	all_unmatched: 'All leftovers (unmatched)'
};

export const STAGE_ROW_STATUS_LABELS: Record<StageRowStatus, string> = {
	matched: 'Matched',
	different: 'Different',
	paired_by_amount_and_date: 'Paired by amount & date',
	only_left: 'Only in first',
	only_right: 'Only in second'
};
