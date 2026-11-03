import { describe, expect, it } from 'vitest';
import { buildRule } from '$lib/engine/planSuggester';
import type { MatchPlan } from '$lib/engine/types';
import type { TableOverview } from '$lib/engine/workerProtocol';
import { listLinks } from './linkerModel';
import { moveLinkEndpoint } from './linkRewiring';

const LEFT_OVERVIEW: TableOverview = {
	fileName: 'ledger.csv', sheetName: null, rowCount: 2, columnNames: ['Ref', 'Date', 'Amount', 'Memo'], columnRoles: ['reference', 'date', 'amount', 'description'],
	previewRows: [['A1', '2024-03-01', '100', 'Rent']], skippedRowCount: 0, detectedSystemName: null, dateOrder: 'day_first'
};

function buildPlanWithReferenceAndAmountLinks(): MatchPlan {
	const column = (columnIndex: number) => ({ sourceKind: 'column' as const, columnIndex });
	return {
		keyRules: [buildRule('reference', 'reference', column(0), column(0))],
		compareRules: [buildRule('amount', 'amount', column(2), column(3), { amountTolerance: 0.5 })],
		fallbackMatching: { isEnabled: true, amountRuleId: 'amount', dateRuleId: null, dateWindowDays: 3 }
	};
}

describe('moving a link end to another column', () => {
	it('moves the right end and keeps tolerances when the kind of field stays the same', () => {
		const { updatedPlan, moveOutcome } = moveLinkEndpoint(buildPlanWithReferenceAndAmountLinks(), 'amount', 'right', 'column:1', LEFT_OVERVIEW);
		expect(moveOutcome).toBe('moved');
		const movedLink = listLinks(updatedPlan).find((link) => link.ruleId === 'amount');
		expect(movedLink?.rightValue).toBe('column:1');
		expect(movedLink?.rule.amountTolerance).toBe(0.5);
	});

	it('rebuilds the rule and drops the fallback reference when the left end moves to a different kind of column', () => {
		const { updatedPlan, moveOutcome } = moveLinkEndpoint(buildPlanWithReferenceAndAmountLinks(), 'amount', 'left', 'column:1', LEFT_OVERVIEW);
		expect(moveOutcome).toBe('moved');
		const movedLink = listLinks(updatedPlan).find((link) => link.ruleId === 'amount');
		expect(movedLink?.rule.fieldKind).toBe('date');
		expect(movedLink?.rule.amountTolerance).toBe(0);
		expect(updatedPlan.fallbackMatching.amountRuleId).toBeNull();
		expect(updatedPlan.fallbackMatching.dateRuleId).toBe('amount');
	});

	it('folds the link into an existing one when that pair of columns is already linked', () => {
		const { updatedPlan, moveOutcome } = moveLinkEndpoint(buildPlanWithReferenceAndAmountLinks(), 'amount', 'left', 'column:0', LEFT_OVERVIEW);
		const { updatedPlan: mergedPlan, moveOutcome: mergeOutcome } = moveLinkEndpoint(updatedPlan, 'amount', 'right', 'column:0', LEFT_OVERVIEW);
		expect(moveOutcome).toBe('moved');
		expect(mergeOutcome).toBe('merged_into_existing_link');
		expect(listLinks(mergedPlan).map((link) => link.ruleId)).toEqual(['reference']);
	});

	it('leaves the plan alone when the end is dropped back where it started or the link is gone', () => {
		const plan = buildPlanWithReferenceAndAmountLinks();
		expect(moveLinkEndpoint(plan, 'amount', 'right', 'column:3', LEFT_OVERVIEW).moveOutcome).toBe('unchanged');
		expect(moveLinkEndpoint(plan, 'missing', 'right', 'column:3', LEFT_OVERVIEW).moveOutcome).toBe('link_not_found');
	});

	it('turns a text column into a reference when a pairing link is moved onto it', () => {
		const { updatedPlan } = moveLinkEndpoint(buildPlanWithReferenceAndAmountLinks(), 'reference', 'left', 'column:3', LEFT_OVERVIEW);
		expect(listLinks(updatedPlan).find((link) => link.ruleId === 'reference')?.rule.fieldKind).toBe('reference');
	});
});
