<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { buildColumnOptions } from '$lib/engine/planEditing';
	import type { MatchPlan } from '$lib/engine/types';
	import type { TableOverview } from '$lib/ports/matchingEngine';
	import { riseIn, staggerDelay } from '../motion';
	import SideCard from '../SideCard.svelte';
	import { createChipAnchorTracker } from './chipAnchorTracker.svelte';
	import ColumnChip from './ColumnChip.svelte';
	import { createEndpointDragController } from './endpointDragController.svelte';
	import LinkActionPopover from './LinkActionPopover.svelte';
	import LinkArrowsLayer from './LinkArrowsLayer.svelte';
	import LinkSettingsPanel from './LinkSettingsPanel.svelte';
	import { addLinkToPlan, changeLinkRole, describeLinkColumns, findCurvePoint, listLinks, readColumnRole, readSampleValue, removeLink, replaceLinkRule, type LinkRole, type LinkView, type ScreenPoint } from './linkerModel';
	import { moveLinkEndpoint, type LinkSide } from './linkRewiring';
	import { findLinkerChipAtClientPoint, toContainerPoint, trackPointerDrag } from './pointerDragTracking';

	type ColumnLinkerProps = {
		plan: MatchPlan;
		leftOverview: TableOverview;
		rightOverview: TableOverview;
		leftLabel: string;
		rightLabel: string;
		suggestedRuleIds: string[];
		onPlanChanged: (updatedPlan: MatchPlan) => boolean;
		onRuleConfirmed: (ruleId: string) => boolean;
		leftHeader: Snippet;
		rightHeader: Snippet;
	};

	let { plan, leftOverview, rightOverview, leftLabel, rightLabel, suggestedRuleIds, onPlanChanged, onRuleConfirmed, leftHeader, rightHeader }: ColumnLinkerProps = $props();
	let containerElement: HTMLElement | undefined = $state();
	const anchorTracker = createChipAnchorTracker(() => containerElement);
	let armedChip = $state<{ side: LinkSide; encodedValue: string } | null>(null);
	let rubberBandEnd = $state<ScreenPoint | null>(null);
	let popover = $state<{ ruleId: string; anchorPoint: ScreenPoint } | null>(null);
	let settingsRuleId = $state<string | null>(null);
	let wasJustDragged = false;

	const endpointDrag = createEndpointDragController({
		getContainerElement: () => containerElement,
		findAnchor: (side, encodedValue) => anchorFor(side, encodedValue),
		findEndpointValue: (ruleId, side) => { const link = links.find((candidate) => candidate.ruleId === ruleId); return link ? (side === 'left' ? link.leftValue : link.rightValue) : null; },
		onEndpointDropped: relinkEndpoint,
		onEndpointTapped: openPopoverAtClientPoint
	});

	let leftColumnOptions = $derived(buildColumnOptions(leftOverview));
	let rightColumnOptions = $derived(buildColumnOptions(rightOverview));
	let links = $derived(listLinks(plan));
	let popoverLink = $derived(links.find((link) => link.ruleId === popover?.ruleId) ?? null);
	let settingsLink = $derived(links.find((link) => link.ruleId === settingsRuleId) ?? null);
	let highlightedSide = $derived<LinkSide | null>(armedChip ? (armedChip.side === 'left' ? 'right' : 'left') : (endpointDrag.activeDrag?.movingSide ?? null));
	let armedAnchorPoint = $derived(armedChip ? anchorFor(armedChip.side, armedChip.encodedValue) : null);
	let rubberBand = $derived(armedChip && armedAnchorPoint && rubberBandEnd ? { side: armedChip.side, anchorPoint: armedAnchorPoint, pointerPoint: rubberBandEnd } : null);

	onMount(() => anchorTracker.watchContainerSize());

	$effect(() => {
		void links.length;
		void leftColumnOptions.length;
		return anchorTracker.remeasureAfterLayoutSettles();
	});

	function anchorFor(side: LinkSide, encodedValue: string): ScreenPoint | null {
		return anchorTracker.anchorFor(side, encodedValue);
	}

	function resolveLinkEndpoints(link: LinkView): { startPoint: ScreenPoint; endPoint: ScreenPoint } | null {
		const activeDrag = endpointDrag.activeDrag;
		const isThisLinkDragged = activeDrag?.ruleId === link.ruleId;
		const startPoint = isThisLinkDragged && activeDrag.movingSide === 'left' ? endpointDrag.draggedEndPoint : anchorFor('left', link.leftValue);
		const endPoint = isThisLinkDragged && activeDrag.movingSide === 'right' ? endpointDrag.draggedEndPoint : anchorFor('right', link.rightValue);
		return startPoint && endPoint ? { startPoint, endPoint } : null;
	}

	function openPopoverAtClientPoint(ruleId: string, clientPoint: ScreenPoint): boolean {
		if (!containerElement) return false;
		const isSameLinkAlreadyOpen = popover?.ruleId === ruleId;
		popover = isSameLinkAlreadyOpen ? null : { ruleId, anchorPoint: toContainerPoint(containerElement, clientPoint) };
		armedChip = null;
		return true;
	}

	function closePopover(): boolean {
		popover = null;
		return true;
	}

	function relinkEndpoint(ruleId: string, movingSide: LinkSide, newEncodedValue: string): boolean {
		const { updatedPlan, moveOutcome } = moveLinkEndpoint(plan, ruleId, movingSide, newEncodedValue, leftOverview);
		switch (moveOutcome) {
			case 'moved':
				onRuleConfirmed(ruleId);
				return onPlanChanged(updatedPlan);
			case 'merged_into_existing_link':
				closePopover();
				return onPlanChanged(updatedPlan);
			default:
				return false;
		}
	}

	function unlinkFromPopover(ruleId: string): boolean {
		closePopover();
		if (settingsRuleId === ruleId) settingsRuleId = null;
		return onPlanChanged(removeLink(plan, ruleId));
	}

	function createLink(leftValue: string, rightValue: string): boolean {
		const { updatedPlan, ruleId } = addLinkToPlan(plan, leftValue, rightValue, leftOverview);
		armedChip = null;
		rubberBandEnd = null;
		const leftAnchor = anchorFor('left', leftValue);
		const rightAnchor = anchorFor('right', rightValue);
		popover = leftAnchor && rightAnchor ? { ruleId, anchorPoint: findCurvePoint(leftAnchor, rightAnchor, 0.5) } : null;
		onRuleConfirmed(ruleId);
		return onPlanChanged(updatedPlan);
	}

	function activateChip(side: LinkSide, encodedValue: string): boolean {
		if (wasJustDragged) {
			wasJustDragged = false;
			return false;
		}
		closePopover();
		if (armedChip && armedChip.side !== side) {
			return side === 'right' ? createLink(armedChip.encodedValue, encodedValue) : createLink(encodedValue, armedChip.encodedValue);
		}
		armedChip = armedChip?.encodedValue === encodedValue && armedChip.side === side ? null : { side, encodedValue };
		return true;
	}

	function startChipDrag(pointerEvent: PointerEvent, side: LinkSide, encodedValue: string): boolean {
		if (pointerEvent.pointerType === 'touch' || !containerElement) return false;
		const dragContainer = containerElement;
		return trackPointerDrag(pointerEvent, {
			onDragMoved: (clientPoint) => {
				armedChip = { side, encodedValue };
				rubberBandEnd = toContainerPoint(dragContainer, clientPoint);
				return true;
			},
			onDragEnded: (clientPoint, wasDragged) => {
				if (!wasDragged) return false;
				wasJustDragged = true;
				setTimeout(() => (wasJustDragged = false), 50);
				const droppedOnChip = findLinkerChipAtClientPoint(clientPoint);
				if (droppedOnChip && droppedOnChip.side !== side) return side === 'left' ? createLink(encodedValue, droppedOnChip.encodedValue) : createLink(droppedOnChip.encodedValue, encodedValue);
				armedChip = null;
				rubberBandEnd = null;
				return false;
			}
		});
	}

	function closePopoverWhenClickingElsewhere(pointerEvent: PointerEvent): boolean {
		const clickedElement = pointerEvent.target as Element | null;
		if (!popover || clickedElement?.closest('[data-link-popover],[data-link-interactive]')) return false;
		return closePopover();
	}

	function handleShortcutKeys(keyboardEvent: KeyboardEvent): boolean {
		const isTypingInField = (keyboardEvent.target as Element | null)?.closest('input,select,textarea') !== null;
		switch (keyboardEvent.key) {
			case 'Escape':
				armedChip = null;
				rubberBandEnd = null;
				return closePopover();
			case 'Delete':
			case 'Backspace':
				return popover && !isTypingInField ? unlinkFromPopover(popover.ruleId) : false;
			default:
				return false;
		}
	}

	function linkRolesForChip(side: LinkSide, encodedValue: string): LinkRole[] {
		return links.filter((link) => (side === 'left' ? link.leftValue : link.rightValue) === encodedValue).map((link) => link.role);
	}

	function isChipArmed(side: LinkSide, encodedValue: string): boolean {
		const isSnapTarget = endpointDrag.activeDrag?.movingSide === side && endpointDrag.activeDrag.snapTargetValue === encodedValue;
		return isSnapTarget || (armedChip?.side === side && armedChip.encodedValue === encodedValue);
	}
</script>

<svelte:window onkeydown={handleShortcutKeys} onpointerdown={closePopoverWhenClickingElsewhere} />

<div bind:this={containerElement} class="relative grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)]">
	{#each [{ side: 'left' as LinkSide, columnOptions: leftColumnOptions, overview: leftOverview, baseDelay: 0, header: leftHeader, tableLabel: leftLabel }, { side: 'right' as LinkSide, columnOptions: rightColumnOptions, overview: rightOverview, baseDelay: 80, header: rightHeader, tableLabel: rightLabel }] as chipColumn (chipColumn.side)}
		<SideCard side={chipColumn.side}>
			{@render chipColumn.header()}
			<div class="space-y-2 border-t border-gray-700 pt-3">
				<p class="truncate text-[11px] font-bold uppercase tracking-wider text-gray-400">Columns in {chipColumn.tableLabel}</p>
				{#each chipColumn.columnOptions as columnOption, chipPosition (columnOption.optionValue)}
					<div in:riseIn={{ delay: staggerDelay(chipPosition, chipColumn.baseDelay), distance: 10 }}>
						<ColumnChip side={chipColumn.side} encodedValue={columnOption.optionValue} columnLabel={columnOption.optionLabel} sampleValue={readSampleValue(chipColumn.overview, columnOption.optionValue)} columnRole={readColumnRole(chipColumn.overview, columnOption.optionValue)}
							linkRoles={linkRolesForChip(chipColumn.side, columnOption.optionValue)} isArmed={isChipArmed(chipColumn.side, columnOption.optionValue)} isTargetHighlighted={highlightedSide === chipColumn.side}
							registerChip={anchorTracker.registerChip} onChipPointerDown={(pointerEvent) => startChipDrag(pointerEvent, chipColumn.side, columnOption.optionValue)} onChipActivated={() => activateChip(chipColumn.side, columnOption.optionValue)} />
					</div>
				{/each}
			</div>
		</SideCard>
	{/each}

	<LinkArrowsLayer {links} {resolveLinkEndpoints} {suggestedRuleIds} selectedRuleIds={[popover?.ruleId ?? null, settingsRuleId]} activeDrag={endpointDrag.activeDrag} {rubberBand}
		onLinkClicked={openPopoverAtClientPoint} onEndpointGrabbed={endpointDrag.startEndpointDrag} />

	{#if popover && popoverLink}
		{#key popoverLink.ruleId}
			<LinkActionPopover anchorPoint={popover.anchorPoint} containerWidth={anchorTracker.containerWidth} linkTitle={describeLinkColumns(popoverLink, leftOverview, rightOverview)} role={popoverLink.role} isSuggested={suggestedRuleIds.includes(popoverLink.ruleId)}
				onUnlinked={() => unlinkFromPopover(popoverLink!.ruleId)}
				onRoleChanged={(newRole) => { onRuleConfirmed(popoverLink!.ruleId); return onPlanChanged(changeLinkRole(plan, popoverLink!.ruleId, newRole)); }}
				onKept={() => { onRuleConfirmed(popoverLink!.ruleId); return closePopover(); }}
				onSettingsOpened={() => { settingsRuleId = popoverLink!.ruleId; return closePopover(); }} />
		{/key}
	{/if}
</div>

{#if settingsLink}
	{#key settingsLink.ruleId}
		<LinkSettingsPanel rule={settingsLink.rule} role={settingsLink.role} linkTitle={describeLinkColumns(settingsLink, leftOverview, rightOverview)}
			onRoleChanged={(newRole) => { onRuleConfirmed(settingsLink!.ruleId); return onPlanChanged(changeLinkRole(plan, settingsLink!.ruleId, newRole)); }}
			onRuleChanged={(updatedRule) => { onRuleConfirmed(updatedRule.ruleId); return onPlanChanged(replaceLinkRule(plan, updatedRule)); }}
			onRemoved={() => unlinkFromPopover(settingsLink!.ruleId)}
			onClosed={() => { settingsRuleId = null; return true; }} />
	{/key}
{/if}
