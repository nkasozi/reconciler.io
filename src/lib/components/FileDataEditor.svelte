<script lang="ts">
	import type { ParsedFileData } from '$lib/utils/fileParser';

	interface FileDataEditorProps {
		data: ParsedFileData;
		fileName: string;
		onSave: (editedData: ParsedFileData) => void;
		onCancel: () => void;
	}

	let { data, fileName, onSave, onCancel }: FileDataEditorProps = $props();

	// Local editing state - always start with a copy
	let editingData = $state<ParsedFileData>(JSON.parse(JSON.stringify(data)));
	let displayStartIndex = $state(0); // For pagination when rows are deleted
	let selectedColumnForCombine = $state<number | null>(null);
	let showCombineConfirm = $state(false);
	let combinedColumnName = $state('');

	// Sync internal state with props changes
	$effect(() => {
		editingData = JSON.parse(JSON.stringify(data));
		displayStartIndex = 0;
	});

	// STANDARDIZED DATA LOADING FUNCTION
	// Always treats first row as headers, works for any data source
	function loadDataIntoTable(rawRows: Record<string, string>[]) {
		console.log('=== LOAD DATA INTO TABLE ===');
		console.log('Input rawRows length:', rawRows.length);
		console.log('First row:', rawRows[0]);

		if (rawRows.length === 0) {
			return;
		}

		// First row becomes headers - USE VALUES, NOT KEYS!
		const headerRow = rawRows[0];
		const newColumns = Object.values(headerRow); // Use VALUES as new column names
		console.log('New columns from values:', newColumns);

		// Remaining rows become data - need to remap keys to match new column structure
		const newRows = rawRows.slice(1).map((row) => {
			const newRow: Record<string, string> = {};
			const oldKeys = Object.keys(row);
			oldKeys.forEach((oldKey, index) => {
				const newColumnName = newColumns[index] || `Column ${index + 1}`;
				newRow[newColumnName] = row[oldKey] || '';
			});
			return newRow;
		});

		console.log('New rows sample:', newRows.slice(0, 2));

		// Reassign entire object to trigger Svelte 5 reactivity
		editingData = {
			columns: newColumns,
			rows: newRows,
			fileName: editingData?.fileName ?? fileName,
			fileType: editingData?.fileType ?? (data as any)?.fileType ?? ''
		};

		// Reset pagination
		displayStartIndex = 0;
		console.log('=== LOAD DATA COMPLETE ===');
	}

	// Simple operations
	function deleteRow(absoluteRowIndex: number) {
		editingData.rows = editingData.rows.filter((_, index) => index !== absoluteRowIndex);
		// Adjust display index if needed to maintain 20 visible rows
		if (displayStartIndex > editingData.rows.length - 20) {
			displayStartIndex = Math.max(0, editingData.rows.length - 20);
		}
	}

	function deleteHeaderRow() {
		console.log('=== DELETE HEADER ROW START ===');
		console.log('Current columns (header):', editingData.columns);
		console.log('Current rows count:', editingData.rows.length);
		console.log('First few rows:', editingData.rows.slice(0, 3));

		if (editingData.rows.length === 0) {
			console.log('No data rows left, cannot delete header');
			return;
		}

		// The header row is in editingData.columns
		// The first DATA row should become the new header
		// So we reconstruct: [currentHeader, ...allDataRows] then remove first item

		// Step 1: Reconstruct the current header as a row object
		const currentHeaderAsRow: Record<string, string> = {};
		editingData.columns.forEach((colName, index) => {
			currentHeaderAsRow[`col${index}`] = colName;
		});
		console.log('Current header as row:', currentHeaderAsRow);

		// Step 2: Create full dataset [header, ...dataRows]
		const fullDataset = [currentHeaderAsRow, ...editingData.rows];
		console.log('Full dataset length:', fullDataset.length);
		console.log('Full dataset first 2 items:', fullDataset.slice(0, 2));

		// Step 3: Remove the header (first item) - this deletes the current header
		const dataWithoutOldHeader = fullDataset.slice(1);
		console.log('After removing old header:', dataWithoutOldHeader.length);
		console.log('New first row (will become header):', dataWithoutOldHeader[0]);

		// Step 4: Load the data - first row becomes new header
		loadDataIntoTable(dataWithoutOldHeader);

		console.log('=== After loadDataIntoTable ===');
		console.log('New columns (header):', editingData.columns);
		console.log('New rows count:', editingData.rows.length);
		console.log('=== DELETE HEADER ROW END ===');
	}

	function editColumnName(columnIndex: number) {
		const currentName = editingData.columns[columnIndex];
		const newName = prompt('Enter new column name:', currentName);
		if (newName && newName.trim()) {
			editingData.columns[columnIndex] = newName.trim();
		}
	}

	function startCombineWithNext(columnIndex: number) {
		if (columnIndex >= editingData.columns.length - 1) {
			alert('Cannot combine the last column with next column.');
			return;
		}

		selectedColumnForCombine = columnIndex;
		combinedColumnName = `${editingData.columns[columnIndex]} ${editingData.columns[columnIndex + 1]}`;
		showCombineConfirm = true;
	}

	function confirmCombineColumns() {
		if (selectedColumnForCombine === null) return;

		const currentIndex = selectedColumnForCombine;
		const nextIndex = currentIndex + 1;
		const newName =
			combinedColumnName.trim() ||
			`${editingData.columns[currentIndex]} ${editingData.columns[nextIndex]}`;

		// Create new columns array
		const newColumns = [
			...editingData.columns.slice(0, currentIndex),
			newName,
			...editingData.columns.slice(nextIndex + 1)
		];

		// Update rows to combine the two column values
		const newRows = editingData.rows.map((row) => {
			const newRow: Record<string, string> = {};

			// Copy columns before the combined ones
			for (let i = 0; i < currentIndex; i++) {
				newRow[newColumns[i]] = row[editingData.columns[i]] || '';
			}

			// Combine the two columns
			const value1 = row[editingData.columns[currentIndex]] || '';
			const value2 = row[editingData.columns[nextIndex]] || '';
			const combinedValue = [value1, value2].filter((v) => v.trim()).join(' ');
			newRow[newName] = combinedValue;

			// Copy columns after the combined ones
			for (let i = nextIndex + 1; i < editingData.columns.length; i++) {
				const newColIndex = i - 1; // Adjust for removed column
				newRow[newColumns[newColIndex]] = row[editingData.columns[i]] || '';
			}

			return newRow;
		});

		editingData.columns = newColumns;
		editingData.rows = newRows;

		// Reset state
		selectedColumnForCombine = null;
		showCombineConfirm = false;
		combinedColumnName = '';
	}

	function cancelCombine() {
		selectedColumnForCombine = null;
		showCombineConfirm = false;
		combinedColumnName = '';
	}

	function handleSave() {
		onSave(editingData);
	}

	function handleCancel() {
		editingData = JSON.parse(JSON.stringify(data)); // Reset to original
		displayStartIndex = 0;
		onCancel();
	}

	// Get the rows to display (always 20 starting from displayStartIndex)
	const displayedRows = $derived(editingData.rows.slice(displayStartIndex, displayStartIndex + 20));
	const hasChanges = $derived(JSON.stringify(editingData) !== JSON.stringify(data));
</script>

<div class="file-data-editor">
	<!-- Save/Cancel buttons only when there are changes -->
	{#if hasChanges}
		<div class="mb-4 flex justify-end space-x-2">
			<button
				class="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				onclick={handleCancel}
			>
				Cancel
			</button>
			<button
				class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
				onclick={handleSave}
			>
				Save Changes
			</button>
		</div>
	{/if}

	<!-- Combine confirmation modal -->
	{#if showCombineConfirm}
		<div
			class="mb-4 rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20"
		>
			<div class="flex items-center space-x-2">
				<span class="text-sm text-gray-700 dark:text-gray-300">Combine columns:</span>
				<input
					type="text"
					bind:value={combinedColumnName}
					class="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
					placeholder="Combined column name"
				/>
				<button
					class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
					onclick={confirmCombineColumns}
				>
					Combine
				</button>
				<button
					class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
					onclick={cancelCombine}
				>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<!-- Delete column header -->
					<th
						class="px-2 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
					>
						<div class="flex items-center space-x-1">
							<span>Actions</span>
							<button
								class="text-red-500 opacity-50 hover:opacity-100"
								onclick={deleteHeaderRow}
								title="Delete header row (first data row becomes new header)"
							>
								<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</div>
					</th>
					{#each editingData.columns as column, columnIndex}
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							<div class="flex items-center space-x-1">
								<span>{column}</span>
								<!-- Subtle edit icons -->
								<button
									class="opacity-50 hover:opacity-100"
									onclick={() => editColumnName(columnIndex)}
									title="Edit column name"
								>
									<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.828-2.828z"
										/>
									</svg>
								</button>
								{#if columnIndex < editingData.columns.length - 1}
									<button
										class="opacity-50 hover:opacity-100"
										onclick={() => startCombineWithNext(columnIndex)}
										title="Combine with next column"
									>
										<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
				{#each displayedRows as row, displayIndex}
					{@const absoluteRowIndex = displayStartIndex + displayIndex}
					<tr
						class={displayIndex % 2 === 0
							? 'bg-white dark:bg-gray-900'
							: 'bg-gray-50 dark:bg-gray-800'}
					>
						<!-- Delete row column -->
						<td class="px-2 py-4 text-center">
							<button
								class="text-red-500 opacity-50 hover:opacity-100"
								onclick={() => deleteRow(absoluteRowIndex)}
								title="Delete this row"
							>
								<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</td>
						{#each editingData.columns as column}
							<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
								{row[column] || ''}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination info -->
	{#if editingData.rows.length > 20}
		<div class="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
			<p>
				Showing {displayStartIndex + 1} to {Math.min(
					displayStartIndex + 20,
					editingData.rows.length
				)} of {editingData.rows.length} rows
			</p>
			<div class="flex space-x-2">
				<button
					class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
					onclick={() => (displayStartIndex = Math.max(0, displayStartIndex - 20))}
					disabled={displayStartIndex === 0}
				>
					Previous
				</button>
				<button
					class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
					onclick={() =>
						(displayStartIndex = Math.min(editingData.rows.length - 20, displayStartIndex + 20))}
					disabled={displayStartIndex + 20 >= editingData.rows.length}
				>
					Next
				</button>
			</div>
		</div>
	{/if}
</div>
