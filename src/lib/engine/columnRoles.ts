import { isAccountingAmount } from './amountParser';
import { parseFlexibleDate } from './dateParser';
import { normalizeHeaderName } from './textNormalization';

export type ColumnRole = 'date' | 'reference' | 'description' | 'amount' | 'debit' | 'credit' | 'balance' | 'account' | 'party' | 'quantity' | 'other';

const HEADER_NAMES_BY_ROLE: Record<Exclude<ColumnRole, 'other'>, string[]> = {
	date: ['date', 'transaction date', 'txn date', 'trans date', 'posting date', 'posted date', 'post date', 'value date', 'invoice date', 'document date', 'doc date', 'entry date', 'booking date', 'completion time', 'created', 'created utc', 'created date', 'paid at', 'payment date', 'dtposted', 'period date', 'receipt date', 'sale date'],
	reference: ['ref', 'reference', 'ref no', 'reference no', 'reference number', 'num', 'no', 'number', 'transaction id', 'txn id', 'trans id', 'transaction number', 'transaction', 'invoice', 'invoice no', 'invoice number', 'invoice id', 'document no', 'document number', 'doc no', 'cheque no', 'cheque number', 'check no', 'check number', 'checknum', 'receipt no', 'receipt number', 'voucher no', 'vch no', 'voucher number', 'journal no', 'journal number', 'entry no', 'tran no', 'id', 'id no', 'fitid', 'payment id', 'payment ref', 'payment reference', 'bank reference', 'order id', 'order number', 'order no', 'reference txn id', 'source no', 'bill no', 'po number', 'sku', 'item code', 'product code', 'barcode', 'item id'],
	description: ['description', 'memo', 'memo description', 'narration', 'narrative', 'details', 'particulars', 'transaction details', 'transaction description', 'remarks', 'text', 'label', 'notes', 'comment', 'item', 'item name', 'product', 'product name'],
	amount: ['amount', 'net amount', 'total', 'value', 'transaction amount', 'gross', 'net', 'amount local currency', 'amount in local currency', 'trnamt', 'total collected', 'gross sales', 'net sales', 'price', 'unit price', 'cost', 'subtotal', 'amount one column'],
	debit: ['debit', 'dr', 'debits', 'debit amount', 'withdrawal', 'withdrawals', 'withdrawn', 'money out', 'paid out', 'payments', 'spent', 'outflow', 'debit amount two column approach'],
	credit: ['credit', 'cr', 'credits', 'credit amount', 'deposit', 'deposits', 'money in', 'paid in', 'receipts', 'received', 'inflow', 'credit amount two column approach'],
	balance: ['balance', 'running balance', 'closing balance', 'available balance', 'ledger balance'],
	account: ['account', 'account name', 'account code', 'gl account', 'gl code', 'ledger', 'ledger account', 'category', 'n c', 'nominal code', 'split', 'journal', 'source'],
	party: ['name', 'customer', 'vendor', 'supplier', 'payee', 'payer', 'contact', 'client', 'partner', 'customer name', 'vendor name', 'supplier name', 'from', 'to', 'counterparty', 'beneficiary'],
	quantity: ['qty', 'quantity', 'count', 'units', 'stock', 'on hand', 'qty on hand', 'stock count', 'counted']
};

const ROLE_BY_NORMALIZED_HEADER = buildRoleLookup();

function buildRoleLookup(): Map<string, ColumnRole> {
	const roleLookup = new Map<string, ColumnRole>();
	for (const [columnRole, headerNames] of Object.entries(HEADER_NAMES_BY_ROLE)) {
		for (const headerName of headerNames) roleLookup.set(normalizeHeaderName(headerName), columnRole as ColumnRole);
	}
	return roleLookup;
}

export function findRoleForHeader(headerName: string): ColumnRole {
	const normalizedHeader = normalizeHeaderName(headerName);
	const exactRole = ROLE_BY_NORMALIZED_HEADER.get(normalizedHeader);
	if (exactRole) return exactRole;
	const headerWithoutCurrencySuffix = normalizedHeader.replace(/\s+(ugx|kes|usd|eur|gbp|zar|ngn|tzs|inr)$/, '').replace(/^(the|txn|trans)\s+/, '');
	return ROLE_BY_NORMALIZED_HEADER.get(headerWithoutCurrencySuffix) ?? findRoleByKeyword(normalizedHeader);
}

function findRoleByKeyword(normalizedHeader: string): ColumnRole {
	switch (true) {
		case /\bdate\b/.test(normalizedHeader):
			return 'date';
		case /\b(debit|withdraw)/.test(normalizedHeader):
			return 'debit';
		case /\b(credit|deposit)/.test(normalizedHeader):
			return 'credit';
		case /\bbalance\b/.test(normalizedHeader):
			return 'balance';
		case /\b(amount|amt|total)\b/.test(normalizedHeader):
			return 'amount';
		case /\b(ref|reference|id|no|number|invoice|receipt|cheque|check)\b/.test(normalizedHeader):
			return 'reference';
		case /\b(description|memo|narration|details|particulars)\b/.test(normalizedHeader):
			return 'description';
		case /\b(qty|quantity)\b/.test(normalizedHeader):
			return 'quantity';
		default:
			return 'other';
	}
}

export type ColumnProfile = {
	columnIndex: number;
	columnName: string;
	headerRole: ColumnRole;
	effectiveRole: ColumnRole;
	filledRatio: number;
	amountRatio: number;
	dateRatio: number;
	distinctRatio: number;
	sampleValues: string[];
};

export function profileColumns(columnNames: string[], rows: string[][], maximumSampleSize = 2000): ColumnProfile[] {
	const sampledRows = rows.length <= maximumSampleSize ? rows : rows.filter((_, rowIndex) => rowIndex % Math.ceil(rows.length / maximumSampleSize) === 0);
	return columnNames.map((columnName, columnIndex) => {
		const columnValues = sampledRows.map((row) => row[columnIndex] ?? '');
		const filledValues = columnValues.filter((value) => value !== '');
		const filledCount = Math.max(filledValues.length, 1);
		const amountRatio = filledValues.filter((value) => isAccountingAmount(value)).length / filledCount;
		const dateRatio = filledValues.filter((value) => parseFlexibleDate(value).isValidDate).length / filledCount;
		const distinctRatio = new Set(filledValues).size / filledCount;
		const headerRole = findRoleForHeader(columnName);
		const profileWithoutRole = { columnIndex, columnName, headerRole, filledRatio: filledValues.length / Math.max(columnValues.length, 1), amountRatio, dateRatio, distinctRatio, sampleValues: filledValues.slice(0, 5) };
		return { ...profileWithoutRole, effectiveRole: decideEffectiveRole(profileWithoutRole) };
	});
}

function decideEffectiveRole(profile: Omit<ColumnProfile, 'effectiveRole'>): ColumnRole {
	const looksLikeDates = profile.dateRatio >= 0.8 && profile.amountRatio < 0.8;
	const looksLikeAmounts = profile.amountRatio >= 0.8 && profile.dateRatio < 0.5;
	switch (profile.headerRole) {
		case 'date':
			return looksLikeDates || profile.filledRatio === 0 ? 'date' : 'other';
		case 'amount':
		case 'debit':
		case 'credit':
		case 'balance':
		case 'quantity':
			return looksLikeAmounts || profile.filledRatio < 0.6 ? profile.headerRole : 'other';
		case 'other':
			if (looksLikeDates) return 'date';
			if (looksLikeAmounts && profile.distinctRatio > 0.95 && profile.sampleValues.every((value) => /^\d{5,}$/.test(value))) return 'reference';
			return looksLikeAmounts ? 'amount' : 'other';
		default:
			return profile.headerRole;
	}
}
