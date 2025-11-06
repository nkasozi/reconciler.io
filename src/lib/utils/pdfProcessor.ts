// PDF data extraction focused on tabular data, not rendering

export interface PDFTableData {
	headers: string[];
	rows: string[][];
	rawText: string;
	confidence: number;
	metadata?: {
		title?: string;
		pages: number;
	};
}

export interface PDFExtractionResult {
	tables: PDFTableData[];
	success: boolean;
	error?: string;
}

/**
 * Extract tabular data from a PDF file
 */
export async function extractTablesFromPDF(file: File): Promise<PDFExtractionResult> {
	if (typeof window === 'undefined') {
		throw new Error('PDF processing is only available in browser environment');
	}

	try {
		// Use unpdf for text extraction and table detection
		const { extractText, getDocumentProxy } = await import('unpdf');

		// Initialize tables array
		const tables: PDFTableData[] = [];

		// Get array buffer from file
		const arrayBuffer = await file.arrayBuffer();

		// Extract text from PDF using unpdf
		const textResult = await extractText(arrayBuffer);

		// unpdf returns { totalPages, text: string[] }
		// Join all pages' text together
		const fullText = textResult.text.join('\n');

		// Since unpdf doesn't have direct table extraction,
		// we'll extract text and then parse it for table structures
		const extractedTables = extractTablesFromText(fullText);

		// Combine small tables that likely belong together
		const combinedTables = combineRelatedTables(extractedTables);

		// Add the extracted tables to our results
		tables.push(...combinedTables);
		
		// If no tables found, create a fallback
		if (tables.length === 0) {
			tables.push({
				headers: ['Content'],
				rows: [['No table data found in PDF']],
				rawText: 'No table data found in PDF',
				confidence: 0.5,
				metadata: { pages: 1 }
			});
		}

		return {
			tables,
			success: true
		};
	} catch (error) {
		console.error('Error extracting tables from PDF:', error);
		return {
			tables: [],
			success: false,
			error: `Failed to extract tables from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Simple PDF text extraction - placeholder implementation
 * In production, use a proper PDF library like pdf-lib or pdfjs-dist
 */
async function extractTextFromPDFArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
	// This is a very basic implementation that looks for text patterns in PDF
	// For production, you'd want to use a proper PDF parsing library
	const uint8Array = new Uint8Array(arrayBuffer);
	const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });

	// Try to decode as text - this will only work for very simple PDFs
	let text = '';
	try {
		text = decoder.decode(uint8Array);
		// Remove PDF binary data and keep only readable text
		text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
		// Clean up multiple spaces and empty lines
		text = text.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
	} catch (e) {
		// If decoding fails, return empty string
		console.warn('Failed to extract text from PDF - may need proper PDF library');
		text = '';
	}

	return text.trim();
}

/**
 * Combine small related tables into larger ones
 */
function combineRelatedTables(tables: PDFTableData[]): PDFTableData[] {
	if (tables.length <= 1) return tables;

	const combined: PDFTableData[] = [];
	let currentCombined: PDFTableData | null = null;

	for (const table of tables) {
		if (!currentCombined) {
			currentCombined = { ...table };
		} else {
			// Check if this table should be combined with the current one
			const shouldCombine = 
				table.headers.length === currentCombined.headers.length &&
				table.rows.length > 0 &&
				currentCombined.rows.length < 50; // Don't create overly large tables

			if (shouldCombine) {
				// Combine the rows
				currentCombined.rows.push(...table.rows);
				currentCombined.rawText += '\n' + table.rawText;
				currentCombined.confidence = Math.min(currentCombined.confidence, table.confidence);
			} else {
				// Save the current combined table and start a new one
				combined.push(currentCombined);
				currentCombined = { ...table };
			}
		}
	}

	// Don't forget the last table
	if (currentCombined) {
		combined.push(currentCombined);
	}

	return combined;
}

/**
 * Parse text content to detect and extract tabular data
 */
function extractTablesFromText(text: string): PDFTableData[] {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	const tables: PDFTableData[] = [];

	// Look for common table patterns
	const potentialTables = detectTableStructures(lines);

	for (const tableLines of potentialTables) {
		const tableData = parseTableLines(tableLines);
		if (tableData && tableData.rows.length > 0) {
			tables.push(tableData);
		}
	}

	// If no structured tables found, try to create a simple two-column table from key-value pairs
	if (tables.length === 0) {
		const kvTable = extractKeyValuePairs(lines);
		if (kvTable) {
			tables.push(kvTable);
		}
	}

	return tables;
}

/**
 * Detect potential table structures in text lines
 */
function detectTableStructures(lines: string[]): string[][] {
	console.log('Detecting table structures in', lines.length, 'lines');

	const tables: string[][] = [];
	let currentTable: string[] = [];
	let consecutiveTableLines = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check if line looks like a table row (has multiple separators)
		const isTableLike = isTableRow(line);

		if (isTableLike) {
			currentTable.push(line);
			consecutiveTableLines++;
		} else {
			// Allow for occasional non-table lines (like empty lines or separators)
			// Only break the table if we have 2+ non-table lines in a row
			if (line.trim().length === 0 || line.match(/^[-=_\s|+]+$/)) {
				// Skip empty lines or separator lines, but don't break the table
				if (currentTable.length > 0) {
					// Don't reset, just skip this line
					continue;
				}
			} else {
				// Non-table content - save current table if it's significant
				if (consecutiveTableLines >= 2) {
					tables.push([...currentTable]);
				}
				currentTable = [];
				consecutiveTableLines = 0;
			}
		}
	}

	// Don't forget the last table if file ends with one
	if (consecutiveTableLines >= 2) {
		tables.push(currentTable);
	}

	// If no tables found through strict detection, try a more lenient approach
	if (tables.length === 0 && lines.length > 3) {
		console.log('No strict tables found, trying lenient approach...');
		// Look for any section that has consistent spacing patterns
		const potentialTable = lines.filter(
			(line) =>
				line.trim().length > 10 && // Not too short
				(line.includes('  ') || line.includes('\t') || line.includes('|')) // Has some separation
		);

		console.log('Potential table lines found:', potentialTable.length);

		if (potentialTable.length >= 3) {
			tables.push(potentialTable);
		}
	}

	console.log('Final tables detected:', tables.length);
	tables.forEach((table, i) => {
		console.log(`Table ${i + 1}: ${table.length} lines`);
	});

	return tables;
}

/**
 * Check if a line looks like it could be part of a table
 */
function isTableRow(line: string): boolean {
	// Common table separators
	const separators = ['\t', '|', ',', '  ', ';'];

	// Count separators
	let separatorCount = 0;
	for (const sep of separators) {
		const count = (
			line.match(
				new RegExp(sep === '|' ? '\\|' : sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
			) || []
		).length;
		if (count >= 2) {
			// At least 2 separators = 3 columns
			separatorCount = Math.max(separatorCount, count);
		}
	}

	return separatorCount >= 2;
}

/**
 * Parse table lines into structured data
 */
function parseTableLines(lines: string[]): PDFTableData | null {
	console.log('Parsing table lines:', lines.length);
	if (lines.length < 2) return null;

	// Try different separators to find the best one
	const separators = [/\s{3,}/, '\t', '|', ',', /\s{2,}/, ';'];
	let bestSeparator: string | RegExp = /\s{3,}/;
	let maxColumns = 0;
	let bestColumnConsistency = 0;

	// Find the separator that gives the most consistent column count
	for (const sep of separators) {
		const allParsedLines = lines.map((line) => {
			const parts = typeof sep === 'string' ? line.split(sep) : line.split(sep);
			return parts.map((part) => part.trim()).filter((part) => part.length > 0);
		});

		// Calculate consistency - how many lines have the same number of columns
		const columnCounts = allParsedLines.map((parts) => parts.length);
		const maxCount = Math.max(...columnCounts);
		const consistency =
			columnCounts.filter((count) => count === maxCount).length / columnCounts.length;
		const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;

		if (
			avgColumns >= 2 &&
			(avgColumns > maxColumns ||
				(avgColumns === maxColumns && consistency > bestColumnConsistency))
		) {
			maxColumns = avgColumns;
			bestColumnConsistency = consistency;
			bestSeparator = sep;
		}
	}

	if (maxColumns < 2) return null;

	// Parse using the best separator
	const allRows: string[][] = [];
	let headers: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const parts =
			typeof bestSeparator === 'string' ? line.split(bestSeparator) : line.split(bestSeparator);
		const cleanParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);

		if (cleanParts.length >= 2) {
			allRows.push(cleanParts);
		}
	}

	// Smart header detection - look for first row that might be headers
	let headerRowIndex = 0;

	// Try to detect headers by looking for:
	// 1. First row with text that looks like column names (no numbers, reasonable length)
	// 2. Or just use the first row if no clear headers found
	for (let i = 0; i < Math.min(3, allRows.length); i++) {
		const row = allRows[i];
		const looksLikeHeaders = row.every((cell) => {
			// Headers typically don't start with numbers and aren't too long
			return !/^\d/.test(cell) && cell.length < 50 && cell.length > 1;
		});

		if (looksLikeHeaders) {
			headerRowIndex = i;
			break;
		}
	}

	if (allRows.length === 0) return null;

	headers = allRows[headerRowIndex] || [];
	const dataRows = allRows.slice(headerRowIndex + 1);

	console.log('Headers found:', headers);
	console.log('Data rows:', dataRows.length);
	console.log('Sample data rows:', dataRows.slice(0, 3));

	// If we didn't find good headers, create generic ones
	if (headers.length === 0 && allRows.length > 0) {
		const maxCols = Math.max(...allRows.map((row) => row.length));
		headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
		dataRows.push(...allRows);
	}

	return {
		headers,
		rows: dataRows,
		rawText: lines.join('\n'),
		confidence: calculateConfidence(headers, dataRows),
		metadata: {
			title: `Table with ${headers.length} columns`,
			pages: 1
		}
	};
}

/**
 * Extract key-value pairs as a fallback table structure
 */
function extractKeyValuePairs(lines: string[]): PDFTableData | null {
	const kvPairs: string[][] = [];

	for (const line of lines) {
		// Look for patterns like "Key: Value" or "Key = Value"
		const kvMatch = line.match(/^([^:=]+)[:=]\s*(.+)$/);
		if (kvMatch) {
			const key = kvMatch[1].trim();
			const value = kvMatch[2].trim();
			if (key && value) {
				kvPairs.push([key, value]);
			}
		}
	}

	if (kvPairs.length < 2) return null;

	return {
		headers: ['Field', 'Value'],
		rows: kvPairs,
		rawText: lines.join('\n'),
		confidence: 0.7, // Lower confidence for key-value extraction
		metadata: {
			title: 'Key-Value Data',
			pages: 1
		}
	};
}

/**
 * Calculate confidence score for extracted table
 */
function calculateConfidence(headers: string[], rows: string[][]): number {
	if (headers.length === 0 || rows.length === 0) return 0;

	let score = 0.5; // Base score

	// More columns generally means better structure
	score += Math.min(headers.length * 0.1, 0.3);

	// More rows means more data
	score += Math.min(rows.length * 0.02, 0.2);

	// Consistent row lengths
	const expectedLength = headers.length;
	const consistentRows = rows.filter((row) => Math.abs(row.length - expectedLength) <= 1).length;
	const consistency = consistentRows / rows.length;
	score += consistency * 0.2;

	// Check for numeric data (often indicates structured data)
	let numericCells = 0;
	let totalCells = 0;
	rows.forEach((row) => {
		row.forEach((cell) => {
			totalCells++;
			if (!isNaN(Number(cell.replace(/[,$%]/g, '')))) {
				numericCells++;
			}
		});
	});

	if (totalCells > 0) {
		score += (numericCells / totalCells) * 0.1;
	}

	return Math.min(score, 1.0);
}

/**
 * Check if a file is a PDF
 */
export function isPDF(file: File): boolean {
	return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Render PDF page to canvas for OCR processing
 */
export async function renderPDFPageToCanvas(
	file: File,
	pageNumber: number = 1
): Promise<HTMLCanvasElement> {
	if (typeof window === 'undefined') {
		throw new Error('PDF processing is only available in browser environment');
	}

	try {
		const pdfjsLib = await import('pdfjs-dist');

		// Try using a working CDN URL for the worker
		pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

		const arrayBuffer = await file.arrayBuffer();
		const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
		const page = await pdf.getPage(pageNumber);

		// Get page dimensions
		const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR quality

		// Create canvas
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');

		if (!context) {
			throw new Error('Could not get canvas context');
		}

		canvas.height = viewport.height;
		canvas.width = viewport.width;

		// Render PDF page to canvas
		const renderContext = {
			canvasContext: context,
			viewport: viewport,
			canvas: canvas
		};

		await page.render(renderContext).promise;
		return canvas;
	} catch (error) {
		console.error('Error rendering PDF page to canvas:', error);
		throw new Error(
			`Failed to render PDF page: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}
