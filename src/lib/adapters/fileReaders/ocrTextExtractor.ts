import type { ExtractionProgressReporter } from './pdfTextExtractor';
import type { PositionedWord } from './positionedTextTable';

const MAXIMUM_IMAGE_SIDE_IN_PIXELS = 3200;
const MINIMUM_IMAGE_WIDTH_IN_PIXELS = 1600;
const MINIMUM_WORD_CONFIDENCE = 25;

type OcrWord = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } };
type OcrBlock = { paragraphs?: { lines?: { words?: OcrWord[] }[] }[] };

export async function prepareImageForOcr(imageFile: File): Promise<HTMLCanvasElement> {
	const imageBitmap = await createImageBitmap(imageFile, { imageOrientation: 'from-image' });
	const longestSide = Math.max(imageBitmap.width, imageBitmap.height);
	const shrinkFactor = longestSide > MAXIMUM_IMAGE_SIDE_IN_PIXELS ? MAXIMUM_IMAGE_SIDE_IN_PIXELS / longestSide : 1;
	const growFactor = imageBitmap.width * shrinkFactor < MINIMUM_IMAGE_WIDTH_IN_PIXELS ? MINIMUM_IMAGE_WIDTH_IN_PIXELS / (imageBitmap.width * shrinkFactor) : 1;
	const scaleFactor = Math.min(shrinkFactor * growFactor, MAXIMUM_IMAGE_SIDE_IN_PIXELS / longestSide);
	const imageCanvas = document.createElement('canvas');
	imageCanvas.width = Math.round(imageBitmap.width * scaleFactor);
	imageCanvas.height = Math.round(imageBitmap.height * scaleFactor);
	const canvasContext = imageCanvas.getContext('2d', { willReadFrequently: true });
	if (!canvasContext) throw new Error('Your browser could not prepare the photo.');
	canvasContext.imageSmoothingQuality = 'high';
	canvasContext.drawImage(imageBitmap, 0, 0, imageCanvas.width, imageCanvas.height);
	imageBitmap.close();
	convertCanvasToHighContrastGrayscale(canvasContext, imageCanvas.width, imageCanvas.height);
	console.log(`[ocrTextExtractor] Prepared photo at ${imageCanvas.width}×${imageCanvas.height}`);
	return imageCanvas;
}

function convertCanvasToHighContrastGrayscale(canvasContext: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): boolean {
	const imageData = canvasContext.getImageData(0, 0, canvasWidth, canvasHeight);
	const pixelValues = imageData.data;
	let darkestLevel = 255;
	let brightestLevel = 0;
	for (let pixelOffset = 0; pixelOffset < pixelValues.length; pixelOffset += 4) {
		const grayLevel = 0.299 * pixelValues[pixelOffset] + 0.587 * pixelValues[pixelOffset + 1] + 0.114 * pixelValues[pixelOffset + 2];
		pixelValues[pixelOffset] = grayLevel;
		darkestLevel = Math.min(darkestLevel, grayLevel);
		brightestLevel = Math.max(brightestLevel, grayLevel);
	}
	const levelRange = Math.max(1, brightestLevel - darkestLevel);
	for (let pixelOffset = 0; pixelOffset < pixelValues.length; pixelOffset += 4) {
		const stretchedLevel = ((pixelValues[pixelOffset] - darkestLevel) / levelRange) * 255;
		pixelValues[pixelOffset] = pixelValues[pixelOffset + 1] = pixelValues[pixelOffset + 2] = stretchedLevel;
	}
	canvasContext.putImageData(imageData, 0, 0);
	return true;
}

export async function recognizeWordsWithOcr(pageCanvases: HTMLCanvasElement[], pageNumbers: number[], reportProgress: ExtractionProgressReporter): Promise<PositionedWord[]> {
	const { createWorker } = await import('tesseract.js');
	let currentPagePosition = 0;
	reportProgress('Loading the text reader (first time only, about 10 MB)');
	const ocrWorker = await createWorker('eng', 1, {
		logger: (ocrMessage: { status: string; progress: number }) => {
			if (ocrMessage.status !== 'recognizing text') return;
			reportProgress(`Reading page ${currentPagePosition + 1} of ${pageCanvases.length} — ${Math.round(ocrMessage.progress * 100)}%`);
		}
	});
	try {
		await ocrWorker.setParameters({ preserve_interword_spaces: '1' });
		const recognizedWords: PositionedWord[] = [];
		for (currentPagePosition = 0; currentPagePosition < pageCanvases.length; currentPagePosition++) {
			const { data } = await ocrWorker.recognize(pageCanvases[currentPagePosition], {}, { blocks: true });
			const pageWords = ((data.blocks ?? []) as OcrBlock[]).flatMap((block) => (block.paragraphs ?? []).flatMap((paragraph) => (paragraph.lines ?? []).flatMap((line) => line.words ?? [])));
			for (const ocrWord of pageWords) {
				if (ocrWord.confidence < MINIMUM_WORD_CONFIDENCE || ocrWord.text.trim() === '') continue;
				recognizedWords.push({ text: ocrWord.text, left: ocrWord.bbox.x0, right: ocrWord.bbox.x1, top: ocrWord.bbox.y0, bottom: ocrWord.bbox.y1, pageNumber: pageNumbers[currentPagePosition] });
			}
		}
		console.log(`[ocrTextExtractor] OCR recognised ${recognizedWords.length} words`);
		return recognizedWords;
	} finally {
		await ocrWorker.terminate();
	}
}
