<script lang="ts">
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { draw, scale } from 'svelte/transition';
	import { isMotionReduced } from '../motion';
	import { buildCurvedLinkPath, type LinkView, type ScreenPoint } from './linkerModel';
	import type { LinkSide } from './linkRewiring';

	type LinkArrowProps = {
		link: LinkView;
		startPoint: ScreenPoint;
		endPoint: ScreenPoint;
		badgePoint: ScreenPoint;
		isSuggested: boolean;
		isSelected: boolean;
		draggedSide: LinkSide | null;
		isAnotherLinkBeingDragged: boolean;
		onLinkClicked: (ruleId: string, clientPoint: ScreenPoint) => boolean;
		onEndpointGrabbed: (pointerEvent: PointerEvent, ruleId: string, movingSide: LinkSide) => boolean;
	};

	let { link, startPoint, endPoint, badgePoint, isSuggested, isSelected, draggedSide, isAnotherLinkBeingDragged, onLinkClicked, onEndpointGrabbed }: LinkArrowProps = $props();
	let isHovered = $state(false);

	let curvePath = $derived(buildCurvedLinkPath(startPoint, endPoint));
	let isPairLink = $derived(link.role === 'pair');
	let isLifted = $derived(isHovered || isSelected || draggedSide !== null);
	let strokeColorClass = $derived(isPairLink ? 'stroke-green-500' : 'stroke-blue-500');
	let fillColorClass = $derived(isPairLink ? 'fill-green-500' : 'fill-blue-500');
	let restingStrokeWidth = $derived(isPairLink ? 3.5 : 2.5);
	let isFlowDotShown = $derived(!isSuggested && draggedSide === null && !isMotionReduced());
	let endpoints = $derived<{ side: LinkSide; point: ScreenPoint }[]>([{ side: 'left', point: startPoint }, { side: 'right', point: endPoint }]);
	let drawDuration = $derived(isMotionReduced() ? 0 : 650);

	function clickLink(mouseEvent: MouseEvent): boolean {
		mouseEvent.stopPropagation();
		return onLinkClicked(link.ruleId, { x: mouseEvent.clientX, y: mouseEvent.clientY });
	}

	function grabEndpoint(pointerEvent: PointerEvent, movingSide: LinkSide): boolean {
		pointerEvent.stopPropagation();
		pointerEvent.preventDefault();
		return onEndpointGrabbed(pointerEvent, link.ruleId, movingSide);
	}

	function openFromKeyboard(keyboardEvent: KeyboardEvent): boolean {
		if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return false;
		keyboardEvent.preventDefault();
		const badgeBox = (keyboardEvent.currentTarget as SVGGElement).getBoundingClientRect();
		return onLinkClicked(link.ruleId, { x: badgeBox.left + badgeBox.width / 2, y: badgeBox.bottom });
	}
</script>

<g class="transition-opacity duration-300 {isAnotherLinkBeingDragged ? 'opacity-30' : 'opacity-100'}" data-link-interactive role="presentation" onpointerenter={() => (isHovered = true)} onpointerleave={() => (isHovered = false)}>
	<path d={curvePath} fill="none" stroke-linecap="round" class="{strokeColorClass} transition-[stroke-opacity,stroke-width] duration-300" stroke-width={isLifted ? 14 : 4} stroke-opacity={isLifted ? 0.22 : 0} />
	<path d={curvePath} fill="none" stroke-linecap="round" class="{strokeColorClass} {isSuggested ? 'link-suggested' : ''} transition-[stroke-width] duration-200"
		stroke-width={isLifted ? restingStrokeWidth + 1.5 : restingStrokeWidth}
		in:draw|global={{ duration: drawDuration, easing: cubicOut }} out:draw|global={{ duration: drawDuration * 0.6, easing: cubicIn }} />
	{#if isFlowDotShown}
		<circle r={isLifted ? 3.5 : 2.5} class="pointer-events-none fill-white" opacity="0.9">
			<animateMotion dur={isPairLink ? '2.2s' : '3s'} repeatCount="indefinite" path={curvePath} />
		</circle>
	{/if}
	<path d={curvePath} fill="none" stroke="transparent" stroke-width="20" pointer-events="stroke" class="cursor-pointer" role="presentation" onclick={clickLink} />

	<g class="scale-from-center cursor-pointer outline-none" style="pointer-events: auto" role="button" tabindex="0" aria-label="Link options" onclick={clickLink} onkeydown={openFromKeyboard}
		in:scale|global={{ duration: drawDuration * 0.7, delay: drawDuration * 0.45, start: 0.2 }} out:scale|global={{ duration: drawDuration * 0.4 }}>
		<circle cx={badgePoint.x} cy={badgePoint.y} r={isLifted ? 13 : 11} class="{fillColorClass} stroke-gray-900 transition-[r] duration-200 ease-[var(--ease-spring)]" stroke-width="3" />
		<text x={badgePoint.x} y={badgePoint.y + 4} text-anchor="middle" class="pointer-events-none select-none fill-white text-[11px] font-bold">{isSuggested ? '?' : isPairLink ? '⇄' : '✓'}</text>
	</g>

	{#each endpoints as endpoint (endpoint.side)}
		{@const isEndpointDragged = draggedSide === endpoint.side}
		<g class="endpoint-handle {isEndpointDragged ? 'pointer-events-none' : 'cursor-grab'}" style="touch-action: none; pointer-events: {isEndpointDragged ? 'none' : 'auto'}" role="presentation" onpointerdown={(pointerEvent) => grabEndpoint(pointerEvent, endpoint.side)}>
			<circle cx={endpoint.point.x} cy={endpoint.point.y} r="14" fill="transparent" />
			{#if isLifted}
				<circle cx={endpoint.point.x} cy={endpoint.point.y} r="9" class="{fillColorClass} handle-ring scale-from-center pointer-events-none" opacity="0.35" transition:scale={{ duration: isMotionReduced() ? 0 : 220 }} />
			{/if}
			<circle cx={endpoint.point.x} cy={endpoint.point.y} r={isEndpointDragged ? 7 : isLifted ? 6 : 4} class="{fillColorClass} stroke-gray-900 transition-[r] duration-200 ease-[var(--ease-spring)]" stroke-width="2.5" />
		</g>
	{/each}
</g>

<style>
	.link-suggested {
		stroke-dasharray: 4 3;
		animation: march-link 1.2s linear infinite;
	}
	.scale-from-center {
		transform-box: fill-box;
		transform-origin: center;
	}
	.handle-ring {
		animation: handle-breathe 1.4s ease-in-out infinite;
	}
	@keyframes march-link {
		to { stroke-dashoffset: -14; }
	}
	@keyframes handle-breathe {
		50% { transform: scale(1.35); opacity: 0.15; }
	}
	@media (prefers-reduced-motion: reduce) {
		.link-suggested, .handle-ring { animation: none; }
	}
</style>
