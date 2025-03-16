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

<div class="min-h-screen bg-gray-900 dark:bg-gray-900 text-white">
<div class="container mx-auto pt-24 pb-2 text-center">
	<div class="flex flex-col justify-center items-center min-h-[80vh]">
		<h1
			class="mb-8 px-8 text-2xl leading-tight font-semibold text-white sm:text-3xl md:text-5xl lg:px-0 lg:text-5xl xl:text-5xl"
		>
			<span class="font-extrabold text-red-500">Reconciliation</span> has <br /> never been so
			<span class="animated-text font-extrabold text-blue-600">{currentText}</span>
		</h1>

		<div class="error fraud mb-8 px-8 text-white sm:leading-loose lg:px-0">
			<span
				class="mr-4 text-lg leading-tight font-semibold sm:text-xl md:text-xl lg:text-xl xl:text-xl"
			>
				Detect Errors, Prevent Fraud, Confirm Balances.
			</span>
		</div>

		<a
			href="/upload"
			title="Try It Now"
			class="btn-bottom-animation rounded border border-green-500 bg-green-500 px-4 py-4 font-semibold text-white hover:bg-green-600 hover:text-pink-100 lg:px-4 lg:py-2 lg:text-sm xl:px-4 xl:py-3 xl:text-base"
		>
			Try It Now For Free
		</a>
	</div>

	<!-- Desktop SVG illustrations -->
	<div class="mt-24 hidden md:block">
		<img
			src="/images/details.svg"
			alt="Details illustration"
			class="absolute top-0 right-0 mt-24 max-w-sm px-16 py-24"
		/>
	</div>

	<div class="mt-24 hidden md:block">
		<img
			src="/images/reconcile.svg"
			alt="Reconcile illustration"
			class="absolute top-0 left-0 mt-24 max-w-xs px-16 py-24"
		/>
	</div>

	<!-- Mobile SVG illustration -->
	<div class="-mt-12 text-center md:hidden">
		<img src="/images/details.svg" alt="Details illustration" class="mx-auto mt-2 max-w-sm px-4" />
	</div>
</div>
</div>

<style>
	@keyframes btn-bottom-animation {
		0% {
			transform: translateY(-10px);
		}
		50% {
			transform: translateY(10px);
		}
		100% {
			transform: translateY(-10px);
		}
	}

	.btn-bottom-animation {
		animation: btn-bottom-animation 3s ease-in-out infinite;
	}

	.animated-text {
		display: inline-block;
		min-width: 100px;
		position: relative;
	}

	.animated-text::after {
		content: '';
		position: absolute;
		right: -5px;
		top: 0;
		height: 100%;
		border-right: 0.1em solid #e2e8f0;
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		from,
		to {
			border-color: transparent;
		}
		50% {
			border-color: #e2e8f0;
		}
	}
</style>
