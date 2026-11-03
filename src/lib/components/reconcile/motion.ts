import { backOut, cubicOut, elasticOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { TransitionConfig } from 'svelte/transition';

export type MotionOptions = { delay?: number; duration?: number; distance?: number };

export const STAGGER_STEP_IN_MILLISECONDS = 55;
export const MAXIMUM_STAGGERED_ITEMS = 12;

export function isMotionReduced(): boolean {
	return prefersReducedMotion.current;
}

export function staggerDelay(itemPosition: number, baseDelay = 0): number {
	return baseDelay + Math.min(itemPosition, MAXIMUM_STAGGERED_ITEMS) * STAGGER_STEP_IN_MILLISECONDS;
}

export function riseIn(_node: Element, { delay = 0, duration = 420, distance = 18 }: MotionOptions = {}): TransitionConfig {
	if (isMotionReduced()) return { duration: 0 };
	return {
		delay,
		duration,
		easing: cubicOut,
		css: (progress: number, remaining: number) => `opacity: ${progress}; transform: translateY(${remaining * distance}px) scale(${0.98 + progress * 0.02});`
	};
}

export function popIn(_node: Element, { delay = 0, duration = 480 }: MotionOptions = {}): TransitionConfig {
	if (isMotionReduced()) return { duration: 0 };
	return {
		delay,
		duration,
		easing: backOut,
		css: (progress: number) => `opacity: ${Math.min(1, progress * 1.6)}; transform: scale(${0.55 + progress * 0.45});`
	};
}

export function bounceIn(_node: Element, { delay = 0, duration = 900 }: MotionOptions = {}): TransitionConfig {
	if (isMotionReduced()) return { duration: 0 };
	return {
		delay,
		duration,
		easing: elasticOut,
		css: (progress: number) => `transform: scale(${progress}); opacity: ${Math.min(1, progress * 3)};`
	};
}

export function collapseAway(node: Element, { delay = 0, duration = 380 }: MotionOptions = {}): TransitionConfig {
	if (isMotionReduced()) return { duration: 0 };
	const startingHeight = (node as HTMLElement).offsetHeight;
	return {
		delay,
		duration,
		easing: cubicOut,
		css: (progress: number) =>
			`overflow: hidden; height: ${progress * startingHeight}px; opacity: ${progress}; transform: translateX(${(1 - progress) * 40}px) scale(${0.96 + progress * 0.04});`
	};
}
