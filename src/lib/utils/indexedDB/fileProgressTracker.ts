import type { FileProgressTracker } from './types';
import type { ColumnPair } from '../reconciliation';
import { getReconciliationDB } from './database';

function generateFileHash(
	primaryFileName: string,
	primaryFileSize: number,
	comparisonFileName: string,
	comparisonFileSize: number,
	columnPairs: ColumnPair[],
	reconciliationConfig: Record<string, any>
): string {
	const hashInput = [
		primaryFileName,
		primaryFileSize.toString(),
		comparisonFileName,
		comparisonFileSize.toString(),
		JSON.stringify(columnPairs),
		JSON.stringify(reconciliationConfig)
	].join('|');

	let hash = 0;
	for (let i = 0; i < hashInput.length; i++) {
		const char = hashInput.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return `file-progress-${Math.abs(hash).toString(36)}`;
}

async function getOrCreateFileProgress(
	primaryFileName: string,
	primaryFileSize: number,
	comparisonFileName: string,
	comparisonFileSize: number,
	columnPairs: ColumnPair[],
	reconciliationConfig: Record<string, any>
): Promise<FileProgressTracker> {
	const fileHash = generateFileHash(
		primaryFileName,
		primaryFileSize,
		comparisonFileName,
		comparisonFileSize,
		columnPairs,
		reconciliationConfig
	);

	const db = await getReconciliationDB();
	const progressTable = db.getFileProgressTable();

	const existingProgress = (await progressTable.get(fileHash)) as FileProgressTracker | undefined;

	if (existingProgress) {
		console.log(`[FileProgressTracker] Found existing progress for hash ${fileHash}`);
		return existingProgress;
	}

	console.log(`[FileProgressTracker] Creating new progress tracker for hash ${fileHash}`);
	const newProgress: FileProgressTracker = {
		fileHash,
		lastComparisonRowInserted: 0,
		lastPrimaryRowInserted: 0,
		reconciliationProgress: 'not_started',
		primaryFileName,
		comparisonFileName,
		primaryFileSize,
		comparisonFileSize,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};

	await progressTable.put(newProgress);
	return newProgress;
}

async function updateComparisonProgress(
	fileHash: string,
	lastRowInserted: number | 'completed'
): Promise<void> {
	const db = await getReconciliationDB();
	const progressTable = db.getFileProgressTable();

	const progress = (await progressTable.get(fileHash)) as FileProgressTracker | undefined;
	if (!progress) {
		throw new Error(`[FileProgressTracker] No progress record found for hash ${fileHash}`);
	}

	progress.lastComparisonRowInserted = lastRowInserted;
	progress.updatedAt = Date.now();

	await progressTable.put(progress);
	console.log(
		`[FileProgressTracker] Updated comparison progress to row ${lastRowInserted} for hash ${fileHash}`
	);
}

async function updatePrimaryProgress(
	fileHash: string,
	lastRowInserted: number | 'completed'
): Promise<void> {
	const db = await getReconciliationDB();
	const progressTable = db.getFileProgressTable();

	const progress = (await progressTable.get(fileHash)) as FileProgressTracker | undefined;
	if (!progress) {
		throw new Error(`[FileProgressTracker] No progress record found for hash ${fileHash}`);
	}

	progress.lastPrimaryRowInserted = lastRowInserted;
	progress.updatedAt = Date.now();

	await progressTable.put(progress);
	console.log(
		`[FileProgressTracker] Updated primary progress to row ${lastRowInserted} for hash ${fileHash}`
	);
}

async function updateReconciliationProgress(
	fileHash: string,
	status: 'not_started' | 'ongoing' | 'completed'
): Promise<void> {
	const db = await getReconciliationDB();
	const progressTable = db.getFileProgressTable();

	const progress = (await progressTable.get(fileHash)) as FileProgressTracker | undefined;
	if (!progress) {
		throw new Error(`[FileProgressTracker] No progress record found for hash ${fileHash}`);
	}

	progress.reconciliationProgress = status;
	progress.updatedAt = Date.now();

	await progressTable.put(progress);
	console.log(
		`[FileProgressTracker] Updated reconciliation progress to ${status} for hash ${fileHash}`
	);
}

async function getFileProgress(fileHash: string): Promise<FileProgressTracker | undefined> {
	const db = await getReconciliationDB();
	const progressTable = db.getFileProgressTable();

	return (await progressTable.get(fileHash)) as FileProgressTracker | undefined;
}

export {
	generateFileHash,
	getOrCreateFileProgress,
	updateComparisonProgress,
	updatePrimaryProgress,
	updateReconciliationProgress,
	getFileProgress
};
