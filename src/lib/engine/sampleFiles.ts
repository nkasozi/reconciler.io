const SAMPLE_LEDGER_CSV = [
	'Kato General Stores Ltd',
	'Transaction Detail by Account',
	'March 2024',
	'',
	'Date,Transaction Type,Num,Name,Memo/Description,Account,Amount,Balance',
	'03/01/2024,Deposit,DEP-1001,Cash sales,Daily takings,Stanbic Current,"1,250,000.00","1,250,000.00"',
	'03/02/2024,Check,CHQ-2045,UMEME,Electricity Feb,Stanbic Current,"-185,400.00","1,064,600.00"',
	'03/04/2024,Deposit,DEP-1002,Mary Shop,Invoice 88,Stanbic Current,"640,000.00","1,704,600.00"',
	'03/05/2024,Expense,EXP-3310,NWSC,Water bill,Stanbic Current,"-48,200.00","1,656,400.00"',
	'03/08/2024,Check,CHQ-2046,Landlord,Rent March,Stanbic Current,"-2,000,000.00","-343,600.00"',
	'03/11/2024,Deposit,DEP-1003,Cash sales,Daily takings,Stanbic Current,"980,500.00","636,900.00"',
	'03/14/2024,Bill Payment,BP-0412,Bidco,Stock purchase,Stanbic Current,"-1,120,000.00","-483,100.00"',
	'03/18/2024,Deposit,DEP-1004,Okello Traders,Invoice 91,Stanbic Current,"355,000.00","-128,100.00"',
	'03/22/2024,Check,CHQ-2047,Staff,Salaries March,Stanbic Current,"-900,000.00","-1,028,100.00"',
	'03/28/2024,Deposit,DEP-1005,Cash sales,Daily takings,Stanbic Current,"1,410,000.00","381,900.00"',
	'Total for Stanbic Current,,,,,,"381,900.00",'
].join('\n');

const SAMPLE_BANK_CSV = [
	'Stanbic Bank Uganda - Account Statement',
	'Account: 9030001234567',
	'',
	'Tran Date,Value Date,Narration,Reference,Debit,Credit,Balance',
	'01/03/2024,01/03/2024,CASH DEPOSIT KAMPALA RD,DEP-1001,,"1,250,000.00","1,250,000.00"',
	'04/03/2024,04/03/2024,CHQ PAID UMEME LTD,CHQ2045,"185,400.00",,"1,064,600.00"',
	'04/03/2024,04/03/2024,EFT MARY SHOP INV88,DEP 1002,,"604,000.00","1,668,600.00"',
	'06/03/2024,06/03/2024,NWSC BILL PAYMENT,MM88213,"48,200.00",,"1,620,400.00"',
	'09/03/2024,09/03/2024,CHQ PAID J MUKASA,CHQ-2046,"2,000,000.00",,"-379,600.00"',
	'11/03/2024,11/03/2024,CASH DEPOSIT KAMPALA RD,DEP-1003,,"980,500.00","600,900.00"',
	'15/03/2024,15/03/2024,RTGS BIDCO UGANDA,BP-0412,"1,120,000.00",,"-519,100.00"',
	'22/03/2024,22/03/2024,CHQ PAID SALARIES,CHQ-2047,"900,000.00",,"-1,419,100.00"',
	'31/03/2024,31/03/2024,MONTHLY LEDGER FEE,FEE0324,"15,000.00",,"-1,434,100.00"',
	'31/03/2024,31/03/2024,EXCISE DUTY,FEE0324B,"750.00",,"-1,434,850.00"'
].join('\n');

export function buildSampleFiles(): { leftFile: File; rightFile: File } {
	return {
		leftFile: new File([SAMPLE_LEDGER_CSV], 'QuickBooks - Stanbic ledger March.csv', { type: 'text/csv' }),
		rightFile: new File([SAMPLE_BANK_CSV], 'Stanbic bank statement March.csv', { type: 'text/csv' })
	};
}

const SAMPLE_PURCHASE_ORDERS_CSV = [
	'PO Number,Supplier,Order Date,PO Amount',
	'PO-5001,Bidco Uganda,01/03/2024,"4,500,000"',
	'PO-5002,Mukwano Industries,03/03/2024,"2,150,000"',
	'PO-5003,Kakira Sugar,05/03/2024,"6,800,000"',
	'PO-5004,Roofings Ltd,08/03/2024,"9,200,000"',
	'PO-5005,Nice House of Plastics,12/03/2024,"1,340,000"'
].join('\n');

const SAMPLE_INVOICES_CSV = [
	'Invoice No,Supplier Name,PO Ref,Invoice Date,Invoice Total',
	'INV-88121,Bidco Uganda,PO-5001,06/03/2024,"4,500,000"',
	'INV-88122,Mukwano Industries,PO-5002,07/03/2024,"2,350,000"',
	'INV-88123,Kakira Sugar,PO-5003,09/03/2024,"6,800,000"',
	'INV-88124,Roofings Ltd,PO-5004,14/03/2024,"9,200,000"'
].join('\n');

const SAMPLE_DELIVERY_NOTES_CSV = [
	'GRN No,Purchase Order,Received On,Value Received',
	'GRN-301,PO 5001,05/03/2024,"4,500,000"',
	'GRN-302,PO 5002,06/03/2024,"2,150,000"',
	'GRN-303,PO 5003,08/03/2024,"6,120,000"',
	'GRN-305,PO 5005,15/03/2024,"1,340,000"'
].join('\n');

export function buildThreeWaySampleFiles(): File[] {
	return [
		new File([SAMPLE_PURCHASE_ORDERS_CSV], 'Purchase orders March.csv', { type: 'text/csv' }),
		new File([SAMPLE_INVOICES_CSV], 'Supplier invoices March.csv', { type: 'text/csv' }),
		new File([SAMPLE_DELIVERY_NOTES_CSV], 'Goods received notes March.csv', { type: 'text/csv' })
	];
}
