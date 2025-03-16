<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();
	let mobileNavOpen = $state(false);

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
</script>

<!-- Main layout with navigation -->
<div class="h-screen bg-white text-gray-700">
	<!-- Navigation -->
	<nav class="mx-auto w-full max-w-xl pt-8 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
		<div class="container px-8 py-2 lg:px-0">
			<nav class="relative flex items-center justify-between sm:h-10 md:justify-center">
				<div class="flex flex-1 items-center md:absolute md:inset-y-0 md:left-0">
					<div class="flex w-full items-center justify-between md:w-auto">
						<a href="/" title="Finance Reconciliation tool">
							<span class="text-2xl font-extrabold tracking-tight text-blue-500">Reconciler</span>
							<span class="text-2xl tracking-tight text-green-500">.io</span>
						</a>
						<div class="-mr-2 flex items-center md:hidden">
							<!-- Mobile menu button -->
							<button
								type="button"
								class="cursor-pointer px-2 text-gray-700 hover:text-red-500 focus:text-red-500 focus:outline-none"
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
				<div class="hidden md:block">
					<a
						href="/features"
						class="ml-8 font-medium text-gray-700 transition duration-150 ease-in-out hover:text-red-400 focus:text-red-400 focus:outline-none"
						>Features</a
					>
					<a
						href="/pricing"
						class="ml-8 font-medium text-gray-700 transition duration-150 ease-in-out hover:text-red-400 focus:text-red-400 focus:outline-none"
						>Pricing</a
					>
					<a
						href="/why-reconcile"
						class="ml-8 font-medium text-gray-700 transition duration-150 ease-in-out hover:text-red-400 focus:text-red-400 focus:outline-none"
						>Why Reconcile?</a
					>
					<a
						href="/blog"
						class="ml-8 font-medium text-gray-700 transition duration-150 ease-in-out hover:text-red-400 focus:text-red-400 focus:outline-none"
						>Blog</a
					>
				</div>
				<div
					class="hidden md:absolute md:inset-y-0 md:right-0 md:flex md:items-center md:justify-end"
				>
					<ul class="flex">
						<li class="mb-3 block py-2 lg:mb-0 lg:px-4">
							<a href="/login" title="Login" class="text-gray-700 hover:text-red-400">Login</a>
						</li>
						<li class="block py-2">
							<a
								href="/signup"
								title="Sign Up"
								class="mt-12 rounded border border-red-400 bg-red-400 px-4 py-3 font-semibold text-white hover:bg-red-600 hover:text-pink-100 lg:px-2 lg:py-2 lg:text-sm xl:px-4 xl:py-3 xl:text-base"
							>
								Sign Up
							</a>
						</li>
					</ul>
				</div>
			</nav>
		</div>

		<!-- Mobile navigation menu -->
		{#if mobileNavOpen}
			<div class="absolute inset-x-0 top-0 z-[9999] p-2 md:hidden">
				<div class="origin-top-right transform rounded-lg shadow-md transition">
					<div class="overflow-hidden rounded-lg bg-white shadow-xs">
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
									class="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-50 hover:text-gray-700 focus:bg-gray-50 focus:text-gray-700 focus:outline-none"
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
						<div class="px-2 pt-2 pb-3">
							<a
								href="/features"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-gray-50 hover:text-red-400 focus:bg-gray-50 focus:text-red-400 focus:outline-none"
							>
								Features
							</a>
							<a
								href="/pricing"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-gray-50 hover:text-red-400 focus:bg-gray-50 focus:text-red-400 focus:outline-none"
							>
								Pricing
							</a>
							<a
								href="/why-reconcile"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-gray-50 hover:text-red-400 focus:bg-gray-50 focus:text-red-400 focus:outline-none"
							>
								Why Reconcile?
							</a>
							<a
								href="/blog"
								class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-gray-50 hover:text-red-400 focus:bg-gray-50 focus:text-red-400 focus:outline-none"
							>
								Blog
							</a>
						</div>
						<div>
							<a
								href="/login"
								class="block w-full bg-gray-50 px-5 py-3 text-center font-medium text-gray-700 transition duration-150 ease-in-out hover:bg-red-600 hover:text-pink-100 focus:bg-gray-50 focus:text-indigo-700 focus:outline-none"
							>
								Login
							</a>
							<a
								href="/signup"
								class="block w-full bg-red-400 px-5 py-3 text-center font-medium text-white transition duration-150 ease-in-out hover:bg-red-600 hover:text-pink-100 focus:bg-gray-50 focus:text-indigo-700 focus:outline-none"
							>
								Sign Up
							</a>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</nav>
	<!-- End of navigation -->

	<!-- Main content -->
	{@render children()}

	<!-- Decorative circles -->
	<div class="home-page-circle-1"></div>
	<div class="home-page-circle-2"></div>
	<div class="home-page-circle-3"></div>
	<div class="right_bottom_circle"></div>
</div>

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
		background: rgb(0 0 0 / 0.1);
		animation: pulse-1 15s ease-in-out infinite alternate;
	}

	.home-page-circle-2 {
		width: 600px;
		height: 600px;
		right: -300px;
		top: -200px;
		background: rgb(0 0 0 / 0.1);
		animation: pulse-2 20s ease-in-out infinite alternate;
	}

	.home-page-circle-3 {
		width: 300px;
		height: 300px;
		left: 10%;
		bottom: 10%;
		background: rgb(0 0 0 / 0.1);
		animation: pulse-3 12s ease-in-out infinite alternate;
	}

	.right_bottom_circle {
		width: 200px;
		height: 200px;
		right: 5%;
		bottom: 5%;
		background: rgb(20 20 20 / 0.1);
		animation: pulse-4 18s ease-in-out infinite alternate;
	}

	@keyframes pulse-1 {
		0% {
			transform: scale(1);
			opacity: 0.1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.15;
		}
		100% {
			transform: scale(1);
			opacity: 0.1;
		}
	}

	@keyframes pulse-2 {
		0% {
			transform: scale(1);
			opacity: 0.08;
		}
		50% {
			transform: scale(1.05);
			opacity: 0.12;
		}
		100% {
			transform: scale(1);
			opacity: 0.08;
		}
	}

	@keyframes pulse-3 {
		0% {
			transform: scale(1);
			opacity: 0.12;
		}
		50% {
			transform: scale(1.15);
			opacity: 0.18;
		}
		100% {
			transform: scale(1);
			opacity: 0.12;
		}
	}

	@keyframes pulse-4 {
		0% {
			transform: scale(1);
			opacity: 0.1;
		}
		50% {
			transform: scale(1.2);
			opacity: 0.16;
		}
		100% {
			transform: scale(1);
			opacity: 0.1;
		}
	}
</style>
