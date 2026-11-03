const DATABASE_NAME = 'reconciler';
const DATABASE_VERSION = 1;

export const RECONCILIATIONS_STORE = 'reconciliations';
export const FILE_CONTENTS_STORE = 'fileContents';

export type StoreName = typeof RECONCILIATIONS_STORE | typeof FILE_CONTENTS_STORE;

let openDatabasePromise: Promise<IDBDatabase> | null = null;

function promisifyRequest<ResultValue>(request: IDBRequest<ResultValue>): Promise<ResultValue> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Browser storage request failed'));
	});
}

export function isBrowserStorageAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}

export function openBrowserDatabase(): Promise<IDBDatabase> {
	if (openDatabasePromise) return openDatabasePromise;
	openDatabasePromise = new Promise((resolve, reject) => {
		const openRequest = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		openRequest.onupgradeneeded = () => {
			const database = openRequest.result;
			console.log('[browserDatabase] Creating storage for saved reconciliations');
			if (!database.objectStoreNames.contains(RECONCILIATIONS_STORE)) database.createObjectStore(RECONCILIATIONS_STORE);
			if (!database.objectStoreNames.contains(FILE_CONTENTS_STORE)) database.createObjectStore(FILE_CONTENTS_STORE);
		};
		openRequest.onsuccess = () => resolve(openRequest.result);
		openRequest.onerror = () => {
			openDatabasePromise = null;
			reject(openRequest.error ?? new Error('Could not open browser storage'));
		};
	});
	return openDatabasePromise;
}

async function runInStore<ResultValue>(storeName: StoreName, accessMode: IDBTransactionMode, buildRequest: (objectStore: IDBObjectStore) => IDBRequest<ResultValue>): Promise<ResultValue> {
	const database = await openBrowserDatabase();
	const transaction = database.transaction(storeName, accessMode);
	return promisifyRequest(buildRequest(transaction.objectStore(storeName)));
}

export function putStoredValue<StoredValue>(storeName: StoreName, storageKey: string, storedValue: StoredValue): Promise<IDBValidKey> {
	return runInStore(storeName, 'readwrite', (objectStore) => objectStore.put(storedValue, storageKey));
}

export function getStoredValue<StoredValue>(storeName: StoreName, storageKey: string): Promise<StoredValue | undefined> {
	return runInStore(storeName, 'readonly', (objectStore) => objectStore.get(storageKey) as IDBRequest<StoredValue | undefined>);
}

export function getAllStoredValues<StoredValue>(storeName: StoreName): Promise<StoredValue[]> {
	return runInStore(storeName, 'readonly', (objectStore) => objectStore.getAll() as IDBRequest<StoredValue[]>);
}

export function deleteStoredValue(storeName: StoreName, storageKey: string): Promise<undefined> {
	return runInStore(storeName, 'readwrite', (objectStore) => objectStore.delete(storageKey));
}
