import type { DateOrder } from '$lib/engine/dateParser';
import type { DataTable } from '$lib/engine/types';

export const SUPPORTED_FILE_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls', '.xlsm', '.xlsb', '.ods', '.ofx', '.qfx', '.qbo', '.qif', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];

export type FileInput = { fileName: string; fileBytes: ArrayBuffer };

export type TableFileReader = (fileInput: FileInput, fallbackDateOrder: DateOrder) => DataTable;

export type ProgressReporter = (progressMessage: string) => boolean;

export type DocumentPreparer = {
	isScannedDocumentFile: (file: File) => boolean;
	prepareFileForReading: (file: File, reportProgress: ProgressReporter) => Promise<File>;
};
