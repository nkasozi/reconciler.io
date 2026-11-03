<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';

	interface TabletNavigationBarProperties {
		onOpenWaitlistModal: (event: MouseEvent) => void;
	}

	let { onOpenWaitlistModal }: TabletNavigationBarProperties = $props();
</script>

<nav class="relative hidden items-center justify-between sm:h-10 md:flex lg:hidden">
	<div class="flex items-center">
		<a href="/" title="Finance Reconciliation tool" class="mr-8">
			<BrandLogo size="small" />
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
			on:click={onOpenWaitlistModal}
		>
			Login
		</button>
		<button
			type="button"
			title="Sign Up"
			class="rounded border border-red-400 bg-red-400 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-red-600 hover:text-white"
			on:click={onOpenWaitlistModal}
		>
			Sign Up
		</button>
	</div>
</nav>
