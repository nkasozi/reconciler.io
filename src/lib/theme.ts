import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

// Check for saved theme preference or use user's system preference
const userTheme = browser
	? localStorage.getItem('theme') ||
		(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
	: 'light';

// Create the theme store
export const theme = writable<Theme>(userTheme as Theme);

// Update the DOM and localStorage when theme changes
export function toggleTheme(): void {
	theme.update((currentTheme) => {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

		if (browser) {
			localStorage.setItem('theme', newTheme);
			updateBodyClass(newTheme);
		}

		return newTheme;
	});
}

// Apply theme class to document body
export function applyTheme(selectedTheme: Theme): void {
	if (browser) {
		updateBodyClass(selectedTheme);
	}
}

function updateBodyClass(newTheme: Theme): void {
	document.documentElement.classList.remove('light', 'dark');
	document.documentElement.classList.add(newTheme);
}
