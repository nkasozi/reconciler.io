import { backOut, cubicOut } from 'svelte/easing';
import { Tween } from 'svelte/motion';
import { isMotionReduced } from '../motion';
import type { ScreenPoint } from './linkerModel';
import type { LinkSide } from './linkRewiring';
import { findLinkerChipAtClientPoint, toContainerPoint, trackPointerDrag } from './pointerDragTracking';

export type ActiveEndpointDrag = { ruleId: string; movingSide: LinkSide; originalValue: string; snapTargetValue: string | null };

export type EndpointDragDependencies = {
	getContainerElement: () => HTMLElement | undefined;
	findAnchor: (side: LinkSide, encodedValue: string) => ScreenPoint | null;
	findEndpointValue: (ruleId: string, side: LinkSide) => string | null;
	onEndpointDropped: (ruleId: string, movingSide: LinkSide, newEncodedValue: string) => boolean;
	onEndpointTapped: (ruleId: string, clientPoint: ScreenPoint) => boolean;
};

const SNAP_DURATION_IN_MILLISECONDS = 140;
const SPRING_BACK_DURATION_IN_MILLISECONDS = 480;

export function createEndpointDragController(dependencies: EndpointDragDependencies) {
	let activeDrag = $state<ActiveEndpointDrag | null>(null);
	const draggedEndPoint = new Tween<ScreenPoint>({ x: 0, y: 0 }, { duration: 0, easing: cubicOut });

	function findSnapTarget(clientPoint: ScreenPoint, movingSide: LinkSide): { encodedValue: string; anchor: ScreenPoint } | null {
		const chipUnderPointer = findLinkerChipAtClientPoint(clientPoint);
		if (!chipUnderPointer || chipUnderPointer.side !== movingSide) return null;
		const anchor = dependencies.findAnchor(movingSide, chipUnderPointer.encodedValue);
		return anchor ? { encodedValue: chipUnderPointer.encodedValue, anchor } : null;
	}

	function followPointer(clientPoint: ScreenPoint, containerElement: HTMLElement): boolean {
		if (!activeDrag) return false;
		const snapTarget = findSnapTarget(clientPoint, activeDrag.movingSide);
		const isNewlySnapped = snapTarget !== null && snapTarget.encodedValue !== activeDrag.snapTargetValue;
		activeDrag = { ...activeDrag, snapTargetValue: snapTarget?.encodedValue ?? null };
		const motionDuration = isNewlySnapped && !isMotionReduced() ? SNAP_DURATION_IN_MILLISECONDS : 0;
		draggedEndPoint.set(snapTarget?.anchor ?? toContainerPoint(containerElement, clientPoint), { duration: motionDuration });
		return true;
	}

	function springBackToOrigin(drag: ActiveEndpointDrag): boolean {
		const originAnchor = dependencies.findAnchor(drag.movingSide, drag.originalValue);
		console.log(`[endpointDragController] Link ${drag.ruleId} was not dropped on a column, so it springs back`);
		if (!originAnchor || isMotionReduced()) {
			activeDrag = null;
			return false;
		}
		activeDrag = { ...drag, snapTargetValue: null };
		draggedEndPoint.set(originAnchor, { duration: SPRING_BACK_DURATION_IN_MILLISECONDS, easing: backOut }).then(() => {
			if (activeDrag?.ruleId === drag.ruleId) activeDrag = null;
		});
		return true;
	}

	function finishDrag(clientPoint: ScreenPoint, wasDragged: boolean, ruleId: string): boolean {
		const finishedDrag = activeDrag;
		if (!finishedDrag) return false;
		if (!wasDragged) {
			activeDrag = null;
			return dependencies.onEndpointTapped(ruleId, clientPoint);
		}
		const dropTarget = findSnapTarget(clientPoint, finishedDrag.movingSide);
		if (!dropTarget) return springBackToOrigin(finishedDrag);
		activeDrag = null;
		return dependencies.onEndpointDropped(ruleId, finishedDrag.movingSide, dropTarget.encodedValue);
	}

	function startEndpointDrag(pointerEvent: PointerEvent, ruleId: string, movingSide: LinkSide): boolean {
		const containerElement = dependencies.getContainerElement();
		const originalValue = dependencies.findEndpointValue(ruleId, movingSide);
		const originAnchor = originalValue ? dependencies.findAnchor(movingSide, originalValue) : null;
		if (!containerElement || !originalValue || !originAnchor) {
			console.warn(`[endpointDragController] Could not start dragging the ${movingSide} end of ${ruleId}`);
			return false;
		}
		console.log(`[endpointDragController] Picked up the ${movingSide} end of ${ruleId}`);
		draggedEndPoint.set(originAnchor, { duration: 0 });
		activeDrag = { ruleId, movingSide, originalValue, snapTargetValue: null };
		return trackPointerDrag(pointerEvent, {
			onDragMoved: (clientPoint) => followPointer(clientPoint, containerElement),
			onDragEnded: (clientPoint, wasDragged) => finishDrag(clientPoint, wasDragged, ruleId)
		}, 3);
	}

	return {
		get activeDrag() {
			return activeDrag;
		},
		get draggedEndPoint() {
			return draggedEndPoint.current;
		},
		startEndpointDrag
	};
}
