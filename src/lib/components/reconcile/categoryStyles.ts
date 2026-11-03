import type { ResultCategory } from '$lib/engine/resultViews';

export type CategoryStyle = {
	solidBackgroundClass: string;
	textColorClass: string;
	ringColorClass: string;
	textOnSolidClass: string;
	iconText: string;
};

export const CATEGORY_STYLES: Record<ResultCategory, CategoryStyle> = {
	matched: { solidBackgroundClass: 'bg-green-500', textColorClass: 'text-green-400', ringColorClass: 'ring-green-500', textOnSolidClass: 'text-white', iconText: '✓' },
	needs_review: { solidBackgroundClass: 'bg-orange-400', textColorClass: 'text-orange-400', ringColorClass: 'ring-orange-400', textOnSolidClass: 'text-gray-900', iconText: '≠' },
	only_left: { solidBackgroundClass: 'bg-blue-500', textColorClass: 'text-blue-400', ringColorClass: 'ring-blue-500', textOnSolidClass: 'text-white', iconText: '←' },
	only_right: { solidBackgroundClass: 'bg-red-400', textColorClass: 'text-red-400', ringColorClass: 'ring-red-400', textOnSolidClass: 'text-white', iconText: '→' }
};

export const CATEGORY_DISPLAY_ORDER: ResultCategory[] = ['matched', 'needs_review', 'only_left', 'only_right'];
