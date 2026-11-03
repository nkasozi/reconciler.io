import type { GridCellState, GridView } from '$lib/engine/resultGrid';
import type { ResultCategory } from '$lib/engine/resultViews';
import type { TableLabels } from '$lib/engine/workflowTypes';

export const GRID_CELL_CLASSES: Record<GridCellState, string> = {
	plain: 'text-gray-200',
	agrees: 'bg-green-950 text-green-200',
	differs: 'bg-red-950 text-red-100 font-bold ring-2 ring-inset ring-red-400 cursor-help',
	unpaired_key: 'bg-orange-950 text-orange-100 font-bold ring-2 ring-inset ring-orange-400 cursor-help'
};

export const ROW_STATUS_LABELS: Record<ResultCategory, string> = {
	needs_review: 'Needs a look',
	only_left: 'Missing on right',
	only_right: 'Missing on left',
	matched: 'Matched'
};

export const ROW_STATUS_CLASSES: Record<ResultCategory, string> = {
	needs_review: 'bg-orange-400 text-gray-900',
	only_left: 'bg-blue-500 text-white',
	only_right: 'bg-red-400 text-white',
	matched: 'bg-green-500 text-white'
};

export type GridViewChoice = { choiceKey: string; choiceLabel: string; view: GridView };

export function buildGridViewChoices(labels: TableLabels): GridViewChoice[] {
	return [
		{ choiceKey: 'all', choiceLabel: 'Everything, problems first', view: { viewKind: 'pairs', category: 'all' } },
		{ choiceKey: 'needs_review', choiceLabel: 'Needs a look', view: { viewKind: 'pairs', category: 'needs_review' } },
		{ choiceKey: 'only_left', choiceLabel: `Only in ${labels.leftLabel}`, view: { viewKind: 'pairs', category: 'only_left' } },
		{ choiceKey: 'only_right', choiceLabel: `Only in ${labels.rightLabel}`, view: { viewKind: 'pairs', category: 'only_right' } },
		{ choiceKey: 'matched', choiceLabel: 'Matched', view: { viewKind: 'pairs', category: 'matched' } },
		{ choiceKey: 'file_left', choiceLabel: `${labels.leftLabel} as filed`, view: { viewKind: 'file', side: 'left' } },
		{ choiceKey: 'file_right', choiceLabel: `${labels.rightLabel} as filed`, view: { viewKind: 'file', side: 'right' } }
	];
}
