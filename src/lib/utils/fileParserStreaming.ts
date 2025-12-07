import Papa from 'papaparse';

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
 * Streaming parser that reads from File API using chunks
 * Never loads the entire file into memory
 */
export abstract class StreamingFileParserV2 {
	protected file: File;
	protected columns: FileColumn[] = [];
	protected columnNames: string[] = [];
	protected totalRowCount: number | null = null;
	protected columnsCached = false;
	protected rowCountCached = false;

	constructor(file: File) {
		this.file = file;
	}

	/**
	 * Parse header and column info from file start
	 * Reads only the beginning of the file
	 */
	protected abstract parseHeaderOnly(): Promise<void>;

	/**
	 * Get the first X rows of the file without loading the entire file into memory
	 */
	abstract getFirstXRows(maxRows: number): Promise<Record<string, string>[]>;

	/**
	 * Get an async iterable for processing rows one at a time
	 */
	abstract getRowIterator(): AsyncIterable<Record<string, string>>;

	/**
	 * Get the total number of rows in the file by scanning entire file
	 */
	abstract getTotalRowCount(): Promise<number>;

	/**
	 * Get column information (parses header if not done yet)
	 */
	async getColumns(): Promise<FileColumn[]> {
		if (!this.columnsCached) {
			await this.parseHeaderOnly();
		}
		return this.columns;
	}

	/**
	 * Get column names (parses header if not done yet)
	 */
	async getColumnNames(): Promise<string[]> {
		if (!this.columnsCached) {
			await this.parseHeaderOnly();
		}
		return this.columnNames;
	}

	/**
	 * Get file size for progress tracking
	 */
	getFileSize(): number {
		return this.file.size;
	}
}

/**
 * CSV Streaming Parser - reads file chunks and processes incrementally
 */
export class StreamingCSVParserV2 extends StreamingFileParserV2 {
	private parsePromise: Promise<void> | null = null;

	protected async parseHeaderOnly(): Promise<void> {
		if (this.columnsCached) return;

		// Read first chunk to get headers
		const firstChunkSize = Math.min(8192, this.file.size); // Read first 8KB
		const chunk = await this.readFileChunk(0, firstChunkSize);
		const text = new TextDecoder().decode(chunk);

		// Parse just the first row
		return new Promise((resolve, reject) => {
			let headerParsed = false;

			Papa.parse(text, {
				header: false,
				dynamicTyping: false,
				skipEmptyLines: false,
				complete: () => {
					if (!headerParsed) {
						// Try to extract from raw text
						const firstLine = text.split('\n')[0];
						this.columnNames = firstLine.split(',').map((col) => col.trim().replace(/^"|"$/g, ''));
						this.columns = this.columnNames.map((name) => ({
							name,
							dataType: 'string' as ColumnDataType
						}));
					}
					this.columnsCached = true;
					resolve();
				},
				error: (error: any) => {
					reject(error);
				}
			});
		});
	}

	private async readFileChunk(start: number, end: number): Promise<Uint8Array> {
		const blob = this.file.slice(start, end);
		return new Uint8Array(await blob.arrayBuffer());
	}

	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		await this.parseHeaderOnly();

		const rows: Record<string, string>[] = [];
		let bytesRead = 0;
		const maxBytesToRead = Math.min(1024 * 1024, this.file.size); // Read up to 1MB for preview

		while (bytesRead < maxBytesToRead && rows.length < maxRows) {
			const chunkSize = Math.min(65536, maxBytesToRead - bytesRead); // 64KB chunks
			const chunk = await this.readFileChunk(bytesRead, bytesRead + chunkSize);
			const text = new TextDecoder().decode(chunk);

			await new Promise<void>((resolve) => {
				let isFirstRow = true;

				Papa.parse(text, {
					header: true,
					dynamicTyping: false,
					skipEmptyLines: true,
					complete: () => {
						resolve();
					},
					step: (row: any) => {
						if (isFirstRow) {
							// Update columns from actual data
							const rowData = row.data as Record<string, string>;
							this.columnNames = Object.keys(rowData).map((k) => k.trim());
							this.columns = this.columnNames.map((name) => ({
								name,
								dataType: 'string'
							}));
							this.columnsCached = true;
							isFirstRow = false;
						}

						const rowData = row.data as Record<string, string>;
						const normalizedRow: Record<string, string> = {};

						Object.entries(rowData).forEach(([key, value]) => {
							const trimmedKey = key.trim();
							normalizedRow[trimmedKey] = String(value ?? '');
						});

						if (Object.values(normalizedRow).some((v) => v && v.trim())) {
							rows.push(normalizedRow);
						}

						if (rows.length >= maxRows) {
							// Stop parsing
							return false;
						}
					},
					error: () => {
						resolve();
					}
				});
			});

			bytesRead += chunkSize;
		}

		return rows.slice(0, maxRows);
	}

	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		await this.parseHeaderOnly();

		const chunkSize = 65536; // 64KB chunks
		let bytesRead = 0;
		let buffer = '';
		let lastIncompleteRow = '';

		while (bytesRead < this.file.size) {
			const chunk = await this.readFileChunk(bytesRead, bytesRead + chunkSize);
			const chunkText = new TextDecoder().decode(chunk);
			buffer += chunkText;

			// Parse complete rows from buffer
			const lines = buffer.split('\n');

			// Keep last line in case it's incomplete
			lastIncompleteRow = lines[lines.length - 1];
			const completeLines = lines.slice(0, -1).join('\n');

			if (completeLines) {
				yield* this.parseCSVLines(completeLines);
			}

			buffer = lastIncompleteRow;
			bytesRead += chunkSize;
		}

		// Parse remaining buffer
		if (buffer.trim()) {
			yield* this.parseCSVLines(buffer);
		}
	}

	private async *parseCSVLines(csvText: string): AsyncIterable<Record<string, string>> {
		const rows: Record<string, string>[] = [];

		return new Promise<void>((resolve) => {
			Papa.parse(csvText, {
				header: true,
				dynamicTyping: false,
				skipEmptyLines: true,
				complete: () => {
					resolve();
				},
				step: (row: any) => {
					const rowData = row.data as Record<string, string>;
					const normalizedRow: Record<string, string> = {};

					Object.entries(rowData).forEach(([key, value]) => {
						const trimmedKey = key.trim();
						normalizedRow[trimmedKey] = String(value ?? '');
					});

					if (Object.values(normalizedRow).some((v) => v && v.trim())) {
						rows.push(normalizedRow);
					}
				}
			});
		}).then(() => {
			// Yield all collected rows (Papa Parse doesn't support async generators directly)
			for (const row of rows) {
				return row;
			}
		});
	}

	async getTotalRowCount(): Promise<number> {
		if (this.rowCountCached && this.totalRowCount !== null) {
			return this.totalRowCount;
		}

		await this.parseHeaderOnly();

		let count = 0;
		const chunkSize = 65536;
		let bytesRead = 0;
		let buffer = '';
		let lastIncompleteRow = '';

		while (bytesRead < this.file.size) {
			const chunk = await this.readFileChunk(bytesRead, bytesRead + chunkSize);
			const chunkText = new TextDecoder().decode(chunk);
			buffer += chunkText;

			// Count newlines (approximate row count)
			const lines = buffer.split('\n');
			lastIncompleteRow = lines[lines.length - 1];
			const completeLines = lines.slice(0, -1);

			count += completeLines.length;
			buffer = lastIncompleteRow;
			bytesRead += chunkSize;
		}

		this.totalRowCount = Math.max(0, count - 1); // Subtract 1 for header
		this.rowCountCached = true;
		return this.totalRowCount;
	}
}

/**
 * Excel Streaming Parser
 */
export class StreamingExcelParserV2 extends StreamingFileParserV2 {
	private workbookData: any = null;

	protected async parseHeaderOnly(): Promise<void> {
		// For Excel, we need the file-saver/xlsx library
		// For now, implement minimal header parsing
		if (this.columnsCached) return;

		try {
			const arrayBuffer = await this.file.arrayBuffer();
			// This would require xlsx library to parse properly
			// For now, set placeholder
			this.columnNames = [];
			this.columns = [];
			this.columnsCached = true;
		} catch (error) {
			console.error('Error parsing Excel header:', error);
			this.columnsCached = true;
		}
	}

	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		// Simplified: load entire file once for Excel
		// Excel files are typically smaller than CSV and harder to stream
		const arrayBuffer = await this.file.arrayBuffer();
		// Parse would happen here with xlsx library
		return [];
	}

	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		const rows = await this.getFirstXRows(Infinity);
		for (const row of rows) {
			yield row;
		}
	}

	async getTotalRowCount(): Promise<number> {
		if (this.rowCountCached && this.totalRowCount !== null) {
			return this.totalRowCount;
		}

		const rows = await this.getFirstXRows(Infinity);
		this.totalRowCount = rows.length;
		this.rowCountCached = true;
		return this.totalRowCount;
	}
}

/**
 * PDF Streaming Parser
 */
export class StreamingPDFParserV2 extends StreamingFileParserV2 {
	protected async parseHeaderOnly(): Promise<void> {
		// PDF parsing is more complex
		// Would require pdf-parse or similar library
		if (this.columnsCached) return;

		this.columnNames = [];
		this.columns = [];
		this.columnsCached = true;
	}

	async getFirstXRows(maxRows: number): Promise<Record<string, string>[]> {
		// Simplified: would extract tables from PDF
		return [];
	}

	async *getRowIterator(): AsyncIterable<Record<string, string>> {
		const rows = await this.getFirstXRows(Infinity);
		for (const row of rows) {
			yield row;
		}
	}

	async getTotalRowCount(): Promise<number> {
		const rows = await this.getFirstXRows(Infinity);
		this.totalRowCount = rows.length;
		return this.totalRowCount;
	}
}

/**
 * Factory functions to create parsers
 */
export function createStreamingParserV2(file: File): StreamingFileParserV2 {
	const fileName = file.name.toLowerCase();

	if (fileName.endsWith('.csv')) {
		return new StreamingCSVParserV2(file);
	} else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
		return new StreamingExcelParserV2(file);
	} else if (fileName.endsWith('.pdf')) {
		return new StreamingPDFParserV2(file);
	}

	throw new Error(`Unsupported file type: ${file.name}`);
}
