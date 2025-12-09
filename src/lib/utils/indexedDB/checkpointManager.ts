/**
 * ============================================================================
 * CHECKPOINT MANAGER MODULE
 * ============================================================================
 *
 * Manages checkpoints for resumable reconciliations in IndexedDB.
 *
 * ARCHITECTURE:
 * 1. Stores checkpoint data in a dedicated IndexedDB store
 * 2. Each checkpoint contains:
 *    - reconciliationId (unique identifier)
 *    - lastProcessedRecordId (for resuming from last position)
 *    - processedCount (total records processed so far)
 *    - timestamp (when checkpoint was created)
 *    - config (reconciliation configuration for validation)
 *    - status ('in-progress', 'completed', 'paused', 'failed')
 * 3. Supports multiple concurrent reconciliations via unique IDs
 * 4. Enables resume, pause, and cancel operations
 */

import Dexie, { type Table } from 'dexie';

export interface Checkpoint {
	id?: number;
	reconciliationId: string;
	primaryStoreName: string;
	comparisonStoreName: string;
	lastProcessedRecordId: string | null;
	processedCount: number;
	totalCount: number;
	startTime: number;
	lastCheckpointTime: number;
	status: 'in-progress' | 'paused' | 'completed' | 'failed';
	errorMessage?: string;
	configHash: string; // SHA256 hash of config for validation
}

/**
 * Checkpoint Manager for resumable reconciliations
 */
export class CheckpointManager {
	private db: Dexie | null = null;
	private checkpointTable: Table<Checkpoint> | null = null;
	private readonly STORE_NAME = 'reconciliation_checkpoints';

	/**
	 * Initialize checkpoint storage
	 */
	async initialize(): Promise<void> {
		if (this.db) {
			return; // Already initialized
		}

		this.db = new Dexie('ReconciliationCheckpointDB');

		// Define schema for checkpoints store
		this.db.version(1).stores({
			[this.STORE_NAME]: '++id, reconciliationId, status, [primaryStoreName+comparisonStoreName]'
		});

		this.checkpointTable = this.db.table<Checkpoint>(this.STORE_NAME);
		console.log('[CheckpointManager] Initialized');
	}

	/**
	 * Create a new checkpoint
	 */
	async createCheckpoint(data: Omit<Checkpoint, 'id'>): Promise<number> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const checkpoint: Checkpoint = {
			...data,
			lastCheckpointTime: Date.now()
		};

		const id = await this.checkpointTable.add(checkpoint);
		console.log(
			`[CheckpointManager] Created checkpoint ${id} for reconciliation ${data.reconciliationId}`
		);
		return id;
	}

	/**
	 * Get checkpoint by reconciliation ID
	 */
	async getCheckpoint(reconciliationId: string): Promise<Checkpoint | undefined> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const checkpoint = await this.checkpointTable
			.where('reconciliationId')
			.equals(reconciliationId)
			.first();

		if (checkpoint) {
			console.log(
				`[CheckpointManager] Retrieved checkpoint for ${reconciliationId}: processed=${checkpoint.processedCount}/${checkpoint.totalCount}`
			);
		}

		return checkpoint;
	}

	/**
	 * Update checkpoint progress
	 */
	async updateCheckpoint(reconciliationId: string, updates: Partial<Checkpoint>): Promise<void> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const checkpoint = await this.checkpointTable
			.where('reconciliationId')
			.equals(reconciliationId)
			.first();

		if (!checkpoint) {
			throw new Error(`Checkpoint not found for reconciliation ${reconciliationId}`);
		}

		await this.checkpointTable.update(checkpoint.id!, {
			...updates,
			lastCheckpointTime: Date.now()
		});

		console.log(`[CheckpointManager] Updated checkpoint for ${reconciliationId}:`, updates);
	}

	/**
	 * Mark checkpoint as completed
	 */
	async completeCheckpoint(reconciliationId: string): Promise<void> {
		await this.updateCheckpoint(reconciliationId, {
			status: 'completed'
		});
		console.log(`[CheckpointManager] Marked reconciliation ${reconciliationId} as completed`);
	}

	/**
	 * Pause checkpoint (preserves progress for resuming later)
	 */
	async pauseCheckpoint(reconciliationId: string): Promise<void> {
		await this.updateCheckpoint(reconciliationId, {
			status: 'paused'
		});
		console.log(`[CheckpointManager] Paused reconciliation ${reconciliationId}`);
	}

	/**
	 * Mark checkpoint as failed with error message
	 */
	async failCheckpoint(reconciliationId: string, errorMessage: string): Promise<void> {
		await this.updateCheckpoint(reconciliationId, {
			status: 'failed',
			errorMessage
		});
		console.log(
			`[CheckpointManager] Marked reconciliation ${reconciliationId} as failed: ${errorMessage}`
		);
	}

	/**
	 * Delete checkpoint (cleanup after completion or cancellation)
	 */
	async deleteCheckpoint(reconciliationId: string): Promise<void> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const checkpoint = await this.checkpointTable
			.where('reconciliationId')
			.equals(reconciliationId)
			.first();

		if (checkpoint && checkpoint.id) {
			await this.checkpointTable.delete(checkpoint.id);
			console.log(`[CheckpointManager] Deleted checkpoint for reconciliation ${reconciliationId}`);
		}
	}

	/**
	 * List all active checkpoints (for resuming)
	 */
	async listActiveCheckpoints(): Promise<Checkpoint[]> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const checkpoints = await this.checkpointTable
			.where('status')
			.anyOf('in-progress', 'paused')
			.toArray();

		console.log(`[CheckpointManager] Found ${checkpoints.length} active checkpoints`);
		return checkpoints;
	}

	/**
	 * Get resumable checkpoint (most recent incomplete)
	 */
	async getResumableCheckpoint(
		primaryStoreName: string,
		comparisonStoreName: string
	): Promise<Checkpoint | undefined> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		// Find most recent checkpoint for these stores that's resumable
		const checkpoints = await this.checkpointTable
			.where('[primaryStoreName+comparisonStoreName]')
			.equals([primaryStoreName, comparisonStoreName])
			.filter(
				(cp) =>
					cp.status === 'in-progress' ||
					(cp.status === 'paused' && Date.now() - cp.lastCheckpointTime < 24 * 60 * 60 * 1000) // 24 hour TTL
			)
			.reverse()
			.limit(1)
			.toArray();

		if (checkpoints.length > 0) {
			console.log(
				`[CheckpointManager] Found resumable checkpoint: ${checkpoints[0].reconciliationId}`
			);
			return checkpoints[0];
		}

		console.log(`[CheckpointManager] No resumable checkpoint found`);
		return undefined;
	}

	/**
	 * Calculate config hash for validation
	 */
	static calculateConfigHash(config: any): string {
		// Simple hash based on config stringification
		// In production, use proper SHA256
		const json = JSON.stringify(config);
		let hash = 0;
		for (let i = 0; i < json.length; i++) {
			const char = json.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString(16);
	}

	/**
	 * Validate checkpoint configuration
	 */
	static validateCheckpointConfig(checkpoint: Checkpoint, currentConfig: any): boolean {
		const currentHash = CheckpointManager.calculateConfigHash(currentConfig);
		const isValid = checkpoint.configHash === currentHash;

		if (!isValid) {
			console.warn(
				`[CheckpointManager] Configuration mismatch: checkpoint=${checkpoint.configHash}, current=${currentHash}`
			);
		}

		return isValid;
	}

	/**
	 * Cleanup old completed/failed checkpoints
	 */
	async cleanupOldCheckpoints(ageMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
		await this.ensureInitialized();

		if (!this.checkpointTable) {
			throw new Error('Checkpoint table not initialized');
		}

		const cutoffTime = Date.now() - ageMs;
		const toDelete = await this.checkpointTable
			.where('lastCheckpointTime')
			.below(cutoffTime)
			.filter((cp) => cp.status === 'completed' || cp.status === 'failed')
			.toArray();

		for (const checkpoint of toDelete) {
			if (checkpoint.id) {
				await this.checkpointTable.delete(checkpoint.id);
			}
		}

		console.log(
			`[CheckpointManager] Cleaned up ${toDelete.length} old checkpoints (older than ${ageMs}ms)`
		);
		return toDelete.length;
	}

	/**
	 * Ensure database is initialized
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.db) {
			await this.initialize();
		}
	}

	/**
	 * Close database connection
	 */
	async close(): Promise<void> {
		if (this.db) {
			await this.db.close();
			this.db = null;
			this.checkpointTable = null;
			console.log('[CheckpointManager] Closed');
		}
	}
}

/**
 * Singleton instance of CheckpointManager
 */
let checkpointManager: CheckpointManager | null = null;

/**
 * Get or create singleton CheckpointManager
 */
export async function getCheckpointManager(): Promise<CheckpointManager> {
	if (!checkpointManager) {
		checkpointManager = new CheckpointManager();
		await checkpointManager.initialize();
	}
	return checkpointManager;
}
