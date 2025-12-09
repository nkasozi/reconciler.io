<script lang="ts">
	import type {
		FailureAnalysisSummary,
		FailureRecord,
		FailureType
	} from '../utils/failureAnalyzer';
	import { getFailureAnalyzer } from '../utils/failureAnalyzer';

	export let failures: FailureRecord[] = [];
	export let summary: FailureAnalysisSummary | null = null;
	export let isLoading = false;
	export let onExport: (() => Promise<void>) | null = null;

	let selectedFailureType: FailureType | 'all' = 'all';
	let searchTerm = '';
	let expandedFailures = new Set<string>();

	// Filter failures based on type and search
	$: filteredFailures = failures.filter((failure) => {
		const matchesType =
			selectedFailureType === 'all' || failure.reason.type === selectedFailureType;
		const matchesSearch =
			searchTerm === '' ||
			failure.primaryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
			failure.reason.reason.toLowerCase().includes(searchTerm.toLowerCase());
		return matchesType && matchesSearch;
	});

	// Failure type colors and labels
	const typeConfig: Record<FailureType, { color: string; label: string; icon: string }> = {
		missing_in_comparison: {
			color: 'bg-orange-100 border-orange-300',
			label: 'Missing in Comparison',
			icon: '⚠️'
		},
		missing_in_primary: {
			color: 'bg-red-100 border-red-300',
			label: 'Missing in Primary',
			icon: '❌'
		},
		mismatch: {
			color: 'bg-yellow-100 border-yellow-300',
			label: 'Mismatch',
			icon: '🔄'
		},
		error: {
			color: 'bg-red-100 border-red-300',
			label: 'Error',
			icon: '💥'
		},
		unknown: {
			color: 'bg-gray-100 border-gray-300',
			label: 'Unknown',
			icon: '❓'
		}
	};

	function toggleFailureExpanded(failureId: string) {
		if (expandedFailures.has(failureId)) {
			expandedFailures.delete(failureId);
		} else {
			expandedFailures.add(failureId);
		}
		expandedFailures = expandedFailures;
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) {
			return '(empty)';
		}
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		return String(value);
	}

	async function handleExport() {
		if (onExport) {
			try {
				await onExport();
			} catch (error) {
				console.error('Export failed:', error);
			}
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Failure Analysis</h2>
		{#if onExport && failures.length > 0}
			<button
				onclick={handleExport}
				class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
			>
				📥 Export Failures
			</button>
		{/if}
	</div>

	<!-- Summary Stats -->
	{#if summary}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
			<!-- Total Failures -->
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="text-sm text-gray-600 dark:text-gray-400">Total Failures</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalFailures}</div>
			</div>

			<!-- Missing in Comparison -->
			<div
				class="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20"
			>
				<div class="text-sm text-orange-700 dark:text-orange-300">Missing in Comparison</div>
				<div class="text-2xl font-bold text-orange-900 dark:text-orange-100">
					{summary.byType.missing_in_comparison}
				</div>
			</div>

			<!-- Missing in Primary -->
			<div
				class="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
			>
				<div class="text-sm text-red-700 dark:text-red-300">Missing in Primary</div>
				<div class="text-2xl font-bold text-red-900 dark:text-red-100">
					{summary.byType.missing_in_primary}
				</div>
			</div>

			<!-- Mismatches -->
			<div
				class="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20"
			>
				<div class="text-sm text-yellow-700 dark:text-yellow-300">Mismatches</div>
				<div class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
					{summary.byType.mismatch}
				</div>
			</div>

			<!-- Errors -->
			<div
				class="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20"
			>
				<div class="text-sm text-red-700 dark:text-red-300">Errors</div>
				<div class="text-2xl font-bold text-red-900 dark:text-red-100">{summary.byType.error}</div>
			</div>
		</div>

		<!-- Affected Columns -->
		{#if Object.keys(summary.affectedColumns).length > 0}
			<div
				class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
					Most Affected Columns
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(summary.affectedColumns)
						.sort(([, a], [, b]) => b - a)
						.slice(0, 10) as [column, count]}
						<div
							class="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-200"
						>
							{column}
							<span class="font-semibold">({count})</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Top Failure Reasons -->
		{#if summary.topReasons.length > 0}
			<div
				class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
			>
				<h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
					Top Failure Reasons
				</h3>
				<div class="space-y-2">
					{#each summary.topReasons as reason}
						<div class="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-700">
							<span class="text-sm text-gray-700 dark:text-gray-300">{reason.reason}</span>
							<div class="flex items-center gap-2">
								<div class="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-600">
									<div
										class="h-2 rounded-full bg-blue-600"
										style="width: {reason.percentage}%"
									></div>
								</div>
								<span class="w-12 text-right text-sm font-semibold text-gray-900 dark:text-white">
									{reason.percentage}%
								</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Filters -->
	{#if failures.length > 0}
		<div
			class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="flex flex-col gap-3 sm:flex-row">
				<!-- Type Filter -->
				<div class="flex-1">
					<label
						for="failure-type"
						class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Filter by Type
					</label>
					<select
						id="failure-type"
						bind:value={selectedFailureType}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					>
						<option value="all">All Types</option>
						<option value="missing_in_comparison">Missing in Comparison</option>
						<option value="missing_in_primary">Missing in Primary</option>
						<option value="mismatch">Mismatch</option>
						<option value="error">Error</option>
						<option value="unknown">Unknown</option>
					</select>
				</div>

				<!-- Search -->
				<div class="flex-1">
					<label
						for="search-failures"
						class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Search
					</label>
					<input
						id="search-failures"
						type="text"
						bind:value={searchTerm}
						placeholder="Search by ID or reason..."
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
					/>
				</div>

				<!-- Results Count -->
				<div class="flex items-end">
					<div class="text-sm text-gray-600 dark:text-gray-400">
						Showing {filteredFailures.length} of {failures.length}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Failures List -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
			<span class="ml-2 text-gray-600 dark:text-gray-400">Analyzing failures...</span>
		</div>
	{:else if filteredFailures.length === 0}
		<div class="py-12 text-center text-gray-600 dark:text-gray-400">
			{#if failures.length === 0}
				<div>✅ No failures detected! All records reconciled successfully.</div>
			{:else}
				<div>No failures match the current filters.</div>
			{/if}
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredFailures as failure, idx}
				{@const config = typeConfig[failure.reason.type]}
				{@const failureId = `${failure.primaryId}-${idx}`}
				{@const isExpanded = expandedFailures.has(failureId)}

				<div class={`overflow-hidden rounded-lg border-l-4 transition-all ${config.color}`}>
					<!-- Header -->
					<button
						onclick={() => toggleFailureExpanded(failureId)}
						class="w-full p-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
					>
						<div class="flex items-start justify-between">
							<div class="flex flex-1 items-start gap-3">
								<span class="text-xl">{config.icon}</span>
								<div class="flex-1">
									<div class="font-semibold text-gray-900 dark:text-white">
										{config.label}
									</div>
									<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
										Primary ID: <span class="font-mono">{failure.primaryId}</span>
									</div>
									<div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
										{failure.reason.reason}
									</div>
								</div>
							</div>
							<div class="text-xl">
								{isExpanded ? '▼' : '▶'}
							</div>
						</div>
					</button>

					<!-- Details (Expanded) -->
					{#if isExpanded}
						<div class="border-current/20 space-y-4 border-t bg-black/5 px-4 py-4 dark:bg-white/5">
							<!-- Suggestion -->
							<div>
								<div class="text-sm font-semibold text-gray-800 dark:text-gray-200">
									💡 Suggestion
								</div>
								<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
									{failure.reason.suggestion}
								</div>
							</div>

							<!-- Affected Columns -->
							{#if failure.reason.columns && failure.reason.columns.length > 0}
								<div>
									<div class="text-sm font-semibold text-gray-800 dark:text-gray-200">
										Affected Columns
									</div>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each failure.reason.columns as column}
											<span
												class="rounded bg-gray-300/50 px-2 py-1 font-mono text-xs text-gray-800 dark:bg-gray-600/50 dark:text-gray-200"
											>
												{column}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Primary Data -->
							{#if Object.keys(failure.primaryData).length > 0}
								<div>
									<div class="text-sm font-semibold text-gray-800 dark:text-gray-200">
										Primary Record
									</div>
									<div
										class="mt-1 overflow-x-auto rounded bg-black/10 p-2 font-mono text-xs text-gray-700 dark:bg-black/30 dark:text-gray-300"
									>
										<pre>{JSON.stringify(failure.primaryData, null, 2)}</pre>
									</div>
								</div>
							{/if}

							<!-- Comparison Data -->
							{#if failure.comparisonData}
								<div>
									<div class="text-sm font-semibold text-gray-800 dark:text-gray-200">
										Comparison Record(s)
									</div>
									<div
										class="mt-1 overflow-x-auto rounded bg-black/10 p-2 font-mono text-xs text-gray-700 dark:bg-black/30 dark:text-gray-300"
									>
										<pre>{JSON.stringify(failure.comparisonData, null, 2)}</pre>
									</div>
								</div>
							{/if}

							<!-- Timestamp -->
							<div class="border-current/20 border-t pt-2 text-xs text-gray-600 dark:text-gray-400">
								Analyzed: {new Date(failure.timestamp).toLocaleString()}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(.dark) {
		color-scheme: dark;
	}
</style>
