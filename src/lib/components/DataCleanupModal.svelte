<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ParsedFileData } from '$lib/utils/fileParser';
	import type { DocumentScanResult } from '$lib/utils/documentScanner';
	import {
		validateAndCleanData,
		calculateDataQualityScore,
		type DataValidationResult,
		type ValidationIssue
	} from '$lib/utils/dataValidation';

	export let show = false;
	export let parsedData: ParsedFileData | null = null;
	export let scanResult: DocumentScanResult | null = null;
	export let fileType: 'primary' | 'comparison' = 'primary';

	const dispatch = createEventDispatcher<{
		accept: { data: ParsedFileData };
		reject: void;
		close: void;
	}>();

	let validationResult: DataValidationResult | null = null;
	let selectedIssue: ValidationIssue | null = null;
	let showDetails = false;
	let isProcessing = false;
	let editableData: ParsedFileData | null = null;
	let editingCell: { row: number; column: string } | null = null;
	let qualityScore = 0;

	// Reactive validation when data changes
	$: if (show && parsedData && scanResult) {
		performValidation();
	}

	async function performValidation() {
		if (!parsedData || !scanResult) return;

		isProcessing = true;
		try {
			validationResult = validateAndCleanData(parsedData, scanResult, {
				removeEmptyRows: true,
				trimWhitespace: true,
				fixCommonOCRErrors: true,
				standardizeFormats: true,
				confidenceThreshold: 70
			});

			editableData = validationResult.cleanedData || parsedData;
			qualityScore = calculateDataQualityScore(validationResult);
		} catch (error) {
			console.error('Validation failed:', error);
		} finally {
			isProcessing = false;
		}
	}

	function handleAccept() {
		if (editableData) {
			dispatch('accept', { data: editableData });
		}
		close();
	}

	function handleReject() {
		dispatch('reject');
		close();
	}

	function close() {
		show = false;
		validationResult = null;
		selectedIssue = null;
		editableData = null;
		dispatch('close');
	}

	function selectIssue(issue: ValidationIssue) {
		selectedIssue = selectedIssue === issue ? null : issue;
	}

	function startEditCell(rowIndex: number, column: string) {
		editingCell = { row: rowIndex, column };
	}

	function finishEditCell(event: Event) {
		if (!editingCell || !editableData) return;

		const target = event.target as HTMLInputElement;
		const newValue = target.value;

		// Update the data
		editableData.rows[editingCell.row][editingCell.column] = newValue;

		// Re-validate after edit
		if (validationResult && scanResult) {
			validationResult = validateAndCleanData(editableData, scanResult);
			qualityScore = calculateDataQualityScore(validationResult);
		}

		editingCell = null;
	}

	function getSeverityColor(severity: string): string {
		switch (severity) {
			case 'error':
				return 'text-red-600 bg-red-50 border-red-200';
			case 'warning':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'info':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getQualityColor(score: number): string {
		if (score >= 85) return 'text-green-600 bg-green-50';
		if (score >= 70) return 'text-blue-600 bg-blue-50';
		if (score >= 50) return 'text-yellow-600 bg-yellow-50';
		return 'text-red-600 bg-red-50';
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (editingCell) {
				editingCell = null;
			} else {
				close();
			}
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
		<div class="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white">
			<!-- Header -->
			<div class="border-b border-gray-200 p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-xl font-semibold text-gray-900">
							Data Quality Review - {fileType === 'primary' ? 'Primary' : 'Comparison'} File
						</h2>
						<p class="mt-1 text-sm text-gray-600">
							Review and clean up scanned data before proceeding
						</p>
					</div>
					<button
						type="button"
						on:click={close}
						class="text-gray-400 transition-colors hover:text-gray-600"
					>
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<!-- Quality Score -->
				{#if validationResult}
					<div class="mt-4 rounded-lg border p-3 {getQualityColor(qualityScore)}">
						<div class="flex items-center justify-between">
							<div class="flex items-center space-x-2">
								<span class="font-medium">Data Quality Score: {qualityScore}%</span>
								<div
									class="h-2 w-2 rounded-full {qualityScore >= 70
										? 'bg-green-400'
										: qualityScore >= 50
											? 'bg-yellow-400'
											: 'bg-red-400'}"
								></div>
							</div>
							<button
								type="button"
								on:click={() => (showDetails = !showDetails)}
								class="text-sm opacity-75 transition-opacity hover:opacity-100"
							>
								{showDetails ? 'Hide' : 'Show'} Details
							</button>
						</div>
					</div>
				{/if}
			</div>

			<div class="flex flex-1 overflow-hidden">
				<!-- Issues Panel -->
				{#if validationResult && (showDetails || validationResult.issues.length > 0)}
					<div class="w-1/3 overflow-y-auto border-r border-gray-200">
						<div class="p-4">
							<h3 class="mb-3 font-medium text-gray-900">
								Issues Found ({validationResult.issues.length})
							</h3>

							{#if validationResult.issues.length === 0}
								<div class="py-8 text-center text-gray-500">
									<svg
										class="mx-auto mb-2 h-12 w-12 text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									<p>No issues found!</p>
								</div>
							{:else}
								<div class="space-y-2">
									{#each validationResult.issues as issue}
										<button
											type="button"
											on:click={() => selectIssue(issue)}
											class="w-full rounded-lg border p-3 text-left transition-colors {getSeverityColor(
												issue.severity
											)} {selectedIssue === issue ? 'ring-2 ring-blue-500' : ''}"
										>
											<div class="flex items-start justify-between">
												<div class="flex-1">
													<div class="text-sm font-medium capitalize">
														{issue.type.replace('_', ' ')}
													</div>
													<div class="mt-1 text-xs">{issue.message}</div>
												</div>
												<span
													class="rounded px-2 py-1 text-xs font-medium uppercase {issue.severity ===
													'error'
														? 'bg-red-600 text-white'
														: issue.severity === 'warning'
															? 'bg-yellow-600 text-white'
															: 'bg-blue-600 text-white'}"
												>
													{issue.severity}
												</span>
											</div>
										</button>
									{/each}
								</div>
							{/if}

							<!-- Suggestions -->
							{#if validationResult.suggestions.length > 0}
								<div class="mt-6">
									<h4 class="mb-2 font-medium text-gray-900">Suggestions</h4>
									<ul class="space-y-1 text-sm text-gray-600">
										{#each validationResult.suggestions as suggestion}
											<li class="flex items-start space-x-2">
												<span class="mt-0.5 text-blue-500">•</span>
												<span>{suggestion}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Data Table -->
				<div class="flex flex-1 flex-col overflow-hidden">
					{#if isProcessing}
						<div class="flex flex-1 items-center justify-center">
							<div class="text-center">
								<div
									class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
								></div>
								<p class="text-gray-600">Validating data...</p>
							</div>
						</div>
					{:else if editableData}
						<div class="border-b border-gray-200 bg-gray-50 p-4">
							<div class="flex items-center justify-between">
								<div class="text-sm text-gray-600">
									{editableData.rows.length} rows • {editableData.columns.length} columns
									{#if scanResult?.confidence}
										• OCR Confidence: {scanResult.confidence.toFixed(1)}%
									{/if}
								</div>
								<div class="text-xs text-gray-500">
									Click cells to edit • Press Escape to cancel
								</div>
							</div>
						</div>

						<div class="flex-1 overflow-auto">
							<table class="w-full border-collapse">
								<thead class="sticky top-0 bg-gray-50">
									<tr>
										{#each editableData.columns as column}
											<th
												class="min-w-[120px] border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700"
											>
												{column}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#each editableData.rows.slice(0, 50) as row, rowIndex}
										<tr class="hover:bg-gray-50">
											{#each editableData.columns as column}
												<td class="border border-gray-200 px-3 py-2 text-sm">
													{#if editingCell && editingCell.row === rowIndex && editingCell.column === column}
														<input
															type="text"
															value={row[column]}
															class="w-full rounded border-none bg-yellow-50 px-1 py-0.5 outline-none"
															on:blur={finishEditCell}
															on:keydown={(e) => e.key === 'Enter' && finishEditCell(e)}
															autofocus
														/>
													{:else}
														<button
															type="button"
															on:click={() => startEditCell(rowIndex, column)}
															class="w-full rounded px-1 py-0.5 text-left transition-colors hover:bg-blue-50"
														>
															{row[column] || '-'}
														</button>
													{/if}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>

							{#if editableData.rows.length > 50}
								<div class="border-t bg-gray-50 p-4 text-center text-gray-500">
									Showing first 50 rows of {editableData.rows.length} total rows
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-gray-200 bg-gray-50 p-6">
				<div class="flex items-center justify-between">
					<div class="text-sm text-gray-600">
						{#if validationResult}
							{validationResult.issues.filter((i) => i.severity === 'error').length} errors •
							{validationResult.issues.filter((i) => i.severity === 'warning').length} warnings
						{/if}
					</div>

					<div class="flex space-x-3">
						<button
							type="button"
							on:click={handleReject}
							class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
						>
							Reject & Rescan
						</button>

						<button
							type="button"
							on:click={handleAccept}
							disabled={validationResult &&
								validationResult.issues.some((i) => i.severity === 'error')}
							class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Accept & Continue
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
