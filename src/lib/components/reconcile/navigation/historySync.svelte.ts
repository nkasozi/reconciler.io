import { untrack } from 'svelte';
import { afterNavigate, pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';
import { areLocationsEqual, buildLocationKey, isSameScreenIgnoringReconciliation, buildUrlForLocation, readLocationFromUrl, type AppLocation } from './appLocation';

export type HistorySyncDependencies = {
	readSessionLocation: () => AppLocation | null;
	applyLocation: (requestedLocation: AppLocation) => AppLocation;
	isBusyWorking: () => boolean;
};

function readHistoryLocation(): AppLocation {
	return page.state.appLocation ?? readLocationFromUrl(page.url);
}

export function createHistorySync(dependencies: HistorySyncDependencies) {
	let lastSyncedLocationKey: string | null = null;
	let isRouterReady = $state(false);

	afterNavigate(() => {
		isRouterReady = true;
	});

	$effect(() => {
		if (!isRouterReady) return;
		const historyLocation = readHistoryLocation();
		untrack(() => {
			if (buildLocationKey(historyLocation) === lastSyncedLocationKey) return;
			if (dependencies.isBusyWorking() && lastSyncedLocationKey !== null) {
				console.log('[historySync] Ignoring a back/forward press while work is running');
				return;
			}
			const appliedLocation = dependencies.applyLocation(historyLocation);
			lastSyncedLocationKey = buildLocationKey(appliedLocation);
			if (areLocationsEqual(appliedLocation, historyLocation)) return;
			console.log(`[historySync] ${buildUrlForLocation(historyLocation)} is not available, showing ${buildUrlForLocation(appliedLocation)} instead`);
			replaceState(buildUrlForLocation(appliedLocation), { appLocation: appliedLocation, previousLocation: page.state.previousLocation ?? null });
		});
	});

	$effect(() => {
		if (!isRouterReady) return;
		const sessionLocation = dependencies.readSessionLocation();
		if (!sessionLocation) return;
		untrack(() => {
			const sessionLocationKey = buildLocationKey(sessionLocation);
			if (sessionLocationKey === lastSyncedLocationKey) return;
			const historyLocation = readHistoryLocation();
			const isOnlyChangingStartMode = sessionLocation.view === 'start' && historyLocation.view === 'start';
			const isOnlyGainingSavedId = !historyLocation.reconciliationId && isSameScreenIgnoringReconciliation(sessionLocation, historyLocation);
			const shouldReplaceEntry = isOnlyChangingStartMode || isOnlyGainingSavedId;
			lastSyncedLocationKey = sessionLocationKey;
			const sessionUrl = buildUrlForLocation(sessionLocation);
			console.log(`[historySync] ${shouldReplaceEntry ? 'Replacing' : 'Adding'} history entry ${sessionUrl}`);
			if (shouldReplaceEntry) replaceState(sessionUrl, { appLocation: sessionLocation, previousLocation: page.state.previousLocation ?? null });
			else pushState(sessionUrl, { appLocation: sessionLocation, previousLocation: historyLocation });
		});
	});

	return {
		get previousLocation(): AppLocation | null {
			return page.state.previousLocation ?? null;
		}
	};
}
