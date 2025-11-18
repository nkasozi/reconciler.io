<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import WaitlistModal from '$lib/components/WaitlistModal.svelte';

	injectAnalytics();

	let { children } = $props();
	let mobileNavOpen = $state(false);
	let showComingSoonModal = $state(false);
	let showWaitlistModal = $state(false);

	onMount(() => {
		console.log('Layout component mounted');

		// Add a global click handler to diagnose if clicks are being registered
		document.addEventListener('click', (e) => {
			console.log('Document click detected:', e.target);
		});
	});

	function toggleMobileNav() {
		console.log('toggleMobileNav function called - BEFORE:', mobileNavOpen);
		mobileNavOpen = !mobileNavOpen;
		console.log('toggleMobileNav function called - AFTER:', mobileNavOpen);
	}

	function openMobileNav() {
		console.log('openMobileNav called');
		mobileNavOpen = true;
	}

	function closeMobileNav() {
		console.log('closeMobileNav called');
		mobileNavOpen = false;
	}

	function showComingSoon(event) {
		event.preventDefault();
		showComingSoonModal = true;
	}

	function closeComingSoon() {
		showComingSoonModal = false;
	}

	function openWaitlistModal(event) {
		event.preventDefault();
		showWaitlistModal = true;
	}
</script>

<!-- Main layout with navigation -->
<div class="min-h-screen overflow-x-hidden bg-gray-900 text-white">
	<!-- Navigation -->
	<nav class="mx-auto w-full max-w-xl pt-8 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
		<div class="container px-8 py-2 lg:px-0">
			<!-- Desktop Navigation (lg:block) - Hidden on tablets -->
			<nav class="relative hidden items-center justify-between sm:h-10 lg:flex lg:justify-center">
				<div class="flex flex-1 items-center lg:absolute lg:inset-y-0 lg:left-0">
					<div class="flex w-full items-center justify-between lg:w-auto">
						<a href="/" title="Finance Reconciliation tool">
							<span class="text-2xl font-extrabold tracking-tight text-blue-500">Reconciler</span>
							<span class="text-2xl tracking-tight text-green-500">.io</span>
						</a>
					</div>
				</div>
				<div class="block">
					<a
						href="/"
						class="ml-8 font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Home</a
					>
					<a
						href="/features"
						class="ml-8 font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Features</a
					>
					<a
						href="/pricing"
						class="ml-8 font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Pricing</a
					>
					<a
						href="/why-reconcile"
						class="ml-8 font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Why Reconcile?</a
					>
				</div>
				<div class="lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:items-center lg:justify-end">
					<ul class="flex">
						<li class="mb-3 block py-2 lg:mb-0 lg:px-4">
							<button
								type="button"
								title="Login"
								class="text-white transition-colors hover:text-blue-400"
								on:click={openWaitlistModal}
							>
								Login
							</button>
						</li>
						<li class="block py-2">
							<button
								type="button"
								title="Sign Up"
								class="mt-12 rounded border border-red-400 bg-red-400 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-600 hover:text-white lg:px-2 lg:py-2 lg:text-sm xl:px-4 xl:py-3 xl:text-base"
								on:click={openWaitlistModal}
							>
								Sign Up
							</button>
						</li>
					</ul>
				</div>
			</nav>

			<!-- Tablet Navigation (md:flex lg:hidden) - Simplified layout for tablets -->
			<nav class="relative hidden items-center justify-between sm:h-10 md:flex lg:hidden">
				<div class="flex items-center">
					<a href="/" title="Finance Reconciliation tool" class="mr-8">
						<span class="text-xl font-extrabold tracking-tight text-blue-500">Reconciler</span>
						<span class="text-xl tracking-tight text-green-500">.io</span>
					</a>
				</div>
				<div class="flex items-center space-x-4">
					<a
						href="/"
						class="text-sm font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Home</a
					>
					<a
						href="/features"
						class="text-sm font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Features</a
					>
					<a
						href="/pricing"
						class="text-sm font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Pricing</a
					>
					<a
						href="/why-reconcile"
						class="hidden text-sm font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none xl:inline dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
						>Why Reconcile?</a
					>
				</div>
				<div class="flex items-center space-x-2">
					<button
						type="button"
						title="Login"
						class="text-sm text-white transition-colors hover:text-blue-400"
						on:click={openWaitlistModal}
					>
						Login
					</button>
					<button
						type="button"
						title="Sign Up"
						class="rounded border border-red-400 bg-red-400 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-red-600 hover:text-white"
						on:click={openWaitlistModal}
					>
						Sign Up
					</button>
				</div>
			</nav>

			<!-- Mobile Navigation -->
			<nav class="relative flex items-center justify-between sm:h-10 md:hidden">
				<div class="flex flex-1 items-center">
					<div class="flex w-full items-center justify-between">
						<a href="/" title="Finance Reconciliation tool">
							<span class="text-2xl font-extrabold tracking-tight text-blue-500">Reconciler</span>
							<span class="text-2xl tracking-tight text-green-500">.io</span>
						</a>
						<div class="-mr-2 flex items-center">
							<!-- Mobile menu button -->
							<button
								type="button"
								class="cursor-pointer px-2 text-white hover:text-red-500 focus:text-red-500 focus:outline-none"
								aria-label="Toggle mobile menu"
								on:click={() => {
									console.log('Menu button clicked');
									toggleMobileNav();
								}}
							>
								<svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6h16M4 12h16M4 18h16"
									/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			</nav>
		</div>

		<!-- Mobile navigation menu -->
		{#if mobileNavOpen}
			<div class="absolute inset-x-0 top-0 z-[9999] p-2 md:hidden">
				<div class="origin-top-right transform rounded-lg shadow-md transition">
					<div class="shadow-xs overflow-hidden rounded-lg bg-gray-800">
						<div class="flex items-center justify-between px-5 pt-4">
							<div>
								<a href="/" title="Transactions Reconciliation tool">
									<span class="text-2xl font-extrabold tracking-tight text-blue-500"
										>Reconciler</span
									>
									<span class="text-2xl tracking-tight text-green-500">.io</span>
								</a>
							</div>
							<div class="-mr-2">
								<!-- Close menu button -->
								<button
									type="button"
									class="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
									aria-label="Close mobile menu"
									on:click={() => {
										console.log('Close button clicked');
										closeMobileNav();
									}}
								>
									<svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>
						<div class="px-2 pb-3 pt-2">
							<a
								href="/"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
							>
								Home
							</a>
							<a
								href="/features"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
							>
								Features
							</a>
							<a
								href="/pricing"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
							>
								Pricing
							</a>
							<a
								href="/why-reconcile"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
							>
								Why Reconcile?
							</a>
						</div>
						<div>
							<button
								type="button"
								class="block w-full bg-gray-700 px-5 py-3 text-center font-medium text-white transition duration-150 ease-in-out hover:bg-gray-600 hover:text-white focus:outline-none"
								on:click={openWaitlistModal}
							>
								Login
							</button>
							<button
								type="button"
								class="block w-full bg-red-400 px-5 py-3 text-center font-medium text-white transition duration-150 ease-in-out hover:bg-red-600 hover:text-white focus:outline-none"
								on:click={openWaitlistModal}
							>
								Sign Up
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</nav>
	<!-- End of navigation -->

	<!-- Main content -->
	{@render children()}

	<!-- Coming Soon Modal -->
	{#if showComingSoonModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
			on:click={closeComingSoon}
		>
			<div class="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-2xl" on:click|stopPropagation>
				<div class="mb-6 text-center">
					<!-- Icon -->
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600"
					>
						<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
					</div>

					<!-- Title -->
					<h3 class="mb-2 text-xl font-bold text-white">Coming Soon!</h3>

					<!-- Message -->
					<p class="text-gray-300">
						We're working on something exciting for you!
						<br /><br />
						<span class="text-blue-400">Great things are on the way.</span>
					</p>
				</div>

				<!-- Action buttons -->
				<div class="flex justify-center space-x-3">
					<button
						type="button"
						on:click={closeComingSoon}
						class="rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition duration-200 hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
					>
						Got it
					</button>
					<button
						type="button"
						on:click={closeComingSoon}
						class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition duration-200 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
					>
						Continue browsing
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Decorative circles -->
	<div class="home-page-circle-1"></div>
	<div class="home-page-circle-2"></div>
	<div class="home-page-circle-3"></div>
	<div class="right_bottom_circle"></div>
</div>

<!-- Waitlist Modal -->
<WaitlistModal bind:isOpen={showWaitlistModal} />

<style>
	/* Decorative circles styling - adding pointer-events: none to allow clicks to pass through */
	.home-page-circle-1,
	.home-page-circle-2,
	.home-page-circle-3,
	.right_bottom_circle {
		position: absolute;
		border-radius: 50%;
		z-index: -1;
		pointer-events: none; /* This prevents the circles from intercepting clicks */
	}

	.home-page-circle-1 {
		width: 400px;
		height: 400px;
		left: -200px;
		top: -100px;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-1 15s ease-in-out infinite alternate;
	}

	.home-page-circle-2 {
		width: 600px;
		height: 600px;
		right: -300px;
		top: -200px;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-2 20s ease-in-out infinite alternate;
	}

	.home-page-circle-3 {
		width: 300px;
		height: 300px;
		left: 10%;
		bottom: 10%;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-3 12s ease-in-out infinite alternate;
	}

	.right_bottom_circle {
		width: 200px;
		height: 200px;
		right: 5%;
		bottom: 5%;
		background: rgb(255 255 255 / 0.05);
		animation: pulse-4 18s ease-in-out infinite alternate;
	}

	@keyframes pulse-1 {
		0% {
			transform: scale(1);
			opacity: 0.05;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.08;
		}
		100% {
			transform: scale(1);
			opacity: 0.05;
		}
	}

	@keyframes pulse-2 {
		0% {
			transform: scale(1);
			opacity: 0.04;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.07;
		}
		100% {
			transform: scale(1);
			opacity: 0.04;
		}
	}

	@keyframes pulse-3 {
		0% {
			transform: scale(1);
			opacity: 0.06;
		}
		50% {
			transform: scale(1.15);
			opacity: 0.09;
		}
		100% {
			transform: scale(1);
			opacity: 0.06;
		}
	}

	@keyframes pulse-4 {
		0% {
			transform: scale(1);
			opacity: 0.05;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.08;
		}
		100% {
			transform: scale(1);
			opacity: 0.05;
		}
	}
</style>
