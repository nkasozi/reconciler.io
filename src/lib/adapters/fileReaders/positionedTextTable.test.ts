import { describe, expect, it } from 'vitest';
import { convertGridToTable } from '$lib/engine/headerDetection';
import { buildGridFromPositionedWords, fixCommonOcrDigitMistakes, type PositionedWord } from './positionedTextTable';

const CHARACTER_WIDTH = 5;
const LINE_HEIGHT = 10;

function wordsForLine(pageNumber: number, lineNumber: number, cells: { text: string; left?: number; right?: number }[]): PositionedWord[] {
	const top = lineNumber * 14;
	return cells.flatMap((cell) => {
		const cellWidth = cell.text.length * CHARACTER_WIDTH;
		const cellLeft = cell.left ?? (cell.right ?? 0) - cellWidth;
		let wordLeft = cellLeft;
		return cell.text.split(' ').map((wordText) => {
			const word = { text: wordText, left: wordLeft, right: wordLeft + wordText.length * CHARACTER_WIDTH, top, bottom: top + LINE_HEIGHT, pageNumber };
			wordLeft = word.right + CHARACTER_WIDTH;
			return word;
		});
	});
}

describe('buildGridFromPositionedWords', () => {
	it('rebuilds a bank statement table from word positions across pages', () => {
		const headerCells = [{ text: 'Date', left: 10 }, { text: 'Narration', left: 80 }, { text: 'Withdrawals', right: 330 }, { text: 'Deposits', right: 420 }, { text: 'Balance', right: 510 }];
		const words = [
			...wordsForLine(1, 0, [{ text: 'Stanbic Bank Uganda Account Statement March 2024', left: 10 }]),
			...wordsForLine(1, 2, headerCells),
			...wordsForLine(1, 3, [{ text: '01/03/2024', left: 10 }, { text: 'CASH DEPOSIT KAMPALA RD', left: 80 }, { text: '1,250,000.00', right: 420 }, { text: '1,250,000.00', right: 510 }]),
			...wordsForLine(1, 4, [{ text: '04/03/2024', left: 10 }, { text: 'CHQ PAID UMEME', left: 80 }, { text: '185,400.00', right: 330 }, { text: '1,064,600.00', right: 510 }]),
			...wordsForLine(2, 0, headerCells),
			...wordsForLine(2, 1, [{ text: '09/03/2024', left: 10 }, { text: 'CHQ PAID J MUKASA', left: 80 }, { text: '2,000,000.00', right: 330 }, { text: '-935,400.00', right: 510 }])
		];
		const grid = buildGridFromPositionedWords(words);
		const table = convertGridToTable(grid);
		expect(table.columnNames).toEqual(['Date', 'Narration', 'Withdrawals', 'Deposits', 'Balance']);
		expect(table.rows).toEqual([
			['01/03/2024', 'CASH DEPOSIT KAMPALA RD', '', '1,250,000.00', '1,250,000.00'],
			['04/03/2024', 'CHQ PAID UMEME', '185,400.00', '', '1,064,600.00'],
			['09/03/2024', 'CHQ PAID J MUKASA', '2,000,000.00', '', '-935,400.00']
		]);
	});

	it('fixes letters that OCR mistakes for digits in numeric cells only', () => {
		expect(fixCommonOcrDigitMistakes('1,25O,OOO.0O')).toBe('1,250,000.00');
		expect(fixCommonOcrDigitMistakes('l85,4OO.00')).toBe('185,400.00');
		expect(fixCommonOcrDigitMistakes('1 250 000')).toBe('1,250,000');
		expect(fixCommonOcrDigitMistakes('CASH DEPOSIT')).toBe('CASH DEPOSIT');
		expect(fixCommonOcrDigitMistakes('SOLO')).toBe('SOLO');
	});
});
