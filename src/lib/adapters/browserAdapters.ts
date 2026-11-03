import type { MatchingEngineGateway } from '$lib/ports/matchingEngine';
import type { ReconciliationRepository } from '$lib/ports/reconciliationRepository';
import type { DocumentPreparer } from '$lib/ports/tableFileReader';
import { browserDocumentPreparer } from './fileReaders/scannedDocumentConverter';
import { createDexieReconciliationRepository } from './storage/dexieReconciliationRepository';
import { createWebWorkerMatchingEngine } from './webWorker/webWorkerMatchingEngine';

export type BrowserAdapters = {
	startMatchingEngine: () => MatchingEngineGateway;
	documentPreparer: DocumentPreparer;
	reconciliationRepository: ReconciliationRepository;
};

export function createBrowserAdapters(): BrowserAdapters {
	return {
		startMatchingEngine: createWebWorkerMatchingEngine,
		documentPreparer: browserDocumentPreparer,
		reconciliationRepository: createDexieReconciliationRepository()
	};
}
