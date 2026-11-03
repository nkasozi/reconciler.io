<script lang="ts">
	type BrandLogoProps = {
		size?: 'small' | 'large';
	};

	let { size = 'large' }: BrandLogoProps = $props();
	let markSizeClass = $derived(size === 'large' ? 'h-9 w-9' : 'h-8 w-8');
	let wordmarkSizeClass = $derived(size === 'large' ? 'text-2xl' : 'text-xl');
</script>

<span class="brand-logo group inline-flex items-center gap-2.5" aria-label="Reconciler.io">
	<svg class="{markSizeClass} shrink-0 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-105" viewBox="0 0 36 36" aria-hidden="true">
		<rect width="36" height="36" rx="8" class="fill-blue-500" />
		<rect x="7" y="9" width="8" height="3" rx="1.5" class="fill-white" />
		<rect x="7" y="16.5" width="8" height="3" rx="1.5" class="fill-white" />
		<rect x="7" y="24" width="8" height="3" rx="1.5" class="fill-white" />
		<rect x="21" y="9" width="8" height="3" rx="1.5" class="fill-white" />
		<rect x="21" y="16.5" width="8" height="3" rx="1.5" class="fill-white" />
		<rect x="21" y="24" width="8" height="3" rx="1.5" class="fill-white" />
		<circle cx="18" cy="18" r="7.5" class="fill-green-500 stroke-blue-500" stroke-width="2.5" />
		<path d="M14.6 18.2 l2.4 2.4 l4.4 -4.8" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="brand-check stroke-white" pathLength="1" />
	</svg>
	<span class="{wordmarkSizeClass} font-extrabold leading-none tracking-tight text-white">Reconciler<span class="text-green-400">.io</span></span>
</span>

<style>
	.brand-check {
		stroke-dasharray: 1;
		stroke-dashoffset: 0;
	}
	.brand-logo:hover .brand-check {
		animation: redraw-check 0.6s cubic-bezier(0.22, 1, 0.36, 1);
	}
	@keyframes redraw-check {
		from { stroke-dashoffset: 1; }
		to { stroke-dashoffset: 0; }
	}
</style>
