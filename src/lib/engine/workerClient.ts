import type { WorkerRequestBody, WorkerResponse, WorkerResponseBody } from './workerProtocol';

type PendingRequest = { resolveRequest: (body: WorkerResponseBody) => void; rejectRequest: (error: Error) => void };

export type ReconcileWorkerClient = {
	sendRequest: <ResponseType extends WorkerResponseBody['responseType']>(body: WorkerRequestBody) => Promise<Extract<WorkerResponseBody, { responseType: ResponseType }>>;
	terminate: () => boolean;
};

export function createReconcileWorkerClient(): ReconcileWorkerClient {
	const worker = new Worker(new URL('./reconcile.worker.ts', import.meta.url), { type: 'module' });
	const pendingRequests = new Map<number, PendingRequest>();
	let nextRequestId = 1;

	worker.onmessage = (messageEvent: MessageEvent<WorkerResponse>): void => {
		const response = messageEvent.data;
		const pendingRequest = pendingRequests.get(response.requestId);
		if (!pendingRequest) return;
		pendingRequests.delete(response.requestId);
		if (response.isSuccess) pendingRequest.resolveRequest(response.body);
		else pendingRequest.rejectRequest(new Error(response.errorMessage));
	};
	worker.onerror = (errorEvent: ErrorEvent): void => {
		console.error('[workerClient] Worker crashed', errorEvent.message);
		for (const pendingRequest of pendingRequests.values()) pendingRequest.rejectRequest(new Error('Something went wrong while processing your files. Please try again.'));
		pendingRequests.clear();
	};

	return {
		sendRequest: (body) => {
			const requestId = nextRequestId++;
			return new Promise((resolveRequest, rejectRequest) => {
				pendingRequests.set(requestId, { resolveRequest: resolveRequest as PendingRequest['resolveRequest'], rejectRequest });
				worker.postMessage({ requestId, body });
			});
		},
		terminate: () => {
			worker.terminate();
			return true;
		}
	};
}
