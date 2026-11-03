<script lang="ts">
	import PricingSystemIntegrationPanel from './PricingSystemIntegrationPanel.svelte';
</script>

<div class="mb-16 bg-gray-50 px-4 py-16 dark:bg-gray-800">
	<div class="mx-auto max-w-5xl">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
				One Single Solution for Many Business Challenges
			</h2>
			<p class="text-lg text-gray-600 dark:text-gray-300">
				Web-based and works with any ERP, accounting system, and external data sources
			</p>
		</div>

		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Bank Reconciliation</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Universal tool for any industry and business size</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Match bank statements with internal financial records</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Handle high transaction volumes and varied formats</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-blue-600 dark:text-blue-400">✓</span>
						<span>Support multi-currency and complex matching (1-to-many, many-to-many)</span>
					</li>
				</ul>
			</div>

			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
					Credit Card Reconciliation
				</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Multi-stepped matching for any process</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Reconcile statements, payment gateways, and GL accounts</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Handle POS, e-commerce, and expense management</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-green-600 dark:text-green-400">✓</span>
						<span>Process corporate credit cards and employee expenses</span>
					</li>
				</ul>
			</div>

			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">AP/AR Reconciliation</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>One centralized platform for AP and AR</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Seamless invoice and payment matching</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Reconcile vendor statements with payables</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-purple-600 dark:text-purple-400">✓</span>
						<span>Auto-match incoming payments to open invoices</span>
					</li>
				</ul>
			</div>

			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
					Securities, Positions & Trades
				</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Intraday positions reconciliation</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Match ledgers against counterparty records</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Automated break identification and resolution</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-orange-600 dark:text-orange-400">✓</span>
						<span>Ensure regulatory compliance and contract obligations</span>
					</li>
				</ul>
			</div>

			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
					Financial Close Management
				</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Centralized repository for balance sheet reconciliations</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Fully auditable attestation and approval workflow</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Period-end close checklist and automation</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-red-600 dark:text-red-400">✓</span>
						<span>Variance analysis against previous periods</span>
					</li>
				</ul>
			</div>

			<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-700">
				<h3 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">
					Intercompany Reconciliation
				</h3>
				<ul class="space-y-3 text-gray-700 dark:text-gray-300">
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Automated matching with configurable rules</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Real-time exception management</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Support multiple GL and accounting systems</span>
					</li>
					<li class="flex items-start">
						<span class="mr-3 text-indigo-600 dark:text-indigo-400">✓</span>
						<span>Unified reporting across subsidiaries</span>
					</li>
				</ul>
			</div>
		</div>

		<PricingSystemIntegrationPanel />
	</div>
</div>
