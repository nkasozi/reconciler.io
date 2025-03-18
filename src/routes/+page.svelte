<script lang="ts">
	import { onMount } from 'svelte';

	let currentText = $state('');
	let phrases = ['Easy', 'Simple', 'Quick'];
	let currentPhraseIndex = 0;
	let isDeleting = $state(false);
	let loopNum = 0;
	let typingSpeed = $state(100);

	onMount(() => {
		typeText();
	});

	function typeText() {
		const currentPhrase = phrases[currentPhraseIndex];
		const fullText = currentPhrase;

		if (isDeleting) {
			// Deleting text
			currentText = fullText.substring(0, currentText.length - 1);
		} else {
			// Typing text
			currentText = fullText.substring(0, currentText.length + 1);
		}

		// Set typing speed
		typingSpeed = isDeleting ? 50 : 100;

		// Check if word is complete
		if (!isDeleting && currentText === fullText) {
			// Pause at end of word
			typingSpeed = 1500;
			isDeleting = true;
		} else if (isDeleting && currentText === '') {
			// Word is completely deleted
			isDeleting = false;
			currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
			typingSpeed = 500;
		}

		setTimeout(typeText, typingSpeed);
	}
</script>

<div class="min-h-screen bg-gray-900 text-white dark:bg-gray-900">
	<div class="container mx-auto pt-24 pb-2 text-center">
		<div class="flex min-h-[80vh] flex-col items-center justify-start pt-28">
			<h1
				class="mb-12 px-8 text-3xl leading-tight font-semibold text-white sm:text-4xl md:text-6xl lg:px-0 lg:text-6xl xl:text-7xl"
			>
				<span class="font-extrabold text-green-500">Reconciliation</span> has <br /> never been so
				<span class="animated-text font-extrabold">{currentText}</span>
			</h1>

			<div class="error fraud mb-16 px-8 text-white sm:leading-loose lg:px-0">
				<span
					class="mr-4 text-xl leading-tight font-semibold sm:text-2xl md:text-2xl lg:text-2xl xl:text-2xl"
				>
					Detect Errors, Prevent Fraud, Confirm Balances.
				</span>
			</div>

			<a
				href="/upload"
				title="Try It Now"
				class="btn-bottom-animation transform rounded-lg border-2 border-green-500 bg-green-500 px-8 py-5 text-lg font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-green-600 hover:text-white lg:px-10 lg:py-4 xl:px-12 xl:py-5"
			>
				Try It Now For Free
			</a>
		</div>

		<!-- Desktop SVG illustrations -->
		<div class="hidden md:block">
			<img
				src="/images/details.svg"
				alt="Details illustration"
				class="absolute top-[60%] right-0 z-0 max-w-sm -translate-y-1/2 px-16 opacity-30"
			/>
		</div>

		<div class="hidden md:block">
			<img
				src="/images/reconcile.svg"
				alt="Reconcile illustration"
				class="absolute top-[60%] left-0 z-0 max-w-xs -translate-y-1/2 px-16 opacity-30"
			/>
		</div>

		<!-- Mobile SVG illustration -->
		<div class="mt-20 text-center md:hidden">
			<img
				src="/images/details.svg"
				alt="Details illustration"
				class="mx-auto max-w-sm px-4 opacity-30"
			/>
		</div>
	</div>
</div>

<style>
	@keyframes btn-bottom-animation {
		0% {
			transform: translateY(-8px) scale(1);
			box-shadow: 0 10px 25px rgba(46, 213, 115, 0.2);
		}
		50% {
			transform: translateY(8px) scale(1.05);
			box-shadow: 0 15px 30px rgba(46, 213, 115, 0.4);
		}
		100% {
			transform: translateY(-8px) scale(1);
			box-shadow: 0 10px 25px rgba(46, 213, 115, 0.2);
		}
	}

	.btn-bottom-animation {
		animation: btn-bottom-animation 4s ease-in-out infinite;
		box-shadow: 0 10px 25px rgba(46, 213, 115, 0.3);
	}

	.animated-text {
		display: inline-block;
		min-width: 140px;
		position: relative;
		color: #63b3ed;
		text-shadow: 0 0 15px rgba(99, 179, 237, 0.5);
	}

	.animated-text::after {
		content: '';
		position: absolute;
		right: -8px;
		top: 0;
		height: 100%;
		border-right: 0.12em solid #63b3ed;
		animation: blink 1.2s step-end infinite;
	}

	@keyframes blink {
		from,
		to {
			border-color: transparent;
			opacity: 0;
		}
		50% {
			border-color: #63b3ed;
			opacity: 1;
		}
	}
</style>
