<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';

	let isAnnual = $state(false); // Default to monthly
	let isHoveredPro = $state(false);
	let isHoveredEnterprise = $state(false);
	let upgradeNotice = $state<string | null>(null);

	// Check for upgrade prompt from file upload
	onMount(() => {
		// Get the upgrade reason from session storage
		const reason = sessionStorage.getItem('upgrade_reason');
		if (reason) {
			upgradeNotice = reason;
			// Highlight the Pro tier
			isHoveredPro = true;
			setTimeout(() => {
				// Reset the highlighting after 3 seconds
				isHoveredPro = false;
			}, 3000);
		}
	});

	onDestroy(() => {
		// Clear the upgrade reason when navigating away
		sessionStorage.removeItem('upgrade_reason');
	});

	function switchBilling() {
		console.log('Switch billing clicked, current isAnnual:', isAnnual);
		isAnnual = !isAnnual;
		console.log('After toggle, isAnnual:', isAnnual);
	}

	function getPrice(monthly: number): string {
		if (isAnnual) {
			return `$${(monthly * 10).toFixed(0)}`;
		}
		return `$${monthly}`;
	}

	function getPeriod(): string {
		return isAnnual ? '/year' : '/month';
	}

	function contactEmail() {
		window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Pro%20Trial%20Request';
	}

	function contactSales() {
		window.location.href = 'mailto:nkasozi@gmail.com?subject=Reconciler%20Enterprise%20Inquiry';
	}
</script>

<svelte:head>
	<title>Pricing | Reconcile - Data Reconciliation Made Simple</title>
	<meta
		name="description"
		content="Simple, transparent pricing for all your data reconciliation needs."
	/>
</svelte:head>

<div class="bg-blue-50 py-16 dark:bg-gray-900">
	<div class="container mx-auto px-4">
		<!-- Upgrade notice -->
		{#if upgradeNotice}
			<div class="mx-auto mb-8 max-w-3xl">
				<div class="rounded border-l-4 border-yellow-500 bg-yellow-100 p-4 dark:bg-yellow-900/30">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg
								class="h-5 w-5 text-yellow-500"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm text-yellow-800 dark:text-yellow-200">{upgradeNotice}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div class="mb-16 text-center">
			<h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
				Simple, Transparent <span class="text-blue-600 dark:text-blue-400">Pricing</span>
			</h1>
			<p class="mx-auto max-w-3xl text-xl text-gray-600 dark:text-gray-300">
				Choose the plan that works best for your reconciliation needs
			</p>

			<!-- Billing toggle -->
			<div class="mt-8 flex items-center justify-center">
				<span
					class={`text-sm ${!isAnnual ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
					>Monthly</span
				>
				<button
					class="relative mx-4 flex h-6 w-12 items-center rounded-full bg-blue-600 px-0.5 dark:bg-blue-500"
					on:click={switchBilling}
					aria-label={isAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'}
				>
					<span
						class={`absolute h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`}
					></span>
				</button>
				<span
					class={`text-sm ${isAnnual ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
				>
					Annual <span class="ml-1 font-medium text-green-500">Save 15%</span>
				</span>
			</div>
		</div>

		<!-- Pricing Cards -->
		<div class="mx-auto mb-16 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
			<!-- Free Tier -->
			<div
				class="overflow-hidden rounded-lg border border-transparent bg-white shadow-lg transition-all duration-300 dark:bg-gray-800"
			>
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Free</h3>
					<div class="mb-4 flex items-end gap-1">
						<span class="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
						<span class="pb-1 text-gray-500 dark:text-gray-400">forever</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						Perfect for occasional reconciliation tasks
					</p>
				</div>
				<div class="p-6">
					<ul class="space-y-3">
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Upload & reconcile up to 10,000 rows</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Basic column mapping</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">CSV & Excel support</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Basic reconciliation reporting</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-500 dark:text-gray-400">Advanced analysis features</span>
						</li>
					</ul>
					<button
						on:click={() => goto('/upload')}
						class="mt-8 w-full rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 transition duration-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
					>
						Get Started
					</button>
				</div>
			</div>

			<!-- Pro Tier -->
			<div
				class={`transform overflow-hidden rounded-lg bg-white shadow-xl transition-all duration-300 dark:bg-gray-800 ${isHoveredPro ? 'scale-105' : ''} border-2 border-blue-500`}
				on:mouseenter={() => (isHoveredPro = true)}
				on:mouseleave={() => (isHoveredPro = false)}
			>
				<div class="bg-blue-500 px-4 py-2 text-center text-sm font-semibold text-white">
					MOST POPULAR
				</div>
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Pro</h3>
					<div class="mb-4 flex items-end gap-1">
						<span class="text-4xl font-bold text-gray-900 dark:text-white">{getPrice(5)}</span>
						<span class="pb-1 text-gray-500 dark:text-gray-400">{getPeriod()}</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						For teams that need advanced features
					</p>
				</div>
				<div class="p-6">
					<ul class="space-y-3">
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Up to 100,000 rows per file</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Advanced column mapping</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Support for all file formats</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Interactive failure analysis</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Reverse reconciliation</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Duplicate handling in comparison files</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Continuous comparison after failures</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Results history</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Priority email support</span>
						</li>
					</ul>
					<button
						on:click={contactEmail}
						class="mt-8 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition duration-300 hover:bg-blue-700"
					>
						Start Pro Trial
					</button>
				</div>
			</div>

			<!-- Enterprise Tier -->
			<div
				class={`overflow-hidden rounded-lg border border-transparent bg-white shadow-lg transition-all duration-300 dark:bg-gray-800 ${isHoveredEnterprise ? 'scale-105' : ''}`}
				on:mouseenter={() => (isHoveredEnterprise = true)}
				on:mouseleave={() => (isHoveredEnterprise = false)}
			>
				<div class="border-b border-gray-200 p-6 dark:border-gray-700">
					<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Enterprise</h3>
					<div class="mb-4 flex items-end gap-1">
						<span class="text-4xl font-bold text-gray-900 dark:text-white">{getPrice(10)}</span>
						<span class="pb-1 text-gray-500 dark:text-gray-400">{getPeriod()}</span>
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-300">
						For organizations with complex reconciliation needs
					</p>
				</div>
				<div class="p-6">
					<ul class="space-y-3">
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Unlimited rows and file size</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Custom reconciliation rules</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">API access & integrations</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Advanced reconciliation analytics</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Multiple concurrent reconciliations</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Reconciliation categories with alerts</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300"
								>Advanced configuration options</span
							>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Multi-user notifications</span>
						</li>
						<li class="flex items-start">
							<svg
								class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="ml-2 text-gray-600 dark:text-gray-300">Dedicated account manager</span>
						</li>
					</ul>
					<button
						on:click={contactSales}
						class="mt-8 w-full rounded-lg bg-gray-800 px-4 py-3 font-medium text-white transition duration-300 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						Contact Sales
					</button>
				</div>
			</div>
		</div>

		<!-- Feature Comparison Table -->
		<div
			class="mx-auto mb-16 max-w-5xl overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800"
		>
			<div class="border-b border-gray-200 p-6 dark:border-gray-700">
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Feature Comparison</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="bg-gray-50 dark:bg-gray-700">
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
								>Feature</th
							>
							<th
								class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
								>Free</th
							>
							<th
								class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400"
								>Pro</th
							>
							<th
								class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300"
								>Enterprise</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Maximum rows</td>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300">10,000</td>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300">100,000</td
							>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300"
								>Unlimited</td
							>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">File formats</td>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300"
								>CSV, Excel</td
							>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300"
								>All formats</td
							>
							<td class="px-6 py-4 text-center text-sm text-gray-700 dark:text-gray-300"
								>All formats + Custom</td
							>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
								>Interactive failure analysis</td
							>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Advanced reporting</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
								>Reverse reconciliation</td
							>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Duplicate handling</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Results history</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
								>Multiple concurrent reconciliations</td
							>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">API access</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300"
								>Advanced configuration options</td
							>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
						<tr>
							<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Priority support</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-red-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
							<td class="px-6 py-4 text-center">
								<svg
									class="mx-auto h-5 w-5 text-green-500"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- FAQ Section -->
		<div class="mx-auto mb-16 max-w-3xl">
			<h2 class="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white">
				Frequently Asked Questions
			</h2>

			<div class="space-y-4">
				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Can I upgrade or downgrade my plan at any time?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Yes, you can upgrade or downgrade your subscription at any time. When upgrading, you'll
						get immediate access to the new features. When downgrading, the changes will take effect
						at the end of your current billing cycle.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Is there a money-back guarantee?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Yes, we offer a 14-day money-back guarantee for all paid plans. If you're not satisfied
						with our service within the first 14 days of your subscription, you can request a full
						refund, no questions asked.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Do you offer custom pricing for larger teams?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Yes, we offer custom pricing for teams with specific needs. Please contact our sales
						team to discuss your requirements and get a tailored quote. Enterprise plans can include
						additional features like reconciliation categories with alerts, multi-user
						notifications, and advanced configuration options.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						Is my data secure?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Absolutely. All data processing happens locally in your browser, ensuring maximum
						privacy. We do not store or transmit your data to our servers. For Enterprise plans with
						cloud processing, we use industry-standard encryption and security practices.
					</p>
				</div>

				<div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
					<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
						What are the advanced features in the Pro and Enterprise plans?
					</h3>
					<p class="text-gray-600 dark:text-gray-300">
						Pro plans include powerful features like reverse reconciliation, duplicate handling in
						comparison files, continuous comparison after failures, and results history. Enterprise
						adds even more capabilities like multiple concurrent reconciliations, reconciliation
						categories with alerts, advanced configuration options (case sensitivity, whitespace
						preservation, auto column combining), and multi-user notifications for team
						collaboration.
					</p>
				</div>
			</div>
		</div>

		<!-- CTA Section -->
		<div class="text-center">
			<h2 class="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
				Ready to transform your data reconciliation?
			</h2>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<button
					on:click={() => goto('/upload')}
					class="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white transition duration-300 hover:bg-blue-700"
				>
					Start Free Trial
				</button>
				<button
					on:click={contactSales}
					class="rounded-lg border border-blue-600 bg-white px-8 py-3 font-semibold text-blue-600 transition duration-300 hover:bg-gray-100 dark:border-blue-400 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700"
				>
					Contact Sales
				</button>
			</div>
		</div>
	</div>
</div>
