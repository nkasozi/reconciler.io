<script lang="ts">
	import { onMount } from 'svelte';
	import { parseFile, type ParsedFileData, RowLimitExceededError } from '$lib/utils/fileParser';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import { goto } from '$app/navigation';
	import ColumnMappingModal from '$lib/components/ColumnMappingModal.svelte';
	import type { ColumnPair } from '$lib/utils/reconciliation';

	// File data state
	type FileData = {
		file: File | null;
		isUploading: boolean;
		isUploaded: boolean;
		progress: number;
		parsedData: ParsedFileData | null;
	};

	let primaryFileData = $state<FileData>({
		file: null,
		isUploading: false,
		isUploaded: false,
		progress: 0,
		parsedData: null
	});

	let comparisonFileData = $state<FileData>({
		file: null,
		isUploading: false,
		isUploaded: false,
		progress: 0,
		parsedData: null
	});

	let errorMessage = $state<string | null>(null);

	// Typewriter effect state
	let currentText = $state('');
	let phrases = ['Easy', 'Simple', 'Quick'];
	let currentPhraseIndex = 2; // Start with "Quick"
	let isDeleting = $state(false);
	let typingSpeed = $state(100);

	onMount(() => {
		// Reset the store when the upload page loads
		reconciliationStore.reset();
		typeText();
	});

	function typeText() {
		const currentPhrase = phrases[currentPhraseIndex];
		const length = currentText.length;

		// If we're deleting text
		if (isDeleting) {
			currentText = currentPhrase.substring(0, length - 1);
			typingSpeed = 70; // Faster when deleting

			// If we've deleted everything, start typing the next phrase
			if (currentText === '') {
				isDeleting = false;
				currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
				typingSpeed = 100; // Normal speed when typing
			}
		}
		// If we're typing text
		else {
			currentText = currentPhrase.substring(0, length + 1);

			// If we've typed the entire phrase, start deleting after a pause
			if (length === currentPhrase.length) {
				typingSpeed = 1500; // Pause at the end of phrase
				isDeleting = true;
			} else {
				typingSpeed = 100 + Math.random() * 100; // Vary typing speed for realism
			}
		}

		// Schedule the next frame
		setTimeout(typeText, typingSpeed);
	}

	// Handle drag and drop
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		const target = event.currentTarget as HTMLElement;
		if (target) target.classList.add('highlight');
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		const target = event.currentTarget as HTMLElement;
		if (target) target.classList.remove('highlight');
	}

	function handleDrop(event: DragEvent, type: 'primary' | 'comparison') {
		event.preventDefault();
		const target = event.currentTarget as HTMLElement;
		if (target) target.classList.remove('highlight');

		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		processFile(file, type);
	}

	// Handle file input change
	function handlePrimaryFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		processFile(file, 'primary');
	}

	function handleComparisonFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		processFile(file, 'comparison');
	}

	// Process the uploaded file
	async function processFile(file: File, type: 'primary' | 'comparison') {
		console.log(`Processing ${type} file:`, file.name, file.type);

		// Reset any previous error
		errorMessage = null;

		// Update state to show uploading
		if (type === 'primary') {
			primaryFileData = {
				...primaryFileData,
				file,
				isUploading: true,
				progress: 0
			};
		} else {
			comparisonFileData = {
				...comparisonFileData,
				file,
				isUploading: true,
				progress: 0
			};
		}

		try {
			// Simulate upload progress
			for (let progress = 0; progress <= 100; progress += 5) {
				if (type === 'primary') {
					primaryFileData = { ...primaryFileData, progress };
				} else {
					comparisonFileData = { ...comparisonFileData, progress };
				}
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			// Parse the file
			console.log(`Parsing ${type} file:`, file.name);
			const parsedData = await parseFile(file);
			console.log(`Parsed ${type} file data:`, parsedData);

			// Update state with parsed data
			if (type === 'primary') {
				primaryFileData = {
					...primaryFileData,
					parsedData,
					isUploading: false,
					isUploaded: true
				};

				// Store in the global store
				reconciliationStore.setPrimaryFileData(parsedData);

				// Save to localStorage as backup
				try {
					localStorage.setItem('primary_file_data', JSON.stringify(parsedData));
				} catch (error) {
					console.error('Error saving to localStorage:', error);
				}
			} else {
				comparisonFileData = {
					...comparisonFileData,
					parsedData,
					isUploading: false,
					isUploaded: true
				};

				// Store in the global store
				reconciliationStore.setComparisonFileData(parsedData);

				// Save to localStorage as backup
				try {
					localStorage.setItem('comparison_file_data', JSON.stringify(parsedData));
				} catch (error) {
					console.error('Error saving to localStorage:', error);
				}
			}

			console.log(`Upload complete, state updated for ${type} file`);
		} catch (error) {
			console.error(`Error processing ${type} file:`, error);

			// Update state to show error
			if (type === 'primary') {
				primaryFileData = {
					...primaryFileData,
					isUploading: false
				};
			} else {
				comparisonFileData = {
					...comparisonFileData,
					isUploading: false
				};
			}

			// Special handling for row limit errors
			if (error instanceof RowLimitExceededError) {
				// Store the error message in sessionStorage
				sessionStorage.setItem(
					'upgrade_reason',
					`Your file has ${error.rowCount.toLocaleString()} rows, which exceeds the free tier limit of 10,000 rows. Please upgrade to Pro.`
				);

				// Redirect to pricing page
				goto('/pricing?source=row_limit');
				return;
			}

			if (error instanceof Error) {
				errorMessage = `Error parsing file: ${error.message}`;
			} else {
				errorMessage = 'An unknown error occurred while parsing the file.';
			}
		}
	}

	function removeFile(type: 'primary' | 'comparison') {
		if (type === 'primary') {
			primaryFileData = {
				file: null,
				isUploading: false,
				isUploaded: false,
				progress: 0,
				parsedData: null
			};
		} else {
			comparisonFileData = {
				file: null,
				isUploading: false,
				isUploaded: false,
				progress: 0,
				parsedData: null
			};
		}

		// Update store if needed
		reconciliationStore.reset();
	}

	// Column mapping modal
	let showMappingModal = $state(false);

	function openMappingModal() {
		// Only proceed if both files are uploaded and parsed
		if (
			primaryFileData.isUploaded &&
			comparisonFileData.isUploaded &&
			primaryFileData.parsedData &&
			comparisonFileData.parsedData
		) {
			console.log('Opening column mapping modal');

			try {
				// Force a refresh of the store data
				reconciliationStore.reset();

				// Set the data in the store
				console.log('Setting primary file data in store');
				reconciliationStore.setPrimaryFileData(primaryFileData.parsedData);

				if (comparisonFileData.parsedData) {
					console.log('Setting comparison file data in store');
					reconciliationStore.setComparisonFileData(comparisonFileData.parsedData);
				}

				// Show the mapping modal
				showMappingModal = true;
			} catch (error) {
				console.error('Error preparing for column mapping:', error);
				errorMessage = 'Error preparing for column mapping. Please try again.';
			}
		} else {
			console.warn('Cannot proceed - files not properly uploaded', {
				primaryUploaded: primaryFileData.isUploaded,
				primaryHasData: !!primaryFileData.parsedData,
				comparisonUploaded: comparisonFileData.isUploaded,
				comparisonHasData: !!comparisonFileData.parsedData
			});
		}
	}

	// Handle column mapping completion
	function handleColumnMapping(event: CustomEvent) {
		const { primaryIdPair, comparisonPairs } = event.detail;

		console.log('Column mapping complete:', { primaryIdPair, comparisonPairs });

		// Store the mapping configuration
		reconciliationStore.setConfig({
			primaryIdPair,
			comparisonPairs
		});

		// Navigate to the summary page instead of directly to results
		goto('/summary');
	}
</script>

<div class="min-h-screen bg-gray-900 text-white dark:bg-gray-900">
	<div class="container mx-auto pb-2 pt-16 text-center">
		<h1
			class="mb-8 px-8 text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-5xl lg:px-0 lg:text-5xl xl:text-5xl"
		>
			<span class="font-extrabold text-green-500">Reconciliation</span> has <br /> never been so
			<span class="animated-text font-extrabold text-blue-600">{currentText}</span>
		</h1>

		<!-- File Upload Areas -->
		<div class="mx-auto flex max-w-6xl flex-wrap justify-center p-4">
			<!-- Primary File Section -->
			<div class="mb-8 w-full p-4 sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2">
				<!-- File Info Header -->
				{#if primaryFileData.parsedData}
					<div class="mb-3 overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800">
						<div
							class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700"
						>
							<div>
								<h3 class="text-lg font-bold text-gray-900 dark:text-white">
									Primary File: <span class="font-medium">{primaryFileData.file?.name || ''}</span>
								</h3>
								<p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
									{primaryFileData.parsedData.rows.length.toLocaleString()} rows, {primaryFileData
										.parsedData.columns.length} columns
								</p>
							</div>
							<button
								class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-900 dark:hover:text-red-400"
								aria-label="Remove file"
								title="Remove file"
								on:click={() => removeFile('primary')}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					</div>
				{/if}

				<!-- Upload Area or Preview -->
				{#if !primaryFileData.isUploaded}
					<!-- Upload Area -->
					<div
						class="upload-area"
						class:highlight={false}
						class:uploading={primaryFileData.isUploading}
						on:dragover|preventDefault={handleDragOver}
						on:dragleave|preventDefault={handleDragLeave}
						on:drop|preventDefault={(e) => handleDrop(e, 'primary')}
					>
						{#if !primaryFileData.isUploading}
							<!-- Normal upload state -->
							<input
								type="file"
								class="drop-here"
								accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt"
								on:change={handlePrimaryFileUpload}
							/>
							<div class="upload-message">
								Drag &amp; Drop <br /> an Excel (.xlsx/.xls) or CSV file here
							</div>
						{:else}
							<!-- Uploading state -->
							<div class="upload-progress">
								<div class="uploading-text">Uploading...</div>
								<div class="progress-bar">
									<div class="progress-fill" style="width: {primaryFileData.progress}%"></div>
								</div>
								<div class="progress-text">{Math.round(primaryFileData.progress)}%</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Preview Table -->
					<div
						class="preview-container overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
					>
						<div
							class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300"
						>
							File Preview (First 20 rows)
						</div>
						<div class="preview-table-wrapper max-h-[400px] overflow-auto">
							<table class="w-auto">
								<thead class="sticky top-0 z-10">
									<tr class="bg-gray-50 dark:bg-gray-700">
										{#each primaryFileData.parsedData.columns as column}
											<th
												class="min-w-[150px] whitespace-nowrap border-b border-gray-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:text-gray-300"
											>
												{column}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
									{#each primaryFileData.parsedData.rows.slice(0, 20) as row, i}
										<tr
											class={i % 2 === 0
												? 'bg-white dark:bg-gray-800'
												: 'bg-gray-50 dark:bg-gray-700'}
										>
											{#each primaryFileData.parsedData.columns as column}
												<td
													class="min-w-[150px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
												>
													{row[column] || ''}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>

			<!-- Comparison File Section -->
			<div class="mb-8 w-full p-4 sm:w-1/2 md:w-1/2 lg:w-1/2 xl:w-1/2">
				<!-- File Info Header -->
				{#if comparisonFileData.parsedData}
					<div class="mb-3 overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800">
						<div
							class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700"
						>
							<div>
								<h3 class="text-lg font-bold text-gray-900 dark:text-white">
									Comparison File: <span class="font-medium"
										>{comparisonFileData.file?.name || ''}</span
									>
								</h3>
								<p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
									{comparisonFileData.parsedData.rows.length.toLocaleString()} rows, {comparisonFileData
										.parsedData.columns.length} columns
								</p>
							</div>
							<button
								class="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-red-900 dark:hover:text-red-400"
								aria-label="Remove file"
								title="Remove file"
								on:click={() => removeFile('comparison')}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					</div>
				{/if}

				<!-- Upload Area or Preview -->
				{#if !comparisonFileData.isUploaded}
					<!-- Upload Area -->
					<div
						class="upload-area"
						class:highlight={false}
						class:uploading={comparisonFileData.isUploading}
						on:dragover|preventDefault={handleDragOver}
						on:dragleave|preventDefault={handleDragLeave}
						on:drop|preventDefault={(e) => handleDrop(e, 'comparison')}
					>
						{#if !comparisonFileData.isUploading}
							<!-- Normal upload state -->
							<input
								type="file"
								class="drop-here"
								accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt"
								on:change={handleComparisonFileUpload}
							/>
							<div class="upload-message">
								Drag &amp; Drop <br /> another Excel (.xlsx/.xls) or CSV file here
							</div>
						{:else}
							<!-- Uploading state -->
							<div class="upload-progress">
								<div class="uploading-text">Uploading...</div>
								<div class="progress-bar">
									<div class="progress-fill" style="width: {comparisonFileData.progress}%"></div>
								</div>
								<div class="progress-text">{Math.round(comparisonFileData.progress)}%</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Preview Table -->
					<div
						class="preview-container overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
					>
						<div
							class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300"
						>
							File Preview (First 20 rows)
						</div>
						<div class="preview-table-wrapper max-h-[400px] overflow-auto">
							<table class="w-auto">
								<thead class="sticky top-0 z-10">
									<tr class="bg-gray-50 dark:bg-gray-700">
										{#each comparisonFileData.parsedData.columns as column}
											<th
												class="min-w-[150px] whitespace-nowrap border-b border-gray-200 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:text-gray-300"
											>
												{column}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
									{#each comparisonFileData.parsedData.rows.slice(0, 20) as row, i}
										<tr
											class={i % 2 === 0
												? 'bg-white dark:bg-gray-800'
												: 'bg-gray-50 dark:bg-gray-700'}
										>
											{#each comparisonFileData.parsedData.columns as column}
												<td
													class="min-w-[150px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
												>
													{row[column] || ''}
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Error message display -->
		{#if errorMessage}
			<div class="mx-auto mb-4 max-w-2xl">
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Error</h3>
							<div class="mt-2 text-sm text-red-700">
								<p>{errorMessage}</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Debug State Info -->
		<div
			class="mx-auto mb-4 max-w-4xl rounded-md border border-gray-700 bg-gray-800 p-3 text-xs text-gray-300"
		>
			<details>
				<summary class="cursor-pointer font-semibold">Debug State Info (Click to expand)</summary>
				<div class="mt-2 rounded bg-gray-700 p-2 text-left">
					<div class="mb-1">
						<b>Primary File:</b>
						{primaryFileData.isUploaded ? 'Uploaded' : 'Not Uploaded'}
					</div>
					<div class="mb-1">
						<b>Primary File Uploading:</b>
						{primaryFileData.isUploading ? 'Yes' : 'No'}
					</div>
					<div class="mb-1"><b>Primary File Progress:</b> {primaryFileData.progress}%</div>
					<div class="mb-1"><b>Has Primary Data:</b> {!!primaryFileData.parsedData}</div>
					{#if primaryFileData.parsedData}
						<div class="mb-1">
							<b>Primary Columns:</b>
							{primaryFileData.parsedData.columns.length}
						</div>
						<div class="mb-1"><b>Primary Rows:</b> {primaryFileData.parsedData.rows.length}</div>
					{/if}
					<div class="mb-1">
						<b>Comparison File:</b>
						{comparisonFileData.isUploaded ? 'Uploaded' : 'Not Uploaded'}
					</div>
					<div class="mb-1">
						<b>Comparison File Uploading:</b>
						{comparisonFileData.isUploading ? 'Yes' : 'No'}
					</div>
					<div class="mb-1"><b>Comparison File Progress:</b> {comparisonFileData.progress}%</div>
					<div class="mb-1"><b>Has Comparison Data:</b> {!!comparisonFileData.parsedData}</div>
					{#if comparisonFileData.parsedData}
						<div class="mb-1">
							<b>Comparison Columns:</b>
							{comparisonFileData.parsedData.columns.length}
						</div>
						<div class="mb-1">
							<b>Comparison Rows:</b>
							{comparisonFileData.parsedData.rows.length}
						</div>
					{/if}
				</div>
			</details>
		</div>

		<!-- Map Columns Button -->
		<div class="mb-16 flex justify-center">
			<button
				on:click={openMappingModal}
				disabled={!primaryFileData.isUploaded ||
					!comparisonFileData.isUploaded ||
					!primaryFileData.parsedData ||
					!comparisonFileData.parsedData}
				class="btn-breathing mt-2 transform rounded-lg border-2 border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 hover:text-white"
				class:opacity-50={!primaryFileData.isUploaded ||
					!comparisonFileData.isUploaded ||
					!primaryFileData.parsedData ||
					!comparisonFileData.parsedData}
				class:cursor-not-allowed={!primaryFileData.isUploaded ||
					!comparisonFileData.isUploaded ||
					!primaryFileData.parsedData ||
					!comparisonFileData.parsedData}
			>
				Map Columns
			</button>
		</div>

		<!-- Column Mapping Modal -->
		{#if primaryFileData.parsedData && comparisonFileData.parsedData}
			<ColumnMappingModal
				primaryFile={primaryFileData.parsedData}
				comparisonFile={comparisonFileData.parsedData}
				show={showMappingModal}
				on:close={() => (showMappingModal = false)}
				on:mapping={handleColumnMapping}
			/>
		{/if}
	</div>
</div>

<style>
	/* Button animation */
	@keyframes btn-breathing {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.03);
		}
		100% {
			transform: scale(1);
		}
	}

	.btn-breathing {
		animation: btn-breathing 4s ease-in-out infinite;
	}

	/* Upload area styling */
	.upload-area {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 150px;
		border: 2px dashed #4a5568;
		border-radius: 8px;
		background-color: #2d3748;
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.upload-area.highlight {
		border-color: #4caf50;
		background-color: rgba(76, 175, 80, 0.2);
	}

	.drop-here {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		z-index: 10;
	}

	.upload-message {
		text-align: center;
		font-size: 1rem;
		color: #e2e8f0;
		line-height: 1.5;
	}

	/* Upload progress */
	.upload-progress {
		width: 80%;
		text-align: center;
	}

	.uploading-text {
		margin-bottom: 10px;
		color: #4caf50;
		font-weight: 500;
	}

	.progress-bar {
		height: 10px;
		background-color: #4a5568;
		border-radius: 5px;
		overflow: hidden;
		margin-bottom: 5px;
	}

	.progress-fill {
		height: 100%;
		background-color: #4caf50;
		transition: width 0.2s ease;
	}

	.progress-text {
		font-size: 0.8rem;
		color: #e2e8f0;
	}

	/* Preview table styling */
	.preview-container {
		max-height: 500px;
		display: flex;
		flex-direction: column;
	}

	.preview-table-wrapper {
		overflow: auto;
		max-height: 400px;
		width: 100%;
	}

	/* Fix for horizontal and vertical scrolling */
	.preview-table-wrapper table {
		border-collapse: collapse;
		width: auto; /* Allow table to expand beyond container */
	}

	.preview-table-wrapper thead {
		position: sticky;
		top: 0;
	}
</style>
