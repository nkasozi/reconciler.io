// OCR processing with Google Document AI and Tesseract.js fallback

import {
	createGoogleDocumentAIProcessor,
	type GoogleDocumentAIConfig,
	type GoogleDocumentAIResult
} from './googleDocumentAI.js';
import { getGoogleDocumentAIConfig } from './googleDocumentAIConfig.js';

export interface OCRTableData {
	headers: string[];
	rows: string[][];
	confidence: number;
	rawText: string;
}

export interface OCRExtractionResult {
	tables: OCRTableData[];
	success: boolean;
	error?: string;
}

export interface OCROptions {
	language?: string;
	preserveInterwordSpaces?: boolean;
	useGoogleDocumentAI?: boolean;
	googleApiKey?: string; // API key for Google Document AI
}

/**
 * Extract tabular data from an image using Google Document AI (primary) or Tesseract.js (fallback)
 */
export async function extractTablesFromImage(
	imageSource: File | HTMLCanvasElement | string,
	options: OCROptions = {}
): Promise<OCRExtractionResult> {
	if (typeof window === 'undefined') {
		throw new Error('OCR processing is only available in browser environment');
	}

	// Convert input to File if needed
	let file: File;
	if (imageSource instanceof File) {
		file = imageSource;
	} else if (imageSource instanceof HTMLCanvasElement) {
		file = await canvasToFile(imageSource);
	} else if (typeof imageSource === 'string') {
		throw new Error('URL-based image processing not yet implemented');
	} else {
		throw new Error('Unsupported image source type');
	}

	// Try Google Document AI via backend first (no API key needed - handled server-side)
	if (options.useGoogleDocumentAI !== false) {
		try {
			console.log('Starting Google Document AI processing via backend...');

			// Import the backend client
			const { processDocumentWithBackend, convertToOCRResult } = await import(
				'./documentAIClient.js'
			);

			// Process via backend (Vercel function in production, SvelteKit API in development)
			const backendResult = await processDocumentWithBackend(file);

			if (backendResult.success) {
				console.log('Google Document AI completed successfully via backend');
				console.log('Tables found:', backendResult.tables.length);

				if (backendResult.isDevelopmentMock) {
					console.log('📝 Using development mock data');
				}

				// Convert backend result to OCR format
				const ocrResult = convertToOCRResult(backendResult);

				// If no structured tables found, try parsing text
				if (ocrResult.tables.length === 0 && backendResult.text.trim()) {
					console.log('No structured tables found, parsing text for table patterns...');
					const parsedTables = extractTablesFromOCRText(
						backendResult.text,
						backendResult.confidence * 100
					);
					ocrResult.tables.push(...parsedTables);
				}

				return ocrResult;
			} else {
				console.warn('Google Document AI backend failed:', backendResult.error);
				throw new Error(backendResult.error || 'Google Document AI backend processing failed');
			}
		} catch (error) {
			console.warn('Google Document AI backend failed, falling back to Tesseract.js:', error);
			// Fall through to Tesseract.js fallback
		}
	}

	// Fallback to Tesseract.js
	try {
		console.log('Using Tesseract.js for OCR processing...');
		const { createWorker } = await import('tesseract.js');
		const worker = await createWorker(options.language || 'eng');

		// Configure for table detection
		const parameters: any = {
			preserve_interword_spaces: options.preserveInterwordSpaces ? '1' : '0'
		};

		await worker.setParameters(parameters);

		// Perform OCR
		const { data } = await worker.recognize(imageSource);
		await worker.terminate();

		// Extract tables from OCR text
		const tables = extractTablesFromOCRText(data.text, data.confidence);

		return {
			tables,
			success: true
		};
	} catch (error) {
		console.error('Error extracting tables from image:', error);
		return {
			tables: [],
			success: false,
			error: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}

/**
 * Convert canvas to File for Google Document AI processing
 */
async function canvasToFile(
	canvas: HTMLCanvasElement,
	filename: string = 'image.png'
): Promise<File> {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => {
			if (blob) {
				const file = new File([blob], filename, { type: 'image/png' });
				resolve(file);
			} else {
				throw new Error('Failed to convert canvas to blob');
			}
		});
	});
}

/**
 * Extract tabular structures from OCR text
 */
function extractTablesFromOCRText(text: string, overallConfidence: number): OCRTableData[] {
	const lines = text
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	const tables: OCRTableData[] = [];

	// Look for table patterns (similar to PDF processing but with OCR considerations)
	const potentialTables = detectTableStructuresInOCR(lines);

	for (const tableLines of potentialTables) {
		const tableData = parseOCRTableLines(tableLines, overallConfidence);
		if (tableData && tableData.rows.length > 0) {
			tables.push(tableData);
		}
	}

	// If no structured tables found, try to create a simple table from detected patterns
	if (tables.length === 0) {
		const simpleTable = createSimpleTableFromText(lines, overallConfidence);
		if (simpleTable) {
			tables.push(simpleTable);
		}
	}

	return tables;
}

/**
 * Detect table structures in OCR text (handles OCR artifacts)
 */
function detectTableStructuresInOCR(lines: string[]): string[][] {
	const tables: string[][] = [];
	let currentTable: string[] = [];
	let consecutiveTableLines = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check if line looks like a table row (more lenient for OCR)
		const isTableLike = isOCRTableRow(line);

		if (isTableLike) {
			currentTable.push(line);
			consecutiveTableLines++;
		} else {
			// If we had a sequence of table-like lines, save it
			if (consecutiveTableLines >= 2) {
				tables.push([...currentTable]);
			}
			currentTable = [];
			consecutiveTableLines = 0;
		}
	}

	// Don't forget the last table
	if (consecutiveTableLines >= 2) {
		tables.push(currentTable);
	}

	return tables;
}

/**
 * Check if a line looks like it could be part of a table (OCR-friendly)
 */
function isOCRTableRow(line: string): boolean {
	// OCR might introduce artifacts, so be more flexible
	const separators = [
		/\s{3,}/, // Multiple spaces (common in OCR)
		/\|\s*/, // Pipes with optional spaces
		/\t+/, // Tabs
		/,\s*/, // Commas with optional spaces
		/;\s*/ // Semicolons
	];

	for (const sep of separators) {
		const matches = line.match(new RegExp(sep, 'g')) || [];
		if (matches.length >= 1) {
			// At least 1 separator = 2 columns
			return true;
		}
	}

	// Also check for aligned data (common in printed tables)
	const words = line.split(/\s+/);
	if (words.length >= 3) {
		// At least 3 words could be columnar data
		return true;
	}

	return false;
}

/**
 * Parse OCR table lines into structured data
 */
function parseOCRTableLines(lines: string[], baseConfidence: number): OCRTableData | null {
	if (lines.length < 2) return null;

	// Try different separators for OCR text
	const separators = [
		/\s{3,}/, // Multiple spaces (most common in OCR)
		/\|\s*/, // Pipes
		/,\s*/, // Commas
		/\t+/, // Tabs
		/;\s*/ // Semicolons
	];

	let bestResult: { rows: string[][]; headers: string[]; separator: RegExp | string } | null = null;
	let maxColumns = 0;

	// Try each separator
	for (const sep of separators) {
		const result = tryParseLinesWithSeparator(lines, sep);
		if (result && result.avgColumns > maxColumns) {
			maxColumns = result.avgColumns;
			bestResult = result;
		}
	}

	if (!bestResult || maxColumns < 2) return null;

	return {
		headers: bestResult.headers,
		rows: bestResult.rows,
		rawText: lines.join('\n'),
		confidence: Math.min(baseConfidence / 100, 0.9) // Convert to 0-1 and cap
	};
}

/**
 * Try parsing with a specific separator
 */
function tryParseLinesWithSeparator(lines: string[], separator: RegExp | string) {
	const rows: string[][] = [];
	let headers: string[] = [];
	let totalColumns = 0;
	let validLines = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const parts = line.split(separator);

		const cleanParts = parts.map((part) => part.trim()).filter((part) => part.length > 0);

		if (cleanParts.length >= 2) {
			if (i === 0) {
				headers = cleanParts;
			} else {
				rows.push(cleanParts);
			}
			totalColumns += cleanParts.length;
			validLines++;
		}
	}

	const avgColumns = validLines > 0 ? totalColumns / validLines : 0;

	return avgColumns >= 2 ? { rows, headers, avgColumns, separator } : null;
}

/**
 * Create a simple table when no clear structure is found
 */
function createSimpleTableFromText(lines: string[], baseConfidence: number): OCRTableData | null {
	if (lines.length < 2) return null;

	// Try to split each line into words and create a table
	const rows: string[][] = [];
	let maxWords = 0;

	for (const line of lines) {
		const words = line.split(/\s+/).filter((word) => word.trim().length > 0);
		if (words.length > 1) {
			rows.push(words);
			maxWords = Math.max(maxWords, words.length);
		}
	}

	if (rows.length < 2 || maxWords < 2) return null;

	// Use first row as headers, rest as data
	const headers = rows[0];
	const dataRows = rows.slice(1);

	return {
		headers,
		rows: dataRows,
		rawText: lines.join('\n'),
		confidence: Math.min((baseConfidence / 100) * 0.7, 0.7) // Lower confidence for simple extraction
	};
}

/**
 * Preprocess image for better OCR results
 */
export function preprocessImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
	const ctx = canvas.getContext('2d')!;
	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;

	// Convert to grayscale and apply contrast enhancement
	for (let i = 0; i < data.length; i += 4) {
		const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);

		// Apply contrast enhancement
		const enhanced = gray > 128 ? 255 : 0;

		data[i] = enhanced; // Red
		data[i + 1] = enhanced; // Green
		data[i + 2] = enhanced; // Blue
		// Alpha stays the same
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas;
}
