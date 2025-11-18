<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';

	// User contact information
	let email = $state('');

	// Form validation
	let isFormSubmitted = $state(false);
	let isValidEmail = $derived(validateEmail(email));
	let isFormValid = $derived(validateForm());

	// Reconciliation data from store
	let primaryFileName = $state('');
	let comparisonFileName = $state('');
	let columnMappings = $state<{ primaryColumn: string | null; comparisonColumn: string | null }[]>(
		[]
	);
	let primaryIdColumn = $state<string>('');
	let comparisonIdColumn = $state<string>('');

	// Reconciliation configuration options
	let reverseReconciliation = $state(false);
	let caseSensitive = $state(true);
	let trimValues = $state(true);

	onMount(() => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			if (!state.primaryFileData) {
				console.log('Missing state.primaryFileData');
				// Redirect to upload page if any required data is missing
				goto('/upload');
				return;
			}
			if (!state.comparisonFileData) {
				console.log('Missing state.comparisonFileData');
				// Redirect to upload page if any required data is missing
				goto('/upload');
				return;
			}
			if (!state.reconciliationConfig) {
				console.log('Missing state.reconciliationConfig');
				// Redirect to upload page if any required data is missing
				goto('/upload');
				return;
			}

			// Set file names
			primaryFileName = state.primaryFileData.fileName || 'Primary File';
			comparisonFileName = state.comparisonFileData.fileName || 'Comparison File';

			// Set column mappings
			const config = state.reconciliationConfig;
			primaryIdColumn = config.primaryIdPair.primaryColumn || '';
			comparisonIdColumn = config.primaryIdPair.comparisonColumn || '';

			columnMappings = config.comparisonPairs.map((pair) => ({
				primaryColumn: pair.primaryColumn,
				comparisonColumn: pair.comparisonColumn
			}));

			// Set configuration options
			reverseReconciliation = config.reverseReconciliation;
			caseSensitive = config.caseSensitive;
			trimValues = config.trimValues;
		});

		return unsubscribe;
	});

	function validateEmail(email: string): boolean {
		if (!email.trim()) return false;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validateForm(): boolean {
		// Only email is required
		return isValidEmail;
	}

	function handleSubmit() {
		isFormSubmitted = true;

		if (!isFormValid) {
			return;
		}

		// Save contact info to store
		reconciliationStore.setContactInfo({
			email
		});

		// Navigate to results page
		goto('/reconciliation-progress');
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Page header -->
	<div class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
		<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="text-center">
				<h1 class="text-2xl font-bold text-blue-700 dark:text-blue-300">Reconciliation Summary</h1>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Review your configuration and provide contact information to start the reconciliation
				</p>
			</div>
		</div>
	</div>

	<!-- Main content -->
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="container mx-auto max-w-3xl px-4">
			<!-- Files summary section -->
			<div class="mb-8 rounded-lg bg-gray-800 p-6 shadow shadow-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-white">Files</h2>

				{#if reverseReconciliation}
					<div
						class="mb-4 rounded-md border border-orange-500 bg-orange-50 p-3 dark:border-orange-400 dark:bg-orange-900/20"
					>
						<div class="flex items-center">
							<svg
								class="h-4 w-4 text-orange-500 dark:text-orange-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
								></path>
							</svg>
							<span class="ml-2 text-sm font-medium text-orange-700 dark:text-orange-300">
								Reverse reconciliation enabled - files will be swapped during processing
							</span>
						</div>
					</div>
				{/if}

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="rounded-md bg-gray-700 p-4">
						<h3 class="mb-2 font-medium text-white">
							Primary File {reverseReconciliation ? '(will become Comparison)' : ''}
						</h3>
						<p class="text-sm text-gray-300">{primaryFileName}</p>
					</div>

					<div class="rounded-md bg-gray-700 p-4">
						<h3 class="mb-2 font-medium text-white">
							Comparison File {reverseReconciliation ? '(will become Primary)' : ''}
						</h3>
						<p class="text-sm text-gray-300">{comparisonFileName}</p>
					</div>
				</div>
			</div>

			<!-- Column mappings section -->
			<div class="mb-8 rounded-lg bg-gray-800 p-6 shadow shadow-gray-800">
				<h2 class="mb-4 text-xl font-semibold text-white">Column Mappings</h2>

				<div class="mb-4">
					<h3 class="mb-2 font-medium text-white">ID Columns</h3>
					<div class="rounded-md bg-gray-700 p-4">
						<div class="flex items-center justify-between">
							<div class="w-5/12">
								<p class="text-sm font-medium text-white">
									{primaryIdColumn}
								</p>
								<p class="text-xs text-blue-300">Primary File</p>
							</div>

							<div class="flex w-2/12 justify-center">
								<svg
									class="h-5 w-5 text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M14 5l7 7m0 0l-7 7m7-7H3"
									></path>
								</svg>
							</div>

							<div class="w-5/12">
								<p class="text-sm font-medium text-white">
									{comparisonIdColumn}
								</p>
								<p class="text-xs text-blue-300">Comparison File</p>
							</div>
						</div>
					</div>
				</div>

				{#if columnMappings.length > 0}
					<div>
						<h3 class="mb-2 font-medium text-white">Comparison Columns</h3>
						<div class="space-y-2">
							{#each columnMappings as mapping}
								<div class="rounded-md bg-gray-700 p-4">
									<div class="flex items-center justify-between">
										<div class="w-5/12">
											<p class="text-sm font-medium text-white">
												{mapping.primaryColumn}
											</p>
											<p class="text-xs text-blue-300">Primary File</p>
										</div>

										<div class="flex w-2/12 justify-center">
											<svg
												class="h-5 w-5 text-blue-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M14 5l7 7m0 0l-7 7m7-7H3"
												></path>
											</svg>
										</div>

										<div class="w-5/12">
											<p class="text-sm font-medium text-white">
												{mapping.comparisonColumn}
											</p>
											<p class="text-xs text-blue-300">Comparison File</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Reconciliation Options Card -->
			<div
				class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<h2 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
					Reconciliation Options
				</h2>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div
						class="flex items-center space-x-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
					>
						<div class="flex items-center">
							{#if reverseReconciliation}
								<svg
									class="h-5 w-5 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
							{:else}
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
							{/if}
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-white">
								Reverse Reconciliation
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">
								{reverseReconciliation ? 'Enabled' : 'Disabled'}
							</div>
						</div>
					</div>

					<div
						class="flex items-center space-x-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
					>
						<div class="flex items-center">
							{#if caseSensitive}
								<svg
									class="h-5 w-5 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
							{:else}
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
							{/if}
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-white">Case Sensitive</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">
								{caseSensitive ? 'Enabled' : 'Disabled'}
							</div>
						</div>
					</div>

					<div
						class="flex items-center space-x-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
					>
						<div class="flex items-center">
							{#if trimValues}
								<svg
									class="h-5 w-5 text-green-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									></path>
								</svg>
							{:else}
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
							{/if}
						</div>
						<div>
							<div class="text-sm font-medium text-gray-900 dark:text-white">
								Trim Whitespace from Values
							</div>
							<div class="text-xs text-gray-500 dark:text-gray-400">
								{trimValues ? 'Enabled' : 'Disabled'}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Contact Information Card -->
			<div
				class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="mb-6">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Contact Information
					</h2>

					<div
						class="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900"
					>
						<h3 class="mb-2 text-lg font-semibold text-blue-800 dark:text-blue-200">
							One more thing!
						</h3>
						<p class="text-sm text-blue-700 dark:text-blue-300">
							The files you uploaded are quite large and this may take a few minutes. How can we
							contact you with the results?
						</p>
					</div>
				</div>

				<div class="mx-auto">
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>
						<div>
							<!-- Email field with responsive layout -->
							<div class="flex flex-col gap-4 lg:flex-row lg:items-center">
								<div class="lg:w-1/3">
									<label
										class="block text-sm font-medium text-gray-700 dark:text-gray-300"
										for="email"
									>
										Email Address <span class="text-blue-500">*</span>
									</label>
									{#if isFormSubmitted && !isValidEmail}
										<p class="mt-1 text-sm text-blue-600 dark:text-blue-400">
											Please enter a valid email address
										</p>
									{/if}
								</div>
								<div class="lg:w-2/3">
									<input
										class="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
										id="email"
										type="email"
										placeholder="your.email@example.com"
										bind:value={email}
										required
									/>
								</div>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>

		<!-- Action Buttons Row -->
		<div class="mt-8 flex items-center justify-between">
			<!-- Back to Column Selection Button -->
			<button
				type="button"
				onclick={() => goto('/column-selection')}
				class="transform rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
			>
				← Back to Column Selection
			</button>

			<!-- Start Reconciliation Button -->
			<button
				type="button"
				onclick={() => handleSubmit()}
				class="btn-breathing transform rounded-lg border-2 border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!isFormValid}
			>
				Start Reconciliation
			</button>
		</div>
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
</style>
