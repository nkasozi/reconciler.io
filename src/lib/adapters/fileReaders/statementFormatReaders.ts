import { parseFlexibleDate } from '$lib/engine/dateParser';

export type HeaderAndRows = { columnNames: string[]; rows: string[][] };

const OFX_TRANSACTION_BLOCK_PATTERN = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi;

export function looksLikeOfxText(fileText: string): boolean {
	return /<OFX>/i.test(fileText) || /OFXHEADER:/i.test(fileText);
}

export function looksLikeQifText(fileText: string): boolean {
	return /^\s*!Type:/im.test(fileText);
}

export function readOfxStatement(fileText: string): HeaderAndRows {
	const columnNames = ['Date', 'Amount', 'Reference', 'Payee', 'Memo', 'Cheque No', 'Type'];
	const rows: string[][] = [];
	for (const blockMatch of fileText.matchAll(OFX_TRANSACTION_BLOCK_PATTERN)) {
		const transactionBlock = blockMatch[1];
		const readTag = (tagName: string): string => transactionBlock.match(new RegExp(`<${tagName}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim() ?? '';
		const parsedPostedDate = parseFlexibleDate(readTag('DTPOSTED'));
		rows.push([
			parsedPostedDate.isValidDate ? parsedPostedDate.isoDate : readTag('DTPOSTED'),
			readTag('TRNAMT'),
			readTag('FITID'),
			readTag('NAME'),
			readTag('MEMO'),
			readTag('CHECKNUM'),
			readTag('TRNTYPE')
		]);
	}
	console.log(`[statementFormatReaders] OFX statement contained ${rows.length} transactions`);
	return { columnNames, rows };
}

export function readQifStatement(fileText: string): HeaderAndRows {
	const columnNames = ['Date', 'Amount', 'Reference', 'Payee', 'Memo', 'Category'];
	const rows: string[][] = [];
	let currentRecord: Record<string, string> = {};
	for (const rawLine of fileText.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === '' || line.startsWith('!')) continue;
		const fieldCode = line[0];
		const fieldValue = line.slice(1).trim();
		switch (fieldCode) {
			case '^':
				if (Object.keys(currentRecord).length > 0) rows.push(convertQifRecordToRow(currentRecord));
				currentRecord = {};
				break;
			case 'D':
				currentRecord.date = fieldValue.replace(/'/g, '/');
				break;
			case 'T':
			case 'U':
				currentRecord.amount = fieldValue;
				break;
			case 'N':
				currentRecord.reference = fieldValue;
				break;
			case 'P':
				currentRecord.payee = fieldValue;
				break;
			case 'M':
				currentRecord.memo = fieldValue;
				break;
			case 'L':
				currentRecord.category = fieldValue;
				break;
			default:
				break;
		}
	}
	if (Object.keys(currentRecord).length > 0) rows.push(convertQifRecordToRow(currentRecord));
	console.log(`[statementFormatReaders] QIF statement contained ${rows.length} transactions`);
	return { columnNames, rows };
}

function convertQifRecordToRow(qifRecord: Record<string, string>): string[] {
	return [qifRecord.date ?? '', qifRecord.amount ?? '', qifRecord.reference ?? '', qifRecord.payee ?? '', qifRecord.memo ?? '', qifRecord.category ?? ''];
}
