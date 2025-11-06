import { extractTablesFromPDF, isPDF } from './pdfProcessor';
import { extractTablesFromImage } from './ocrProcessor';

export interface DocumentScanResult {
	type: 'pdf' | 'image';
	text: string;
	confidence?: number;
	// Updated to match ParsedFileData format
	columns?: string[];
	rows?: Record<string, string>[];
	metadata?: any;
	pages?: string[];
}

export interface ScanOptions {
	useOCR?: boolean;
	language?: string;
	preprocessImage?: boolean;
	extractTables?: boolean;
}

/**
 * Helper function to check if file is an image
 */
function isImageFile(file: File): boolean {
	return (
		file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|tiff|tif)$/i.test(file.name)
	);
}

/**
 * Main document scanning function that handles PDFs and images
 */
export async function scanDocument(
	file: File,
	options: ScanOptions = {}
): Promise<DocumentScanResult> {
	const { extractTables = true } = options;

	if (isPDF(file)) {
		return await scanPDF(file, options);
	} else if (isImageFile(file)) {
		return await scanImage(file, options);
	} else {
		throw new Error('Unsupported file type for scanning');
	}
}

/**
 * Scan PDF file and extract tabular data
 */
async function scanPDF(file: File, options: ScanOptions = {}): Promise<DocumentScanResult> {
	const { extractTables = true } = options;

	try {
		const pdfResult = await extractTablesFromPDF(file);

		if (!pdfResult.success) {
			throw new Error(pdfResult.error || 'PDF extraction failed');
		}

		// If we have tables, use the first one (or could combine multiple)
		if (pdfResult.tables.length > 0) {
			const firstTable = pdfResult.tables[0];

			return {
				type: 'pdf',
				text: firstTable.rawText,
				confidence: firstTable.confidence,
				columns: firstTable.headers,
				rows: firstTable.rows.map((row) => {
					const rowObj: Record<string, string> = {};
					firstTable.headers.forEach((header, index) => {
						rowObj[header] = row[index] || '';
					});
					return rowObj;
				}),
				metadata: pdfResult.tables[0].metadata
			};
		}

		// If no tables found, return basic text info
		return {
			type: 'pdf',
			text: pdfResult.tables[0]?.rawText || '',
			confidence: pdfResult.tables[0]?.confidence || 0,
			columns: [],
			rows: []
		};
	} catch (error) {
		throw new Error(
			`PDF scanning failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Scan image file using OCR and extract tabular data
 */
async function scanImage(file: File, options: ScanOptions = {}): Promise<DocumentScanResult> {
	const { language = 'eng' } = options;

	try {
		const imageResult = await extractTablesFromImage(file, { language });

		if (!imageResult.success) {
			throw new Error(imageResult.error || 'Image OCR failed');
		}

		// If we have tables, use the first one
		if (imageResult.tables.length > 0) {
			const firstTable = imageResult.tables[0];

			return {
				type: 'image',
				text: firstTable.rawText,
				confidence: firstTable.confidence,
				columns: firstTable.headers,
				rows: firstTable.rows.map((row) => {
					const rowObj: Record<string, string> = {};
					firstTable.headers.forEach((header, index) => {
						rowObj[header] = row[index] || '';
					});
					return rowObj;
				})
			};
		}

		// If no tables found, return basic text info
		return {
			type: 'image',
			text: imageResult.tables[0]?.rawText || '',
			confidence: imageResult.tables[0]?.confidence || 0,
			columns: [],
			rows: []
		};
	} catch (error) {
		throw new Error(
			`Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

/**
 * Validate scan quality and provide feedback
 */
export function validateScanQuality(result: DocumentScanResult): {
	isValid: boolean;
	issues: string[];
	suggestions: string[];
} {
	const issues: string[] = [];
	const suggestions: string[] = [];

	// Check text length
	if (!result.text || result.text.length < 10) {
		issues.push('Very little text detected');
		suggestions.push('Ensure the document is clearly visible and well-lit');
	}

	// Check confidence if available
	if (result.confidence !== undefined && result.confidence < 0.7) {
		issues.push('Low OCR confidence detected');
		suggestions.push(
			'Try improving image quality - better lighting, higher resolution, or cleaner document'
		);
	}

	// Check for table data if expected
	if (result.rows && result.rows.length === 0) {
		issues.push('No table structure detected');
		suggestions.push('Ensure the document contains tabular data in a clear format');
	}

	return {
		isValid: issues.length === 0,
		issues,
		suggestions
	};
}
