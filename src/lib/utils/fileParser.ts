import { scanDocument, type DocumentScanResult } from './documentScanner';
import Papa from 'papaparse';
import type {
	IndexedDBConfig,
	FileDumpProgress,
	FileDumpResult,
	FileDumpProgressCallback
} from './indexedDB/types';
import { dumpCSVToIndexedDB } from './indexedDB/fileDumper';

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
 * Base class for streaming file parsers
 * Loads file data once and caches internally (not in Svelte state)
 * This prevents redundant file reads while keeping state minimal
 */
export abstract class StreamingFileParser {
	protected file: File;
	protected columns: FileColumn[] = [];
	protected columnNames: string[] = [];
	protected totalRowCount: number = 0;

	protected cacheInitialized = false;

	// Cached metadata
	private metadataCache: {
		columns: FileColumn[] | null;
		columnNames: string[] | null;
		totalRowCount: number | null;
		fileName: string;
	} | null = null;

	constructor(file: File) {
		this.file = file;
	}

	/**
	 * Ensure data is loaded and cached
	 * This is called internally by all methods to guarantee one-time load
	 */
	protected abstract ensureDataLoaded(): Promise<void>;

	/**
	 * Optionally ensure columns are loaded (used by CSV parser for fast column access)
	 * Can be overridden by subclasses that support fast column loading
	 */
	protected async ensureColumnsLoaded(): Promise<void> {
		// Default implementation: just ensure data is loaded
		await this.ensureDataLoaded();
	}

	/**
	 * Get the first X rows of the file without loading the entire file into memory
	 */
	abstract getFirstXRows(maxRows: number): Promise<Record<string, string>[]>;

	/**
	 * Get an async iterable for processing rows one at a time
	 */
	abstract getRowIterator(): AsyncIterable<Record<string, string>>;

	/**
	 * Get the total number of rows in the file
	 */
	abstract getTotalRowCount(): Promise<number>;

	/**
	 * Begin dumping file data to IndexedDB
	 * Creates a new table/store and bulk inserts records in background
	 */
	abstract beginFileDumpToIndexedDB(
		config: IndexedDBConfig,
		fileHash?: string,
		onProgress?: FileDumpProgressCallback
	): Promise<FileDumpResult>;

	/**
	 * Get column information
	 */
	async getColumns(): Promise<FileColumn[]> {
		if (!this.cacheInitialized) {
			await this.ensureColumnsLoaded();
		}
		return this.columns;
	}

	/**
	 * Get column names
	 */
	async getColumnNames(): Promise<string[]> {
		if (!this.cacheInitialized) {
			await this.ensureColumnsLoaded();
		}
		return this.columnNames;
	}

	/**
	 * Get filename
	 */
	getFileName(): string {
		return this.file.name;
	}

	/**
	 * Get cached metadata (columns, columnNames, totalRowCount, fileName)
	 * Returns immediately if data is loaded, null if not yet loaded
	 */
	getCachedMetadata(): {
		columns: FileColumn[] | null;
		columnNames: string[] | null;
		totalRowCount: number | null;
		fileName: string;
	} | null {
		if (!this.cacheInitialized) {
			return null;
		}

		return {
			columns: this.columns,
			columnNames: this.columnNames,
			totalRowCount: this.totalRowCount,
			fileName: this.file.name
		};
	}

	/**
	 * Clear cache if needed
	 */
	clearCache(): void {
		this.cacheInitialized = false;
	}
}

/**
 * CSV file parser with true streaming support via Papa.parse
 * Never loads entire file into memory - uses Papa.parse's step callback for streaming
 */
export class StreamingCSVParser extends StreamingFileParser {
	private columnsPromise: Promise<void> | null = null;

	/**
	 * Load column headers only - reads just the first row
	 */
	protected async ensureColumnsLoaded(): Promise<void> {
		if (this.columnNames.length > 0) {
			return;
		}

		if (this.columnsPromise) {
			return this.columnsPromise;
		}

		this.columnsPromise = new Promise<void>((resolve, reject) => {
			let headerParsed = false;

			Papa.parse(this.file, {
				header: true,
				dynamicTyping: false,
				skipEmptyLines: true,
				worker: true,
				step: (row, parser) => {
					if (!headerParsed) {
						const rowData = row.data as Record<string, string>;
						this.columnNames = Object.keys(rowData).map((k) => k.trim());
						this.columns = createFileColumns(this.columnNames, []);
						headerParsed = true;
						// Abort parsing after getting headers
						parser.abort();
						resolve();
					}
				},
				error: (error: any) => {
					reject(
						new Error(
							`Failed to parse CSV headers: ${error instanceof Error ? error.message : String(error)}`
						)
					);
				}
			});
		});

		return this.columnsPromise;
	}

	/**
	 * Ensure columns are loaded (required before getting rows)
	 * Does NOT cache the entire file - use getRowIterator() for streaming
	 */
	protected async ensureDataLoaded(): Promise<void> {
		// Just ensure columns are loaded
		await this.ensureColumnsLoaded();
		this.cacheInitialized = true;
	}

	/**
	 * Get first X rows by streaming through file
	 * Does NOT cache entire file - reads only what's needed via step callback
	 */
	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		await this.ensureColumnsLoaded();

		const rows: Record<string, string>[] = [];

		return new Promise((resolve, reject) => {
			Papa.parse(this.file, {
				header: true,
				dynamicTyping: false,
				skipEmptyLines: true,
				worker: true,
				step: (row, parser) => {
					if (rows.length < maxRows) {
						const rowData = row.data as Record<string, string>;
						const normalizedRow: Record<string, string> = {};
						Object.entries(rowData).forEach(([key, value]) => {
							const trimmedKey = key.trim();
							normalizedRow[trimmedKey] = String(value ?? '');
						});

						const hasContent = Object.values(normalizedRow).some((val) => val && val.trim() !== '');
						if (hasContent) {
							rows.push(normalizedRow);
						}
					}

					// Stop parsing once we have enough rows
					if (rows.length >= maxRows) {
						parser.abort();
					}
				},
				complete: () => {
					resolve(rows);
				},
				error: (error: any) => {
					reject(new Error(`Failed to parse CSV: ${error.message}`));
				}
			});
		});
	}

	/**
	 * Override to use fast column-only loading instead of loading entire file
	 */
	async getColumns(): Promise<FileColumn[]> {
		await this.ensureColumnsLoaded();
		return this.columns;
	}

	/**
	 * Iterate through rows one at a time as an async generator
	 * TRULY STREAMING - yields rows as Papa.parse encounters them
	 * Does NOT wait for entire file to parse before yielding
	 * Uses Web Worker for background parsing
	 */
	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		console.log('[CSV Parser] getRowIterator started - TRUE STREAMING MODE');
		await this.ensureColumnsLoaded();
		console.log('[CSV Parser] Columns loaded, starting Papa.parse with streaming yields');

		const rowQueue: Record<string, string>[] = [];
		let parseComplete = false;
		let hasError: Error | null = null;
		let resolveWait: (() => void) | null = null;

		// Start parsing in background (don't await it!)
		console.log('[CSV Parser] Starting Papa.parse in background');
		Papa.parse(this.file, {
			header: true,
			dynamicTyping: false,
			skipEmptyLines: true,
			worker: true,
			step: (row) => {
				const rowData = row.data as Record<string, string>;
				const normalizedRow: Record<string, string> = {};
				Object.entries(rowData).forEach(([key, value]) => {
					const trimmedKey = key.trim();
					normalizedRow[trimmedKey] = String(value ?? '');
				});

				const hasContent = Object.values(normalizedRow).some((val) => val && val.trim() !== '');
				if (hasContent) {
					rowQueue.push(normalizedRow);
					if (rowQueue.length % 1000 === 0) {
						console.log(`[CSV Parser] Parsed ${rowQueue.length} rows so far...`);
					}
					// Wake up the async generator if it's waiting
					if (resolveWait) {
						resolveWait();
						resolveWait = null;
					}
				}
			},
			complete: () => {
				console.log(`[CSV Parser] Papa.parse completed. Total rows collected: ${rowQueue.length}`);
				parseComplete = true;
				// Wake up the async generator if it's waiting
				if (resolveWait) {
					resolveWait();
					resolveWait = null;
				}
			},
			error: (err: any) => {
				console.error('[CSV Parser] Papa.parse error:', err);
				hasError = new Error(`Failed to parse CSV: ${err.message}`);
				parseComplete = true;
				// Wake up the async generator if it's waiting
				if (resolveWait) {
					resolveWait();
					resolveWait = null;
				}
			}
		});

		// Yield rows as they become available
		console.log('[CSV Parser] Starting to yield rows as they arrive');
		let yieldedCount = 0;
		while (!parseComplete || rowQueue.length > 0) {
			if (rowQueue.length > 0) {
				const row = rowQueue.shift();
				if (row) {
					yieldedCount++;
					if (yieldedCount % 1000 === 0) {
						console.log(`[CSV Parser] Yielded ${yieldedCount} rows so far...`);
					}
					yield row;
				}
			} else if (!parseComplete) {
				// No rows available yet, but parsing not done - wait a bit
				await new Promise<void>((resolve) => {
					resolveWait = resolve;
					// Safety timeout in case Papa.parse doesn't call callbacks
					setTimeout(resolve, 10);
				});
			}
		}

		if (hasError) {
			throw hasError;
		}

		console.log(`[CSV Parser] Finished yielding all ${yieldedCount} rows`);
	}

	/**
	 * Get total row count by streaming through entire file
	 */
	async getTotalRowCount(): Promise<number> {
		await this.ensureColumnsLoaded();

		let count = 0;

		return new Promise((resolve, reject) => {
			Papa.parse(this.file, {
				header: true,
				dynamicTyping: false,
				skipEmptyLines: true,
				worker: true,
				step: (row) => {
					const rowData = row.data as Record<string, string>;
					const hasContent = Object.values(rowData).some((val) => String(val).trim() !== '');
					if (hasContent) {
						count++;
					}
				},
				complete: () => {
					resolve(count);
				},
				error: (error: any) => {
					reject(new Error(`Failed to parse CSV: ${error.message}`));
				}
			});
		});
	}

	/**
	 * Begin dumping CSV file to IndexedDB for reconciliation
	 */
	async beginFileDumpToIndexedDB(
		config: IndexedDBConfig,
		fileHash?: string,
		onProgress?: FileDumpProgressCallback
	): Promise<FileDumpResult> {
		return dumpCSVToIndexedDB(this.file, config, fileHash, onProgress);
	}
}

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
 * Returns only the first 20 rows to avoid memory issues with large files
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
	const fileType = getFileType(file);

	switch (fileType) {
		case 'csv':
		case 'txt':
			return await parseCSVStreaming(file);
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
 * Parse CSV file using streaming to only load first 20 rows for display
 */
async function parseCSVStreaming(file: File): Promise<ParsedFileData> {
	const parser = new StreamingCSVParser(file);
	const rows = await parser.getFirstXRows(20);

	if (rows.length === 0) {
		throw new Error('CSV file is empty or has no data rows');
	}

	const columns = await parser.getColumns();

	return {
		columns,
		rows,
		fileName: file.name,
		fileType: 'csv'
	};
}

/**
 * Excel file parser with streaming support
 */
export class StreamingExcelParser extends StreamingFileParser {
	private allRows: Record<string, string>[] = [];
	private loadPromise: Promise<void> | null = null;

	protected async ensureDataLoaded(): Promise<void> {
		if (this.cacheInitialized) return;
		if (this.loadPromise) return this.loadPromise;

		this.loadPromise = new Promise(async (resolve, reject) => {
			try {
				const xlsx = await import('xlsx');
				const arrayBuffer = await this.file.arrayBuffer();
				const workbook = xlsx.read(arrayBuffer, { type: 'array' });
				const firstSheetName = workbook.SheetNames[0];
				const worksheet = workbook.Sheets[firstSheetName];
				const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

				if (jsonData.length === 0) {
					throw new Error('Excel file is empty');
				}

				// Extract column names (first row)
				this.columnNames = (jsonData[0] as any[]).map((col) => String(col).trim());
				this.columns = createFileColumns(this.columnNames, []);

				// Extract data rows
				for (let i = 1; i < jsonData.length; i++) {
					const rowArray = jsonData[i] as any[];
					if (!rowArray || rowArray.length === 0) continue;

					const rowData: Record<string, string> = {};
					this.columnNames.forEach((column, index) => {
						rowData[column] = index < rowArray.length ? String(rowArray[index] ?? '') : '';
					});

					// Check if row has any content
					const hasContent = Object.values(rowData).some((val) => val && String(val).trim() !== '');
					if (hasContent) {
						this.allRows.push(rowData);
					}
				}

				this.cacheInitialized = true;
				this.totalRowCount = this.allRows.length;
				resolve();
			} catch (error) {
				this.cacheInitialized = true;
				reject(error);
			}
		});

		return this.loadPromise;
	}

	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		await this.ensureDataLoaded();
		return this.allRows.slice(0, maxRows);
	}

	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		console.log('[Excel Parser] getRowIterator started');
		await this.ensureDataLoaded();
		console.log(`[Excel Parser] Data loaded, yielding ${this.allRows.length} rows`);
		for (let i = 0; i < this.allRows.length; i++) {
			if (i % 1000 === 0) {
				console.log(`[Excel Parser] Yielding row ${i} of ${this.allRows.length}`);
			}
			yield this.allRows[i];
		}
		console.log(`[Excel Parser] Finished yielding all ${this.allRows.length} rows`);
	}

	async getTotalRowCount(): Promise<number> {
		await this.ensureDataLoaded();
		return this.totalRowCount;
	}

	/**
	 * Begin dumping Excel file to IndexedDB for reconciliation
	 */
	async beginFileDumpToIndexedDB(
		config: IndexedDBConfig,
		fileHash?: string,
		onProgress?: FileDumpProgressCallback
	): Promise<FileDumpResult> {
		// For Excel, we convert to CSV format and use the CSV dumper
		// This is a simplified implementation
		throw new Error('Excel file dumping to IndexedDB not yet implemented');
	}
}

/**
 * PDF file parser with streaming support
 */
export class StreamingPDFParser extends StreamingFileParser {
	private allRows: Record<string, string>[] = [];
	private loadPromise: Promise<void> | null = null;

	protected async ensureDataLoaded(): Promise<void> {
		if (this.cacheInitialized) return;
		if (this.loadPromise) return this.loadPromise;

		this.loadPromise = (async () => {
			try {
				const scanResult = await scanDocument(this.file);

				if (scanResult.columns && scanResult.rows && scanResult.rows.length > 0) {
					this.columnNames = scanResult.columns;
					this.columns = createFileColumns(this.columnNames, scanResult.rows);
					this.allRows = scanResult.rows;
					this.totalRowCount = scanResult.rows.length;
					this.cacheInitialized = true;
					return;
				}

				// If no table data, try to create columns from text
				const textLines = scanResult.text.split('\n').filter((line) => line.trim().length > 0);
				const firstLine = textLines[0] || '';
				const possibleColumns = firstLine.split(/\s{2,}|\t/);

				this.columnNames =
					possibleColumns.length > 1 && possibleColumns.every((col) => col.length < 50)
						? possibleColumns
						: ['Extracted Text'];

				this.columns = createFileColumns(this.columnNames, []);

				// Create rows from text lines
				for (let i = 1; i < textLines.length; i++) {
					const values = textLines[i].split(/\s{2,}|\t/);
					const rowData: Record<string, string> = {};

					this.columnNames.forEach((column, index) => {
						rowData[column] = index < values.length ? values[index] : '';
					});

					this.allRows.push(rowData);
				}

				this.totalRowCount = this.allRows.length;
				this.cacheInitialized = true;
			} catch (error) {
				this.cacheInitialized = true;
				throw new Error(
					`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		})();

		return this.loadPromise;
	}

	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		await this.ensureDataLoaded();
		return this.allRows.slice(0, maxRows);
	}

	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		console.log('[PDF Parser] getRowIterator started');
		await this.ensureDataLoaded();
		console.log(`[PDF Parser] Data loaded, yielding ${this.allRows.length} rows`);
		for (let i = 0; i < this.allRows.length; i++) {
			if (i % 1000 === 0) {
				console.log(`[PDF Parser] Yielding row ${i} of ${this.allRows.length}`);
			}
			yield this.allRows[i];
		}
		console.log(`[PDF Parser] Finished yielding all ${this.allRows.length} rows`);
	}

	async getTotalRowCount(): Promise<number> {
		await this.ensureDataLoaded();
		return this.totalRowCount;
	}

	/**
	 * Begin dumping PDF file to IndexedDB for reconciliation
	 */
	async beginFileDumpToIndexedDB(
		config: IndexedDBConfig,
		fileHash?: string,
		onProgress?: FileDumpProgressCallback
	): Promise<FileDumpResult> {
		// For PDF, we would need to implement a similar dumper
		// This is a simplified implementation
		throw new Error('PDF file dumping to IndexedDB not yet implemented');
	}
}

/**
 * Get streaming parser for a CSV file for row-by-row iteration
 */
export function getCSVStreamingParser(file: File): StreamingCSVParser {
	return new StreamingCSVParser(file);
}

/**
 * Get streaming parser for an Excel file
 */
export function getExcelStreamingParser(file: File): StreamingExcelParser {
	return new StreamingExcelParser(file);
}

/**
 * Get streaming parser for a PDF file
 */
export function getPDFStreamingParser(file: File): StreamingPDFParser {
	return new StreamingPDFParser(file);
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
			for (let i = 0; i < textLines.length; i++) {
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
			for (let i = 1; i < textLines.length; i++) {
				const values = textLines[i].split(/\s{2,}|\t/);
				const rowData: Record<string, string> = {};

				columnNames.forEach((column, index) => {
					rowData[column] = index < values.length ? values[index] : '';
				});

				rows.push(rowData);
			}
		} else {
			// Single column - each line is a row
			for (let i = 0; i < textLines.length; i++) {
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
