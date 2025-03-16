/**
 * Defines the structure for parsed file data
 */
export type ParsedFileData = {
	columns: string[];
	rows: Record<string, string>[];
	fileName: string;
	fileType: string;
};

/**
 * Determines the file type based on extension or MIME type
 */
export function getFileType(file: File): string {
	// First check by MIME type
	const mimeType = file.type.toLowerCase();

	if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) {
		return 'excel';
	} else if (mimeType === 'text/csv') {
		return 'csv';
	} else if (mimeType === 'text/plain') {
		return 'txt';
	} else if (mimeType.includes('pdf')) {
		return 'pdf';
	} else if (mimeType.includes('word') || mimeType.includes('document')) {
		return 'doc';
	} else if (mimeType.includes('rtf')) {
		return 'rtf';
	}

	// If MIME type is not conclusive, check by file extension
	const extension = file.name.split('.').pop()?.toLowerCase() || '';

	if (['xlsx', 'xls'].includes(extension)) {
		return 'excel';
	} else if (extension === 'csv') {
		return 'csv';
	} else if (extension === 'txt') {
		return 'txt';
	} else if (extension === 'pdf') {
		return 'pdf';
	} else if (['doc', 'docx'].includes(extension)) {
		return 'doc';
	} else if (extension === 'rtf') {
		return 'rtf';
	}

	return 'unknown';
}

/**
 * Main function to parse any supported file type
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
	const fileType = getFileType(file);

	switch (fileType) {
		case 'csv':
		case 'txt':
			return await parseCSV(file);
		case 'excel':
			return await parseExcel(file);
		case 'pdf':
		case 'doc':
		case 'rtf':
			// For the prototype, we'll return placeholder data
			// In a production app, we'd integrate with PDF/DOC/RTF parsing libraries
			return createPlaceholderData(file, fileType);
		default:
			throw new Error(`Unsupported file type: ${fileType}`);
	}
}

/**
 * Creates placeholder data for unsupported file types
 * (In a real app, this would be replaced with actual parsing logic)
 */
function createPlaceholderData(file: File, fileType: string): ParsedFileData {
	return {
		columns: ['Column1', 'Column2', 'Column3'],
		rows: [
			{ Column1: 'Data 1-1', Column2: 'Data 1-2', Column3: 'Data 1-3' },
			{ Column1: 'Data 2-1', Column2: 'Data 2-2', Column3: 'Data 2-3' },
			{ Column1: 'Data 3-1', Column2: 'Data 3-2', Column3: 'Data 3-3' }
		],
		fileName: file.name,
		fileType: fileType
	};
}

/**
 * Parses CSV file content
 */
async function parseCSV(file: File): Promise<ParsedFileData> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const csvText = event.target?.result as string;
				if (!csvText) {
					throw new Error('Failed to read CSV file');
				}

				// Split into lines and handle various newline types
				const lines = csvText.split(/\r\n|\n|\r/);

				if (lines.length === 0) {
					throw new Error('CSV file is empty');
				}

				// Parse header row
				const columns = parseCSVLine(lines[0]);

				// Parse data rows
				const rows: Record<string, string>[] = [];
				for (let i = 1; i < lines.length; i++) {
					if (lines[i].trim() === '') continue; // Skip empty lines

					const values = parseCSVLine(lines[i]);
					const rowData: Record<string, string> = {};

					columns.forEach((column, index) => {
						rowData[column] = index < values.length ? values[index] : '';
					});

					rows.push(rowData);
				}

				resolve({
					columns,
					rows,
					fileName: file.name,
					fileType: 'csv'
				});
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => {
			reject(new Error('Error reading file'));
		};

		reader.readAsText(file);
	});
}

/**
 * Parses a single CSV line, handling quotes correctly
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = i < line.length - 1 ? line[i + 1] : '';

		if (char === '"' && !inQuotes) {
			// Start of quoted field
			inQuotes = true;
		} else if (char === '"' && inQuotes && nextChar === '"') {
			// Escaped quote inside quoted field
			current += '"';
			i++; // Skip the next quote
		} else if (char === '"' && inQuotes) {
			// End of quoted field
			inQuotes = false;
		} else if (char === ',' && !inQuotes) {
			// End of field
			result.push(current);
			current = '';
		} else {
			// Normal character
			current += char;
		}
	}

	// Add the last field
	result.push(current);

	return result;
}

/**
 * Parses Excel file (XLSX/XLS)
 * In a real implementation, this would use a library like SheetJS/xlsx
 * For this prototype, we'll use a simple placeholder
 */
async function parseExcel(file: File): Promise<ParsedFileData> {
	// For prototype purposes, we'll use a placeholder implementation
	// In a real app, you would use a library like SheetJS/xlsx

	return new Promise((resolve) => {
		// Simulate async parsing
		setTimeout(() => {
			const columns = ['Date', 'Transaction ID', 'Amount', 'Description'];

			const rows = [
				{
					Date: '2023-01-01',
					'Transaction ID': 'TX001',
					Amount: '$100.00',
					Description: 'Payment'
				},
				{
					Date: '2023-01-02',
					'Transaction ID': 'TX002',
					Amount: '$250.50',
					Description: 'Refund'
				},
				{
					Date: '2023-01-03',
					'Transaction ID': 'TX003',
					Amount: '$75.25',
					Description: 'Subscription'
				}
			];

			resolve({
				columns,
				rows,
				fileName: file.name,
				fileType: 'excel'
			});
		}, 500);
	});
}
