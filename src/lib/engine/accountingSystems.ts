import type { DateOrder } from './dateParser';
import { normalizeHeaderName } from './textNormalization';

export type AccountingSystemSignature = {
	systemName: string;
	exportHint: string;
	distinctiveHeaders: string[];
	minimumHeadersToMatch: number;
	preferredDateOrder: DateOrder | null;
};

export const ACCOUNTING_SYSTEM_SIGNATURES: AccountingSystemSignature[] = [
	{ systemName: 'QuickBooks', exportHint: 'Reports → Transaction Detail by Account (or General Ledger) → Export → Excel', distinctiveHeaders: ['transaction type', 'num', 'memo description', 'split', 'clr', 'name', 'account'], minimumHeadersToMatch: 3, preferredDateOrder: null },
	{ systemName: 'Xero', exportHint: 'Accounting → Reports → Account Transactions → Export → Excel or CSV', distinctiveHeaders: ['source', 'reference', 'description', 'debit', 'credit', 'running balance', 'gross', 'contact', 'account code'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Xero bank statement', exportHint: 'Bank account → Account Transactions → Export', distinctiveHeaders: ['payee', 'description', 'reference', 'check number', 'amount', 'transaction type'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Sage', exportHint: 'Reports → Nominal Activity (or Audit Trail) → Export to CSV/Excel', distinctiveHeaders: ['tran no', 'type', 'n c', 'ex ref', 'details', 'dept', 'ref', 'debit', 'credit'], minimumHeadersToMatch: 4, preferredDateOrder: 'day_first' },
	{ systemName: 'MYOB', exportHint: 'Reports → Accounts → General Ledger [Detail] → Send To → Excel', distinctiveHeaders: ['id no', 'src', 'memo', 'debit', 'credit', 'job no', 'job'], minimumHeadersToMatch: 3, preferredDateOrder: 'day_first' },
	{ systemName: 'Zoho Books', exportHint: 'Reports → Account Transactions → Export → CSV/XLSX', distinctiveHeaders: ['transaction details', 'transaction type', 'transaction', 'reference', 'debit', 'credit', 'account'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Wave', exportHint: 'Accounting → Transactions → Export', distinctiveHeaders: ['transaction id', 'transaction date', 'account name', 'transaction description', 'amount one column', 'debit amount two column approach', 'credit amount two column approach'], minimumHeadersToMatch: 3, preferredDateOrder: null },
	{ systemName: 'NetSuite', exportHint: 'Reports → General Ledger → Export → CSV', distinctiveHeaders: ['internal id', 'document number', 'type', 'period', 'memo', 'amount', 'name', 'account'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'SAP', exportHint: 'FBL3N / FBL1N / FBL5N line items → Export → Spreadsheet', distinctiveHeaders: ['document number', 'posting date', 'document date', 'amount in local currency', 'assignment', 'document type', 'posting key', 'text'], minimumHeadersToMatch: 3, preferredDateOrder: 'day_first' },
	{ systemName: 'Microsoft Dynamics', exportHint: 'General Ledger Entries → Open in Excel', distinctiveHeaders: ['posting date', 'document type', 'document no', 'entry no', 'debit amount', 'credit amount', 'g l account no'], minimumHeadersToMatch: 3, preferredDateOrder: null },
	{ systemName: 'Tally', exportHint: 'Display → Account Books → Ledger → Export (Alt+E) → Excel', distinctiveHeaders: ['particulars', 'vch type', 'vch no', 'debit', 'credit'], minimumHeadersToMatch: 3, preferredDateOrder: 'day_first' },
	{ systemName: 'Odoo', exportHint: 'Accounting → Journal Items → Export', distinctiveHeaders: ['journal', 'partner', 'label', 'reference', 'debit', 'credit', 'matching'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'M-Pesa statement', exportHint: 'M-Pesa app → Statements → Download (convert PDF to Excel first)', distinctiveHeaders: ['receipt no', 'completion time', 'details', 'transaction status', 'paid in', 'withdrawn', 'balance'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Mobile money statement', exportHint: 'Download your statement from the mobile money portal', distinctiveHeaders: ['id', 'date', 'type', 'from', 'to', 'amount', 'fee', 'balance', 'external transaction id'], minimumHeadersToMatch: 5, preferredDateOrder: 'day_first' },
	{ systemName: 'Stripe', exportHint: 'Payments or Balance → Export → CSV', distinctiveHeaders: ['id', 'created utc', 'amount', 'fee', 'net', 'currency', 'description', 'customer email'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'PayPal', exportHint: 'Activity → Statements → Activity download → CSV', distinctiveHeaders: ['time', 'time zone', 'gross', 'fee', 'net', 'transaction id', 'reference txn id', 'from email address'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Shopify', exportHint: 'Orders → Export → CSV', distinctiveHeaders: ['financial status', 'paid at', 'fulfillment status', 'subtotal', 'shipping', 'taxes', 'total', 'lineitem name'], minimumHeadersToMatch: 4, preferredDateOrder: null },
	{ systemName: 'Square', exportHint: 'Transactions → Export → Transactions CSV', distinctiveHeaders: ['gross sales', 'net sales', 'total collected', 'payment id', 'transaction id', 'card brand', 'device name'], minimumHeadersToMatch: 3, preferredDateOrder: null },
	{ systemName: 'Bank statement', exportHint: 'Online banking → Statements → Download as CSV, Excel or OFX', distinctiveHeaders: ['value date', 'tran date', 'narration', 'withdrawals', 'deposits', 'balance', 'cheque no', 'money in', 'money out', 'paid in', 'paid out', 'description'], minimumHeadersToMatch: 3, preferredDateOrder: null }
];

export function detectAccountingSystem(columnNames: string[]): AccountingSystemSignature | null {
	const normalizedColumnNames = new Set(columnNames.map(normalizeHeaderName));
	let bestSignature: AccountingSystemSignature | null = null;
	let bestMatchedHeaderShare = 0;
	for (const signature of ACCOUNTING_SYSTEM_SIGNATURES) {
		const matchedHeaderCount = signature.distinctiveHeaders.filter((headerName) => normalizedColumnNames.has(headerName)).length;
		const matchedHeaderShare = matchedHeaderCount / signature.distinctiveHeaders.length;
		const isStrongEnough = matchedHeaderCount >= signature.minimumHeadersToMatch;
		if (isStrongEnough && matchedHeaderShare > bestMatchedHeaderShare) {
			bestSignature = signature;
			bestMatchedHeaderShare = matchedHeaderShare;
		}
	}
	console.log(`[accountingSystems] Detected system: ${bestSignature?.systemName ?? 'none'}`);
	return bestSignature;
}
