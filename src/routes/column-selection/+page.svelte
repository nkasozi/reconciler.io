<script lang="ts">
	import { onMount } from 'svelte';

	// Sample data for preview of uploaded files
	// In a real app, this would come from parsing the uploaded files
	type ColumnData = {
		name: string;
		sampleValues: string[];
	};

	type FilePreviewData = {
		columns: ColumnData[];
		rows: Record<string, string>[];
	};

	let primaryFilePreview = $state<FilePreviewData>({
		columns: [
			{ name: 'Date', sampleValues: ['2023-01-01', '2023-01-02', '2023-01-03'] },
			{ name: 'Transaction ID', sampleValues: ['TX001', 'TX002', 'TX003'] },
			{ name: 'Amount', sampleValues: ['$100.00', '$250.50', '$75.25'] },
			{ name: 'Description', sampleValues: ['Payment', 'Refund', 'Subscription'] }
		],
		rows: [
			{ Date: '2023-01-01', 'Transaction ID': 'TX001', Amount: '$100.00', Description: 'Payment' },
			{ Date: '2023-01-02', 'Transaction ID': 'TX002', Amount: '$250.50', Description: 'Refund' },
			{
				Date: '2023-01-03',
				'Transaction ID': 'TX003',
				Amount: '$75.25',
				Description: 'Subscription'
			}
		]
	});

	let comparisonFilePreview = $state<FilePreviewData>({
		columns: [
			{ name: 'Payment Date', sampleValues: ['01/01/2023', '01/02/2023', '01/03/2023'] },
			{ name: 'Reference No', sampleValues: ['TX001', 'TX002', 'TX003'] },
			{ name: 'Payment Amount', sampleValues: ['100.00', '250.50', '75.25'] },
			{
				name: 'Notes',
				sampleValues: ['Customer payment', 'Customer refund', 'Monthly subscription']
			}
		],
		rows: [
			{
				'Payment Date': '01/01/2023',
				'Reference No': 'TX001',
				'Payment Amount': '100.00',
				Notes: 'Customer payment'
			},
			{
				'Payment Date': '01/02/2023',
				'Reference No': 'TX002',
				'Payment Amount': '250.50',
				Notes: 'Customer refund'
			},
			{
				'Payment Date': '01/03/2023',
				'Reference No': 'TX003',
				'Payment Amount': '75.25',
				Notes: 'Monthly subscription'
			}
		]
	});

	// Selected column pairs for ID matching
	type ColumnPair = {
		primaryColumn: string | null;
		comparisonColumn: string | null;
	};

	let primaryIdPair = $state<ColumnPair>({
		primaryColumn: null,
		comparisonColumn: null
	});

	// Selected column pairs for comparison
	let comparisonPairs = $state<ColumnPair[]>([{ primaryColumn: null, comparisonColumn: null }]);

	// Contact information
	let contactEmail = $state('');
	let emailValid = $state(false);

	// Validation state
	let primaryIdPairValid = $state(false);
	let formValid = $state(false);

	// Check if primary ID pair is valid
	$effect(() => {
		primaryIdPairValid = !!primaryIdPair.primaryColumn && !!primaryIdPair.comparisonColumn;
		validateForm();
	});

	// Validate email
	function validateEmail() {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		emailValid = emailRegex.test(contactEmail);
		validateForm();
	}

	// Validate the entire form
	function validateForm() {
		formValid = primaryIdPairValid && emailValid;
	}

	// Add another comparison pair
	function addComparisonPair() {
		comparisonPairs = [...comparisonPairs, { primaryColumn: null, comparisonColumn: null }];
	}

	// Remove a comparison pair
	function removeComparisonPair(index: number) {
		comparisonPairs = comparisonPairs.filter((_, i) => i !== index);
	}

	// Start reconciliation process
	function startReconciliation() {
		if (!formValid) return;

		// Prepare reconciliation data
		const reconciliationConfig = {
			primaryIdPair,
			comparisonPairs: comparisonPairs.filter(
				(pair) => pair.primaryColumn && pair.comparisonColumn
			),
			contactEmail
		};

		// In a real app, you'd store this in a store or send to a server
		console.log('Starting reconciliation with config:', reconciliationConfig);

		// Navigate to results page (in a real app, this might be a loading page first)
		window.location.href = '/reconciliation-results';
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-6 text-center text-3xl font-bold text-gray-800">File Column Selection</h1>

	<!-- File preview -->
	<div class="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
		<!-- Primary file preview -->
		<div class="rounded-lg bg-white p-4 shadow-md">
			<h2 class="mb-2 text-xl font-semibold text-gray-700">Primary File</h2>

			<div class="overflow-x-auto">
				<table class="min-w-full border border-gray-200 bg-white">
					<thead>
						<tr>
							{#each primaryFilePreview.columns as column}
								<th
									class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase"
								>
									{column.name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each primaryFilePreview.rows as row, rowIndex}
							<tr class={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
								{#each Object.values(row) as cell}
									<td class="border-b border-gray-200 px-4 py-2 text-sm">{cell}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Comparison file preview -->
		<div class="rounded-lg bg-white p-4 shadow-md">
			<h2 class="mb-2 text-xl font-semibold text-gray-700">Comparison File</h2>

			<div class="overflow-x-auto">
				<table class="min-w-full border border-gray-200 bg-white">
					<thead>
						<tr>
							{#each comparisonFilePreview.columns as column}
								<th
									class="border-b border-gray-200 bg-gray-50 px-4 py-2 text-left text-xs font-semibold tracking-wider text-gray-700 uppercase"
								>
									{column.name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each comparisonFilePreview.rows as row, rowIndex}
							<tr class={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
								{#each Object.values(row) as cell}
									<td class="border-b border-gray-200 px-4 py-2 text-sm">{cell}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Primary ID column pair selection -->
	<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-700">Select Primary ID Columns</h2>
		<p class="mb-4 text-gray-600">
			Select the columns from each file that uniquely identify a row. These columns will be used to
			match rows between files.
		</p>

		<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<label class="mb-2 block text-sm font-bold text-gray-700" for="primary-id-column">
					Primary File ID Column:
				</label>
				<select
					id="primary-id-column"
					class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
					bind:value={primaryIdPair.primaryColumn}
				>
					<option value="">Select a column</option>
					{#each primaryFilePreview.columns as column}
						<option value={column.name}>{column.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="mb-2 block text-sm font-bold text-gray-700" for="comparison-id-column">
					Comparison File ID Column:
				</label>
				<select
					id="comparison-id-column"
					class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
					bind:value={primaryIdPair.comparisonColumn}
				>
					<option value="">Select a column</option>
					{#each comparisonFilePreview.columns as column}
						<option value={column.name}>{column.name}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if !primaryIdPairValid}
			<p class="text-xs text-red-500 italic">Both ID columns must be selected.</p>
		{/if}
	</div>

	<!-- Comparison column pairs selection -->
	<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-700">Select Comparison Column Pairs</h2>
			<button
				type="button"
				on:click={addComparisonPair}
				class="rounded bg-blue-500 px-2 py-1 text-sm font-bold text-white hover:bg-blue-700"
			>
				+ Add Pair
			</button>
		</div>

		<p class="mb-4 text-gray-600">
			Select columns to compare between the two files. You can add multiple comparison pairs.
		</p>

		{#each comparisonPairs as pair, index}
			<div class="mb-4 rounded-md bg-gray-50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="text-md font-medium text-gray-700">Comparison Pair {index + 1}</h3>
					{#if comparisonPairs.length > 1}
						<button
							type="button"
							on:click={() => removeComparisonPair(index)}
							class="text-red-500 hover:text-red-700"
						>
							Remove
						</button>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="mb-2 block text-sm font-bold text-gray-700" for={`primary-col-${index}`}>
							Primary File Column:
						</label>
						<select
							id={`primary-col-${index}`}
							class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
							bind:value={pair.primaryColumn}
						>
							<option value="">Select a column</option>
							{#each primaryFilePreview.columns as column}
								<option value={column.name}>{column.name}</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							class="mb-2 block text-sm font-bold text-gray-700"
							for={`comparison-col-${index}`}
						>
							Comparison File Column:
						</label>
						<select
							id={`comparison-col-${index}`}
							class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
							bind:value={pair.comparisonColumn}
						>
							<option value="">Select a column</option>
							{#each comparisonFilePreview.columns as column}
								<option value={column.name}>{column.name}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Contact information -->
	<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-700">Contact Information</h2>
		<p class="mb-4 text-gray-600">
			Enter your email address to receive the reconciliation results.
		</p>

		<div class="mb-4">
			<label class="mb-2 block text-sm font-bold text-gray-700" for="email"> Email: </label>
			<input
				type="email"
				id="email"
				class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
				placeholder="your@email.com"
				bind:value={contactEmail}
				on:input={validateEmail}
			/>
			{#if contactEmail && !emailValid}
				<p class="text-xs text-red-500 italic">Please enter a valid email address.</p>
			{/if}
		</div>
	</div>

	<!-- Start reconciliation button -->
	<div class="mt-6 flex justify-center">
		<button
			type="button"
			on:click={startReconciliation}
			class="rounded border border-green-500 bg-green-500 px-6 py-3 font-semibold text-white transition-colors duration-200 hover:bg-green-600 hover:text-pink-100"
			disabled={!formValid}
			class:opacity-50={!formValid}
			class:cursor-not-allowed={!formValid}
		>
			Start Reconciliation
		</button>
	</div>
</div>
