<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Features | Reconcile - Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Powerful features for seamless data reconciliation across all your systems."
	/>
</svelte:head>

<div class="relative min-h-screen bg-gray-900 py-16 text-white">
	<!-- Desktop SVG illustrations -->
	<div class="hidden md:block">
		<img
			src="/images/details.svg"
			alt="Details illustration"
			class="absolute top-1/2 right-0 max-w-sm -translate-y-1/2 px-16 opacity-20"
		/>
	</div>

	<div class="hidden md:block">
		<img
			src="/images/reconcile.svg"
			alt="Reconcile illustration"
			class="absolute top-1/2 left-0 max-w-xs -translate-y-1/2 px-16 opacity-20"
		/>
	</div>
	<div class="container mx-auto px-4">
		<div class="mb-16 text-center">
			<h1 class="mb-4 text-4xl font-bold text-white md:text-5xl">
				Powerful Features for <span class="text-blue-400">Modern Data Reconciliation</span>
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-300">
				From intelligent column mapping to detailed discrepancy analysis, our tool empowers you to
				reconcile data with confidence.
			</p>
		</div>

		<!-- Feature Categories -->
		<div class="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
			<!-- Category 1 -->
			<div
				class="transform rounded-lg bg-white p-6 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
			>
				<div
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-8 w-8"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Intuitive Data Mapping</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Effortlessly map columns between files with our drag-and-drop interface. Save your
					mappings for future use.
				</p>
			</div>

			<!-- Category 2 -->
			<div
				class="transform rounded-lg bg-white p-6 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
			>
				<div
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-8 w-8"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
					Real-time Reconciliation
				</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Watch your data reconcile in real-time with our high-performance matching engine. See
					progress updates as they happen.
				</p>
			</div>

			<!-- Category 3 -->
			<div
				class="transform rounded-lg bg-white p-6 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
			>
				<div
					class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-8 w-8"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
						/>
					</svg>
				</div>
				<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Detailed Analysis</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Analyze discrepancies with pinpoint accuracy. Navigate through mismatches and understand
					the exact differences in your data.
				</p>
			</div>
		</div>

		<!-- Feature List -->
		<div class="mb-16 overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
			<div class="border-b border-gray-200 p-8 dark:border-gray-700">
				<h2 class="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Complete Feature List</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Everything you need for powerful data reconciliation
				</p>
			</div>

			<div class="grid grid-cols-1 p-2 md:grid-cols-2 lg:grid-cols-3">
				<!-- Feature 1 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Multi-format Support
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								CSV, Excel, JSON, and more formats supported out of the box.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 2 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Smart Column Mapping
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Automatic suggestions for column mapping based on headers and content.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 3 -->
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								High-Speed Processing
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Parallel processing for lightning-fast reconciliation of even large datasets.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 4 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Interactive Failure Analysis
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Navigate through discrepancies with our interactive viewer and highlighting.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 5 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">Detailed Reporting</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Generate comprehensive reports with matching statistics and detailed discrepancies.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 6 -->
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Result Export Options
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Export reconciliation results as CSV, Excel, or PDF for further analysis.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 7 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Real-time Progress Tracking
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Monitor reconciliation progress with detailed logs and status updates.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 8 -->
				<div class="border-b border-gray-200 p-6 md:border-r dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">Dark Mode Support</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								Eye-friendly dark mode for comfortable use in any lighting condition.
							</p>
						</div>
					</div>
				</div>

				<!-- Feature 9 -->
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<div class="flex items-start">
						<div class="h-8 w-8 flex-shrink-0 text-blue-600 dark:text-blue-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div class="ml-4">
							<h3 class="text-lg font-medium text-gray-900 dark:text-white">
								Privacy-First Design
							</h3>
							<p class="mt-1 text-gray-600 dark:text-gray-300">
								All data processing happens locally in your browser, ensuring maximum privacy.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA Section -->
		<div class="text-center">
			<h2 class="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
				Ready to transform your data reconciliation workflow?
			</h2>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<button
					on:click={() => goto('/upload')}
					class="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition duration-300 hover:bg-blue-700"
				>
					Start Reconciling Now
				</button>
				<button
					on:click={() => goto('/pricing')}
					class="rounded-lg border border-blue-600 bg-white px-8 py-3 font-semibold text-blue-600 transition duration-300 hover:bg-gray-100 dark:border-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
				>
					View Pricing
				</button>
			</div>
		</div>
	</div>
</div>
