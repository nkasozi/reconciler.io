import type { DocumentPreparer } from '$lib/ports/tableFileReader';
import type { ExtractionProgressReporter } from './pdfTextExtractor';
import type { PositionedWord } from './positionedTextTable';

const SCANNED_DOCUMENT_EXTENSION_PATTERN = /\.(pdf|png|jpe?g|webp|gif|bmp)$/i;
const MINIMUM_ROWS_FOR_A_TABLE = 2;

export function isScannedDocumentFile(file: File): boolean {
	return SCANNED_DOCUMENT_EXTENSION_PATTERN.test(file.name) || file.type === 'application/pdf' || file.type.startsWith('image/');
}

function isPdfFile(file: File): boolean {
	return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export async function convertScannedDocumentToCsvFile(file: File, reportProgress: ExtractionProgressReporter): Promise<File> {
	console.log(`[scannedDocumentConverter] Extracting a table from "${file.name}" in the browser`);
	const { words, usedOcr } = isPdfFile(file) ? await extractWordsFromPdf(file, reportProgress) : await extractWordsFromPhoto(file, reportProgress);
	const { buildGridFromPositionedWords, fixCommonOcrDigitMistakes } = await import('./positionedTextTable');
	const rawGrid = buildGridFromPositionedWords(words);
	const grid = usedOcr ? rawGrid.map((row) => row.map(fixCommonOcrDigitMistakes)) : rawGrid;
	if (grid.length < MINIMUM_ROWS_FOR_A_TABLE) {
		throw new Error(`We couldn't find a table in "${file.name}". If it's a photo, try a sharper, straighter picture — or export the file as Excel or CSV.`);
	}
	const { default: Papa } = await import('papaparse');
	console.log(`[scannedDocumentConverter] Built ${grid.length} rows from ${words.length} words (OCR: ${usedOcr})`);
	return new File([Papa.unparse(grid)], `${file.name.replace(/\.[^.]+$/, '')} (from ${isPdfFile(file) ? 'PDF' : 'photo'}).csv`, { type: 'text/csv' });
}

async function extractWordsFromPdf(file: File, reportProgress: ExtractionProgressReporter): Promise<{ words: PositionedWord[]; usedOcr: boolean }> {
	const { loadPdfDocument, extractWordsFromPdfTextLayer, renderPdfPagesToCanvases } = await import('./pdfTextExtractor');
	const pdfDocument = await loadPdfDocument(await file.arrayBuffer());
	try {
		const { words, pageNumbersWithoutText } = await extractWordsFromPdfTextLayer(pdfDocument, reportProgress);
		if (pageNumbersWithoutText.length === 0) return { words, usedOcr: false };
		const { recognizeWordsWithOcr } = await import('./ocrTextExtractor');
		const scannedPageCanvases = await renderPdfPagesToCanvases(pdfDocument, pageNumbersWithoutText, reportProgress);
		const recognizedWords = await recognizeWordsWithOcr(scannedPageCanvases, pageNumbersWithoutText, reportProgress);
		return { words: [...words, ...recognizedWords], usedOcr: true };
	} finally {
		await pdfDocument.destroy();
	}
}

async function extractWordsFromPhoto(file: File, reportProgress: ExtractionProgressReporter): Promise<{ words: PositionedWord[]; usedOcr: boolean }> {
	const { prepareImageForOcr, recognizeWordsWithOcr } = await import('./ocrTextExtractor');
	reportProgress('Preparing your photo');
	const photoCanvas = await prepareImageForOcr(file);
	return { words: await recognizeWordsWithOcr([photoCanvas], [1], reportProgress), usedOcr: true };
}

export async function prepareFileForReading(file: File, reportProgress: ExtractionProgressReporter = () => true): Promise<File> {
	return isScannedDocumentFile(file) ? convertScannedDocumentToCsvFile(file, reportProgress) : file;
}

export const browserDocumentPreparer: DocumentPreparer = { isScannedDocumentFile, prepareFileForReading };
