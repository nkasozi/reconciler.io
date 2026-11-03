import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { SavedReconciliation } from '$lib/ports/reconciliationRepository';
import { createDexieReconciliationRepository } from './dexieReconciliationRepository';

function buildRecord(reconciliationId: string, updatedAt: number): SavedReconciliation {
	return {
		reconciliationId, title: `Reconciliation ${reconciliationId}`, isTitleChosenByPerson: false, createdAt: 1, updatedAt,
		files: [{ tableId: 'file-A', fileLetter: 'A', fileName: 'ledger.csv', displayName: 'ledger', rowCount: 2, fileContentKey: `${reconciliationId}/file-A` }],
		stages: [], reviewedItemKeysByStageId: {}, headline: null
	};
}

describe('Dexie reconciliation repository', () => {
	it('saves, finds and lists reconciliations newest first', async () => {
		const repository = createDexieReconciliationRepository(`test-list-${Math.random()}`);
		await repository.saveReconciliation(buildRecord('older', 100));
		await repository.saveReconciliation(buildRecord('newer', 200));
		expect((await repository.listReconciliationsNewestFirst()).map((record) => record.reconciliationId)).toEqual(['newer', 'older']);
		expect((await repository.findReconciliation('older'))?.title).toBe('Reconciliation older');
		expect(await repository.findReconciliation('missing')).toBeNull();
	});

	it('stores file contents and deletes them together with their reconciliation', async () => {
		const repository = createDexieReconciliationRepository(`test-delete-${Math.random()}`);
		await repository.saveReconciliation(buildRecord('r1', 100));
		await repository.saveFileContent({ fileContentKey: 'r1/file-A', fileName: 'ledger.csv', fileBlob: new Blob(['Ref,Amount\nA,1']) });
		expect((await repository.findFileContent('r1/file-A'))?.fileName).toBe('ledger.csv');
		expect(await repository.deleteReconciliationWithFiles('r1')).toBe(true);
		expect(await repository.findReconciliation('r1')).toBeNull();
		expect(await repository.findFileContent('r1/file-A')).toBeNull();
		expect(await repository.deleteReconciliationWithFiles('r1')).toBe(false);
	});
});
