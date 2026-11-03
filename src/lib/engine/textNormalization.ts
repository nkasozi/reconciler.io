const MAXIMUM_CHARACTERS_FOR_EDIT_DISTANCE = 200;

export function normalizeReferenceForMatching(rawValue: string): string {
	const upperCaseWithoutSpacesOrPunctuation = String(rawValue ?? '')
		.trim()
		.replace(/\.0+$/, '')
		.toUpperCase()
		.replace(/[\s\-_/\\#.,:;'"()[\]]+/g, '');
	const isDigitsOnly = /^\d+$/.test(upperCaseWithoutSpacesOrPunctuation);
	return isDigitsOnly
		? upperCaseWithoutSpacesOrPunctuation.replace(/^0+(?=\d)/, '')
		: upperCaseWithoutSpacesOrPunctuation;
}

export function normalizeTextForMatching(rawValue: string): string {
	return String(rawValue ?? '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

export function normalizeHeaderName(headerName: string): string {
	return String(headerName ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function calculateTextSimilarityPercent(firstText: string, secondText: string): number {
	const firstNormalized = normalizeTextForMatching(firstText);
	const secondNormalized = normalizeTextForMatching(secondText);
	if (firstNormalized === secondNormalized) return 100;
	if (firstNormalized === '' || secondNormalized === '') return 0;

	const editDistanceSimilarity = calculateEditDistanceSimilarity(firstNormalized, secondNormalized);
	const sharedWordSimilarity = calculateSharedWordSimilarity(firstNormalized, secondNormalized);
	return Math.round(Math.max(editDistanceSimilarity, sharedWordSimilarity) * 100);
}

function calculateEditDistanceSimilarity(firstText: string, secondText: string): number {
	const truncatedFirst = firstText.slice(0, MAXIMUM_CHARACTERS_FOR_EDIT_DISTANCE);
	const truncatedSecond = secondText.slice(0, MAXIMUM_CHARACTERS_FOR_EDIT_DISTANCE);
	const longerLength = Math.max(truncatedFirst.length, truncatedSecond.length);
	const editDistance = calculateLevenshteinDistance(truncatedFirst, truncatedSecond);
	return (longerLength - editDistance) / longerLength;
}

function calculateSharedWordSimilarity(firstText: string, secondText: string): number {
	const firstWords = new Set(firstText.split(/[^a-z0-9]+/).filter((word) => word.length > 1));
	const secondWords = new Set(secondText.split(/[^a-z0-9]+/).filter((word) => word.length > 1));
	if (firstWords.size === 0 || secondWords.size === 0) return 0;
	let sharedWordCount = 0;
	for (const word of firstWords) if (secondWords.has(word)) sharedWordCount++;
	return sharedWordCount / Math.max(firstWords.size, secondWords.size);
}

export function calculateLevenshteinDistance(firstText: string, secondText: string): number {
	if (firstText === secondText) return 0;
	if (firstText.length === 0) return secondText.length;
	if (secondText.length === 0) return firstText.length;

	let previousRowCosts = Array.from({ length: secondText.length + 1 }, (_, columnIndex) => columnIndex);
	for (let firstIndex = 1; firstIndex <= firstText.length; firstIndex++) {
		const currentRowCosts = [firstIndex];
		for (let secondIndex = 1; secondIndex <= secondText.length; secondIndex++) {
			const substitutionCost = firstText[firstIndex - 1] === secondText[secondIndex - 1] ? 0 : 1;
			currentRowCosts[secondIndex] = Math.min(
				previousRowCosts[secondIndex] + 1,
				currentRowCosts[secondIndex - 1] + 1,
				previousRowCosts[secondIndex - 1] + substitutionCost
			);
		}
		previousRowCosts = currentRowCosts;
	}
	return previousRowCosts[secondText.length];
}
