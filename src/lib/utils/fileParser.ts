import { scanDocument, type DocumentScanResult } from './documentScanner';

/**
 * Data type detected for a column
 */
export type ColumnDataType = 'string' | 'number' | 'boolean' | 'date';

/**
 * Represents a column with metadata
 */
export type FileColumn = {
	name: string;
	dataType: ColumnDataType;
};

/**
 * Defines the structure for parsed file data
 */
export type ParsedFileData = {
	columns: FileColumn[];
	rows: Record<string, string>[];
	fileName: string;
	fileType: string;
	scanResult?: DocumentScanResult;
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
	} else if (mimeType.startsWith('image/')) {
		return 'image';
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
	} else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'tif', 'webp'].includes(extension)) {
		return 'image';
	}

	return 'unknown';
}

/**
 * Error class for files that exceed row limits
 */
export class RowLimitExceededError extends Error {
	rowCount: number;

	constructor(rowCount: number) {
		super(
			`File exceeds the maximum allowed rows. Found ${rowCount.toLocaleString()} rows, maximum is 10,000 rows.`
		);
		this.name = 'RowLimitExceededError';
		this.rowCount = rowCount;
	}
}

/**
 * Maximum allowed rows for free tier
 */
export const MAX_FREE_TIER_ROWS = 10000;

/**
 * Infers the data type of a value
 */
export function inferDataType(value: string): ColumnDataType {
	if (value === null || value === undefined || value.trim() === '') {
		return 'string'; // Default to string for empty values
	}

	const trimmed = value.trim();

	// Check for boolean
	if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
		return 'boolean';
	}

	// Check for number (including decimals, scientific notation, and common thousands separators)
	// Normalize some common formatting (remove commas used as thousand separators, trim spaces)
	const numericCandidate = trimmed.replace(/,/g, '');
	// Handle numbers wrapped in parentheses as negative (e.g. (1,000) => -1000)
	const normalizedCandidate = numericCandidate.replace(/^\((.*)\)$/, '-$1');

	if (!isNaN(Number(normalizedCandidate)) && normalizedCandidate !== '') {
		return 'number';
	}

	// Check for date (ISO format, common date patterns)
	if (
		/^\d{4}-\d{2}-\d{2}/.test(trimmed) || // YYYY-MM-DD
		/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed) || // MM/DD/YYYY or DD/MM/YYYY
		/^\d{1,2}-\d{1,2}-\d{2,4}/.test(trimmed) // MM-DD-YYYY or DD-MM-YYYY
	) {
		return 'date';
	}

	return 'string';
}

/**
 * Infers the data type for a column by sampling the first 20 non-empty values
 */
function inferColumnDataType(columnValues: string[]): ColumnDataType {
	// Sample up to 20 non-empty values
	const samples = columnValues.filter((v) => v && v.trim() !== '').slice(0, 20);

	if (samples.length === 0) {
		return 'string'; // Default to string if all values are empty
	}

	// Count the types found
	const typeCounts: Record<ColumnDataType, number> = {
		number: 0,
		boolean: 0,
		date: 0,
		string: 0
	};

	samples.forEach((sample) => {
		const type = inferDataType(sample);
		typeCounts[type]++;
	});

	// Return the most common type, with preference order: number > date > boolean > string
	if (typeCounts.number > 0 && typeCounts.number >= samples.length * 0.8) {
		return 'number'; // At least 80% numbers
	}
	if (typeCounts.date > 0 && typeCounts.date >= samples.length * 0.8) {
		return 'date'; // At least 80% dates
	}
	if (typeCounts.boolean > 0 && typeCounts.boolean >= samples.length * 0.8) {
		return 'boolean'; // At least 80% booleans
	}

	return 'string'; // Default fallback
}

/**
 * Creates FileColumn array from column names and row data
 */
function createFileColumns(columnNames: string[], rows: Record<string, string>[]): FileColumn[] {
	return columnNames.map((name) => ({
		name,
		dataType: inferColumnDataType(rows.map((row) => row[name] || ''))
	}));
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
			return await parsePDF(file);
		case 'image':
			return await parseImage(file);
		case 'doc':
		case 'rtf':
			// For now, we'll return placeholder data for DOC/RTF
			// These could be added later with additional libraries
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
	const columnNames = ['Column1', 'Column2', 'Column3'];
	const rows = [
		{ Column1: 'Data 1-1', Column2: 'Data 1-2', Column3: 'Data 1-3' },
		{ Column1: 'Data 2-1', Column2: 'Data 2-2', Column3: 'Data 2-3' },
		{ Column1: 'Data 3-1', Column2: 'Data 3-2', Column3: 'Data 3-3' }
	];

	return {
		columns: createFileColumns(columnNames, rows),
		rows,
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
				const estimatedRowCount = lines.filter((line) => line.trim() !== '').length - 1;

				// Check if file exceeds row limit
				if (estimatedRowCount > MAX_FREE_TIER_ROWS) {
					throw new RowLimitExceededError(estimatedRowCount);
				}

				// Parse header row
				const columnNames = parseCSVLine(lines[0]);

				// Parse data rows
				const rows: Record<string, string>[] = [];
				for (let i = 1; i < lines.length; i++) {
					if (lines[i].trim() === '') continue; // Skip empty lines

					const values = parseCSVLine(lines[i]);
					const rowData: Record<string, string> = {};

					columnNames.forEach((column, index) => {
						rowData[column] = index < values.length ? values[index] : '';
					});

					rows.push(rowData);

					// Check row limit during parsing
					if (rows.length > MAX_FREE_TIER_ROWS) {
						throw new RowLimitExceededError(estimatedRowCount);
					}
				}

				resolve({
					columns: createFileColumns(columnNames, rows),
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
				const columnNames = (jsonData[0] as any[]).map((col) => String(col));

				// Process data rows
				const rows: Record<string, string>[] = [];
				for (let i = 1; i < jsonData.length; i++) {
					const rowData: Record<string, string> = {};
					const row = jsonData[i] as any[];

					// Skip empty rows
					if (!row || row.length === 0) continue;

					columnNames.forEach((column, index) => {
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
					columns: createFileColumns(columnNames, rows),
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

/**
 * Parse PDF file using document scanning
 */
async function parsePDF(file: File): Promise<ParsedFileData> {
	try {
		const scanResult = await scanDocument(file);

		// If we have table data, use it directly (already in the correct format)
		if (scanResult.columns && scanResult.rows && scanResult.rows.length > 0) {
			// Check row limit
			if (scanResult.rows.length > MAX_FREE_TIER_ROWS) {
				throw new RowLimitExceededError(scanResult.rows.length);
			}

			return {
				columns: createFileColumns(scanResult.columns, scanResult.rows),
				rows: scanResult.rows,
				fileName: file.name,
				fileType: 'pdf',
				scanResult
			};
		}

		// If no table data, try to create columns from text
		const textLines = scanResult.text.split('\n').filter((line) => line.trim().length > 0);

		// Use first few words as column headers if available
		const firstLine = textLines[0] || '';
		const columnNames =
			firstLine.split(/\s{2,}|\t/).length > 1 ? firstLine.split(/\s{2,}|\t/) : ['Content'];

		const rows: Record<string, string>[] = [];

		// If we have multiple columns, try to parse remaining lines
		if (columnNames.length > 1) {
			for (let i = 1; i < Math.min(textLines.length, MAX_FREE_TIER_ROWS + 1); i++) {
				const values = textLines[i].split(/\s{2,}|\t/);
				const rowData: Record<string, string> = {};

				columnNames.forEach((column, index) => {
					rowData[column] = index < values.length ? values[index] : '';
				});

				rows.push(rowData);
			}
		} else {
			// Single column - put each line as a row
			for (let i = 0; i < Math.min(textLines.length, MAX_FREE_TIER_ROWS); i++) {
				rows.push({ Content: textLines[i] });
			}
		}

		return {
			columns: createFileColumns(columnNames, rows),
			rows,
			fileName: file.name,
			fileType: 'pdf',
			scanResult
		};
	} catch (error) {
		throw new Error(
			`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Parse image file using OCR
 */
async function parseImage(file: File): Promise<ParsedFileData> {
	try {
		const scanResult = await scanDocument(file);

		// If we have table data from OCR, use it directly (already in the correct format)
		if (scanResult.columns && scanResult.rows && scanResult.rows.length > 0) {
			// Check row limit
			if (scanResult.rows.length > MAX_FREE_TIER_ROWS) {
				throw new RowLimitExceededError(scanResult.rows.length);
			}

			return {
				columns: createFileColumns(scanResult.columns, scanResult.rows),
				rows: scanResult.rows,
				fileName: file.name,
				fileType: 'image',
				scanResult
			};
		}

		// If no table structure detected, create a simple text-based structure
		const textLines = scanResult.text.split('\n').filter((line) => line.trim().length > 0);

		// Try to detect if first line looks like headers
		const firstLine = textLines[0] || '';
		const possibleColumns = firstLine.split(/\s{2,}|\t/);

		const columnNames =
			possibleColumns.length > 1 && possibleColumns.every((col) => col.length < 50)
				? possibleColumns
				: ['Extracted Text'];

		const rows: Record<string, string>[] = [];

		if (columnNames.length > 1) {
			// Multi-column format
			for (let i = 1; i < Math.min(textLines.length, MAX_FREE_TIER_ROWS + 1); i++) {
				const values = textLines[i].split(/\s{2,}|\t/);
				const rowData: Record<string, string> = {};

				columnNames.forEach((column, index) => {
					rowData[column] = index < values.length ? values[index] : '';
				});

				rows.push(rowData);
			}
		} else {
			// Single column - each line is a row
			for (let i = 0; i < Math.min(textLines.length, MAX_FREE_TIER_ROWS); i++) {
				rows.push({ 'Extracted Text': textLines[i] });
			}
		}

		return {
			columns: createFileColumns(columnNames, rows),
			rows,
			fileName: file.name,
			fileType: 'image',
			scanResult
		};
	} catch (error) {
		throw new Error(
			`Failed to parse image: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
