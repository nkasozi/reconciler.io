import type { EngineRequest, EngineResponse, MatchingEngineGateway } from '$lib/ports/matchingEngine';

export type WorkerRequestEnvelope = { requestId: number; request: EngineRequest };
export type WorkerResponseEnvelope = { requestId: number; isSuccess: true; response: EngineResponse } | { requestId: number; isSuccess: false; errorMessage: string };

type PendingRequest = { resolveRequest: (response: EngineResponse) => void; rejectRequest: (error: Error) => void };

export function createWebWorkerMatchingEngine(): MatchingEngineGateway {
	const worker = new Worker(new URL('./reconcile.worker.ts', import.meta.url), { type: 'module' });
	const pendingRequests = new Map<number, PendingRequest>();
	let nextRequestId = 1;

	worker.onmessage = (messageEvent: MessageEvent<WorkerResponseEnvelope>): void => {
		const envelope = messageEvent.data;
		const pendingRequest = pendingRequests.get(envelope.requestId);
		if (!pendingRequest) return;
		pendingRequests.delete(envelope.requestId);
		if (envelope.isSuccess) pendingRequest.resolveRequest(envelope.response);
		else pendingRequest.rejectRequest(new Error(envelope.errorMessage));
	};
	worker.onerror = (errorEvent: ErrorEvent): void => {
		console.error('[webWorkerMatchingEngine] Worker crashed', errorEvent.message);
		for (const pendingRequest of pendingRequests.values()) pendingRequest.rejectRequest(new Error('Something went wrong while processing your files. Please try again.'));
		pendingRequests.clear();
	};

	return {
		sendRequest: (request) => {
			const requestId = nextRequestId++;
			return new Promise((resolveRequest, rejectRequest) => {
				pendingRequests.set(requestId, { resolveRequest: resolveRequest as PendingRequest['resolveRequest'], rejectRequest });
				worker.postMessage({ requestId, request } satisfies WorkerRequestEnvelope);
			});
		},
		terminate: () => {
			worker.terminate();
			return true;
		}
	};
}
