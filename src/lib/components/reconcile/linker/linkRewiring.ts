import { buildRule } from '$lib/engine/planSuggester';
import { decodeColumnSource, guessFieldKindForColumn } from '$lib/engine/planEditing';
import type { FieldKind, FieldRule, MatchPlan } from '$lib/engine/types';
import type { TableOverview } from '$lib/ports/matchingEngine';
import { listLinks, reconnectFallback, removeLink, replaceLinkRule, type LinkRole, type LinkView } from './linkerModel';

export type LinkSide = 'left' | 'right';
export type EndpointMoveOutcome = 'moved' | 'merged_into_existing_link' | 'unchanged' | 'link_not_found';
export type EndpointMoveResult = { updatedPlan: MatchPlan; moveOutcome: EndpointMoveOutcome };

function chooseFieldKindForMovedLink(role: LinkRole, leftOverview: TableOverview, leftValue: string): FieldKind {
	const guessedFieldKind = guessFieldKindForColumn(leftOverview, decodeColumnSource(leftValue));
	return role === 'pair' && guessedFieldKind === 'text' ? 'reference' : guessedFieldKind;
}

function rebuildRuleForNewColumns(movingLink: LinkView, newLeftValue: string, newRightValue: string, newFieldKind: FieldKind): FieldRule {
	const leftSource = decodeColumnSource(newLeftValue);
	const rightSource = decodeColumnSource(newRightValue);
	const isSameKindOfField = newFieldKind === movingLink.rule.fieldKind;
	return isSameKindOfField ? { ...movingLink.rule, leftSource, rightSource } : buildRule(movingLink.ruleId, newFieldKind, leftSource, rightSource);
}

function forgetFallbackReferencesToRule(plan: MatchPlan, ruleId: string): MatchPlan {
	const { amountRuleId, dateRuleId } = plan.fallbackMatching;
	return { ...plan, fallbackMatching: { ...plan.fallbackMatching, amountRuleId: amountRuleId === ruleId ? null : amountRuleId, dateRuleId: dateRuleId === ruleId ? null : dateRuleId } };
}

export function moveLinkEndpoint(plan: MatchPlan, ruleId: string, movingSide: LinkSide, newEncodedValue: string, leftOverview: TableOverview): EndpointMoveResult {
	const allLinks = listLinks(plan);
	const movingLink = allLinks.find((link) => link.ruleId === ruleId);
	if (!movingLink) {
		console.warn(`[linkRewiring] Tried to move an end of link ${ruleId}, but it no longer exists`);
		return { updatedPlan: plan, moveOutcome: 'link_not_found' };
	}
	const newLeftValue = movingSide === 'left' ? newEncodedValue : movingLink.leftValue;
	const newRightValue = movingSide === 'right' ? newEncodedValue : movingLink.rightValue;
	if (newLeftValue === movingLink.leftValue && newRightValue === movingLink.rightValue) {
		console.log(`[linkRewiring] Link ${ruleId} was dropped back where it started`);
		return { updatedPlan: plan, moveOutcome: 'unchanged' };
	}
	const isAlreadyLinkedElsewhere = allLinks.some((link) => link.ruleId !== ruleId && link.leftValue === newLeftValue && link.rightValue === newRightValue);
	if (isAlreadyLinkedElsewhere) {
		console.log(`[linkRewiring] ${newLeftValue} → ${newRightValue} is already linked, so link ${ruleId} is folded into it`);
		return { updatedPlan: removeLink(plan, ruleId), moveOutcome: 'merged_into_existing_link' };
	}
	const newFieldKind = chooseFieldKindForMovedLink(movingLink.role, leftOverview, newLeftValue);
	const rebuiltRule = rebuildRuleForNewColumns(movingLink, newLeftValue, newRightValue, newFieldKind);
	const planWithRebuiltRule = replaceLinkRule(plan, rebuiltRule);
	const planReadyForFallback = rebuiltRule.fieldKind === movingLink.rule.fieldKind ? planWithRebuiltRule : forgetFallbackReferencesToRule(planWithRebuiltRule, ruleId);
	console.log(`[linkRewiring] Moved the ${movingSide} end of ${ruleId}: ${newLeftValue} → ${newRightValue} (${rebuiltRule.fieldKind})`);
	return { updatedPlan: reconnectFallback(planReadyForFallback), moveOutcome: 'moved' };
}
