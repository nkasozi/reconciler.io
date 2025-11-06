<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	export let isActive = false;
	export let supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];

	const dispatch = createEventDispatcher<{
		scan: { file: File };
		error: { message: string };
		close: void;
	}>();

	let videoElement: HTMLVideoElement;
	let canvasElement: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let isCapturing = false;
	let isCameraReady = false;
	let errorMessage = '';

	// Camera constraints
	const videoConstraints = {
		video: {
			width: { ideal: 1920 },
			height: { ideal: 1080 },
			facingMode: 'environment' // Use rear camera on mobile
		}
	};

	onMount(() => {
		return () => {
			if (stream) {
				stopCamera();
			}
		};
	});

	async function startCamera() {
		try {
			errorMessage = '';
			stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
			videoElement.srcObject = stream;

			videoElement.onloadedmetadata = () => {
				videoElement.play();
				isCameraReady = true;
			};
		} catch (error) {
			errorMessage = 'Failed to access camera. Please ensure camera permissions are granted.';
			dispatch('error', { message: errorMessage });
		}
	}

	function stopCamera() {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
			stream = null;
		}
		isCameraReady = false;
	}

	async function captureImage() {
		if (!isCameraReady || isCapturing) return;

		isCapturing = true;

		try {
			// Set canvas dimensions to video dimensions
			canvasElement.width = videoElement.videoWidth;
			canvasElement.height = videoElement.videoHeight;

			// Draw video frame to canvas
			const ctx = canvasElement.getContext('2d')!;
			ctx.drawImage(videoElement, 0, 0);

			// Convert canvas to blob
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvasElement.toBlob(
					(blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Failed to capture image'));
					},
					'image/jpeg',
					0.9
				);
			});

			// Create file from blob
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
			const file = new File([blob], `scan-${timestamp}.jpg`, { type: 'image/jpeg' });

			dispatch('scan', { file });
			closeScanner();
		} catch (error) {
			errorMessage = 'Failed to capture image';
			dispatch('error', { message: errorMessage });
		} finally {
			isCapturing = false;
		}
	}

	function closeScanner() {
		console.log('closeScanner function called');
		stopCamera();
		console.log('About to dispatch close event');
		dispatch('close');
		console.log('Close event dispatched');
	}

	// Auto-start camera when component becomes active
	$: if (isActive && !isCameraReady && !stream) {
		console.log('Starting camera automatically...');
		startCamera();
	}

	// Stop camera when component becomes inactive
	$: if (!isActive && stream) {
		console.log('Stopping camera...');
		stopCamera();
	}
</script>

{#if isActive}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
		<div class="mx-4 max-h-screen w-full max-w-4xl overflow-hidden rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Document Scanner</h3>
				<button type="button" onclick={closeScanner} class="text-gray-400 hover:text-gray-600">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{#if errorMessage}
				<div class="mb-4 rounded border border-red-400 bg-red-100 p-3 text-red-700">
					{errorMessage}
				</div>
			{/if}

			<div class="relative">
				<!-- Video preview -->
				<video
					bind:this={videoElement}
					class="max-h-96 w-full rounded-lg bg-gray-100 {isCameraReady ? '' : 'hidden'}"
					autoplay
					muted
					playsinline
				></video>

				<!-- Loading state -->
				{#if !isCameraReady && !errorMessage}
					<div class="flex h-96 w-full items-center justify-center rounded-lg bg-gray-100">
						<div class="text-center">
							<div
								class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"
							></div>
							<p class="text-gray-600">Starting camera...</p>
						</div>
					</div>
				{/if}

				<!-- Capture overlay -->
				{#if isCameraReady}
					<div class="pointer-events-none absolute inset-0">
						<!-- Document frame guide -->
						<div
							class="absolute inset-4 rounded-lg border-2 border-dashed border-white opacity-50"
						></div>

						<!-- Corner guides -->
						<div class="absolute left-4 top-4 h-6 w-6 border-l-4 border-t-4 border-white"></div>
						<div class="absolute right-4 top-4 h-6 w-6 border-r-4 border-t-4 border-white"></div>
						<div class="absolute bottom-4 left-4 h-6 w-6 border-b-4 border-l-4 border-white"></div>
						<div class="absolute bottom-4 right-4 h-6 w-6 border-b-4 border-r-4 border-white"></div>
					</div>
				{/if}
			</div>

			<!-- Instructions and controls -->
			<div class="mt-4 space-y-4">
				<div class="rounded bg-gray-50 p-3 text-sm text-gray-600">
					<ul class="space-y-1">
						<li>• Position the document within the frame guides</li>
						<li>• Ensure good lighting and the document is flat</li>
						<li>• Hold steady and tap capture when ready</li>
					</ul>
				</div>

				<div class="flex justify-center space-x-4">
					<button
						type="button"
						onclick={closeScanner}
						class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
					>
						Cancel
					</button>

					<button
						type="button"
						onclick={captureImage}
						disabled={!isCameraReady || isCapturing}
						class="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isCapturing}
							<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
							<span>Capturing...</span>
						{:else}
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							<span>Capture</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Hidden canvas for image capture -->
			<canvas bind:this={canvasElement} class="hidden"></canvas>
		</div>
	</div>
{/if}
