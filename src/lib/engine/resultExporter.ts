import * as XLSX from 'xlsx';
import { describePlanInPlainEnglish, describeRuleLabel } from './planDescriber';
import { selectRowsForCategory, type ResultCategory, type ResultViewContext } from './resultViews';
import type { DataTable, PairedRow, UnpairedRow } from './types';

export type ExportLabels = { leftLabel: string; rightLabel: string };

export type StageExportInput = { context: ResultViewContext; labels: ExportLabels; outputTable: DataTable | null; stageNumber: number };

export function buildExcelReport(context: ResultViewContext, labels: ExportLabels): ArrayBuffer {
	return buildWorkflowExcelReport([{ context, labels, outputTable: null, stageNumber: 1 }]);
}

export function buildWorkflowExcelReport(stageExports: StageExportInput[]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	const isMultiStep = stageExports.length > 1;
	for (const stageExport of stageExports) {
		const sheetPrefix = isMultiStep ? `S${stageExport.stageNumber} ` : '';
		appendStageSheets(workbook, stageExport, sheetPrefix);
	}
	console.log(`[resultExporter] Excel report built with ${workbook.SheetNames.length} sheets`);
	return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

function appendStageSheets(workbook: XLSX.WorkBook, stageExport: StageExportInput, sheetPrefix: string): boolean {
	const { context, labels, outputTable } = stageExport;
	const appendSheet = (grid: (string | number)[][], sheetName: string, fallbackSheetName: string): boolean => {
		const candidateName = safeSheetName(`${sheetPrefix}${sheetName}`, `${sheetPrefix}${fallbackSheetName}`);
		const uniqueName = workbook.SheetNames.includes(candidateName) ? safeSheetName(`${sheetPrefix}${fallbackSheetName}`, fallbackSheetName) : candidateName;
		XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(grid), uniqueName);
		return true;
	};
	appendSheet(buildSummaryGrid(context, labels), 'Summary', 'Summary');
	appendSheet(buildPairedGrid(context, labels, 'needs_review'), 'Needs review', 'Needs review');
	appendSheet(buildUnpairedGrid(context, 'only_left'), `Only in ${labels.leftLabel}`, 'Only in file 1');
	appendSheet(buildUnpairedGrid(context, 'only_right'), `Only in ${labels.rightLabel}`, 'Only in file 2');
	appendSheet(buildPairedGrid(context, labels, 'matched'), 'Matched', 'Matched');
	if (outputTable) appendSheet([outputTable.columnNames, ...outputTable.rows], 'Result table', 'Result table');
	return true;
}

function safeSheetName(sheetName: string, fallbackSheetName: string): string {
	const cleanedName = sheetName.replace(/[\\/?*[\]:]/g, ' ').replace(/…$/, '').slice(0, 31).trim();
	return cleanedName.length > 0 ? cleanedName : fallbackSheetName;
}

function buildSummaryGrid(context: ResultViewContext, labels: ExportLabels): (string | number)[][] {
	const { summary } = context.outcome;
	const summaryGrid: (string | number)[][] = [
		['Reconciliation report', new Date().toLocaleString()],
		[],
		['', labels.leftLabel, labels.rightLabel],
		['File', context.leftTable.fileName, context.rightTable.fileName],
		['Rows', summary.leftTotals.rowCount, summary.rightTotals.rowCount]
	];
	if (summary.hasAmountRule) summaryGrid.push(['Total amount', summary.leftTotals.amountTotal, summary.rightTotals.amountTotal]);
	summaryGrid.push(
		[],
		['Matched exactly', selectRowsForCategory(context, 'matched').length],
		['Paired but need review', selectRowsForCategory(context, 'needs_review').length],
		[`Only in ${labels.leftLabel}`, summary.onlyInLeftCount, summary.hasAmountRule ? summary.onlyInLeftAmountTotal : ''],
		[`Only in ${labels.rightLabel}`, summary.onlyInRightCount, summary.hasAmountRule ? summary.onlyInRightAmountTotal : '']
	);
	if (summary.hasAmountRule) {
		summaryGrid.push(['Differences on paired rows', summary.pairedAmountDifferenceTotal], ['Difference between totals', summary.leftTotals.amountTotal - summary.rightTotals.amountTotal], ['Unexplained', summary.unexplainedDifference]);
	}
	summaryGrid.push([], ['How rows were matched'], ...describePlanInPlainEnglish(context.plan, context.leftTable, context.rightTable).map((sentence) => [sentence]));
	return summaryGrid;
}

function buildPairedGrid(context: ResultViewContext, labels: ExportLabels, category: ResultCategory): string[][] {
	const pairedRows = selectRowsForCategory(context, category) as PairedRow[];
	const ruleLabels = new Map([...context.plan.keyRules, ...context.plan.compareRules].map((rule) => [rule.ruleId, describeRuleLabel(rule, context.leftTable, context.rightTable)]));
	const headerRow = ['Status', 'What is different', ...context.leftTable.columnNames.map((columnName) => `${labels.leftLabel}: ${columnName}`), ...context.rightTable.columnNames.map((columnName) => `${labels.rightLabel}: ${columnName}`)];
	const dataRows = pairedRows.map((pairedRow) => {
		const differenceText = pairedRow.ruleOutcomes.filter((ruleOutcome) => !ruleOutcome.isMatch).map((ruleOutcome) => `${ruleLabels.get(ruleOutcome.ruleId)}: ${ruleOutcome.differenceDescription}`).join('; ');
		const statusText = pairedRow.matchMethod === 'amount_and_date' ? 'Paired by amount & date' : pairedRow.pairStatus === 'matched' ? 'Matched' : 'Different';
		return [statusText, differenceText, ...context.leftTable.rows[pairedRow.leftRowIndex], ...context.rightTable.rows[pairedRow.rightRowIndex]];
	});
	return [headerRow, ...dataRows];
}

function buildUnpairedGrid(context: ResultViewContext, category: 'only_left' | 'only_right'): string[][] {
	const table = category === 'only_left' ? context.leftTable : context.rightTable;
	const unpairedRows = selectRowsForCategory(context, category) as UnpairedRow[];
	const reasonLabels: Record<UnpairedRow['unpairedReason'], string> = { key_not_found: 'Not found in the other file', key_is_blank: 'Matching value is blank', extra_duplicate: 'Extra duplicate' };
	return [['Reason', 'Row number', ...table.columnNames], ...unpairedRows.map((unpairedRow) => [reasonLabels[unpairedRow.unpairedReason], String(unpairedRow.rowIndex + 1), ...table.rows[unpairedRow.rowIndex]])];
}
