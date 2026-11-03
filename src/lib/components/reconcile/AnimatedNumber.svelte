<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { Tween } from 'svelte/motion';
	import { formatAmountForDisplay } from '$lib/engine/amountParser';
	import { isMotionReduced } from './motion';

	type AnimatedNumberProps = { targetValue: number; displayStyle?: 'count' | 'amount'; delayInMilliseconds?: number };

	let { targetValue, displayStyle = 'count', delayInMilliseconds = 0 }: AnimatedNumberProps = $props();
	const animatedValue = new Tween(0, { duration: 900, easing: cubicOut });

	$effect(() => {
		const nextValue = targetValue;
		const startTimer = setTimeout(() => animatedValue.set(nextValue, { duration: isMotionReduced() ? 0 : 900 }), delayInMilliseconds);
		return () => clearTimeout(startTimer);
	});

	let displayedText = $derived(displayStyle === 'amount' ? formatAmountForDisplay(Math.round(animatedValue.current * 100) / 100) : Math.round(animatedValue.current).toLocaleString());
</script>

<span class="tabular-nums">{displayedText}</span>
