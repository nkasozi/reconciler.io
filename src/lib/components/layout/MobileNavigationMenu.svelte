<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';

	interface MobileNavigationMenuProperties {
		onCloseMobileNavigation: () => void;
		onMobileNavigationLinkClick: () => void;
		onOpenWaitlistFromMobileNavigation: (event: MouseEvent) => void;
	}

	let {
		onCloseMobileNavigation,
		onMobileNavigationLinkClick,
		onOpenWaitlistFromMobileNavigation
	}: MobileNavigationMenuProperties = $props();
</script>

<div class="absolute inset-x-0 top-0 z-[9999] p-2 md:hidden">
	<div class="origin-top-right transform rounded-lg shadow-md transition">
		<div class="overflow-hidden rounded-lg bg-gray-800 shadow-xs">
			<div class="flex items-center justify-between px-5 pt-4">
				<div>
					<a href="/" title="Transactions Reconciliation tool">
						<BrandLogo size="large" />
					</a>
				</div>
				<div class="-mr-2">
					<button
						type="button"
						class="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none"
						aria-label="Close mobile menu"
						on:click={() => {
							console.log('Close button clicked');
							onCloseMobileNavigation();
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
					href="/"
					class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
					on:click={onMobileNavigationLinkClick}
				>
					Home
				</a>
				<a
					href="/features"
					class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
					on:click={onMobileNavigationLinkClick}
				>
					Features
				</a>
				<a
					href="/pricing"
					class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
					on:click={onMobileNavigationLinkClick}
				>
					Pricing
				</a>
				<a
					href="/why-reconcile"
					class="mt-1 block rounded-md px-3 py-2 text-base font-medium text-blue-500 transition duration-150 ease-in-out hover:bg-gray-700 hover:text-blue-300 focus:bg-gray-700 focus:text-blue-300 focus:outline-none"
					on:click={onMobileNavigationLinkClick}
				>
					Why Reconcile?
				</a>
			</div>
			<div>
				<button
					type="button"
					class="block w-full bg-gray-700 px-5 py-3 text-center font-medium text-white transition duration-150 ease-in-out hover:bg-gray-600 hover:text-white focus:outline-none"
					on:click={onOpenWaitlistFromMobileNavigation}
				>
					Login
				</button>
				<button
					type="button"
					class="block w-full bg-red-400 px-5 py-3 text-center font-medium text-white transition duration-150 ease-in-out hover:bg-red-600 hover:text-white focus:outline-none"
					on:click={onOpenWaitlistFromMobileNavigation}
				>
					Sign Up
				</button>
			</div>
		</div>
	</div>
</div>
