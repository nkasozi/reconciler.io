import { readAnyFile } from '$lib/adapters/fileReaders/readAnyFile';
import { writeXlsxWorkbook } from '$lib/adapters/spreadsheet/xlsxWorkbookWriter';
import { createMatchingEngineService } from '$lib/application/matchingEngineService';
import type { WorkerRequestEnvelope, WorkerResponseEnvelope } from './webWorkerMatchingEngine';

const matchingEngineService = createMatchingEngineService({ readTableFile: readAnyFile, writeWorkbook: writeXlsxWorkbook });

self.onmessage = async (messageEvent: MessageEvent<WorkerRequestEnvelope>): Promise<void> => {
	const { requestId, request } = messageEvent.data;
	console.log(`[reconcile.worker] Request ${requestId}: ${request.requestType}`);
	try {
		const response = await matchingEngineService.handleRequest(request);
		const transferables = response.responseType === 'excel_ready' ? [response.workbookBytes] : [];
		postEnvelope({ requestId, isSuccess: true, response }, transferables);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[reconcile.worker] Request ${requestId} failed:`, error);
		postEnvelope({ requestId, isSuccess: false, errorMessage }, []);
	}
};

function postEnvelope(envelope: WorkerResponseEnvelope, transferables: Transferable[]): boolean {
	(self as unknown as Worker).postMessage(envelope, transferables);
	return true;
}
