<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import WaitlistModal from '$lib/components/WaitlistModal.svelte';
	import DesktopNavigationBar from '$lib/components/layout/DesktopNavigationBar.svelte';
	import TabletNavigationBar from '$lib/components/layout/TabletNavigationBar.svelte';
	import MobileNavigationBar from '$lib/components/layout/MobileNavigationBar.svelte';
	import MobileNavigationMenu from '$lib/components/layout/MobileNavigationMenu.svelte';
	import ComingSoonModal from '$lib/components/layout/ComingSoonModal.svelte';
	import DecorativeBackgroundCircles from '$lib/components/layout/DecorativeBackgroundCircles.svelte';

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

	function showComingSoon(event: MouseEvent): void {
		event.preventDefault();
		showComingSoonModal = true;
	}

	function closeComingSoon() {
		showComingSoonModal = false;
	}

	function openWaitlistModal(event: MouseEvent): void {
		event.preventDefault();
		showWaitlistModal = true;
	}

	function openWaitlistFromMobile(event: MouseEvent): void {
		event.preventDefault();
		// Close mobile navigation first
		mobileNavOpen = false;
		// Then open waitlist modal
		showWaitlistModal = true;
	}

	function handleMobileNavClick() {
		// Close mobile navigation when any navigation link is clicked
		mobileNavOpen = false;
	}
</script>

<div class="relative min-h-screen overflow-x-clip bg-gray-900 text-white">
	<nav class="mx-auto w-full max-w-xl pt-8 md:max-w-2xl lg:max-w-4xl xl:max-w-5xl">
		<div class="container px-8 py-2 lg:px-0">
			<DesktopNavigationBar onOpenWaitlistModal={openWaitlistModal} />
			<TabletNavigationBar onOpenWaitlistModal={openWaitlistModal} />
			<MobileNavigationBar onToggleMobileNavigation={toggleMobileNav} />
		</div>

		{#if mobileNavOpen}
			<MobileNavigationMenu
				onCloseMobileNavigation={closeMobileNav}
				onMobileNavigationLinkClick={handleMobileNavClick}
				onOpenWaitlistFromMobileNavigation={openWaitlistFromMobile}
			/>
		{/if}
	</nav>

	{@render children()}

	{#if showComingSoonModal}
		<ComingSoonModal onCloseComingSoonModal={closeComingSoon} />
	{/if}

	<DecorativeBackgroundCircles />
</div>

<WaitlistModal bind:isOpen={showWaitlistModal} />
