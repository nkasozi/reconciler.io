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
 * Error class for files that exceed row limits
 */
export class RowLimitExceededError extends Error {
	rowCount: number;
	
	constructor(rowCount: number) {
		super(`File exceeds the maximum allowed rows. Found ${rowCount.toLocaleString()} rows, maximum is 10,000 rows.`);
		this.name = 'RowLimitExceededError';
		this.rowCount = rowCount;
	}
}

/**
 * Maximum allowed rows for free tier
 */
export const MAX_FREE_TIER_ROWS = 10000;

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
				
				// Get a rough estimate of row count (excluding header and empty lines)
				const estimatedRowCount = lines.filter(line => line.trim() !== '').length - 1;
				
				// Check if file exceeds row limit
				if (estimatedRowCount > MAX_FREE_TIER_ROWS) {
					throw new RowLimitExceededError(estimatedRowCount);
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
					
					// Check row limit during parsing
					if (rows.length > MAX_FREE_TIER_ROWS) {
						throw new RowLimitExceededError(estimatedRowCount);
					}
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
 * Parses Excel file (XLSX/XLS) using SheetJS/xlsx library
 */
async function parseExcel(file: File): Promise<ParsedFileData> {
	// Import the xlsx library
	const xlsx = await import('xlsx');

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const data = event.target?.result;
				if (!data) {
					throw new Error('Failed to read Excel file');
				}
				
				// Parse the Excel data
				const workbook = xlsx.read(data, { type: 'array' });
				
				// Get the first sheet
				const firstSheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[firstSheetName];
				
				// Get an initial row count estimate
				const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1:A1');
				const estimatedRowCount = range.e.r; // End row index (0-based)
				
				// Check for row limit before full processing
				if (estimatedRowCount > MAX_FREE_TIER_ROWS) {
					throw new RowLimitExceededError(estimatedRowCount);
				}
				
				// Convert to JSON
				const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
				
				if (jsonData.length === 0) {
					throw new Error('Excel file is empty');
				}
				
				// Extract columns (first row)
				const columns = (jsonData[0] as any[]).map(col => String(col));
				
				// Process data rows
				const rows: Record<string, string>[] = [];
				for (let i = 1; i < jsonData.length; i++) {
					const rowData: Record<string, string> = {};
					const row = jsonData[i] as any[];
					
					// Skip empty rows
					if (!row || row.length === 0) continue;
					
					columns.forEach((column, index) => {
						// Convert all values to strings
						rowData[column] = index < row.length ? String(row[index] ?? '') : '';
					});
					
					rows.push(rowData);
					
					// Check row limit during parsing in case our estimate was off
					if (rows.length > MAX_FREE_TIER_ROWS) {
						throw new RowLimitExceededError(rows.length);
					}
				}
				
				resolve({
					columns,
					rows,
					fileName: file.name,
					fileType: 'excel'
				});
			} catch (error) {
				reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
			}
		};
		
		reader.onerror = () => {
			reject(new Error('Error reading Excel file'));
		};
		
		// Read the file as an array buffer
		reader.readAsArrayBuffer(file);
	});
}
