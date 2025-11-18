<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Props
	let { isOpen = $bindable(false) } = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher();

	// Form state
	let name = $state('');
	let email = $state('');
	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let error = $state('');

	// Close modal function
	function closeModal() {
		isOpen = false;
		dispatch('close');
	}

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!email.trim()) {
			error = 'Email is required';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('name', name.trim());
			formData.append('email', email.trim());

			const response = await fetch('https://getlaunchlist.com/s/kn5cJv', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				isSubmitted = true;
				// Reset form after successful submission
				setTimeout(() => {
					name = '';
					email = '';
					isSubmitted = false;
					closeModal();
				}, 3000);
			} else {
				throw new Error('Failed to submit');
			}
		} catch (err) {
			error = 'Failed to join waitlist. Please try again.';
			console.error('Waitlist submission error:', err);
		} finally {
			isSubmitting = false;
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="waitlist-title"
	>
		<div
			class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
			on:click|stopPropagation
		>
			<!-- Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 id="waitlist-title" class="text-xl font-semibold text-gray-900 dark:text-white">
					{#if isSubmitted}
						🎉 You're on the list!
					{:else}
						Join Our Waitlist
					{/if}
				</h2>
				<button
					type="button"
					class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					on:click={closeModal}
					aria-label="Close modal"
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			{#if isSubmitted}
				<!-- Success message -->
				<div class="text-center">
					<div class="mb-4 text-4xl">✅</div>
					<p class="mb-2 text-lg font-medium text-gray-900 dark:text-white">
						Thank you for joining!
					</p>
					<p class="text-gray-600 dark:text-gray-400">
						We'll notify you as soon as the Reconciler is ready for you to use.
					</p>
				</div>
			{:else}
				<!-- Waitlist form -->
				<div class="mb-4">
					<p class="text-gray-600 dark:text-gray-400">
						Be the first to know when our powerful data reconciliation platform is ready. Get early
						access and exclusive updates!
					</p>
				</div>

				<form class="launchlist-form space-y-4" on:submit={handleSubmit}>
					<!-- Name field -->
					<div>
						<label
							for="waitlist-name"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Name (optional)
						</label>
						<input
							id="waitlist-name"
							name="name"
							type="text"
							bind:value={name}
							placeholder="Your full name"
							class="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
						/>
					</div>

					<!-- Email field -->
					<div>
						<label
							for="waitlist-email"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Email address *
						</label>
						<input
							id="waitlist-email"
							name="email"
							type="email"
							required
							bind:value={email}
							placeholder="your@email.com"
							class="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
							class:border-red-300={error && !email.trim()}
							class:focus:border-red-500={error && !email.trim()}
							class:focus:ring-red-500={error && !email.trim()}
						/>
						{#if error}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
						{/if}
					</div>

					<!-- Submit button -->
					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
					>
						{#if isSubmitting}
							<div class="flex items-center justify-center">
								<svg
									class="mr-2 h-4 w-4 animate-spin"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									></path>
								</svg>
								Joining...
							</div>
						{:else}
							Join Waitlist
						{/if}
					</button>
				</form>

				<!-- Features preview -->
				<div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-600">
					<p class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
						What you'll get early access to:
					</p>
					<ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
						<li class="flex items-center">
							<svg class="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							Advanced data reconciliation tools
						</li>
						<li class="flex items-center">
							<svg class="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							Multiple file format support
						</li>
						<li class="flex items-center">
							<svg class="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							Smart matching algorithms
						</li>
						<li class="flex items-center">
							<svg class="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
							Detailed reconciliation reports
						</li>
					</ul>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Ensure modal appears on top */
	:global(body:has(.fixed.inset-0.z-50)) {
		overflow: hidden;
	}
</style>
