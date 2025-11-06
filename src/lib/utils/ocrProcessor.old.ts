// OCR processing focused on tabular data extraction

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
}

/**
 * Perform OCR on an image file or canvas
 */
export async function performOCR(
	imageSource: File | HTMLCanvasElement | string,
	options: OCROptions = {}
): Promise<OCRResult> {
	if (typeof window === 'undefined') {
		throw new Error('OCR processing is only available in browser environment');
	}

	try {
		const { createWorker } = await import('tesseract.js');
		const worker = await createWorker(options.language || 'eng');

		// Set OCR parameters if provided
		const parameters: any = {};
		if (options.tessedit_pageseg_mode) {
			parameters.tessedit_pageseg_mode = options.tessedit_pageseg_mode;
		}
		if (options.tessedit_char_whitelist) {
			parameters.tessedit_char_whitelist = options.tessedit_char_whitelist;
		}

		if (Object.keys(parameters).length > 0) {
			await worker.setParameters(parameters);
		}

		// Perform OCR
		const { data } = await worker.recognize(imageSource);

		// Process words data - use empty array if words not available
		const words =
			(data as any).words?.map((word: any) => ({
				text: word.text,
				confidence: word.confidence,
				bbox: {
					x0: word.bbox.x0,
					y0: word.bbox.y0,
					x1: word.bbox.x1,
					y1: word.bbox.y1
				}
			})) || [];

		await worker.terminate();

		return {
			text: data.text.trim(),
			confidence: data.confidence,
			words: words
		};
	} catch (error) {
		console.error('Error performing OCR:', error);
		throw new Error(
			`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
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
		const contrast = 1.5;
		const enhancedGray = Math.min(255, Math.max(0, contrast * (gray - 128) + 128));

		data[i] = enhancedGray; // Red
		data[i + 1] = enhancedGray; // Green
		data[i + 2] = enhancedGray; // Blue
		// Alpha channel (data[i + 3]) remains unchanged
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas;
}

/**
 * Extract table-like data from OCR text using pattern matching
 */
export function extractTableData(ocrResult: OCRResult): string[][] {
	const lines = ocrResult.text.split('\n').filter((line: string) => line.trim().length > 0);
	const tableData: string[][] = [];

	for (const line of lines) {
		// Split by multiple spaces, tabs, or common separators
		const columns = line
			.split(/\s{2,}|\t|,|\|/)
			.map((col: string) => col.trim())
			.filter((col: string) => col.length > 0);

		if (columns.length > 1) {
			tableData.push(columns);
		}
	}

	return tableData;
}

/**
 * Clean up worker when done
 * This is a placeholder implementation
 */
export async function terminateOCRWorker(): Promise<void> {
	// In production, this would terminate the tesseract worker
	console.log('OCR worker terminated (placeholder)');
}

/**
 * Check if an image format is supported
 */
export function isImageFile(file: File): boolean {
	const supportedTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
	return (
		supportedTypes.includes(file.type) || /\.(jpg|jpeg|png|bmp|tiff|tif|webp)$/i.test(file.name)
	);
}
