import Dexie, { type EntityTable } from 'dexie';
import type { ReconciliationRepository, SavedReconciliation, StoredFileContent } from '$lib/ports/reconciliationRepository';

const DATABASE_NAME = 'reconciler-library';

type ReconcilerDatabase = Dexie & {
	reconciliations: EntityTable<SavedReconciliation, 'reconciliationId'>;
	fileContents: EntityTable<StoredFileContent, 'fileContentKey'>;
};

export function openReconcilerDatabase(databaseName: string = DATABASE_NAME): ReconcilerDatabase {
	const database = new Dexie(databaseName) as ReconcilerDatabase;
	database.version(1).stores({
		reconciliations: 'reconciliationId, updatedAt',
		fileContents: 'fileContentKey'
	});
	return database;
}

export function createDexieReconciliationRepository(databaseName: string = DATABASE_NAME): ReconciliationRepository {
	let database: ReconcilerDatabase | null = null;
	const requireDatabase = (): ReconcilerDatabase => (database ??= openReconcilerDatabase(databaseName));

	return {
		isAvailable: () => typeof indexedDB !== 'undefined',

		saveReconciliation: async (record) => {
			await requireDatabase().reconciliations.put(record);
			console.log(`[dexieReconciliationRepository] Saved “${record.title}”`);
			return true;
		},

		findReconciliation: async (reconciliationId) => (await requireDatabase().reconciliations.get(reconciliationId)) ?? null,

		listReconciliationsNewestFirst: () => requireDatabase().reconciliations.orderBy('updatedAt').reverse().toArray(),

		deleteReconciliationWithFiles: async (reconciliationId) => {
			const openDatabase = requireDatabase();
			return openDatabase.transaction('rw', openDatabase.reconciliations, openDatabase.fileContents, async () => {
				const record = await openDatabase.reconciliations.get(reconciliationId);
				if (!record) {
					console.warn(`[dexieReconciliationRepository] Nothing to delete for ${reconciliationId}`);
					return false;
				}
				await openDatabase.fileContents.bulkDelete(record.files.map((savedFile) => savedFile.fileContentKey));
				await openDatabase.reconciliations.delete(reconciliationId);
				console.log(`[dexieReconciliationRepository] Deleted “${record.title}” and its ${record.files.length} files`);
				return true;
			});
		},

		saveFileContent: async (fileContent) => {
			await requireDatabase().fileContents.put(fileContent);
			return true;
		},

		findFileContent: async (fileContentKey) => (await requireDatabase().fileContents.get(fileContentKey)) ?? null
	};
}
