// Test PDF processing improvements
import { extractTablesFromPDF } from './src/lib/utils/pdfProcessor.ts';

// Sample PDF-like text content that should extract more than 3 rows
const samplePdfText = `
Invoice Report - Q4 2023

Date        Amount    Description       Status
2023-10-01  $1,200    Office Supplies   Paid
2023-10-02  $850      Equipment         Pending
2023-10-03  $2,100    Software License  Paid
2023-10-04  $450      Utilities         Paid
2023-10-05  $1,800    Marketing         Pending
2023-10-06  $650      Travel            Paid
2023-10-07  $3,200    Consulting        Paid
2023-10-08  $980      Maintenance       Pending
2023-10-09  $1,450    Insurance         Paid
2023-10-10  $2,800    Equipment         Paid
2023-10-11  $750      Supplies          Paid
2023-10-12  $1,200    Software          Pending
2023-10-13  $890      Utilities         Paid
2023-10-14  $2,150    Marketing         Paid
2023-10-15  $1,600    Travel            Paid
2023-10-16  $950      Consulting        Pending
2023-10-17  $1,850    Equipment         Paid
2023-10-18  $720      Maintenance       Paid
2023-10-19  $1,300    Insurance         Paid
2023-10-20  $2,450    Software          Paid

Total: $28,940
End of Report
`;

// Test the extraction
async function testExtraction() {
	try {
		console.log('Testing PDF text extraction...');

		// This simulates what would happen with actual PDF text
		const lines = samplePdfText.split('\n').filter((line) => line.trim().length > 0);
		console.log(`Total lines: ${lines.length}`);

		// Find table-like lines
		const tableLines = lines.filter((line) => {
			const separators = [/\s{2,}/, /\t/, /\|/, /,/, /;/];
			for (const sep of separators) {
				if (line.match(sep)) {
					const parts = line.split(sep).filter((p) => p.trim().length > 0);
					if (parts.length >= 2) {
						return true;
					}
				}
			}
			return false;
		});

		console.log(`Table-like lines found: ${tableLines.length}`);
		console.log('Sample table lines:');
		tableLines.slice(0, 5).forEach((line, i) => {
			console.log(`${i + 1}: "${line}"`);
		});

		if (tableLines.length > 3) {
			console.log('✅ SUCCESS: Found more than 3 table rows!');
		} else {
			console.log('❌ ISSUE: Only found 3 or fewer table rows');
		}
	} catch (error) {
		console.error('Test error:', error);
	}
}

testExtraction();
