import type { StartMode } from '../start/startModes';

export type AppView = 'start' | 'map' | 'links' | 'results';
export type AppLocation = { view: AppView; stepNumber: number | null; startMode: StartMode; reconciliationId?: string | null };

export const RECONCILE_PATH = '/reconcile';

const START_MODE_URL_VALUES: Record<StartMode, string> = { two_files: '', all_together: 'several', step_by_step: 'steps' };

export function createStartLocation(startMode: StartMode = 'two_files'): AppLocation {
	return { view: 'start', stepNumber: null, startMode };
}

export function buildLocationKey(location: AppLocation): string {
	return location.view === 'start' ? `start|${location.startMode}` : `${location.view}|${location.stepNumber ?? ''}|${location.reconciliationId ?? ''}`;
}

export function areLocationsEqual(firstLocation: AppLocation | null, secondLocation: AppLocation | null): boolean {
	if (!firstLocation || !secondLocation) return firstLocation === secondLocation;
	return buildLocationKey(firstLocation) === buildLocationKey(secondLocation);
}

export function buildUrlForLocation(location: AppLocation): string {
	const searchParameters = new URLSearchParams();
	if (location.view !== 'start' && location.reconciliationId) searchParameters.set('r', location.reconciliationId);
	switch (location.view) {
		case 'start':
			if (START_MODE_URL_VALUES[location.startMode]) searchParameters.set('start', START_MODE_URL_VALUES[location.startMode]);
			break;
		case 'map':
			searchParameters.set('view', 'map');
			break;
		case 'links':
		case 'results':
			searchParameters.set('view', location.view);
			searchParameters.set('step', String(location.stepNumber ?? 1));
			break;
	}
	const queryText = searchParameters.toString();
	return queryText ? `${RECONCILE_PATH}?${queryText}` : RECONCILE_PATH;
}

function readStartMode(startValue: string | null): StartMode {
	const matchingEntry = Object.entries(START_MODE_URL_VALUES).find(([, urlValue]) => urlValue !== '' && urlValue === startValue);
	return (matchingEntry?.[0] as StartMode | undefined) ?? 'two_files';
}

export function readLocationFromUrl(url: URL): AppLocation {
	const viewValue = url.searchParams.get('view');
	const stepNumber = Number(url.searchParams.get('step'));
	const validStepNumber = Number.isInteger(stepNumber) && stepNumber > 0 ? stepNumber : 1;
	const reconciliationId = url.searchParams.get('r');
	switch (viewValue) {
		case 'map':
			return { view: 'map', stepNumber: null, startMode: 'two_files', reconciliationId };
		case 'links':
		case 'results':
			return { view: viewValue, stepNumber: validStepNumber, startMode: 'two_files', reconciliationId };
		default:
			return createStartLocation(readStartMode(url.searchParams.get('start')));
	}
}

export function findParentLocation(location: AppLocation, stepCount: number): AppLocation {
	switch (location.view) {
		case 'results':
			return { ...location, view: 'links' };
		case 'links':
			return stepCount > 1 ? { view: 'map', stepNumber: null, startMode: 'two_files', reconciliationId: location.reconciliationId } : createStartLocation();
		default:
			return createStartLocation();
	}
}

export function describeLocationForBackButton(location: AppLocation): string {
	switch (location.view) {
		case 'start':
			return 'Back to your files';
		case 'map':
			return 'Back to the map';
		case 'links':
			return `Back to step ${location.stepNumber} links`;
		case 'results':
			return `Back to step ${location.stepNumber} results`;
	}
}

export function isSameScreenIgnoringReconciliation(firstLocation: AppLocation, secondLocation: AppLocation): boolean {
	return buildLocationKey({ ...firstLocation, reconciliationId: null }) === buildLocationKey({ ...secondLocation, reconciliationId: null });
}
