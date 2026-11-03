import { describe, expect, it } from 'vitest';
import { readAnyFile } from '$lib/adapters/fileReaders/readAnyFile';
import { countRowsMatchedInEveryStep } from './stageTables';
import type { DataTable } from './types';
import { buildChainStageInputs, runWorkflowStage, suggestPlanForStageInputs } from './workflowRunner';
import type { TableId, WorkflowStage } from './workflowTypes';

function tableFromCsv(fileName: string, csvText: string): DataTable {
	return readAnyFile({ fileName, fileBytes: new TextEncoder().encode(csvText).buffer as ArrayBuffer }, 'day_first');
}

function runChain(tablesById: Map<TableId, DataTable>, fileTableIds: TableId[], fileLetters: string[]): WorkflowStage[] {
	const stages: WorkflowStage[] = [];
	for (const chainedStage of buildChainStageInputs(fileTableIds, 1)) {
		const { suggestedPlan } = suggestPlanForStageInputs(tablesById, chainedStage.leftInput, chainedStage.rightInput);
		const stage: WorkflowStage = { ...chainedStage, plan: suggestedPlan.plan, outputColumns: null };
		const leftLabel = chainedStage.stageNumber === 1 ? fileLetters[0] : `Step ${chainedStage.stageNumber - 1}`;
		runWorkflowStage(tablesById, stage, { leftLabel, rightLabel: fileLetters[chainedStage.stageNumber] });
		stages.push(stage);
	}
	return stages;
}

describe('multi-step workflows', () => {
	it('chains an N-way match across four files and counts rows matched everywhere', () => {
		const tablesById = new Map<TableId, DataTable>([
			['A', tableFromCsv('po.csv', 'PO Number,Supplier,Amount\nPO-1,Bidco,100\nPO-2,Mukwano,200\nPO-3,Kakira,300\nPO-4,Roofings,400')],
			['B', tableFromCsv('invoice.csv', 'Invoice,PO Ref,Invoice Amount\nINV-9,PO-1,100\nINV-8,PO-2,250\nINV-7,PO-3,300')],
			['C', tableFromCsv('grn.csv', 'GRN,PO,Value\nG-1,PO-1,100\nG-2,PO-2,200\nG-3,PO-3,300')],
			['D', tableFromCsv('payments.csv', 'Payment Ref,Purchase Order,Paid\nP-1,PO-1,100\nP-3,PO-3,300')]
		]);
		const stages = runChain(tablesById, ['A', 'B', 'C', 'D'], ['PO', 'Invoice', 'GRN', 'Payment']);
		const finalTable = tablesById.get(`stage:${stages[2].stageId}`)!;

		expect(stages).toHaveLength(3);
		expect(finalTable.columnNames.filter((columnName) => /^Step \d+ status$/.test(columnName)).sort()).toEqual(['Step 1 status', 'Step 2 status', 'Step 3 status']);
		expect(countRowsMatchedInEveryStep(finalTable)).toEqual({ stepCount: 3, matchedEverywhereCount: 2 });
		expect(finalTable.columnNames).toContain('PO: Supplier');
		expect(finalTable.columnNames).toContain('Payment: Paid');
	});

	it('checks leftovers from one step against another file', () => {
		const tablesById = new Map<TableId, DataTable>([
			['bank', tableFromCsv('bank.csv', 'Reference,Amount\nR1,50\nR2,70\nMM-77,15')],
			['ledger', tableFromCsv('ledger.csv', 'Reference,Amount\nR1,50\nR2,70')],
			['mobile', tableFromCsv('mobile.csv', 'TxnId,Value\nMM-77,15')]
		]);
		const firstStage: WorkflowStage = { stageId: 's1', stageNumber: 1, leftInput: { tableId: 'bank', rowFilter: 'all_rows', summarize: null }, rightInput: { tableId: 'ledger', rowFilter: 'all_rows', summarize: null }, plan: suggestPlanForStageInputs(tablesById, { tableId: 'bank', rowFilter: 'all_rows', summarize: null }, { tableId: 'ledger', rowFilter: 'all_rows', summarize: null }).suggestedPlan.plan, outputColumns: null };
		runWorkflowStage(tablesById, firstStage, { leftLabel: 'Bank', rightLabel: 'Ledger' });

		const leftoversInput = { tableId: 'stage:s1', rowFilter: 'only_left' as const, summarize: null };
		const mobileInput = { tableId: 'mobile', rowFilter: 'all_rows' as const, summarize: null };
		const { suggestedPlan, effectiveLeftTable } = suggestPlanForStageInputs(tablesById, leftoversInput, mobileInput);
		expect(effectiveLeftTable.rows).toHaveLength(1);
		const secondRun = runWorkflowStage(tablesById, { stageId: 's2', stageNumber: 2, leftInput: leftoversInput, rightInput: mobileInput, plan: suggestedPlan.plan, outputColumns: null }, { leftLabel: 'Step 1', rightLabel: 'Mobile money' });
		expect(secondRun.outcome.summary.matchedCount).toBe(1);
	});

	it('adds up many rows per group before matching (many-to-one)', () => {
		const tablesById = new Map<TableId, DataTable>([
			['sales', tableFromCsv('sales.csv', 'Day,Till,Sale\n2024-03-01,T1,100\n2024-03-01,T2,50\n2024-03-02,T1,80')],
			['bank', tableFromCsv('bank.csv', 'Value Date,Deposit\n2024-03-01,150\n2024-03-02,75')]
		]);
		const salesInput = { tableId: 'sales', rowFilter: 'all_rows' as const, summarize: { groupByColumnIndexes: [0], sumColumnIndexes: [2] } };
		const bankInput = { tableId: 'bank', rowFilter: 'all_rows' as const, summarize: null };
		const { suggestedPlan, effectiveLeftTable } = suggestPlanForStageInputs(tablesById, salesInput, bankInput);
		expect(effectiveLeftTable.columnNames).toEqual(['Day', 'Total Sale', 'Number of rows']);
		expect(effectiveLeftTable.rows).toEqual([['2024-03-01', '150.00', '2'], ['2024-03-02', '80.00', '1']]);
		const allRuleIds = [...suggestedPlan.plan.keyRules, ...suggestedPlan.plan.compareRules].map((rule) => rule.ruleId);
		expect(new Set(allRuleIds).size).toBe(allRuleIds.length);
		const stageRun = runWorkflowStage(tablesById, { stageId: 's1', stageNumber: 1, leftInput: salesInput, rightInput: bankInput, plan: suggestedPlan.plan, outputColumns: null }, { leftLabel: 'Sales', rightLabel: 'Bank' });
		expect(stageRun.outcome.summary.matchedCount + stageRun.outcome.summary.matchedWithDifferencesCount).toBe(2);
		expect(stageRun.outcome.summary.matchedWithDifferencesCount).toBe(1);
	});
});

describe('three-way purchase order match with the sample files', () => {
	it('matches only the purchase order that agrees everywhere', async () => {
		const { buildThreeWaySampleFiles } = await import('./sampleFiles');
		const sampleFiles = buildThreeWaySampleFiles();
		const tablesById = new Map<TableId, DataTable>();
		for (const [filePosition, sampleFile] of sampleFiles.entries()) {
			tablesById.set(`file-${filePosition}`, readAnyFile({ fileName: sampleFile.name, fileBytes: await sampleFile.arrayBuffer() }, 'day_first'));
		}
		const stages = runChain(tablesById, ['file-0', 'file-1', 'file-2'], ['PO', 'Invoice', 'GRN']);
		const firstStageOutput = tablesById.get(`stage:${stages[0].stageId}`)!;
		const finalTable = tablesById.get(`stage:${stages[1].stageId}`)!;
		expect(firstStageOutput.rowStatuses?.filter((rowStatus) => rowStatus === 'matched')).toHaveLength(3);
		expect(countRowsMatchedInEveryStep(finalTable)).toEqual({ stepCount: 2, matchedEverywhereCount: 1 });
	});
});

describe('stacking several sources into one input', () => {
	it('combines three mobile money statements and matches them against one ledger', () => {
		const tablesById = new Map<TableId, DataTable>([
			['ledger', tableFromCsv('ledger.csv', 'Reference,Amount\nMTN-1,50\nAIR-7,20\nMTN-2,30\nMP-9,15')],
			['mtn', tableFromCsv('mtn.csv', 'Reference,Amount\nMTN-1,50\nMTN-2,30')],
			['airtel', tableFromCsv('airtel.csv', 'reference,AMOUNT,Fee\nAIR-7,20,1')],
			['mpesa', tableFromCsv('mpesa.csv', 'Reference,Amount\nMP-9,16')]
		]);
		const ledgerInput = { tableId: 'ledger', rowFilter: 'all_rows' as const, summarize: null };
		const walletsInput = { tableId: 'mtn', stackedTableIds: ['airtel', 'mpesa'], rowFilter: 'all_rows' as const, summarize: null };
		const { suggestedPlan, effectiveRightTable } = suggestPlanForStageInputs(tablesById, ledgerInput, walletsInput);
		expect(effectiveRightTable.columnNames).toEqual(['Reference', 'Amount', 'Fee', 'Source']);
		expect(effectiveRightTable.rows.map((row) => row[3])).toEqual(['mtn', 'mtn', 'airtel', 'mpesa']);
		const stageRun = runWorkflowStage(tablesById, { stageId: 's1', stageNumber: 1, leftInput: ledgerInput, rightInput: walletsInput, plan: suggestedPlan.plan, outputColumns: null }, { leftLabel: 'Ledger', rightLabel: 'Wallets' });
		expect(stageRun.outcome.summary.matchedCount).toBe(3);
		expect(stageRun.outcome.summary.matchedWithDifferencesCount).toBe(1);
	});
});

describe('leftovers from a step matched against stacked sources', () => {
	it('finds the purchase order missing an invoice in the combined delivery notes and invoices', async () => {
		const { buildThreeWaySampleFiles } = await import('./sampleFiles');
		const tablesById = new Map<TableId, DataTable>();
		for (const [filePosition, sampleFile] of buildThreeWaySampleFiles().entries()) {
			tablesById.set(['po', 'invoice', 'grn'][filePosition], readAnyFile({ fileName: sampleFile.name, fileBytes: await sampleFile.arrayBuffer() }, 'day_first'));
		}
		const firstInputs = { leftInput: { tableId: 'po', rowFilter: 'all_rows' as const, summarize: null }, rightInput: { tableId: 'invoice', rowFilter: 'all_rows' as const, summarize: null } };
		const firstPlan = suggestPlanForStageInputs(tablesById, firstInputs.leftInput, firstInputs.rightInput).suggestedPlan.plan;
		runWorkflowStage(tablesById, { stageId: 's1', stageNumber: 1, ...firstInputs, plan: firstPlan, outputColumns: null }, { leftLabel: 'PO', rightLabel: 'Invoice' });

		const leftoversInput = { tableId: 'stage:s1', rowFilter: 'only_left' as const, summarize: null };
		const combinedInput = { tableId: 'grn', stackedTableIds: ['invoice'], rowFilter: 'all_rows' as const, summarize: null };
		const { suggestedPlan } = suggestPlanForStageInputs(tablesById, leftoversInput, combinedInput);
		const thirdRun = runWorkflowStage(tablesById, { stageId: 's3', stageNumber: 3, leftInput: leftoversInput, rightInput: combinedInput, plan: suggestedPlan.plan, outputColumns: null }, { leftLabel: 'Step 1', rightLabel: 'GRN + Invoice' });
		expect(thirdRun.effectiveLeftTable.rows).toHaveLength(1);
		expect(thirdRun.outcome.pairedRows).toHaveLength(1);
	});
});
