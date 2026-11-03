<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';

	interface DesktopNavigationBarProperties {
		onOpenWaitlistModal: (event: MouseEvent) => void;
	}

	let { onOpenWaitlistModal }: DesktopNavigationBarProperties = $props();
</script>

<nav class="relative hidden items-center justify-between sm:h-10 lg:flex lg:justify-center">
	<div class="flex flex-1 items-center lg:absolute lg:inset-y-0 lg:left-0">
		<div class="flex w-full items-center justify-between lg:w-auto">
			<a href="/" title="Finance Reconciliation tool">
				<BrandLogo size="large" />
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
			href="/why-reconcile"
			class="ml-8 font-medium text-blue-500 transition duration-150 ease-in-out hover:text-blue-600 focus:text-blue-600 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300 dark:focus:text-blue-300"
			>Why Reconcile?</a
		>
	</div>
	<div class="lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:items-center lg:justify-end">
		<ul class="flex items-center">
			<li class="mb-3 block py-2 lg:mb-0 lg:px-4">
				<button
					type="button"
					title="Login"
					class="text-white transition-colors hover:text-blue-400"
					on:click={onOpenWaitlistModal}
				>
					Login
				</button>
			</li>
			<li class="block py-2">
				<button
					type="button"
					title="Sign Up"
					class="rounded border border-red-400 bg-red-400 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-600 hover:text-white lg:mt-0 lg:px-2 lg:py-2 lg:text-sm xl:px-4 xl:py-3 xl:text-base"
					on:click={onOpenWaitlistModal}
				>
					Sign Up
				</button>
			</li>
		</ul>
	</div>
</nav>
