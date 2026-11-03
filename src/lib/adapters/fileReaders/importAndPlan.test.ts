import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readAnyFile } from './readAnyFile';
import { runReconciliation } from '$lib/engine/matchEngine';
import { suggestMatchPlan } from '$lib/engine/planSuggester';

function textFile(fileName: string, fileText: string) {
	return { fileName, fileBytes: new TextEncoder().encode(fileText).buffer as ArrayBuffer };
}

const QUICKBOOKS_LEDGER_CSV = [
	'Acme Hardware Ltd',
	'Transaction Detail by Account',
	'"January 1 - March 31, 2024"',
	'',
	',Date,Transaction Type,Num,Name,Memo/Description,Split,Amount,Balance',
	'Checking,,,,,,,,',
	',03/01/2024,Deposit,1001,Mary Shop,Cash sales,Sales,"1,200.00","1,200.00"',
	',03/04/2024,Check,2045,City Power,Electricity,Utilities,-350.50,849.50',
	',03/15/2024,Expense,2046,Landlord,Rent March,Rent,"-2,000.00","-1,150.50"',
	',03/20/2024,Deposit,1002,Kato,Invoice 88,Sales,500.00,-650.50',
	'Total for Checking,,,,,,,"-650.50",',
	'TOTAL,,,,,,,"-650.50",'
].join('\n');

const BANK_STATEMENT_CSV = [
	'Transaction Date,Value Date,Narration,Cheque No,Withdrawals,Deposits,Balance',
	'01/03/2024,01/03/2024,CASH DEPOSIT REF 1001,,,"1,200.00","1,200.00"',
	'05/03/2024,05/03/2024,CHQ 2045 CITY POWER,2045,350.50,,849.50',
	'16/03/2024,16/03/2024,TRANSFER LANDLORD,,"2,000.00",,"-1,150.50"',
	'28/03/2024,28/03/2024,BANK CHARGES,,25.00,,"-1,175.50"'
].join('\n');

describe('reading accounting exports', () => {
	it('skips report title rows and total rows in a QuickBooks export', () => {
		const ledgerTable = readAnyFile(textFile('ledger.csv', QUICKBOOKS_LEDGER_CSV), 'day_first');
		expect(ledgerTable.detectedSystemName).toBe('QuickBooks');
		expect(ledgerTable.columnNames).toContain('Memo/Description');
		expect(ledgerTable.rows).toHaveLength(4);
		expect(ledgerTable.dateOrder).toBe('month_first');
	});

	it('detects a bank statement with day-first dates', () => {
		const bankTable = readAnyFile(textFile('bank.csv', BANK_STATEMENT_CSV), 'month_first');
		expect(bankTable.detectedSystemName).toBe('Bank statement');
		expect(bankTable.dateOrder).toBe('day_first');
	});

	it('reads OFX bank downloads', () => {
		const ofxText = 'OFXHEADER:100\n<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20240305120000<TRNAMT>-350.50<FITID>A1<NAME>CITY POWER</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20240301<TRNAMT>1200.00<FITID>A2<NAME>DEPOSIT</STMTTRN></BANKTRANLIST></OFX>';
		const ofxTable = readAnyFile(textFile('statement.ofx', ofxText), 'day_first');
		expect(ofxTable.rows).toEqual([
			['2024-03-05', '-350.50', 'A1', 'CITY POWER', '', '', 'DEBIT'],
			['2024-03-01', '1200.00', 'A2', 'DEPOSIT', '', '', 'CREDIT']
		]);
	});

	it('reads QIF files', () => {
		const qifText = '!Type:Bank\nD03/05/2024\nT-350.50\nN2045\nPCITY POWER\n^\nD03/01/2024\nT1,200.00\nPDEPOSIT\n^\n';
		const qifTable = readAnyFile(textFile('statement.qif', qifText), 'month_first');
		expect(qifTable.rows[0]).toEqual(['03/05/2024', '-350.50', '2045', 'CITY POWER', '', '']);
		expect(qifTable.rows).toHaveLength(2);
	});

	it('reads Excel workbooks with real date cells and title rows', () => {
		const worksheet = XLSX.utils.aoa_to_sheet([['Stock count - Kampala branch'], [], ['SKU', 'Item', 'Qty', 'Counted On'], ['SKU-1', 'Sugar 1kg', 10, new Date(Date.UTC(2024, 2, 15))], ['SKU-2', 'Salt', 4, new Date(Date.UTC(2024, 2, 15))]], { cellDates: true });
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Count');
		const workbookBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
		const stockTable = readAnyFile({ fileName: 'count.xlsx', fileBytes: workbookBytes }, 'day_first');
		expect(stockTable.columnNames).toEqual(['SKU', 'Item', 'Qty', 'Counted On']);
		expect(stockTable.rows[0]).toEqual(['SKU-1', 'Sugar 1kg', '10', '2024-03-15']);
	});
});

describe('suggestMatchPlan', () => {
	it('reconciles a QuickBooks ledger against a bank statement with zero setup', () => {
		const ledgerTable = readAnyFile(textFile('ledger.csv', QUICKBOOKS_LEDGER_CSV), 'day_first');
		const bankTable = readAnyFile(textFile('bank.csv', BANK_STATEMENT_CSV), 'day_first');
		const { plan } = suggestMatchPlan(ledgerTable, bankTable);
		const outcome = runReconciliation(ledgerTable, bankTable, plan);

		expect(plan.compareRules.find((rule) => rule.fieldKind === 'amount')?.amountSignMode ?? plan.keyRules.find((rule) => rule.fieldKind === 'amount')?.amountSignMode).toBe('opposite_sign');
		expect(outcome.pairedRows).toHaveLength(3);
		expect(outcome.onlyInLeft.map((unpaired) => ledgerTable.rows[unpaired.rowIndex][3])).toEqual(['1002']);
		expect(outcome.onlyInRight.map((unpaired) => bankTable.rows[unpaired.rowIndex][2])).toEqual(['BANK CHARGES']);
		expect(outcome.summary.unexplainedDifference).toBe(0);
	});

	it('finds the matching column by its values even when headers differ', () => {
		const leftTable = readAnyFile(textFile('pos.csv', 'Receipt,Total,Day\nR-100,50,2024-01-01\nR-101,70,2024-01-01\nR-102,20,2024-01-02'), 'day_first');
		const rightTable = readAnyFile(textFile('mm.csv', 'TxnRef,Value,When\nr100,50,2024-01-01\nr101,75,2024-01-01'), 'day_first');
		const { plan } = suggestMatchPlan(leftTable, rightTable);
		expect(plan.keyRules[0].leftSource).toEqual({ sourceKind: 'column', columnIndex: 0 });
		expect(plan.keyRules[0].rightSource).toEqual({ sourceKind: 'column', columnIndex: 0 });
		const outcome = runReconciliation(leftTable, rightTable, plan);
		expect(outcome.summary.matchedCount).toBe(1);
		expect(outcome.summary.matchedWithDifferencesCount).toBe(1);
	});
});
