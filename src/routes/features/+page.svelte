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
			class="absolute right-0 top-1/2 max-w-sm -translate-y-1/2 px-16 opacity-20"
		/>
	</div>

	<div class="hidden md:block">
		<img
			src="/images/reconcile.svg"
			alt="Reconcile illustration"
			class="absolute left-0 top-1/2 max-w-xs -translate-y-1/2 px-16 opacity-20"
		/>
	</div>
	<div class="container mx-auto px-4">
		<div class="mb-16 text-center">
			<h1 class="mb-4 text-4xl font-bold text-white md:text-5xl">
				Powerful Features for <span class="text-green-400">Modern Data Reconciliation</span>
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

		<!-- Use Case Solutions Section -->
		<div class="mb-20">
			<div class="mb-12 text-center">
				<h2 class="mb-4 text-3xl font-bold text-white">
					Reconciliation Solutions for Every Business
				</h2>
				<p class="mx-auto max-w-3xl text-xl text-gray-300">
					From banking to financial close, our platform handles specialized reconciliation needs
					across industries
				</p>
			</div>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				<!-- Bank Reconciliation -->
				<div class="rounded-lg bg-blue-500/10 p-6 dark:bg-blue-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">Bank Reconciliation</h3>
					<p class="mb-4 text-gray-300">
						Universal tool for matching bank statements with GL accounts, handling high volumes,
						multi-currency, and complex matching patterns.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ High transaction volumes</li>
						<li>✓ Multi-currency support</li>
						<li>✓ 1-to-many, many-to-many matching</li>
					</ul>
				</div>

				<!-- Credit Card Reconciliation -->
				<div class="rounded-lg bg-green-500/10 p-6 dark:bg-green-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">Credit Card Reconciliation</h3>
					<p class="mb-4 text-gray-300">
						Multi-stepped matching for payment gateways, POS systems, e-commerce platforms, and
						corporate expense management.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ Payment gateway reconciliation</li>
						<li>✓ E-commerce POS support</li>
						<li>✓ Corporate expense tracking</li>
					</ul>
				</div>

				<!-- AP/AR Reconciliation -->
				<div class="rounded-lg bg-purple-500/10 p-6 dark:bg-purple-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">AP/AR Reconciliation</h3>
					<p class="mb-4 text-gray-300">
						Centralized platform for both Accounts Payable and Receivable, with seamless
						invoice-to-payment matching.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ Unified AP & AR platform</li>
						<li>✓ Invoice matching</li>
						<li>✓ Vendor statement reconciliation</li>
					</ul>
				</div>

				<!-- Securities Reconciliation -->
				<div class="rounded-lg bg-orange-500/10 p-6 dark:bg-orange-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">Securities & Trades</h3>
					<p class="mb-4 text-gray-300">
						Intraday positions reconciliation with automated break identification and resolution for
						regulatory compliance.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ Intraday reconciliation</li>
						<li>✓ Automated break identification</li>
						<li>✓ Regulatory compliance</li>
					</ul>
				</div>

				<!-- Financial Close -->
				<div class="rounded-lg bg-red-500/10 p-6 dark:bg-red-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">Financial Close Management</h3>
					<p class="mb-4 text-gray-300">
						Centralized repository for balance sheet reconciliations with auditable workflows and
						period-end automation.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ Balance sheet reconciliation</li>
						<li>✓ Auditable workflows</li>
						<li>✓ Period-end automation</li>
					</ul>
				</div>

				<!-- Intercompany -->
				<div class="rounded-lg bg-indigo-500/10 p-6 dark:bg-indigo-900/20">
					<h3 class="mb-3 text-lg font-bold text-white">Intercompany Reconciliation</h3>
					<p class="mb-4 text-gray-300">
						Unified reporting across multiple subsidiaries with support for various GL systems and
						data sources.
					</p>
					<ul class="space-y-2 text-sm text-gray-300">
						<li>✓ Multi-system support</li>
						<li>✓ Real-time exceptions</li>
						<li>✓ Unified reporting</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Core Capabilities Section -->
		<div class="mb-20 grid grid-cols-1 gap-8 md:grid-cols-2">
			<!-- Intelligent Matching Engine -->
			<div class="rounded-lg bg-blue-50 p-8 dark:bg-blue-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5.802 4.033l-.707-.707M5.967 5.967l-.707.707"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
					Intelligent Matching Engine
				</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Configurable fuzzy, exact, and tolerance-based matching</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Case-insensitive and whitespace-aware comparison</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Bidirectional reconciliation to catch all discrepancies</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Smart scoring algorithm for match confidence</span>
					</li>
				</ul>
			</div>

			<!-- Automation & Workflow -->
			<div class="rounded-lg bg-green-50 p-8 dark:bg-green-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">Automation & Workflow</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Instant file uploads and multi-format support (CSV, Excel, PDF, etc)</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>One-click reconciliation with saved mapping templates</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Real-time processing with live progress tracking</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Automatic detection and suggestion of column matches</span>
					</li>
				</ul>
			</div>

			<!-- Multi-Source Integration -->
			<div class="rounded-lg bg-purple-50 p-8 dark:bg-purple-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
					Multi-Source Integration
				</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Reconcile data from any source or system</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Support for multiple file formats and encodings</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Seamless column mapping between diverse datasets</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Handle varying data structures and schemas</span>
					</li>
				</ul>
			</div>

			<!-- Comprehensive Analytics -->
			<div class="rounded-lg bg-orange-50 p-8 dark:bg-orange-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
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
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
					Comprehensive Analytics
				</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Detailed matching statistics and coverage reports</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Interactive discrepancy viewer with side-by-side comparison</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Export results as CSV, Excel, or PDF</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Visual dashboards showing match rates and failure patterns</span>
					</li>
				</ul>
			</div>

			<!-- Enterprise Security -->
			<div class="rounded-lg bg-red-50 p-8 dark:bg-red-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">Enterprise Security</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Client-side processing—no data sent to servers</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>End-to-end encryption and secure session handling</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Full audit trails and compliance-ready logging</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>GDPR and SOC 2 compliant architecture</span>
					</li>
				</ul>
			</div>

			<!-- Scalability & Performance -->
			<div class="rounded-lg bg-indigo-50 p-8 dark:bg-indigo-900/20">
				<div
					class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
				<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
					Scalability & Performance
				</h3>
				<ul class="space-y-2 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Process datasets from hundreds to millions of rows</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Optimized for speed with intelligent chunking</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Parallel processing for maximum throughput</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Efficient memory management for even large reconciliations</span>
					</li>
				</ul>
			</div>
		</div>
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
								CSV, Excel, PDF, and more formats supported out of the box.
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
