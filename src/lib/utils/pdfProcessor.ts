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

	// For financial/transaction data, combine all tables with similar structure
	const combined: PDFTableData[] = [];
	let mainTable: PDFTableData | null = null;

	for (const table of tables) {
		if (!mainTable) {
			// Start with the first table
			mainTable = { ...table };
		} else {
			// For financial data, combine if:
			// 1. Similar number of columns (within 1-2 columns)
			// 2. Not too large already
			const columnDiff = Math.abs(table.headers.length - mainTable.headers.length);
			const shouldCombine =
				columnDiff <= 2 && // Allow slight column variation
				mainTable.rows.length < 100; // Don't create overly large tables

			if (shouldCombine) {
				// Combine the rows - pad shorter rows if needed
				const maxColumns = Math.max(table.headers.length, mainTable.headers.length);

				// Update headers to accommodate more columns if needed
				if (table.headers.length > mainTable.headers.length) {
					// Extend main table headers
					for (let i = mainTable.headers.length; i < maxColumns; i++) {
						mainTable.headers.push(`Column ${i + 1}`);
					}
				}

				// Add table rows, padding if necessary
				for (const row of table.rows) {
					const paddedRow = [...row];
					while (paddedRow.length < maxColumns) {
						paddedRow.push('');
					}
					mainTable.rows.push(paddedRow);
				}

				mainTable.rawText += '\n' + table.rawText;
				mainTable.confidence = Math.min(mainTable.confidence, table.confidence);
			} else {
				// Save the current combined table and start a new one
				if (mainTable.rows.length > 0) {
					combined.push(mainTable);
				}
				mainTable = { ...table };
			}
		}
	}

	// Don't forget the last table
	if (mainTable && mainTable.rows.length > 0) {
		combined.push(mainTable);
	}

	return combined.length > 0 ? combined : tables;
}

/**
 * Parse text content to detect and extract tabular data
 */
function extractTablesFromText(text: string): PDFTableData[] {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	console.log(`\n📄 Processing ${lines.length} lines from PDF text`);
	console.log(`First 5 lines:`);
	lines.slice(0, 5).forEach((line, i) => {
		console.log(`  ${i + 1}: "${line}"`);
	});

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
	const tables: string[][] = [];
	let currentTable: string[] = [];
	let consecutiveTableLines = 0;

	let nonTableLineCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check if line looks like a table row (has multiple separators)
		const isTableLike = isTableRow(line);

		if (isTableLike) {
			currentTable.push(line);
			consecutiveTableLines++;
			nonTableLineCount = 0; // Reset non-table line counter
		} else {
			// Allow for occasional non-table lines (like empty lines or separators)
			if (line.trim().length === 0 || line.match(/^[-=_\s|+]+$/)) {
				// Skip empty lines or separator lines, but don't break the table
				if (currentTable.length > 0) {
					// Don't reset, just skip this line
					continue;
				}
			} else {
				nonTableLineCount++;

				// Only break the table after several non-table lines
				// This prevents breaking on occasional formatting lines
				if (nonTableLineCount >= 3) {
					// Non-table content - save current table if it's significant
					if (consecutiveTableLines >= 2) {
						tables.push([...currentTable]);
					}
					currentTable = [];
					consecutiveTableLines = 0;
					nonTableLineCount = 0;
				}
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

		if (potentialTable.length >= 3) {
			tables.push(potentialTable);
		}
	}

	return tables;
}

/**
 * Check if a line looks like it could be part of a table
 */
function isTableRow(line: string): boolean {
	// Common table separators - include single space to catch headers and data
	const separators = ['\t', '|', '  ', ' ', ';'];

	// Count separators
	let separatorCount = 0;
	let detectedSeparator = '';

	for (const sep of separators) {
		const count = (
			line.match(
				new RegExp(sep === '|' ? '\\|' : sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
			) || []
		).length;
		if (count >= 2) {
			// At least 2 separators = 3 columns
			if (count > separatorCount) {
				separatorCount = count;
				detectedSeparator = sep === '  ' ? 'double-space' : sep === ' ' ? 'single-space' : sep;
			}
		}
	}

	const isTable = separatorCount >= 2;
	if (isTable) {
		console.log(
			`✓ Table row detected: "${line.substring(0, 50)}..." | Separator: "${detectedSeparator}" | Count: ${separatorCount}`
		);
	} else {
		// Also log lines that look like they might be table data or headers but aren't detected
		if (line.length > 10 && (line.includes(' ') || /\d/.test(line))) {
			console.log(`✗ Not detected as table: "${line.substring(0, 50)}..."`);
		}
	}

	return isTable;
}

/**
 * Smart parsing for financial data lines that preserves number formatting
 */
function parseFinancialDataLine(line: string): string[] {
	// For financial data, we want to split on multiple spaces but preserve comma-formatted numbers
	// Use regex to match tokens (including comma-formatted numbers)
	const tokens = line.match(/\S+/g) || [];

	// Filter out empty tokens and return
	return tokens.filter((token) => token.trim().length > 0);
}

/**
 * Parse table lines into structured data
 */
function parseTableLines(lines: string[]): PDFTableData | null {
	if (lines.length < 2) return null;

	console.log(`\n🔍 Parsing ${lines.length} table lines:`);
	lines.slice(0, 3).forEach((line, i) => {
		console.log(`   ${i + 1}: "${line}"`);
	});

	// Try different separators to find the best one
	// Note: Prioritize space patterns and avoid commas in numbers
	const separators = [
		/\s+/, // Any whitespace (most flexible)
		/\s{2,}/, // 2+ spaces
		/\s{3,}/, // 3+ spaces
		'\t', // Tab
		'|', // Pipe
		';' // Semicolon (avoid comma to prevent splitting numbers)
	];
	let bestSeparator: string | RegExp = /\s+/;
	let maxColumns = 0;
	let bestColumnConsistency = 0;

	// Find the separator that gives the most consistent column count
	for (const sep of separators) {
		let allParsedLines;

		if (typeof sep === 'string') {
			allParsedLines = lines.map((line) => {
				const parts = line.split(sep);
				return parts.map((part) => part.trim()).filter((part) => part.length > 0);
			});
		} else {
			// For regex separators, use smarter splitting for financial data
			allParsedLines = lines.map((line) => {
				return parseFinancialDataLine(line);
			});
		}

		// Calculate consistency - how many lines have the same number of columns
		const columnCounts = allParsedLines.map((parts) => parts.length);
		const maxCount = Math.max(...columnCounts);
		const consistency =
			columnCounts.filter((count) => count === maxCount).length / columnCounts.length;
		const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;

		// Debug output for separator testing
		const separatorName = typeof sep === 'string' ? sep : sep.toString();
		console.log(
			`  📊 Testing separator "${separatorName}": avgCols=${avgColumns.toFixed(1)}, consistency=${(consistency * 100).toFixed(0)}%, maxCount=${maxCount}`
		);

		// Show sample parsing with this separator
		if (allParsedLines.length > 0) {
			console.log(`     Sample: [${allParsedLines[0].slice(0, 3).join(' | ')}]`);
		}

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

	const bestSeparatorName =
		typeof bestSeparator === 'string' ? bestSeparator : bestSeparator.toString();
	console.log(
		`  🏆 Winner: "${bestSeparatorName}" with ${maxColumns.toFixed(1)} avg columns, ${(bestColumnConsistency * 100).toFixed(0)}% consistency`
	);

	if (maxColumns < 2) {
		console.log(`  ❌ No good separator found (max columns: ${maxColumns})`);
		return null;
	}

	// Parse using the best separator
	const allRows: string[][] = [];
	let headers: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		let cleanParts: string[];

		if (typeof bestSeparator === 'string') {
			const parts = line.split(bestSeparator);
			cleanParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);
		} else {
			// Use smart financial parsing for regex separators
			cleanParts = parseFinancialDataLine(line);
		}

		if (cleanParts.length >= 2) {
			allRows.push(cleanParts);
		}
	}

	// Simple approach: Use first row as headers, let user decide later
	let headerRowIndex = 0;

	console.log(`  � Using row 0 as headers (${allRows.length} total rows)`);
	for (let i = 0; i < Math.min(3, allRows.length); i++) {
		const row = allRows[i];
		console.log(`     Row ${i}: [${row.slice(0, 5).join(' | ')}]`);
	}

	if (allRows.length === 0) return null;

	headers = allRows[headerRowIndex] || [];
	const dataRows = allRows.slice(headerRowIndex + 1);

	console.log(`  📋 Final result: ${headers.length} headers, ${dataRows.length} data rows`);
	console.log(`     Headers: [${headers.slice(0, 3).join(' | ')}]`);
	if (dataRows.length > 0) {
		console.log(`     First row: [${dataRows[0].slice(0, 3).join(' | ')}]`);
	}

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
