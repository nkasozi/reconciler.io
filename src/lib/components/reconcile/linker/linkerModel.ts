import { buildRule } from '$lib/engine/planSuggester';
import { buildColumnOptions, decodeColumnSource, encodeColumnSource, guessFieldKindForColumn } from '$lib/engine/planEditing';
import type { ColumnRole } from '$lib/engine/columnRoles';
import type { FieldKind, FieldRule, MatchPlan } from '$lib/engine/types';
import type { TableOverview } from '$lib/engine/workerProtocol';

export type LinkRole = 'pair' | 'check';
export type LinkView = { ruleId: string; role: LinkRole; leftValue: string; rightValue: string; rule: FieldRule };
export type ScreenPoint = { x: number; y: number };

export const ROLE_ICONS: Record<ColumnRole, string> = {
	date: '📅', reference: '#', description: 'Aa', amount: '💰', debit: '−', credit: '+', balance: '⚖', account: '🗂', party: '👤', quantity: '📦', other: '·'
};

export function listLinks(plan: MatchPlan): LinkView[] {
	const toLinkView = (rule: FieldRule, role: LinkRole): LinkView => ({ ruleId: rule.ruleId, role, leftValue: encodeColumnSource(rule.leftSource), rightValue: encodeColumnSource(rule.rightSource), rule });
	return [...plan.keyRules.map((rule) => toLinkView(rule, 'pair')), ...plan.compareRules.map((rule) => toLinkView(rule, 'check'))];
}

export function addLinkToPlan(plan: MatchPlan, leftValue: string, rightValue: string, leftOverview: TableOverview): { updatedPlan: MatchPlan; ruleId: string } {
	const existingLink = listLinks(plan).find((link) => link.leftValue === leftValue && link.rightValue === rightValue);
	if (existingLink) return { updatedPlan: plan, ruleId: existingLink.ruleId };
	const leftSource = decodeColumnSource(leftValue);
	const rightSource = decodeColumnSource(rightValue);
	const role: LinkRole = plan.keyRules.length === 0 ? 'pair' : 'check';
	const guessedFieldKind = guessFieldKindForColumn(leftOverview, leftSource);
	const fieldKind: FieldKind = role === 'pair' && guessedFieldKind === 'text' ? 'reference' : guessedFieldKind;
	const ruleId = `link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const newRule = buildRule(ruleId, fieldKind, leftSource, rightSource);
	console.log(`[linkerModel] Linked ${leftValue} → ${rightValue} as ${role} (${fieldKind})`);
	const updatedPlan = role === 'pair' ? { ...plan, keyRules: [...plan.keyRules, newRule] } : { ...plan, compareRules: [...plan.compareRules, newRule] };
	return { updatedPlan: reconnectFallback(updatedPlan), ruleId };
}

export function changeLinkRole(plan: MatchPlan, ruleId: string, newRole: LinkRole): MatchPlan {
	const movingRule = [...plan.keyRules, ...plan.compareRules].find((rule) => rule.ruleId === ruleId);
	if (!movingRule) return plan;
	const keyRules = plan.keyRules.filter((rule) => rule.ruleId !== ruleId);
	const compareRules = plan.compareRules.filter((rule) => rule.ruleId !== ruleId);
	return newRole === 'pair' ? { ...plan, keyRules: [...keyRules, movingRule], compareRules } : { ...plan, keyRules, compareRules: [...compareRules, movingRule] };
}

export function replaceLinkRule(plan: MatchPlan, updatedRule: FieldRule): MatchPlan {
	const swapRule = (rule: FieldRule): FieldRule => (rule.ruleId === updatedRule.ruleId ? updatedRule : rule);
	return { ...plan, keyRules: plan.keyRules.map(swapRule), compareRules: plan.compareRules.map(swapRule) };
}

export function removeLink(plan: MatchPlan, ruleId: string): MatchPlan {
	return reconnectFallback({
		...plan,
		keyRules: plan.keyRules.filter((rule) => rule.ruleId !== ruleId),
		compareRules: plan.compareRules.filter((rule) => rule.ruleId !== ruleId),
		fallbackMatching: {
			...plan.fallbackMatching,
			amountRuleId: plan.fallbackMatching.amountRuleId === ruleId ? null : plan.fallbackMatching.amountRuleId,
			dateRuleId: plan.fallbackMatching.dateRuleId === ruleId ? null : plan.fallbackMatching.dateRuleId
		}
	});
}

export function reconnectFallback(plan: MatchPlan): MatchPlan {
	const allRules = [...plan.keyRules, ...plan.compareRules];
	const hasRule = (ruleId: string | null): boolean => ruleId !== null && allRules.some((rule) => rule.ruleId === ruleId);
	const amountRuleId = hasRule(plan.fallbackMatching.amountRuleId) ? plan.fallbackMatching.amountRuleId : (allRules.find((rule) => rule.fieldKind === 'amount')?.ruleId ?? null);
	const dateRuleId = hasRule(plan.fallbackMatching.dateRuleId) ? plan.fallbackMatching.dateRuleId : (allRules.find((rule) => rule.fieldKind === 'date')?.ruleId ?? null);
	return { ...plan, fallbackMatching: { ...plan.fallbackMatching, amountRuleId, dateRuleId } };
}

export function buildCurvedLinkPath(startPoint: ScreenPoint, endPoint: ScreenPoint): string {
	const controlOffset = Math.max(24, Math.abs(endPoint.x - startPoint.x) * 0.5);
	return `M ${startPoint.x} ${startPoint.y} C ${startPoint.x + controlOffset} ${startPoint.y}, ${endPoint.x - controlOffset} ${endPoint.y}, ${endPoint.x} ${endPoint.y}`;
}

export function findCurvePoint(startPoint: ScreenPoint, endPoint: ScreenPoint, curveProgress: number): ScreenPoint {
	const controlOffset = Math.max(24, Math.abs(endPoint.x - startPoint.x) * 0.5);
	const firstControl = { x: startPoint.x + controlOffset, y: startPoint.y };
	const secondControl = { x: endPoint.x - controlOffset, y: endPoint.y };
	const remainingProgress = 1 - curveProgress;
	const blend = (startValue: number, firstControlValue: number, secondControlValue: number, endValue: number): number =>
		remainingProgress ** 3 * startValue + 3 * remainingProgress ** 2 * curveProgress * firstControlValue + 3 * remainingProgress * curveProgress ** 2 * secondControlValue + curveProgress ** 3 * endValue;
	return { x: blend(startPoint.x, firstControl.x, secondControl.x, endPoint.x), y: blend(startPoint.y, firstControl.y, secondControl.y, endPoint.y) };
}

const BADGE_POSITION_CANDIDATES = [0.5, 0.3, 0.7, 0.18, 0.82];
const MINIMUM_BADGE_SPACING_IN_PIXELS = 28;

export function placeLinkBadges(linkEndpoints: { ruleId: string; startPoint: ScreenPoint; endPoint: ScreenPoint }[]): Record<string, ScreenPoint> {
	const placedBadges: Record<string, ScreenPoint> = {};
	const sortedLinks = [...linkEndpoints].sort((first, second) => first.ruleId.localeCompare(second.ruleId));
	for (const linkEndpoint of sortedLinks) {
		const candidatePoints = BADGE_POSITION_CANDIDATES.map((curveProgress) => findCurvePoint(linkEndpoint.startPoint, linkEndpoint.endPoint, curveProgress));
		const isFarFromOthers = (candidatePoint: ScreenPoint): boolean => Object.values(placedBadges).every((placedPoint) => Math.hypot(placedPoint.x - candidatePoint.x, placedPoint.y - candidatePoint.y) >= MINIMUM_BADGE_SPACING_IN_PIXELS);
		placedBadges[linkEndpoint.ruleId] = candidatePoints.find(isFarFromOthers) ?? candidatePoints[0];
	}
	return placedBadges;
}

export function readSampleValue(tableOverview: TableOverview, encodedValue: string): string {
	const source = decodeColumnSource(encodedValue);
	if (source.sourceKind !== 'column') return 'combined amount';
	return tableOverview.previewRows.map((previewRow) => previewRow[source.columnIndex]).find((cellValue) => cellValue && cellValue.trim() !== '') ?? '';
}

export function readColumnRole(tableOverview: TableOverview, encodedValue: string): ColumnRole {
	const source = decodeColumnSource(encodedValue);
	return source.sourceKind === 'column' ? (tableOverview.columnRoles[source.columnIndex] ?? 'other') : 'amount';
}

export function describeLinkColumns(link: LinkView, leftOverview: TableOverview, rightOverview: TableOverview): string {
	const columnLabelFor = (tableOverview: TableOverview, encodedValue: string): string => buildColumnOptions(tableOverview).find((columnOption) => columnOption.optionValue === encodedValue)?.optionLabel ?? 'Column';
	return `${columnLabelFor(leftOverview, link.leftValue)} ↔ ${columnLabelFor(rightOverview, link.rightValue)}`;
}
