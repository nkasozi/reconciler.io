import type { AppLocation } from '$lib/components/reconcile/navigation/appLocation';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			appLocation?: AppLocation;
			previousLocation?: AppLocation | null;
		}
		// interface Platform {}
	}
}

export {};
