import { tick } from 'svelte';
import type { ScreenPoint } from './linkerModel';
import type { LinkSide } from './linkRewiring';

type ChipAnchors = { leftAnchor: ScreenPoint; rightAnchor: ScreenPoint };

const SETTLE_REMEASURE_DELAYS_IN_MILLISECONDS = [250, 700];

export function createChipAnchorTracker(getContainerElement: () => HTMLElement | undefined) {
	const chipElementsByKey = new Map<string, HTMLElement>();
	let anchorPointsByKey = $state<Record<string, ChipAnchors>>({});
	let containerWidth = $state(0);

	function registerChip(chipKey: string, chipElement: HTMLElement | null): boolean {
		if (chipElement) chipElementsByKey.set(chipKey, chipElement);
		else chipElementsByKey.delete(chipKey);
		return true;
	}

	function measureAnchors(): boolean {
		const containerElement = getContainerElement();
		if (!containerElement) return false;
		const containerBox = containerElement.getBoundingClientRect();
		const measuredAnchors: Record<string, ChipAnchors> = {};
		for (const [chipKey, chipElement] of chipElementsByKey) {
			const chipBox = chipElement.getBoundingClientRect();
			const middleY = chipBox.top + chipBox.height / 2 - containerBox.top;
			measuredAnchors[chipKey] = { leftAnchor: { x: chipBox.left - containerBox.left, y: middleY }, rightAnchor: { x: chipBox.right - containerBox.left, y: middleY } };
		}
		anchorPointsByKey = measuredAnchors;
		containerWidth = containerBox.width;
		return true;
	}

	function anchorFor(side: LinkSide, encodedValue: string): ScreenPoint | null {
		const anchors = anchorPointsByKey[`${side}|${encodedValue}`];
		if (!anchors) return null;
		return side === 'left' ? anchors.rightAnchor : anchors.leftAnchor;
	}

	function watchContainerSize(): () => void {
		const containerElement = getContainerElement();
		const resizeObserver = new ResizeObserver(() => measureAnchors());
		if (containerElement) resizeObserver.observe(containerElement);
		window.addEventListener('resize', measureAnchors);
		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', measureAnchors);
		};
	}

	function remeasureAfterLayoutSettles(): () => void {
		tick().then(measureAnchors);
		const settleTimers = SETTLE_REMEASURE_DELAYS_IN_MILLISECONDS.map((delayInMilliseconds) => setTimeout(measureAnchors, delayInMilliseconds));
		return () => settleTimers.forEach((settleTimer) => clearTimeout(settleTimer));
	}

	return {
		get containerWidth() {
			return containerWidth;
		},
		registerChip,
		anchorFor,
		watchContainerSize,
		remeasureAfterLayoutSettles
	};
}
