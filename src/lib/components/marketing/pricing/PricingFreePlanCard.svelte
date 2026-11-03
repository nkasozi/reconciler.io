<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div
	class="overflow-hidden rounded-lg border border-transparent bg-white shadow-lg transition-all duration-300 dark:bg-gray-800"
>
	<div class="border-b border-gray-200 p-6 dark:border-gray-700">
		<h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-white">Free</h3>
		<div class="mb-4 flex items-end gap-1">
			<span class="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
			<span class="pb-1 text-gray-500 dark:text-gray-400">forever</span>
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			Perfect for occasional reconciliation tasks
		</p>
	</div>
	<div class="p-6">
		<ul class="space-y-3">
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300"
					>Upload & reconcile up to 100,000 rows</span
				>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Basic column mapping</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">CSV, PDF & Excel support</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Basic reconciliation reporting</span>
			</li>
			<li class="flex items-start">
				<svg
					class="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="ml-2 text-gray-600 dark:text-gray-300">Reverse Reconciliation</span>
			</li>
		</ul>
		<button
			on:click={() => goto('/reconcile')}
			class="mt-8 w-full rounded-lg bg-gray-100 px-4 py-3 font-medium text-gray-800 transition duration-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
		>
			Get Started
		</button>
	</div>
</div>
