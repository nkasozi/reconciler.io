export type StartMode = 'two_files' | 'all_together' | 'step_by_step';

export type DiagramPiece = { pieceKind: 'file' | 'result' | 'link' | 'arrow'; pieceText: string };

export type StartModeOption = {
	startMode: StartMode;
	optionTitle: string;
	optionSummary: string;
	exampleText: string;
	diagramPieces: DiagramPiece[];
	minimumFileCount: number;
	startButtonLabel: (fileCount: number) => string;
	fileSlotHint: string;
};

const file = (pieceText: string): DiagramPiece => ({ pieceKind: 'file', pieceText });
const link: DiagramPiece = { pieceKind: 'link', pieceText: '⇄' };
const arrow: DiagramPiece = { pieceKind: 'arrow', pieceText: '→' };

export const START_MODE_OPTIONS: StartModeOption[] = [
	{
		startMode: 'two_files',
		optionTitle: 'Two files',
		optionSummary: 'Match one file against another.',
		exampleText: 'e.g. your ledger against the bank statement',
		diagramPieces: [file('A'), link, file('B')],
		minimumFileCount: 2,
		startButtonLabel: () => 'Match them →',
		fileSlotHint: ''
	},
	{
		startMode: 'all_together',
		optionTitle: 'Several files at once',
		optionSummary: 'Match 3 or more files in one go and see which rows agree everywhere.',
		exampleText: 'e.g. purchase orders ⇄ invoices ⇄ delivery notes',
		diagramPieces: [file('A'), link, file('B'), link, file('C'), link, file('…')],
		minimumFileCount: 3,
		startButtonLabel: (fileCount) => `⚡ Match all ${fileCount} files`,
		fileSlotHint: 'Add them in order: each file is matched against everything before it.'
	},
	{
		startMode: 'step_by_step',
		optionTitle: 'Step by step',
		optionSummary: 'Build your own steps, feeding one result into the next.',
		exampleText: 'e.g. match sales with payments, then the leftovers with the bank',
		diagramPieces: [file('A'), link, file('B'), arrow, { pieceKind: 'result', pieceText: '1' }, link, file('C')],
		minimumFileCount: 2,
		startButtonLabel: () => 'Plan my steps →',
		fileSlotHint: 'Add every file you will need. You can add more later, too.'
	}
];

export function findStartModeOption(startMode: StartMode): StartModeOption {
	return START_MODE_OPTIONS.find((modeOption) => modeOption.startMode === startMode) ?? START_MODE_OPTIONS[0];
}
