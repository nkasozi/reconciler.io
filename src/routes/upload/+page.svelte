<script lang="ts">
	import { onMount } from 'svelte';
	import { parseFile, type ParsedFileData, RowLimitExceededError } from '$lib/utils/fileParser';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';
	import { goto } from '$app/navigation';
	import type { ColumnPair } from '$lib/utils/reconciliation';
	import DocumentScanner from '$lib/components/DocumentScanner.svelte';
	import ImagePreview from '$lib/components/ImagePreview.svelte';

	import FileDataEditor from '$lib/components/FileDataEditor.svelte';

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

	// Scanning state
	let showPrimaryScanner = $state(false);
	let showComparisonScanner = $state(false);
	let primaryScanPreview = $state<{ file: File; scanResult?: any } | null>(null);
	let comparisonScanPreview = $state<{ file: File; scanResult?: any } | null>(null);
	let isProcessingScan = $state(false);

	// Editor state
	let showPrimaryEditor = $state(false);
	let showComparisonEditor = $state(false);

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

	// Scanning functions
	function startScanning(type: 'primary' | 'comparison') {
		console.log('=== START SCANNING CALLED ===');
		console.log('type:', type);
		console.log('Current showPrimaryScanner:', showPrimaryScanner);
		console.log('Current showComparisonScanner:', showComparisonScanner);

		errorMessage = null;
		if (type === 'primary') {
			showPrimaryScanner = true;
			console.log('Set showPrimaryScanner to true');
		} else {
			showComparisonScanner = true;
			console.log('Set showComparisonScanner to true');
		}

		console.log('New showPrimaryScanner:', showPrimaryScanner);
		console.log('New showComparisonScanner:', showComparisonScanner);
	}

	function handleScanCapture(event: CustomEvent<{ file: File }>, type: 'primary' | 'comparison') {
		console.log('=== HANDLE SCAN CAPTURE ===');
		console.log('type:', type);
		console.log('event:', event);
		console.log('file:', event.detail.file);

		const { file } = event.detail;

		if (type === 'primary') {
			primaryScanPreview = { file };
			showPrimaryScanner = false;
			console.log('Primary scan captured, showPrimaryScanner set to false');
		} else {
			comparisonScanPreview = { file };
			showComparisonScanner = false;
			console.log('Comparison scan captured, showComparisonScanner set to false');
		}
	}

	function handleScanError(event: CustomEvent<{ message: string }>) {
		errorMessage = event.detail.message;
	}

	function closeScanners() {
		console.log('closeScanners function called');
		console.log(
			'Before - showPrimaryScanner:',
			showPrimaryScanner,
			'showComparisonScanner:',
			showComparisonScanner
		);
		showPrimaryScanner = false;
		showComparisonScanner = false;
		console.log(
			'After - showPrimaryScanner:',
			showPrimaryScanner,
			'showComparisonScanner:',
			showComparisonScanner
		);
	}

	function handleScanRetake(type: 'primary' | 'comparison') {
		if (type === 'primary') {
			primaryScanPreview = null;
			showPrimaryScanner = true;
		} else {
			comparisonScanPreview = null;
			showComparisonScanner = true;
		}
	}

	function handleScanReject(type: 'primary' | 'comparison') {
		if (type === 'primary') {
			primaryScanPreview = null;
		} else {
			comparisonScanPreview = null;
		}
	}

	async function handleScanProcess(
		event: CustomEvent<{ file: File }>,
		type: 'primary' | 'comparison'
	) {
		const { file } = event.detail;
		isProcessingScan = true;

		try {
			// First scan the document to get scan results
			const { scanDocument } = await import('$lib/utils/documentScanner');
			const scanResult = await scanDocument(file, {
				useOCR: true,
				extractTables: true,
				preprocessImage: true,
				useGoogleDocumentAI: true // Enable Google Document AI backend processing
			});

			// Update preview with scan results
			if (type === 'primary') {
				if (primaryScanPreview) {
					primaryScanPreview.scanResult = scanResult;
				}
			} else {
				if (comparisonScanPreview) {
					comparisonScanPreview.scanResult = scanResult;
				}
			}

			// Process the file as normal
			await processFile(file, type);

			// Clear preview after successful processing
			if (type === 'primary') {
				primaryScanPreview = null;
			} else {
				comparisonScanPreview = null;
			}
		} catch (error) {
			console.error('Error processing scanned document:', error);
			errorMessage = error instanceof Error ? error.message : 'Failed to process scanned document';
		} finally {
			isProcessingScan = false;
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
			showPrimaryEditor = false;
		} else {
			comparisonFileData = {
				file: null,
				isUploading: false,
				isUploaded: false,
				progress: 0,
				parsedData: null
			};
			showComparisonEditor = false;
		}

		// Update store if needed
		reconciliationStore.reset();
	}

	function handleEditData(type: 'primary' | 'comparison') {
		if (type === 'primary') {
			showPrimaryEditor = true;
		} else {
			showComparisonEditor = true;
		}
	}

	function handleSaveEditedData(editedData: ParsedFileData, type: 'primary' | 'comparison') {
		if (type === 'primary') {
			primaryFileData.parsedData = editedData;
			showPrimaryEditor = false;
		} else {
			comparisonFileData.parsedData = editedData;
			showComparisonEditor = false;
		}
	}

	function handleCancelEdit(type: 'primary' | 'comparison') {
		if (type === 'primary') {
			showPrimaryEditor = false;
		} else {
			showComparisonEditor = false;
		}
	}

	// Auto-detection: redirect when both files are uploaded
	$effect(() => {
		if (
			primaryFileData.isUploaded &&
			comparisonFileData.isUploaded &&
			primaryFileData.parsedData &&
			comparisonFileData.parsedData
		) {
			// Automatically redirect to column mapping
			setTimeout(() => {
				openMappingModal();
			}, 500); // Small delay to show both files are loaded
		}
	});

	function openMappingModal() {
		// Only proceed if both files are uploaded and parsed
		if (
			primaryFileData.isUploaded &&
			comparisonFileData.isUploaded &&
			primaryFileData.parsedData &&
			comparisonFileData.parsedData
		) {
			console.log('Redirecting to column mapping page');

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

				// Navigate to column mapping page
				goto('/column-selection');
			} catch (error) {
				console.error('Error preparing for column mapping:', error);
				errorMessage = 'Error preparing for column mapping. Please try again.';
			}
		} else {
			console.warn('Cannot open mapping modal - files not ready');
		}
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
								onclick={() => removeFile('primary')}
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
					{#if primaryScanPreview}
						<!-- Scan Preview -->
						<div class="space-y-4">
							<ImagePreview
								file={primaryScanPreview.file}
								scanResult={primaryScanPreview.scanResult}
								on:retake={() => handleScanRetake('primary')}
								on:process={(e) => handleScanProcess(e, 'primary')}
								on:reject={() => handleScanReject('primary')}
							/>
							{#if primaryScanPreview.scanResult}{/if}
						</div>
					{:else}
						<!-- Upload Area -->
						<div
							class="upload-area"
							class:highlight={false}
							class:uploading={primaryFileData.isUploading}
							role="button"
							tabindex="0"
							ondragover={(e) => {
								e.preventDefault();
								handleDragOver(e);
							}}
							ondragleave={(e) => {
								e.preventDefault();
								handleDragLeave(e);
							}}
							ondrop={(e) => {
								e.preventDefault();
								handleDrop(e, 'primary');
							}}
						>
							{#if !primaryFileData.isUploading}
								<!-- Normal upload state -->
								<input
									type="file"
									class="drop-here"
									accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt,.jpg,.jpeg,.png,.bmp,.tiff,.webp"
									onchange={handlePrimaryFileUpload}
								/>
								<div class="upload-message">
									Drag &amp; Drop <br /> Primary Excel, CSV, PDF, or image file here
								</div>

								<!-- Upload options -->
								<div class="mt-4 flex flex-col space-y-2">
									<button
										type="button"
										class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
										onclick={() => document.querySelector('input[type=file]')?.click()}
									>
										📁 Choose File
									</button>

									<div class="flex items-center space-x-2 text-xs text-gray-400">
										<hr class="flex-1" />
										<span>or</span>
										<hr class="flex-1" />
									</div>

									<button
										type="button"
										class="flex w-full items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
										onclick={() => startScanning('primary')}
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
										<span>📱 Scan Document</span>
									</button>
								</div>
							{:else}
								<!-- Uploading state -->
								<div class="upload-progress">
									<div class="uploading-text">
										{isProcessingScan ? 'Processing scan...' : 'Uploading...'}
									</div>
									<div class="progress-bar">
										<div class="progress-fill" style="width: {primaryFileData.progress}%"></div>
									</div>
									<div class="progress-text">{Math.round(primaryFileData.progress)}%</div>
								</div>
							{/if}
						</div>
					{/if}
				{:else}
					<!-- File Data Editor -->
					{#if showPrimaryEditor && primaryFileData.parsedData}
						<FileDataEditor
							data={primaryFileData.parsedData}
							fileName={primaryFileData.file?.name || 'Primary File'}
							onSave={(editedData) => handleSaveEditedData(editedData, 'primary')}
							onCancel={() => handleCancelEdit('primary')}
						/>
					{:else}
						<!-- Preview Table with Edit Button -->
						<div
							class="preview-container overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
						>
							<div
								class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700"
							>
								<div
									class="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300"
								>
									File Preview (First 20 rows)
								</div>
								<button
									class="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
									onclick={() => handleEditData('primary')}
								>
									Edit Data
								</button>
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
								onclick={() => removeFile('comparison')}
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
					{#if comparisonScanPreview}
						<!-- Scan Preview -->
						<div class="space-y-4">
							<ImagePreview
								file={comparisonScanPreview.file}
								scanResult={comparisonScanPreview.scanResult}
								on:retake={() => handleScanRetake('comparison')}
								on:process={(e) => handleScanProcess(e, 'comparison')}
								on:reject={() => handleScanReject('comparison')}
							/>
							{#if comparisonScanPreview.scanResult}{/if}
						</div>
					{:else}
						<!-- Upload Area -->
						<div
							class="upload-area"
							class:highlight={false}
							class:uploading={comparisonFileData.isUploading}
							role="button"
							tabindex="0"
							ondragover={(e) => {
								e.preventDefault();
								handleDragOver(e);
							}}
							ondragleave={(e) => {
								e.preventDefault();
								handleDragLeave(e);
							}}
							ondrop={(e) => {
								e.preventDefault();
								handleDrop(e, 'comparison');
							}}
						>
							{#if !comparisonFileData.isUploading}
								<!-- Normal upload state -->
								<input
									type="file"
									class="drop-here"
									accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt,.jpg,.jpeg,.png,.bmp,.tiff,.webp"
									onchange={handleComparisonFileUpload}
								/>
								<div class="upload-message">
									Drag &amp; Drop <br /> Comparison Excel, CSV, PDF, or image file here
								</div>

								<!-- Upload options -->
								<div class="mt-4 flex flex-col space-y-2">
									<button
										type="button"
										class="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
										onclick={(e) =>
											e.currentTarget.parentElement?.parentElement
												?.querySelector('input[type=file]')
												?.click()}
									>
										📁 Choose File
									</button>

									<div class="flex items-center space-x-2 text-xs text-gray-400">
										<hr class="flex-1" />
										<span>or</span>
										<hr class="flex-1" />
									</div>

									<button
										type="button"
										class="flex w-full items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
										onclick={() => startScanning('comparison')}
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
										<span>📱 Scan Document</span>
									</button>
								</div>
							{:else}
								<!-- Uploading state -->
								<div class="upload-progress">
									<div class="uploading-text">
										{isProcessingScan ? 'Processing scan...' : 'Uploading...'}
									</div>
									<div class="progress-bar">
										<div class="progress-fill" style="width: {comparisonFileData.progress}%"></div>
									</div>
									<div class="progress-text">{Math.round(comparisonFileData.progress)}%</div>
								</div>
							{/if}
						</div>
					{/if}
				{:else}
					<!-- File Data Editor -->
					{#if showComparisonEditor && comparisonFileData.parsedData}
						<FileDataEditor
							data={comparisonFileData.parsedData}
							fileName={comparisonFileData.file?.name || 'Comparison File'}
							onSave={(editedData) => handleSaveEditedData(editedData, 'comparison')}
							onCancel={() => handleCancelEdit('comparison')}
						/>
					{:else}
						<!-- Preview Table with Edit Button -->
						<div
							class="preview-container overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800"
						>
							<div
								class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700"
							>
								<div
									class="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300"
								>
									File Preview (First 20 rows)
								</div>
								<button
									class="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
									onclick={() => handleEditData('comparison')}
								>
									Edit Data
								</button>
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
				onclick={openMappingModal}
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
	</div>

	<!-- Document Scanners -->
	<DocumentScanner
		isActive={showPrimaryScanner}
		onscan={(e: any) => handleScanCapture(e, 'primary')}
		onerror={handleScanError}
		onclose={closeScanners}
	/>

	<DocumentScanner
		isActive={showComparisonScanner}
		onscan={(e: any) => handleScanCapture(e, 'comparison')}
		onerror={handleScanError}
		onclose={closeScanners}
	/>

	<!-- Error message display -->
	{#if errorMessage}
		<div
			class="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-red-400 bg-red-100 p-4 text-red-700 shadow-lg"
		>
			<div class="flex items-start space-x-2">
				<svg class="mt-0.5 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<p class="text-sm font-medium">Upload Error</p>
					<p class="text-sm">{errorMessage}</p>
				</div>
				<button
					type="button"
					class="ml-auto text-red-400 hover:text-red-600"
					onclick={() => (errorMessage = null)}
				>
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/if}
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
		justify-content: flex-start;
		align-items: center;
		min-height: 350px; /* Increased height for new buttons */
		padding: 20px;
		border: 2px dashed #4a5568;
		border-radius: 8px;
		background-color: #2d3748;
		transition: all 0.3s ease;
		overflow: visible;
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
		height: 80px; /* Only cover the drop message area */
		opacity: 0;
		cursor: pointer;
		z-index: 1; /* Much lower z-index to not interfere */
		pointer-events: auto;
	}

	.upload-message {
		text-align: center;
		font-size: 1rem;
		color: #e2e8f0;
		line-height: 1.5;
		margin-bottom: 20px;
		position: relative;
		z-index: 2;
		pointer-events: none; /* Allow clicks to pass through to buttons below */
	}

	/* Ensure upload buttons are clickable */
	.upload-area button {
		position: relative;
		z-index: 20; /* Higher z-index than drop area */
		pointer-events: auto;
	}

	/* Make button container also properly positioned */
	.upload-area .mt-4 {
		position: relative;
		z-index: 20;
		width: 100%;
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
