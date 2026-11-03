<script lang="ts">
	import { isMotionReduced } from './motion';

	type ConfettiBurstProps = { burstKey: number; pieceCount?: number };
	type ConfettiPiece = { pieceId: string; colorClass: string; horizontalDrift: number; verticalLift: number; spinDegrees: number; delayInMilliseconds: number; widthInPixels: number; isRound: boolean };

	const SOLID_THEME_COLOR_CLASSES = ['bg-green-500', 'bg-blue-500', 'bg-green-400', 'bg-blue-400', 'bg-orange-400', 'bg-red-400', 'bg-white'];

	let { burstKey, pieceCount = 46 }: ConfettiBurstProps = $props();

	function buildConfettiPieces(currentBurstKey: number, numberOfPieces: number): ConfettiPiece[] {
		if (currentBurstKey === 0 || isMotionReduced()) return [];
		return Array.from({ length: numberOfPieces }, (_, pieceIndex) => {
			const launchAngle = (Math.PI * 2 * pieceIndex) / numberOfPieces + Math.random() * 0.5;
			const launchSpeed = 120 + Math.random() * 180;
			return {
				pieceId: `${currentBurstKey}-${pieceIndex}`,
				colorClass: SOLID_THEME_COLOR_CLASSES[pieceIndex % SOLID_THEME_COLOR_CLASSES.length],
				horizontalDrift: Math.cos(launchAngle) * launchSpeed,
				verticalLift: Math.sin(launchAngle) * launchSpeed - 140,
				spinDegrees: (Math.random() - 0.5) * 900,
				delayInMilliseconds: Math.random() * 120,
				widthInPixels: 6 + Math.random() * 6,
				isRound: pieceIndex % 3 === 0
			};
		});
	}

	let confettiPieces = $derived(buildConfettiPieces(burstKey, pieceCount));
</script>

<div class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-visible" aria-hidden="true">
	{#each confettiPieces as confettiPiece (confettiPiece.pieceId)}
		<span
			class="confetti-piece absolute {confettiPiece.colorClass} {confettiPiece.isRound ? 'rounded-full' : 'rounded-[1px]'}"
			style="--drift-x: {confettiPiece.horizontalDrift}px; --lift-y: {confettiPiece.verticalLift}px; --spin: {confettiPiece.spinDegrees}deg; animation-delay: {confettiPiece.delayInMilliseconds}ms; width: {confettiPiece.widthInPixels}px; height: {confettiPiece.isRound ? confettiPiece.widthInPixels : confettiPiece.widthInPixels * 1.8}px;"
		></span>
	{/each}
</div>

<style>
	.confetti-piece {
		opacity: 0;
		animation: confetti-flight 1.6s cubic-bezier(0.15, 0.7, 0.35, 1) forwards;
	}
	@keyframes confetti-flight {
		0% { opacity: 1; transform: translate(0, 0) rotate(0) scale(0.4); }
		35% { opacity: 1; transform: translate(calc(var(--drift-x) * 0.8), var(--lift-y)) rotate(calc(var(--spin) * 0.4)) scale(1); }
		100% { opacity: 0; transform: translate(var(--drift-x), calc(var(--lift-y) + 320px)) rotate(var(--spin)) scale(0.9); }
	}
</style>
