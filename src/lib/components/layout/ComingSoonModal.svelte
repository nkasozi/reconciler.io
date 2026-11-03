<script lang="ts">
	interface ComingSoonModalProperties {
		onCloseComingSoonModal: () => void;
	}

	let { onCloseComingSoonModal }: ComingSoonModalProperties = $props();
</script>

<div
	class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
	on:click={onCloseComingSoonModal}
>
	<div class="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-2xl" on:click|stopPropagation>
		<div class="mb-6 text-center">
			<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
				<svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
			</div>

			<h3 class="mb-2 text-xl font-bold text-white">Coming Soon!</h3>

			<p class="text-gray-300">
				We're working on something exciting for you!
				<br /><br />
				<span class="text-blue-400">Great things are on the way.</span>
			</p>
		</div>

		<div class="flex justify-center space-x-3">
			<button
				type="button"
				on:click={onCloseComingSoonModal}
				class="focus:ring-opacity-50 rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition duration-200 hover:bg-gray-700 focus:ring-4 focus:ring-gray-500 focus:outline-none"
			>
				Got it
			</button>
			<button
				type="button"
				on:click={onCloseComingSoonModal}
				class="focus:ring-opacity-50 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition duration-200 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:outline-none"
			>
				Continue browsing
			</button>
		</div>
	</div>
</div>
