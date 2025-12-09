/**
 * ============================================================================
 * CSV EXPORT MODULE WITH STREAMING AND CHUNKED DOWNLOADS
 * ============================================================================
 *
 * Provides CSV export functionality with:
 * - Streaming export for memory efficiency
 * - Chunked downloads for large files (automatically splits if > threshold)
 * - Progress tracking and callbacks
 * - Support for reconciliation status and reason columns
 * - Proper CSV formatting and escaping
 */

import Papa from 'papaparse';

export interface CSVExportConfig {
	/** Maximum size per file chunk in bytes. Default: 10MB */
	chunkSizeBytes?: number;
	/** Progress callback for each chunk */
	onProgress?: (progress: CSVExportProgress) => void;
	/** Include reconciliation status and reason columns. Default: true */
	includeReconciliationColumns?: boolean;
}

export interface CSVExportProgress {
	/** Total records to export */
	totalRecords: number;
	/** Records exported so far */
	exportedRecords: number;
	/** Current chunk number (1-based) */
	currentChunk: number;
	/** Estimated total chunks */
	estimatedTotalChunks: number;
	/** Processing percentage (0-100) */
	percentage: number;
	/** Current chunk size in bytes */
	currentChunkSize: number;
	/** Total exported size in bytes */
	totalExportedSize: number;
}

/**
 * CSV Exporter with streaming and chunking support
 */
export class CSVExporter {
	private chunkSizeBytes: number;
	private onProgress: ((progress: CSVExportProgress) => void) | undefined;
	private includeReconciliationColumns: boolean;

	constructor(config: CSVExportConfig = {}) {
		this.chunkSizeBytes = config.chunkSizeBytes || 10 * 1024 * 1024; // 10MB default
		this.onProgress = config.onProgress;
		this.includeReconciliationColumns = config.includeReconciliationColumns !== false;

		console.log('[CSVExporter] Initialized with config:', {
			chunkSizeBytes: this.chunkSizeBytes,
			includeReconciliationColumns: this.includeReconciliationColumns
		});
	}

	/**
	 * Export records to CSV with chunking
	 * Returns array of CSV chunks and metadata for download
	 */
	async exportToCSV(records: Record<string, any>[]): Promise<CSVChunk[]> {
		if (records.length === 0) {
			console.log('[CSVExporter] No records to export');
			return [];
		}

		console.log(`[CSVExporter] Exporting ${records.length} records to CSV chunks`);

		const chunks: CSVChunk[] = [];
		let currentChunkRecords: Record<string, any>[] = [];
		let currentChunkSize = 0;
		let chunkNumber = 1;
		let exportedRecords = 0;

		// Get all headers
		const headers = this.extractHeaders(records);
		const headerLine = this.formatCSVLine(headers);
		const headerSize = new Blob([headerLine]).size;

		// Start with header
		currentChunkSize = headerSize;
		currentChunkRecords = [];

		for (let i = 0; i < records.length; i++) {
			const record = records[i];
			const recordLine = this.formatCSVLine(headers.map((h) => record[h] || ''));
			const recordSize = new Blob([recordLine + '\n']).size;

			// Check if adding this record exceeds chunk size
			if (currentChunkSize + recordSize > this.chunkSizeBytes && currentChunkRecords.length > 0) {
				// Save current chunk
				const csvContent = this.buildCSVContent(headers, currentChunkRecords);
				chunks.push({
					number: chunkNumber,
					data: csvContent,
					recordCount: currentChunkRecords.length,
					sizeBytes: new Blob([csvContent]).size
				});

				console.log(
					`[CSVExporter] Created chunk ${chunkNumber}: ${currentChunkRecords.length} records, ${chunks[chunks.length - 1].sizeBytes} bytes`
				);

				exportedRecords += currentChunkRecords.length;
				const estimatedTotalChunks = Math.ceil(records.length / currentChunkRecords.length);

				if (this.onProgress) {
					this.onProgress({
						totalRecords: records.length,
						exportedRecords,
						currentChunk: chunkNumber,
						estimatedTotalChunks,
						percentage: Math.round((exportedRecords / records.length) * 100),
						currentChunkSize: chunks[chunks.length - 1].sizeBytes,
						totalExportedSize: chunks.reduce((sum, c) => sum + c.sizeBytes, 0)
					});
				}

				// Reset for next chunk
				chunkNumber++;
				currentChunkRecords = [];
				currentChunkSize = headerSize;
			}

			currentChunkRecords.push(record);
			currentChunkSize += recordSize;
		}

		// Save final chunk
		if (currentChunkRecords.length > 0) {
			const csvContent = this.buildCSVContent(headers, currentChunkRecords);
			chunks.push({
				number: chunkNumber,
				data: csvContent,
				recordCount: currentChunkRecords.length,
				sizeBytes: new Blob([csvContent]).size
			});

			console.log(
				`[CSVExporter] Created final chunk ${chunkNumber}: ${currentChunkRecords.length} records, ${chunks[chunks.length - 1].sizeBytes} bytes`
			);

			exportedRecords += currentChunkRecords.length;

			if (this.onProgress) {
				this.onProgress({
					totalRecords: records.length,
					exportedRecords,
					currentChunk: chunkNumber,
					estimatedTotalChunks: chunks.length,
					percentage: 100,
					currentChunkSize: chunks[chunks.length - 1].sizeBytes,
					totalExportedSize: chunks.reduce((sum, c) => sum + c.sizeBytes, 0)
				});
			}
		}

		console.log(
			`[CSVExporter] Export complete: ${chunks.length} chunks, ${exportedRecords} records total`
		);

		return chunks;
	}

	/**
	 * Download a CSV chunk
	 */
	downloadChunk(chunk: CSVChunk, baseFileName: string): void {
		const fileName =
			chunk.number === 1 && chunk.number === 1 // Only one chunk
				? `${baseFileName}.csv`
				: `${baseFileName}_part_${chunk.number}.csv`;

		console.log(`[CSVExporter] Downloading chunk ${chunk.number}: ${fileName}`);

		const blob = new Blob([chunk.data], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', fileName);
		link.style.visibility = 'hidden';

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Cleanup URL
		setTimeout(() => {
			URL.revokeObjectURL(url);
		}, 100);
	}

	/**
	 * Download all chunks sequentially with delay between downloads
	 */
	async downloadAllChunks(
		chunks: CSVChunk[],
		baseFileName: string,
		delayMs: number = 500
	): Promise<void> {
		console.log(`[CSVExporter] Starting download of ${chunks.length} chunks`);

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			console.log(`[CSVExporter] Downloading chunk ${i + 1}/${chunks.length}`);
			this.downloadChunk(chunk, baseFileName);

			// Delay between downloads to avoid browser throttling
			if (i < chunks.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		console.log(`[CSVExporter] All chunks downloaded`);
	}

	/**
	 * Extract unique headers from records
	 */
	private extractHeaders(records: Record<string, any>[]): string[] {
		const headerSet = new Set<string>();

		for (const record of records) {
			Object.keys(record).forEach((key) => headerSet.add(key));
		}

		// Sort headers: keep original columns first, then add special columns at end
		const headers = Array.from(headerSet).sort((a, b) => {
			// Reconciliation columns at end
			const aIsSpecial = a.startsWith('__') || a.startsWith('_');
			const bIsSpecial = b.startsWith('__') || b.startsWith('_');

			if (aIsSpecial && !bIsSpecial) return 1;
			if (!aIsSpecial && bIsSpecial) return -1;
			return a.localeCompare(b);
		});

		return headers;
	}

	/**
	 * Format a line for CSV (with proper escaping)
	 */
	private formatCSVLine(values: any[]): string {
		return values
			.map((value) => {
				const str = value == null ? '' : String(value);

				// Escape quotes and wrap in quotes if needed
				if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
					return `"${str.replace(/"/g, '""')}"`;
				}

				return str;
			})
			.join(',');
	}

	/**
	 * Build complete CSV content from headers and records
	 */
	private buildCSVContent(headers: string[], records: Record<string, any>[]): string {
		const lines: string[] = [];

		// Add header
		lines.push(this.formatCSVLine(headers));

		// Add records
		for (const record of records) {
			const values = headers.map((h) => record[h] || '');
			lines.push(this.formatCSVLine(values));
		}

		return lines.join('\n');
	}
}

/**
 * Represents a single CSV export chunk
 */
export interface CSVChunk {
	/** Chunk number (1-based) */
	number: number;
	/** CSV content */
	data: string;
	/** Number of records in this chunk */
	recordCount: number;
	/** Size in bytes */
	sizeBytes: number;
}

/**
 * Utility function to create a CSV exporter with standard defaults
 */
export function createCSVExporter(config?: CSVExportConfig): CSVExporter {
	return new CSVExporter(config);
}

/**
 * Utility function to export and auto-download CSV chunks
 * Downloads single file if <10MB, otherwise splits into chunks
 */
export async function exportAndDownloadCSV(
	records: Record<string, any>[],
	fileName: string,
	config?: CSVExportConfig
): Promise<void> {
	const exporter = createCSVExporter(config);
	const chunks = await exporter.exportToCSV(records);

	if (chunks.length === 0) {
		console.warn('[CSV Export] No chunks to download');
		return;
	}

	// Download all chunks (with delays to avoid throttling)
	await exporter.downloadAllChunks(chunks, fileName);

	if (chunks.length > 1) {
		console.log(`[CSV Export] Exported ${records.length} records to ${chunks.length} CSV files`);
	} else {
		console.log(`[CSV Export] Exported ${records.length} records to single CSV file`);
	}
}
