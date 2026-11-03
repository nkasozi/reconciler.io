import type { ScreenPoint } from './linkerModel';
import type { LinkSide } from './linkRewiring';

export type LinkerChipUnderPointer = { side: LinkSide; encodedValue: string };

export type PointerDragCallbacks = {
	onDragMoved: (clientPoint: ScreenPoint) => boolean;
	onDragEnded: (clientPoint: ScreenPoint, wasDragged: boolean) => boolean;
};

export const DRAG_START_DISTANCE_IN_PIXELS = 6;

export function readClientPoint(pointerEvent: PointerEvent): ScreenPoint {
	return { x: pointerEvent.clientX, y: pointerEvent.clientY };
}

export function toContainerPoint(containerElement: HTMLElement, clientPoint: ScreenPoint): ScreenPoint {
	const containerBox = containerElement.getBoundingClientRect();
	return { x: clientPoint.x - containerBox.left, y: clientPoint.y - containerBox.top };
}

export function findLinkerChipAtClientPoint(clientPoint: ScreenPoint): LinkerChipUnderPointer | null {
	const chipElement = document.elementFromPoint(clientPoint.x, clientPoint.y)?.closest<HTMLElement>('[data-linker-side]');
	const chipSide = chipElement?.dataset.linkerSide;
	const encodedValue = chipElement?.dataset.linkerValue;
	switch (chipSide) {
		case 'left':
		case 'right':
			return encodedValue ? { side: chipSide, encodedValue } : null;
		default:
			return null;
	}
}

export function trackPointerDrag(startEvent: PointerEvent, callbacks: PointerDragCallbacks, dragStartDistanceInPixels = DRAG_START_DISTANCE_IN_PIXELS): boolean {
	const dragOrigin = readClientPoint(startEvent);
	let hasDragStarted = false;
	const handlePointerMove = (moveEvent: PointerEvent): void => {
		const movedPoint = readClientPoint(moveEvent);
		const movedDistance = Math.hypot(movedPoint.x - dragOrigin.x, movedPoint.y - dragOrigin.y);
		if (!hasDragStarted && movedDistance < dragStartDistanceInPixels) return;
		hasDragStarted = true;
		callbacks.onDragMoved(movedPoint);
	};
	const handlePointerFinished = (finishEvent: PointerEvent): void => {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerFinished);
		window.removeEventListener('pointercancel', handlePointerFinished);
		const wasCancelled = finishEvent.type === 'pointercancel';
		if (wasCancelled) console.log('[pointerDragTracking] Drag cancelled by the browser');
		callbacks.onDragEnded(readClientPoint(finishEvent), hasDragStarted && !wasCancelled);
	};
	window.addEventListener('pointermove', handlePointerMove);
	window.addEventListener('pointerup', handlePointerFinished);
	window.addEventListener('pointercancel', handlePointerFinished);
	return true;
}
