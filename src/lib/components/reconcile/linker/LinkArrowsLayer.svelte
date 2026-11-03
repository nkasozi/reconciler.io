<script lang="ts">
	import type { ActiveEndpointDrag } from './endpointDragController.svelte';
	import LinkArrow from './LinkArrow.svelte';
	import { buildCurvedLinkPath, findCurvePoint, placeLinkBadges, type LinkView, type ScreenPoint } from './linkerModel';
	import type { LinkSide } from './linkRewiring';

	type LinkEndpoints = { startPoint: ScreenPoint; endPoint: ScreenPoint };
	type RubberBand = { side: LinkSide; anchorPoint: ScreenPoint; pointerPoint: ScreenPoint };

	type LinkArrowsLayerProps = {
		links: LinkView[];
		resolveLinkEndpoints: (link: LinkView) => LinkEndpoints | null;
		suggestedRuleIds: string[];
		selectedRuleIds: (string | null)[];
		activeDrag: ActiveEndpointDrag | null;
		rubberBand: RubberBand | null;
		onLinkClicked: (ruleId: string, clientPoint: ScreenPoint) => boolean;
		onEndpointGrabbed: (pointerEvent: PointerEvent, ruleId: string, movingSide: LinkSide) => boolean;
	};

	let { links, resolveLinkEndpoints, suggestedRuleIds, selectedRuleIds, activeDrag, rubberBand, onLinkClicked, onEndpointGrabbed }: LinkArrowsLayerProps = $props();

	let linkEndpointsByRuleId = $derived(
		Object.fromEntries(links.flatMap((link) => {
			const linkEndpoints = resolveLinkEndpoints(link);
			return linkEndpoints ? [[link.ruleId, linkEndpoints]] : [];
		})) as Record<string, LinkEndpoints>
	);
	let badgePointsByRuleId = $derived(placeLinkBadges(Object.entries(linkEndpointsByRuleId).map(([ruleId, linkEndpoints]) => ({ ruleId, ...linkEndpoints }))));

	function findBadgePoint(ruleId: string, linkEndpoints: LinkEndpoints, isBeingDragged: boolean): ScreenPoint {
		if (isBeingDragged) return findCurvePoint(linkEndpoints.startPoint, linkEndpoints.endPoint, 0.5);
		return badgePointsByRuleId[ruleId] ?? linkEndpoints.startPoint;
	}
</script>

<svg class="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
	{#each links as link (link.ruleId)}
		{@const linkEndpoints = linkEndpointsByRuleId[link.ruleId]}
		{#if linkEndpoints}
			{@const draggedSide = activeDrag?.ruleId === link.ruleId ? activeDrag.movingSide : null}
			<LinkArrow {link} startPoint={linkEndpoints.startPoint} endPoint={linkEndpoints.endPoint} badgePoint={findBadgePoint(link.ruleId, linkEndpoints, draggedSide !== null)}
				isSuggested={suggestedRuleIds.includes(link.ruleId)} isSelected={selectedRuleIds.includes(link.ruleId)} {draggedSide}
				isAnotherLinkBeingDragged={activeDrag !== null && draggedSide === null} {onLinkClicked} {onEndpointGrabbed} />
		{/if}
	{/each}
	{#if rubberBand}
		<path d={rubberBand.side === 'left' ? buildCurvedLinkPath(rubberBand.anchorPoint, rubberBand.pointerPoint) : buildCurvedLinkPath(rubberBand.pointerPoint, rubberBand.anchorPoint)} fill="none" stroke-width="3" stroke-dasharray="6 5" class="stroke-blue-400" />
		<circle cx={rubberBand.pointerPoint.x} cy={rubberBand.pointerPoint.y} r="6" class="fill-blue-400" />
	{/if}
</svg>
