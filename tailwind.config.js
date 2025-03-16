/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class', // Enable class-based dark mode
	theme: {
		extend: {
			colors: {
				// Light mode colors
				primary: '#3b82f6',
				'primary-hover': '#2563eb',
				secondary: '#10b981',
				'secondary-hover': '#059669',
				accent: '#f43f5e',
				'accent-hover': '#e11d48',
				background: '#ffffff',
				foreground: '#1f2937',
				muted: '#f3f4f6',
				'muted-foreground': '#6b7280',

				// Dark mode colors
				'dark-primary': '#60a5fa',
				'dark-primary-hover': '#93c5fd',
				'dark-secondary': '#34d399',
				'dark-secondary-hover': '#6ee7b7',
				'dark-accent': '#fb7185',
				'dark-accent-hover': '#fda4af',
				'dark-background': '#111827',
				'dark-foreground': '#f9fafb',
				'dark-muted': '#374151',
				'dark-muted-foreground': '#9ca3af'
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};
