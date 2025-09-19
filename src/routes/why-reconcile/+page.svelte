<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Why Reconcile | Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Discover why Reconcile is the most powerful solution for your data reconciliation needs."
	/>
</svelte:head>

<div class="bg-blue-50 py-16 dark:bg-gray-900">
	<div class="container mx-auto px-4">
		<!-- Hero Section -->
		<div class="mb-16 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
				Why Choose <span class="text-blue-600 dark:text-blue-400">Reconcile</span>?
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
				The most powerful, intuitive, and reliable solution for your data reconciliation needs.
			</p>
		</div>

		<!-- Key Benefits -->
		<div class="mx-auto mb-20 max-w-5xl">
			<h2 class="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
				Key Benefits
			</h2>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Benefit 1 -->
				<div
					class="transform rounded-lg bg-white p-8 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
				>
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10"
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
						Save Time & Resources
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Automate the tedious and error-prone process of data reconciliation. What used to take
						days now takes minutes. Our powerful engine processes vast datasets quickly and
						accurately, freeing your team to focus on what matters.
					</p>
				</div>

				<!-- Benefit 2 -->
				<div
					class="transform rounded-lg bg-white p-8 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
				>
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							/>
						</svg>
					</div>
					<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">Reduce Errors & Risk</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Manual data reconciliation is prone to human error. Our automated solution ensures
						accuracy and consistency, reducing operational risk. Pinpoint discrepancies instantly
						with our interactive failure analysis.
					</p>
				</div>

				<!-- Benefit 3 -->
				<div
					class="transform rounded-lg bg-white p-8 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
				>
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10"
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
						Gain Actionable Insights
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Go beyond simple matching with detailed analytics and reporting. Understand the patterns
						and root causes of data discrepancies. Turn reconciliation from a compliance exercise
						into a source of business intelligence.
					</p>
				</div>

				<!-- Benefit 4 -->
				<div
					class="transform rounded-lg bg-white p-8 shadow-lg transition duration-300 hover:scale-105 dark:bg-gray-800"
				>
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
							/>
						</svg>
					</div>
					<h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">
						Unmatched Flexibility
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Whether you're reconciling financial transactions, inventory data, or customer records,
						our platform adapts to your needs. Support for multiple file formats, custom mapping,
						and configurable matching rules gives you complete control.
					</p>
				</div>
			</div>
		</div>

		<!-- How It Works -->
		<div class="mx-auto mb-20 max-w-5xl">
			<h2 class="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
				How It Works
			</h2>

			<div class="relative">
				<!-- Progress Line -->
				<div
					class="absolute bottom-0 left-1/2 top-0 z-0 hidden w-1 -translate-x-1/2 transform bg-blue-200 md:block dark:bg-blue-900/50"
				></div>

				<!-- Step 1 -->
				<div class="relative z-10 mb-12 flex flex-col items-center md:flex-row">
					<div class="mb-6 md:mb-0 md:w-1/2 md:pr-12 md:text-right">
						<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Upload Your Files</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Simply drag and drop your files into our secure interface. We support CSV, Excel,
							JSON, and more formats.
						</p>
					</div>
					<div class="flex justify-center md:w-12">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-600 text-xl font-bold text-white dark:border-gray-800"
						>
							1
						</div>
					</div>
					<div class="hidden md:block md:w-1/2 md:pl-12">
						<div class="overflow-hidden rounded-lg bg-blue-50 shadow-md dark:bg-gray-800">
							<div class="p-1">
								<svg
									class="h-48 w-full"
									viewBox="0 0 300 150"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="300" height="150" fill="#F0F9FF" class="dark:fill-gray-700" />
									<rect
										x="50"
										y="35"
										width="200"
										height="80"
										rx="4"
										fill="#DBEAFE"
										class="dark:fill-gray-600"
										stroke="#3B82F6"
										stroke-width="2"
										stroke-dasharray="4 4"
									/>
									<path
										d="M150 75 L150 50 L180 75 L150 100 L150 75 L120 75 L150 75 Z"
										fill="#3B82F6"
									/>
									<text
										x="150"
										y="125"
										text-anchor="middle"
										font-size="14"
										font-family="sans-serif"
										fill="#3B82F6"
										class="dark:fill-blue-400">Drop files here</text
									>
								</svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="relative z-10 mb-12 flex flex-col items-center md:flex-row">
					<div class="hidden md:block md:w-1/2 md:pr-12">
						<div class="overflow-hidden rounded-lg bg-blue-50 shadow-md dark:bg-gray-800">
							<div class="p-1">
								<svg
									class="h-48 w-full"
									viewBox="0 0 300 150"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="300" height="150" fill="#F0F9FF" class="dark:fill-gray-700" />
									<rect
										x="40"
										y="30"
										width="100"
										height="90"
										rx="2"
										fill="white"
										class="dark:fill-gray-600"
										stroke="#3B82F6"
										stroke-width="1"
									/>
									<rect
										x="160"
										y="30"
										width="100"
										height="90"
										rx="2"
										fill="white"
										class="dark:fill-gray-600"
										stroke="#3B82F6"
										stroke-width="1"
									/>
									<line x1="90" y1="50" x2="150" y2="50" stroke="#3B82F6" stroke-width="2" />
									<line x1="90" y1="70" x2="150" y2="70" stroke="#3B82F6" stroke-width="2" />
									<line x1="90" y1="90" x2="150" y2="90" stroke="#3B82F6" stroke-width="2" />
									<circle cx="90" cy="50" r="5" fill="#3B82F6" />
									<circle cx="90" cy="70" r="5" fill="#3B82F6" />
									<circle cx="90" cy="90" r="5" fill="#3B82F6" />
									<circle cx="150" cy="50" r="5" fill="#3B82F6" />
									<circle cx="150" cy="70" r="5" fill="#3B82F6" />
									<circle cx="150" cy="90" r="5" fill="#3B82F6" />
								</svg>
							</div>
						</div>
					</div>
					<div class="flex justify-center md:w-12">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-600 text-xl font-bold text-white dark:border-gray-800"
						>
							2
						</div>
					</div>
					<div class="md:w-1/2 md:pl-12 md:text-left">
						<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Map Your Columns</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Our smart mapping interface suggests column matches based on headers and content.
							Easily drag and drop to create the perfect mapping.
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="relative z-10 mb-12 flex flex-col items-center md:flex-row">
					<div class="mb-6 md:mb-0 md:w-1/2 md:pr-12 md:text-right">
						<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">
							Watch the Reconciliation
						</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Our high-performance engine processes your data in real-time, showing you progress,
							matches, and discrepancies as they happen.
						</p>
					</div>
					<div class="flex justify-center md:w-12">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-600 text-xl font-bold text-white dark:border-gray-800"
						>
							3
						</div>
					</div>
					<div class="hidden md:block md:w-1/2 md:pl-12">
						<div class="overflow-hidden rounded-lg bg-blue-50 shadow-md dark:bg-gray-800">
							<div class="p-1">
								<svg
									class="h-48 w-full"
									viewBox="0 0 300 150"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="300" height="150" fill="#F0F9FF" class="dark:fill-gray-700" />
									<rect
										x="50"
										y="40"
										width="200"
										height="20"
										rx="5"
										fill="#E5E7EB"
										class="dark:fill-gray-600"
									/>
									<rect x="50" y="40" width="150" height="20" rx="5" fill="#3B82F6" />
									<text
										x="150"
										y="55"
										text-anchor="middle"
										font-size="12"
										font-family="sans-serif"
										fill="white">75% Complete</text
									>
									<rect
										x="50"
										y="80"
										width="200"
										height="40"
										rx="4"
										fill="white"
										class="dark:fill-gray-600"
										stroke="#3B82F6"
										stroke-width="1"
									/>
									<text
										x="150"
										y="105"
										text-anchor="middle"
										font-size="12"
										font-family="sans-serif"
										fill="#374151"
										class="dark:fill-gray-300">Processing: 75 of 100 rows</text
									>
								</svg>
							</div>
						</div>
					</div>
				</div>

				<!-- Step 4 -->
				<div class="relative z-10 flex flex-col items-center md:flex-row">
					<div class="hidden md:block md:w-1/2 md:pr-12">
						<div class="overflow-hidden rounded-lg bg-blue-50 shadow-md dark:bg-gray-800">
							<div class="p-1">
								<svg
									class="h-48 w-full"
									viewBox="0 0 300 150"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="300" height="150" fill="#F0F9FF" class="dark:fill-gray-700" />
									<rect
										x="30"
										y="30"
										width="240"
										height="90"
										rx="4"
										fill="white"
										class="dark:fill-gray-600"
										stroke="#D1D5DB"
										stroke-width="1"
									/>
									<rect x="40" y="40" width="60" height="15" rx="2" fill="#3B82F6" opacity="0.2" />
									<rect x="110" y="40" width="60" height="15" rx="2" fill="#3B82F6" opacity="0.2" />
									<rect x="180" y="40" width="60" height="15" rx="2" fill="#3B82F6" opacity="0.2" />
									<rect x="40" y="65" width="60" height="15" rx="2" fill="#EF4444" opacity="0.2" />
									<rect x="110" y="65" width="60" height="15" rx="2" fill="#EF4444" opacity="0.2" />
									<rect x="180" y="65" width="60" height="15" rx="2" fill="#EF4444" opacity="0.2" />
									<rect x="40" y="90" width="60" height="15" rx="2" fill="#10B981" opacity="0.2" />
									<rect x="110" y="90" width="60" height="15" rx="2" fill="#10B981" opacity="0.2" />
									<rect x="180" y="90" width="60" height="15" rx="2" fill="#10B981" opacity="0.2" />
								</svg>
							</div>
						</div>
					</div>
					<div class="flex justify-center md:w-12">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 bg-blue-600 text-xl font-bold text-white dark:border-gray-800"
						>
							4
						</div>
					</div>
					<div class="md:w-1/2 md:pl-12 md:text-left">
						<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Analyze and Export</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Dive deep into the results with our interactive analysis tools. Navigate through
							matches and discrepancies with ease. Export the results for further action.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Use Cases -->
		<div class="mx-auto mb-20 max-w-5xl">
			<h2 class="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
				Common Use Cases
			</h2>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				<!-- Use Case 1 -->
				<div class="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
					<div class="flex h-48 items-center justify-center bg-blue-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-24 w-24 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<div class="p-6">
						<h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
							Financial Reconciliation
						</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Reconcile bank statements, payment processors, and accounting systems. Ensure
							financial accuracy and identify discrepancies quickly.
						</p>
					</div>
				</div>

				<!-- Use Case 2 -->
				<div class="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
					<div class="flex h-48 items-center justify-center bg-green-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-24 w-24 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							/>
						</svg>
					</div>
					<div class="p-6">
						<h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
							Inventory Management
						</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Compare inventory records across warehouses, systems, and physical counts. Identify
							stock discrepancies and prevent shrinkage.
						</p>
					</div>
				</div>

				<!-- Use Case 3 -->
				<div class="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
					<div class="flex h-48 items-center justify-center bg-purple-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-24 w-24 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
					<div class="p-6">
						<h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">
							Customer Data Management
						</h3>
						<p class="text-gray-600 dark:text-gray-300">
							Compare customer records across CRM, marketing, and sales systems. Ensure data
							consistency and improve customer experience.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Testimonials -->
		<div class="mx-auto mb-20 max-w-5xl">
			<h2 class="mb-10 text-center text-3xl font-bold text-gray-900 dark:text-white">
				What Our Customers Say
			</h2>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
				<!-- Testimonial 1 -->
				<div class="relative rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
					<div class="absolute left-4 top-4 text-6xl text-blue-200 dark:text-blue-900/30">"</div>
					<div class="relative z-10">
						<p class="z-10 mb-6 text-gray-600 dark:text-gray-300">
							Reconcile has transformed how we handle our financial data matching. What used to take
							our team days to reconcile now takes just minutes, with far fewer errors. The
							interactive failure analysis is a game-changer for identifying discrepancies.
						</p>
						<div class="flex items-center">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								JD
							</div>
							<div class="ml-4">
								<h4 class="font-semibold text-gray-900 dark:text-white">Jane Doe</h4>
								<p class="text-sm text-gray-500 dark:text-gray-400">CFO, Financial Tech Inc.</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Testimonial 2 -->
				<div class="relative rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
					<div class="absolute left-4 top-4 text-6xl text-blue-200 dark:text-blue-900/30">"</div>
					<div class="relative z-10">
						<p class="mb-6 text-gray-600 dark:text-gray-300">
							Managing inventory across multiple warehouses used to be a nightmare. Reconcile's
							easy-to-use interface and powerful matching engine have made the process smooth and
							reliable. We now have confidence in our inventory numbers.
						</p>
						<div class="flex items-center">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
							>
								JS
							</div>
							<div class="ml-4">
								<h4 class="font-semibold text-gray-900 dark:text-white">John Smith</h4>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									Operations Manager, Global Retail
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA Section -->
		<div
			class="mx-auto mb-10 max-w-4xl rounded-xl bg-blue-600 p-10 text-center shadow-xl dark:bg-blue-700"
		>
			<h2 class="mb-4 text-3xl font-bold text-white">
				Ready to Transform Your Reconciliation Process?
			</h2>
			<p class="mx-auto mb-8 max-w-xl text-lg text-blue-100">
				Join thousands of companies who have simplified their data reconciliation with our powerful,
				easy-to-use platform.
			</p>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<button
					on:click={() => goto('/upload')}
					class="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition duration-300 hover:bg-gray-100"
				>
					Start Free Trial
				</button>
				<button
					on:click={() => goto('/pricing')}
					class="rounded-lg border border-white bg-transparent px-8 py-3 font-semibold text-white transition duration-300 hover:bg-blue-700"
				>
					View Pricing
				</button>
			</div>
		</div>

		<!-- FAQ -->
		<div class="mx-auto mb-20 max-w-3xl">
			<h2 class="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white">
				Frequently Asked Questions
			</h2>

			<div class="space-y-4">
				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						How secure is my data with Reconcile?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Your data security is our top priority. All processing happens in your browser, meaning
						your sensitive data never leaves your computer. For Enterprise plans with cloud
						processing, we use end-to-end encryption and comply with industry standards.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Can Reconcile handle large datasets?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Yes! Our platform uses advanced algorithms and parallel processing to handle datasets of
						any size efficiently. The Pro plan supports up to 100,000 rows, while our Enterprise
						plan offers unlimited capacity.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Do you offer custom solutions for specific industries?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Absolutely. Our Enterprise plan includes custom reconciliation rules tailored to your
						industry. Whether you're in finance, retail, healthcare, or any other sector, we can
						adapt our solution to meet your specific requirements.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
