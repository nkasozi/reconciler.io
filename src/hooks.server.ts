import { redirect, type Handle } from '@sveltejs/kit';

const RETIRED_RECONCILIATION_PATHS = ['/upload', '/column-selection', '/reconciliation-progress', '/reconciliation-results', '/summary'];

export function isRetiredReconciliationPath(requestPath: string): boolean {
	const pathWithoutTrailingSlash = requestPath.length > 1 ? requestPath.replace(/\/+$/, '') : requestPath;
	return RETIRED_RECONCILIATION_PATHS.includes(pathWithoutTrailingSlash);
}

export const handle: Handle = async ({ event, resolve }) => {
	if (isRetiredReconciliationPath(event.url.pathname)) {
		console.log(`[hooks] Redirecting retired page ${event.url.pathname} to /reconcile`);
		redirect(308, '/reconcile');
	}
	return resolve(event);
};
