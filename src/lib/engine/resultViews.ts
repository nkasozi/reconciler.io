import { profileColumns } from './columnRoles';
import { describeRuleLabel } from './planDescriber';
import type { DataTable, MatchPlan, PairedRow, ReconciliationOutcome, UnpairedRow } from './types';

export type ResultCategory = 'needs_review' | 'only_left' | 'only_right' | 'matched';

export type ResultFieldLine = {
	fieldLabel: string;
	leftValue: string;
	rightValue: string | null;
	isMatch: boolean;
	differenceText: string;
};

export type ResultItem = {
	itemTitle: string;
	badgeText: string;
	leftRowNumber: number | null;
	rightRowNumber: number | null;
	fieldLines: ResultFieldLine[];
};

export type ResultPage = { category: ResultCategory; totalItemCount: number; pageNumber: number; items: ResultItem[] };

export type ResultViewContext = { leftTable: DataTable; rightTable: DataTable; plan: MatchPlan; outcome: ReconciliationOutcome };

const UNPAIRED_REASON_LABELS: Record<UnpairedRow['unpairedReason'], string> = {
	key_not_found: 'Not found in the other file',
	key_is_blank: 'Matching value is blank',
	extra_duplicate: 'Extra duplicate'
};

export function selectRowsForCategory(context: ResultViewContext, category: ResultCategory): (PairedRow | UnpairedRow)[] {
	switch (category) {
		case 'needs_review':
			return context.outcome.pairedRows.filter((pairedRow) => pairedRow.pairStatus === 'matched_with_differences' || pairedRow.matchMethod === 'amount_and_date');
		case 'matched':
			return context.outcome.pairedRows.filter((pairedRow) => pairedRow.pairStatus === 'matched' && pairedRow.matchMethod === 'exact_key');
		case 'only_left':
			return context.outcome.onlyInLeft;
		case 'only_right':
			return context.outcome.onlyInRight;
	}
}

export function buildResultPage(context: ResultViewContext, category: ResultCategory, pageNumber: number, pageSize: number, searchText: string): ResultPage {
	const categoryRows = selectRowsForCategory(context, category);
	const loweredSearchText = searchText.trim().toLowerCase();
	const filteredRows = loweredSearchText === '' ? categoryRows : categoryRows.filter((resultRow) => rowContainsText(context, resultRow, loweredSearchText, category));
	const pageRows = filteredRows.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
	const items = pageRows.map((resultRow) => ('leftRowIndex' in resultRow ? buildPairedItem(context, resultRow) : buildUnpairedItem(context, resultRow, category === 'only_left' ? 'left' : 'right')));
	return { category, totalItemCount: filteredRows.length, pageNumber, items };
}

function rowContainsText(context: ResultViewContext, resultRow: PairedRow | UnpairedRow, loweredSearchText: string, category: ResultCategory): boolean {
	const rowsToSearch = 'leftRowIndex' in resultRow
		? [context.leftTable.rows[resultRow.leftRowIndex], context.rightTable.rows[resultRow.rightRowIndex]]
		: [(category === 'only_left' ? context.leftTable : context.rightTable).rows[resultRow.rowIndex]];
	return rowsToSearch.some((row) => row.some((cell) => cell.toLowerCase().includes(loweredSearchText)));
}

function buildPairedItem(context: ResultViewContext, pairedRow: PairedRow): ResultItem {
	const allRules = [...context.plan.keyRules, ...context.plan.compareRules];
	const fieldLines = pairedRow.ruleOutcomes.map((ruleOutcome) => {
		const matchingRule = allRules.find((rule) => rule.ruleId === ruleOutcome.ruleId);
		return {
			fieldLabel: matchingRule ? describeRuleLabel(matchingRule, context.leftTable, context.rightTable) : ruleOutcome.ruleId,
			leftValue: ruleOutcome.leftDisplayValue,
			rightValue: ruleOutcome.rightDisplayValue,
			isMatch: ruleOutcome.isMatch,
			differenceText: ruleOutcome.differenceDescription
		};
	});
	const keyRule = context.plan.keyRules[0];
	const leftKeyText = keyRule && keyRule.leftSource.sourceKind === 'column' ? context.leftTable.rows[pairedRow.leftRowIndex][keyRule.leftSource.columnIndex] : '';
	const badgeText = pairedRow.matchMethod === 'amount_and_date'
		? 'Paired by amount & date — please check'
		: pairedRow.pairStatus === 'matched' ? 'Matched' : `Different: ${fieldLines.filter((fieldLine) => !fieldLine.isMatch).map((fieldLine) => fieldLine.fieldLabel).join(', ')}`;
	return { itemTitle: leftKeyText || `Row ${pairedRow.leftRowIndex + 1}`, badgeText, leftRowNumber: pairedRow.leftRowIndex + 1, rightRowNumber: pairedRow.rightRowIndex + 1, fieldLines };
}

function buildUnpairedItem(context: ResultViewContext, unpairedRow: UnpairedRow, side: 'left' | 'right'): ResultItem {
	const table = side === 'left' ? context.leftTable : context.rightTable;
	const row = table.rows[unpairedRow.rowIndex];
	const importantColumnIndexes = pickImportantColumnIndexes(table);
	const fieldLines = importantColumnIndexes.map((columnIndex) => ({ fieldLabel: table.columnNames[columnIndex], leftValue: row[columnIndex] ?? '', rightValue: null, isMatch: true, differenceText: '' }));
	const titleText = fieldLines.find((fieldLine) => fieldLine.leftValue !== '')?.leftValue ?? `Row ${unpairedRow.rowIndex + 1}`;
	return {
		itemTitle: titleText,
		badgeText: UNPAIRED_REASON_LABELS[unpairedRow.unpairedReason],
		leftRowNumber: side === 'left' ? unpairedRow.rowIndex + 1 : null,
		rightRowNumber: side === 'right' ? unpairedRow.rowIndex + 1 : null,
		fieldLines
	};
}

const importantColumnCache = new WeakMap<DataTable, number[]>();

function pickImportantColumnIndexes(table: DataTable): number[] {
	const cachedIndexes = importantColumnCache.get(table);
	if (cachedIndexes) return cachedIndexes;
	const rolePriority = ['reference', 'date', 'description', 'party', 'amount', 'debit', 'credit', 'quantity', 'account'];
	const columnProfiles = profileColumns(table.columnNames, table.rows, 300).filter((profile) => profile.filledRatio > 0);
	const prioritizedIndexes = rolePriority.flatMap((columnRole) => columnProfiles.filter((profile) => profile.effectiveRole === columnRole).map((profile) => profile.columnIndex));
	const remainingIndexes = columnProfiles.map((profile) => profile.columnIndex).filter((columnIndex) => !prioritizedIndexes.includes(columnIndex));
	const chosenIndexes = [...new Set([...prioritizedIndexes, ...remainingIndexes])].slice(0, 6);
	importantColumnCache.set(table, chosenIndexes);
	return chosenIndexes;
}
