<script lang="ts">
	interface PricingUpgradeNoticeProperties {
		upgradeNoticeMessage: string;
	}

	let { upgradeNoticeMessage }: PricingUpgradeNoticeProperties = $props();
</script>

<div class="mx-auto mb-8 max-w-3xl">
	<div class="rounded border-l-4 border-orange-500 bg-orange-100 p-4 dark:bg-orange-900/30">
		<div class="flex">
			<div class="flex-shrink-0">
				<svg
					class="h-5 w-5 text-orange-500"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3">
				<p class="text-sm text-orange-800 dark:text-orange-200">{upgradeNoticeMessage}</p>
			</div>
		</div>
	</div>
</div>
