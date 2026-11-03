import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { PositionedWord } from './positionedTextTable';

export type ExtractionProgressReporter = (progressMessage: string) => boolean;

const MINIMUM_CHARACTERS_FOR_A_REAL_TEXT_LAYER = 20;
const OCR_RENDER_SCALE = 2.5;
const PDFJS_ASSETS_PATH = '/pdfjs';
const PAGE_RENDER_TIMEOUT_IN_MILLISECONDS = 45_000;

type PdfTextItem = { str: string; transform: number[]; width: number; height: number };

export async function loadPdfDocument(fileBytes: ArrayBuffer): Promise<PDFDocumentProxy> {
	const pdfjs = await import('pdfjs-dist');
	const { default: pdfWorkerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
	pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
	const pdfDocument = await pdfjs.getDocument({
		data: new Uint8Array(fileBytes),
		wasmUrl: `${PDFJS_ASSETS_PATH}/wasm/`,
		iccUrl: `${PDFJS_ASSETS_PATH}/iccs/`,
		cMapUrl: `${PDFJS_ASSETS_PATH}/cmaps/`,
		cMapPacked: true,
		standardFontDataUrl: `${PDFJS_ASSETS_PATH}/standard_fonts/`
	}).promise;
	console.log(`[pdfTextExtractor] Opened PDF with ${pdfDocument.numPages} pages`);
	return pdfDocument;
}

export async function extractWordsFromPdfTextLayer(pdfDocument: PDFDocumentProxy, reportProgress: ExtractionProgressReporter): Promise<{ words: PositionedWord[]; pageNumbersWithoutText: number[] }> {
	const words: PositionedWord[] = [];
	const pageNumbersWithoutText: number[] = [];
	for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
		reportProgress(`Reading text on page ${pageNumber} of ${pdfDocument.numPages}`);
		const pdfPage = await pdfDocument.getPage(pageNumber);
		const pageWords = await extractWordsFromPage(pdfPage, pageNumber);
		const pageCharacterCount = pageWords.reduce((runningTotal, word) => runningTotal + word.text.length, 0);
		if (pageCharacterCount < MINIMUM_CHARACTERS_FOR_A_REAL_TEXT_LAYER) pageNumbersWithoutText.push(pageNumber);
		else words.push(...pageWords);
	}
	console.log(`[pdfTextExtractor] Text layer gave ${words.length} words; pages needing OCR: ${pageNumbersWithoutText.join(', ') || 'none'}`);
	return { words, pageNumbersWithoutText };
}

async function extractWordsFromPage(pdfPage: PDFPageProxy, pageNumber: number): Promise<PositionedWord[]> {
	const pageViewport = pdfPage.getViewport({ scale: 1 });
	const textContent = await pdfPage.getTextContent();
	const pageWords: PositionedWord[] = [];
	for (const contentItem of textContent.items) {
		if (!('str' in contentItem)) continue;
		const textItem = contentItem as PdfTextItem;
		if (textItem.str.trim() === '') continue;
		const fontHeight = textItem.height || Math.hypot(textItem.transform[2], textItem.transform[3]) || 10;
		const baselineFromTop = pageViewport.height - textItem.transform[5];
		const itemLeft = textItem.transform[4];
		const characterWidth = textItem.width / Math.max(1, textItem.str.length);
		for (const pieceMatch of textItem.str.matchAll(/\S+(?: \S+)*/g)) {
			const pieceLeft = itemLeft + (pieceMatch.index ?? 0) * characterWidth;
			pageWords.push({ text: pieceMatch[0], left: pieceLeft, right: pieceLeft + pieceMatch[0].length * characterWidth, top: baselineFromTop - fontHeight, bottom: baselineFromTop, pageNumber });
		}
	}
	return pageWords;
}

export async function renderPdfPagesToCanvases(pdfDocument: PDFDocumentProxy, pageNumbers: number[], reportProgress: ExtractionProgressReporter): Promise<HTMLCanvasElement[]> {
	const renderedCanvases: HTMLCanvasElement[] = [];
	for (const pageNumber of pageNumbers) {
		reportProgress(`Preparing scanned page ${pageNumber} of ${pdfDocument.numPages}`);
		const pdfPage = await pdfDocument.getPage(pageNumber);
		const pageViewport = pdfPage.getViewport({ scale: OCR_RENDER_SCALE });
		const pageCanvas = document.createElement('canvas');
		pageCanvas.width = Math.ceil(pageViewport.width);
		pageCanvas.height = Math.ceil(pageViewport.height);
		const canvasContext = pageCanvas.getContext('2d');
		if (!canvasContext) throw new Error('Your browser could not prepare the scanned page.');
		const renderTask = pdfPage.render({ canvas: pageCanvas, canvasContext, viewport: pageViewport });
		await rejectAfterTimeout(renderTask.promise, PAGE_RENDER_TIMEOUT_IN_MILLISECONDS, () => renderTask.cancel(), `Page ${pageNumber} of this PDF could not be prepared for reading.`);
		renderedCanvases.push(pageCanvas);
	}
	return renderedCanvases;
}

function rejectAfterTimeout<ResultType>(pendingWork: Promise<ResultType>, timeoutInMilliseconds: number, onTimeout: () => void, timeoutMessage: string): Promise<ResultType> {
	return new Promise((resolveWork, rejectWork) => {
		const timeoutTimer = setTimeout(() => {
			console.log(`[pdfTextExtractor] Timed out after ${timeoutInMilliseconds}ms`);
			onTimeout();
			rejectWork(new Error(timeoutMessage));
		}, timeoutInMilliseconds);
		pendingWork.then(
			(workResult) => {
				clearTimeout(timeoutTimer);
				resolveWork(workResult);
			},
			(workError) => {
				clearTimeout(timeoutTimer);
				rejectWork(workError);
			}
		);
	});
}
