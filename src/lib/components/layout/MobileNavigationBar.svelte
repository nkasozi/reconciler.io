<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';

	interface MobileNavigationBarProperties {
		onToggleMobileNavigation: () => void;
	}

	let { onToggleMobileNavigation }: MobileNavigationBarProperties = $props();
</script>

<nav class="relative flex items-center justify-between sm:h-10 md:hidden">
	<div class="flex flex-1 items-center">
		<div class="flex w-full items-center justify-between">
			<a href="/" title="Finance Reconciliation tool">
				<BrandLogo size="large" />
			</a>
			<div class="-mr-2 flex items-center">
				<button
					type="button"
					class="cursor-pointer px-2 text-white hover:text-red-500 focus:text-red-500 focus:outline-none"
					aria-label="Toggle mobile menu"
					on:click={() => {
						console.log('Menu button clicked');
						onToggleMobileNavigation();
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
