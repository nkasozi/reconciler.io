import type { DateOrder } from '$lib/engine/dateParser';
import type { ResultCategory } from '$lib/engine/resultViews';
import type { CategoryCounts, TableOverview } from '$lib/engine/workerProtocol';

const MAXIMUM_LABEL_LENGTH = 22;

export const CATEGORY_TITLES: Record<ResultCategory, (leftLabel: string, rightLabel: string) => string> = {
	needs_review: () => 'Paired, but something is different',
	only_left: (leftLabel) => `Only in ${leftLabel}`,
	only_right: (_, rightLabel) => `Only in ${rightLabel}`,
	matched: () => 'Matched exactly'
};

export function buildSideLabels(leftOverview: TableOverview, rightOverview: TableOverview): { leftLabel: string; rightLabel: string } {
	const leftLabel = buildSingleLabel(leftOverview);
	const rightLabel = buildSingleLabel(rightOverview);
	if (leftLabel.toLowerCase() !== rightLabel.toLowerCase()) return { leftLabel, rightLabel };
	return { leftLabel: `${leftLabel} (1)`, rightLabel: `${rightLabel} (2)` };
}

function buildSingleLabel(tableOverview: TableOverview): string {
	const fileNameWithoutExtension = tableOverview.fileName.replace(/\.[^.]+$/, '');
	const preferredLabel = tableOverview.detectedSystemName ?? fileNameWithoutExtension;
	return preferredLabel.length > MAXIMUM_LABEL_LENGTH ? `${preferredLabel.slice(0, MAXIMUM_LABEL_LENGTH - 1)}…` : preferredLabel;
}

export function chooseFirstInterestingCategory(categoryCounts: CategoryCounts): ResultCategory {
	const categoriesInPriorityOrder: ResultCategory[] = ['needs_review', 'only_left', 'only_right', 'matched'];
	return categoriesInPriorityOrder.find((category) => categoryCounts[category] > 0) ?? 'matched';
}

export function guessDateOrderFromBrowserLanguage(browserLanguage: string): DateOrder {
	const monthFirstLocales = ['en-us', 'en-ph', 'en-ca'];
	return monthFirstLocales.includes(browserLanguage.toLowerCase()) ? 'month_first' : 'day_first';
}

export function downloadBytesAsFile(fileBytes: ArrayBuffer, downloadFileName: string, mimeType: string): boolean {
	const downloadUrl = URL.createObjectURL(new Blob([fileBytes], { type: mimeType }));
	const temporaryLink = document.createElement('a');
	temporaryLink.href = downloadUrl;
	temporaryLink.download = downloadFileName;
	document.body.appendChild(temporaryLink);
	temporaryLink.click();
	temporaryLink.remove();
	setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
	return true;
}

export const WORKING_PHASE_LABELS = ['Reading your files', 'Finding how they connect', 'Matching every row', 'Adding up the totals'];

export async function waitAtLeast<ResultType>(pendingWork: Promise<ResultType>, minimumMilliseconds: number): Promise<ResultType> {
	const [workResult] = await Promise.all([pendingWork, new Promise((resolveTimer) => setTimeout(resolveTimer, minimumMilliseconds))]);
	return workResult;
}

export function toggleItemKey(itemKeys: Set<string>, itemKey: string): Set<string> {
	const updatedItemKeys = new Set(itemKeys);
	if (updatedItemKeys.has(itemKey)) updatedItemKeys.delete(itemKey);
	else updatedItemKeys.add(itemKey);
	return updatedItemKeys;
}
