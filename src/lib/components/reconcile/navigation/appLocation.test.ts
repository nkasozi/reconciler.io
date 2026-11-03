import { describe, expect, it } from 'vitest';
import { areLocationsEqual, buildUrlForLocation, createStartLocation, describeLocationForBackButton, findParentLocation, readLocationFromUrl, type AppLocation } from './appLocation';

const readFromPath = (pathWithQuery: string): AppLocation => readLocationFromUrl(new URL(pathWithQuery, 'http://localhost'));

describe('app locations in the address bar', () => {
	it('round-trips every kind of screen through its URL', () => {
		const locations: AppLocation[] = [
			createStartLocation(),
			createStartLocation('all_together'),
			createStartLocation('step_by_step'),
			{ view: 'map', stepNumber: null, startMode: 'two_files' },
			{ view: 'links', stepNumber: 2, startMode: 'two_files' },
			{ view: 'results', stepNumber: 3, startMode: 'two_files' }
		];
		for (const location of locations) expect(areLocationsEqual(readFromPath(buildUrlForLocation(location)), location)).toBe(true);
	});

	it('builds short, readable URLs', () => {
		expect(buildUrlForLocation(createStartLocation())).toBe('/reconcile');
		expect(buildUrlForLocation(createStartLocation('all_together'))).toBe('/reconcile?start=several');
		expect(buildUrlForLocation({ view: 'links', stepNumber: 2, startMode: 'two_files' })).toBe('/reconcile?view=links&step=2');
	});

	it('falls back to sensible screens for odd URLs', () => {
		expect(readFromPath('/reconcile?view=nonsense')).toEqual(createStartLocation());
		expect(readFromPath('/reconcile?view=links&step=-4').stepNumber).toBe(1);
		expect(readFromPath('/reconcile?start=unknown').startMode).toBe('two_files');
	});
});

describe('going back within the app', () => {
	it('walks results → links → map or start', () => {
		const results: AppLocation = { view: 'results', stepNumber: 2, startMode: 'two_files' };
		const links = findParentLocation(results, 2);
		expect(links).toEqual({ view: 'links', stepNumber: 2, startMode: 'two_files' });
		expect(findParentLocation(links, 2).view).toBe('map');
		expect(findParentLocation(links, 1).view).toBe('start');
		expect(findParentLocation({ view: 'map', stepNumber: null, startMode: 'two_files' }, 3).view).toBe('start');
	});

	it('names where the back button goes', () => {
		expect(describeLocationForBackButton({ view: 'links', stepNumber: 1, startMode: 'two_files' })).toBe('Back to step 1 links');
		expect(describeLocationForBackButton(createStartLocation())).toBe('Back to your files');
	});
});
