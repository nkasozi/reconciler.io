import { isAccountingAmount } from '../amountParser';
import { parseFlexibleDate } from '../dateParser';

export type PositionedWord = { text: string; left: number; right: number; top: number; bottom: number; pageNumber: number };

type TextCell = { text: string; left: number; right: number };
type TextLine = { pageNumber: number; centerY: number; cells: TextCell[] };

const MINIMUM_SHARE_OF_LINES_TO_BLOCK_A_GAP = 0.12;

export function buildGridFromPositionedWords(words: PositionedWord[]): string[][] {
	const cleanWords = words.filter((word) => word.text.trim() !== '' && word.right > word.left);
	if (cleanWords.length === 0) return [];
	const typicalWordHeight = findMedian(cleanWords.map((word) => word.bottom - word.top)) || 10;
	const lines = groupWordsIntoLines(cleanWords, typicalWordHeight);
	const columnSeparators = findColumnSeparators(lines, typicalWordHeight);
	console.log(`[positionedTextTable] ${cleanWords.length} words → ${lines.length} lines and ${columnSeparators.length + 1} columns`);
	return lines.map((line) => placeCellsIntoColumns(line.cells, columnSeparators));
}

export function groupWordsIntoLines(words: PositionedWord[], typicalWordHeight: number): TextLine[] {
	const sortedWords = [...words].sort((first, second) => first.pageNumber - second.pageNumber || centerOf(first) - centerOf(second) || first.left - second.left);
	const lineTolerance = typicalWordHeight * 0.55;
	const lineGroups: { pageNumber: number; centerY: number; lineWords: PositionedWord[] }[] = [];
	for (const word of sortedWords) {
		const currentGroup = lineGroups[lineGroups.length - 1];
		const belongsToCurrentLine = currentGroup && currentGroup.pageNumber === word.pageNumber && Math.abs(centerOf(word) - currentGroup.centerY) <= lineTolerance;
		if (belongsToCurrentLine) {
			currentGroup.lineWords.push(word);
			currentGroup.centerY = (currentGroup.centerY * (currentGroup.lineWords.length - 1) + centerOf(word)) / currentGroup.lineWords.length;
		} else {
			lineGroups.push({ pageNumber: word.pageNumber, centerY: centerOf(word), lineWords: [word] });
		}
	}
	return lineGroups.map((lineGroup) => ({ pageNumber: lineGroup.pageNumber, centerY: lineGroup.centerY, cells: joinWordsIntoCells(lineGroup.lineWords, typicalWordHeight) }));
}

function joinWordsIntoCells(lineWords: PositionedWord[], typicalWordHeight: number): TextCell[] {
	const sortedWords = [...lineWords].sort((first, second) => first.left - second.left);
	const cellGapThreshold = typicalWordHeight * 0.75;
	const cells: TextCell[] = [];
	for (const word of sortedWords) {
		const previousCell = cells[cells.length - 1];
		if (previousCell && word.left - previousCell.right <= cellGapThreshold) {
			previousCell.text = `${previousCell.text} ${word.text.trim()}`;
			previousCell.right = Math.max(previousCell.right, word.right);
		} else {
			cells.push({ text: word.text.trim(), left: word.left, right: word.right });
		}
	}
	return cells;
}

export function findColumnSeparators(lines: TextLine[], typicalWordHeight: number): number[] {
	const tabularLines = lines.filter((line) => line.cells.length >= 2 && line.cells.some((cell) => looksLikeValue(cell.text)));
	const linesToMeasure = tabularLines.length >= 3 ? tabularLines : lines.filter((line) => line.cells.length >= 2);
	if (linesToMeasure.length === 0) return [];
	const allCells = linesToMeasure.flatMap((line) => line.cells);
	const pageLeft = Math.min(...allCells.map((cell) => cell.left));
	const pageRight = Math.max(...allCells.map((cell) => cell.right));
	const binWidth = Math.max(0.5, typicalWordHeight / 4);
	const binCount = Math.ceil((pageRight - pageLeft) / binWidth) + 1;
	const coverageByBin = new Array<number>(binCount).fill(0);
	for (const cell of allCells) {
		const firstBin = Math.floor((cell.left - pageLeft) / binWidth);
		const lastBin = Math.floor((cell.right - pageLeft) / binWidth);
		for (let binIndex = firstBin; binIndex <= lastBin; binIndex++) coverageByBin[binIndex]++;
	}
	const blockingCoverage = Math.max(1, Math.floor(linesToMeasure.length * MINIMUM_SHARE_OF_LINES_TO_BLOCK_A_GAP));
	const minimumGapBins = Math.max(1, Math.round((typicalWordHeight * 0.4) / binWidth));
	const separators: number[] = [];
	let gapStartBin = -1;
	for (let binIndex = 0; binIndex < binCount; binIndex++) {
		const isGapBin = coverageByBin[binIndex] < blockingCoverage;
		if (isGapBin && gapStartBin === -1) gapStartBin = binIndex;
		const gapEnds = gapStartBin !== -1 && (!isGapBin || binIndex === binCount - 1);
		if (!gapEnds) continue;
		const gapEndBin = isGapBin ? binIndex : binIndex - 1;
		const isInteriorGap = gapStartBin > 0 && gapEndBin < binCount - 1;
		if (isInteriorGap && gapEndBin - gapStartBin + 1 >= minimumGapBins) separators.push(pageLeft + ((gapStartBin + gapEndBin + 1) / 2) * binWidth);
		gapStartBin = -1;
	}
	return separators;
}

function placeCellsIntoColumns(cells: TextCell[], columnSeparators: number[]): string[] {
	const rowCells = new Array<string>(columnSeparators.length + 1).fill('');
	for (const cell of cells) {
		const cellCenter = (cell.left + cell.right) / 2;
		const columnIndex = columnSeparators.filter((separatorX) => separatorX < cellCenter).length;
		rowCells[columnIndex] = rowCells[columnIndex] ? `${rowCells[columnIndex]} ${cell.text}` : cell.text;
	}
	return rowCells;
}

export function fixCommonOcrDigitMistakes(cellText: string): string {
	const trimmedText = cellText.trim();
	const isMadeOfDigitLookalikes = /^[\d,.\s()\-+OoIlSB]+$/.test(trimmedText) && /\d/.test(trimmedText);
	if (!isMadeOfDigitLookalikes) return cellText;
	const correctedText = trimmedText.replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/\s+(?=\d{3}\b)/g, ',');
	return isAccountingAmount(correctedText) ? correctedText : cellText;
}

function looksLikeValue(cellText: string): boolean {
	return isAccountingAmount(cellText) || parseFlexibleDate(cellText).isValidDate;
}

function centerOf(word: PositionedWord): number {
	return (word.top + word.bottom) / 2;
}

function findMedian(values: number[]): number {
	if (values.length === 0) return 0;
	const sortedValues = [...values].sort((first, second) => first - second);
	return sortedValues[Math.floor(sortedValues.length / 2)];
}
