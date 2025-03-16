<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { reconciliationStore } from '$lib/stores/reconciliationStore';

	// User contact information
	let email = $state('');
	let phone = $state('');

	// Form validation
	let isFormSubmitted = $state(false);
	let isValidEmail = $derived(validateEmail(email));
	let isValidPhone = $derived(validatePhone(phone));
	let isFormValid = $derived(validateForm());

	// Reconciliation data from store
	let primaryFileName = $state('');
	let comparisonFileName = $state('');
	let columnMappings = $state([]);
	let primaryIdColumn = $state('');
	let comparisonIdColumn = $state('');

	onMount(() => {
		const unsubscribe = reconciliationStore.subscribe((state) => {
			if (!state.primaryFileData || !state.comparisonFileData || !state.reconciliationConfig) {
				// Redirect to upload page if data is missing
				goto('/upload');
				return;
			}

			// Set file names
			primaryFileName = state.primaryFileData.fileName || 'Primary File';
			comparisonFileName = state.comparisonFileData.fileName || 'Comparison File';

			// Set column mappings
			const config = state.reconciliationConfig;
			primaryIdColumn = config.primaryIdPair.primaryColumn;
			comparisonIdColumn = config.primaryIdPair.comparisonColumn;

			columnMappings = config.comparisonPairs.map((pair) => ({
				primaryColumn: pair.primaryColumn,
				comparisonColumn: pair.comparisonColumn
			}));
		});

		return unsubscribe;
	});

	function validateEmail(email: string): boolean {
		if (!email.trim()) return false;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	function validatePhone(phone: string): boolean {
		if (!phone.trim()) return true; // Phone is optional if email is provided
		const phoneRegex = /^\+?[0-9]{10,15}$/;
		return phoneRegex.test(phone);
	}

	function validateForm(): boolean {
		// Email is required, phone is optional
		return isValidEmail && (phone === '' || isValidPhone);
	}

	function handleSubmit() {
		isFormSubmitted = true;

		if (!isFormValid) {
			return;
		}

		// Save contact info to store
		reconciliationStore.setContactInfo({
			email,
			phone
		});

		// Navigate to results page
		goto('/reconciliation-progress');
	}
</script>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<h1 class="text-foreground dark:text-dark-foreground mb-8 text-center text-3xl font-bold">
		Reconciliation Summary
	</h1>

	<!-- Files summary section -->
	<div class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow dark:shadow-gray-800">
		<h2 class="text-foreground dark:text-dark-foreground mb-4 text-xl font-semibold">Files</h2>

		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
				<h3 class="text-foreground dark:text-dark-foreground mb-2 font-medium">Primary File</h3>
				<p class="text-sm text-gray-700 dark:text-gray-300">{primaryFileName}</p>
			</div>

			<div class="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
				<h3 class="text-foreground dark:text-dark-foreground mb-2 font-medium">Comparison File</h3>
				<p class="text-sm text-gray-700 dark:text-gray-300">{comparisonFileName}</p>
			</div>
		</div>
	</div>

	<!-- Column mappings section -->
	<div class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow dark:shadow-gray-800">
		<h2 class="text-foreground dark:text-dark-foreground mb-4 text-xl font-semibold">
			Column Mappings
		</h2>

		<div class="mb-4">
			<h3 class="text-foreground dark:text-dark-foreground mb-2 font-medium">ID Columns</h3>
			<div class="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
				<div class="flex items-center justify-between">
					<div class="w-5/12">
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
							{primaryIdColumn}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Primary File</p>
					</div>

					<div class="flex w-2/12 justify-center">
						<svg
							class="text-primary dark:text-dark-primary h-5 w-5"
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
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
							{comparisonIdColumn}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">Comparison File</p>
					</div>
				</div>
			</div>
		</div>

		{#if columnMappings.length > 0}
			<div>
				<h3 class="text-foreground dark:text-dark-foreground mb-2 font-medium">
					Comparison Columns
				</h3>
				<div class="space-y-2">
					{#each columnMappings as mapping}
						<div class="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
							<div class="flex items-center justify-between">
								<div class="w-5/12">
									<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
										{mapping.primaryColumn}
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">Primary File</p>
								</div>

								<div class="flex w-2/12 justify-center">
									<svg
										class="text-primary dark:text-dark-primary h-5 w-5"
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
									<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
										{mapping.comparisonColumn}
									</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">Comparison File</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Contact information form -->
	<div class="container mx-auto pt-8 pb-2 text-center">
		<div class="dark:bg-dark-background mb-8 rounded-lg bg-white p-6 shadow dark:shadow-gray-800">
			<h2 class="text-foreground dark:text-dark-foreground mb-4 text-xl font-semibold">
				Contact Information
			</h2>

			<div class="mb-8">
				<h1 class="mb-4 text-xl font-semibold text-red-500">
					One more thing! <br />
					The files you uploaded are quite large <br />
					and this may take a few minutes.
				</h1>

				<p class="text-foreground dark:text-dark-foreground mb-6 text-lg">
					How can we contact you with the results?
				</p>
			</div>

			<div class="flex justify-center">
				<form
					class="w-full max-w-md"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div class="mb-6">
						<div class="flex items-center justify-between">
							<label
								class="text-foreground dark:text-dark-foreground mb-1 block font-semibold"
								for="email"
							>
								Email <span class="text-red-500">*</span>
							</label>
							{#if isFormSubmitted && !isValidEmail}
								<p class="text-sm text-red-600 dark:text-red-400">
									Please enter a valid email address
								</p>
							{/if}
						</div>
						<input
							class="w-full appearance-none rounded border-2 border-gray-200 bg-gray-100 px-4 py-2 leading-tight text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-blue-500"
							id="email"
							type="email"
							placeholder="your.email@example.com"
							bind:value={email}
							required
						/>
					</div>

					<div class="mb-6">
						<div class="flex items-center justify-between">
							<label
								class="text-foreground dark:text-dark-foreground mb-1 block font-semibold"
								for="phone"
							>
								Phone Number (optional)
							</label>
							{#if isFormSubmitted && phone && !isValidPhone}
								<p class="text-sm text-red-600 dark:text-red-400">
									Please enter a valid phone number
								</p>
							{/if}
						</div>
						<input
							class="w-full appearance-none rounded border-2 border-gray-200 bg-gray-100 px-4 py-2 leading-tight text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-blue-500"
							id="phone"
							type="tel"
							placeholder="+1234567890"
							bind:value={phone}
						/>
					</div>

					<div class="flex justify-center">
						<button
							type="submit"
							class="focus:ring-opacity-50 rounded border border-green-500 bg-green-500 px-6 py-2 font-semibold text-white hover:bg-green-600 focus:ring-2 focus:ring-green-400 focus:outline-none dark:border-green-600 dark:bg-green-600 dark:hover:bg-green-700"
							disabled={!isFormValid}
							class:opacity-50={!isFormValid}
							class:cursor-not-allowed={!isFormValid}
						>
							Start Reconciliation
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
