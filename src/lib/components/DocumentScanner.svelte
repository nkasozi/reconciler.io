<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	interface DocumentScannerProps {
		isActive?: boolean;
		supportedFormats?: string[];
		onscan?: (event: CustomEvent<{ file: File }>) => void;
		onerror?: (event: CustomEvent<{ message: string }>) => void;
		onclose?: () => void;
	}

	let {
		isActive = false,
		supportedFormats = ['image/jpeg', 'image/png', 'image/webp'],
		onscan,
		onerror,
		onclose
	}: DocumentScannerProps = $props();

	const dispatch = createEventDispatcher<{
		scan: { file: File };
		error: { message: string };
		close: void;
	}>();

	let videoElement: HTMLVideoElement = $state()!;
	let canvasElement: HTMLCanvasElement = $state()!;
	let fileInputElement: HTMLInputElement = $state()!;
	let stream: MediaStream | null = $state(null);
	let isCapturing = $state(false);
	let isCameraReady = $state(false);
	let errorMessage = $state('');
	let scanMode: 'selection' | 'camera' | 'upload' = $state('selection');
	let uploadedFile: File | null = $state(null);
	let uploadedImageUrl: string | null = $state(null);

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
			const errorEvent = new CustomEvent('error', { detail: { message: errorMessage } });
			if (onerror) onerror(errorEvent);
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

			const event = new CustomEvent('scan', { detail: { file } });
			if (onscan) onscan(event);
			dispatch('scan', { file });
			closeScanner();
		} catch (error) {
			errorMessage = 'Failed to capture image';
			const errorEvent = new CustomEvent('error', { detail: { message: errorMessage } });
			if (onerror) onerror(errorEvent);
			dispatch('error', { message: errorMessage });
		} finally {
			isCapturing = false;
		}
	}

	function closeScanner() {
		console.log('closeScanner function called');
		stopCamera();
		resetUpload();
		scanMode = 'selection';
		console.log('About to dispatch close event');
		if (onclose) onclose();
		dispatch('close');
		console.log('Close event dispatched');
	}

	function selectCameraMode() {
		scanMode = 'camera';
		startCamera();
	}

	function selectUploadMode() {
		scanMode = 'upload';
		stopCamera(); // Make sure camera is stopped if it was running
	}

	function resetUpload() {
		uploadedFile = null;
		if (uploadedImageUrl) {
			URL.revokeObjectURL(uploadedImageUrl);
			uploadedImageUrl = null;
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		// Validate file type
		if (!supportedFormats.includes(file.type)) {
			errorMessage = `Unsupported file format. Please upload ${supportedFormats.map((f) => f.split('/')[1].toUpperCase()).join(', ')} files.`;
			const errorEvent = new CustomEvent('error', { detail: { message: errorMessage } });
			if (onerror) onerror(errorEvent);
			dispatch('error', { message: errorMessage });
			return;
		}

		// Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			errorMessage = 'File size too large. Please upload files smaller than 10MB.';
			const errorEvent = new CustomEvent('error', { detail: { message: errorMessage } });
			if (onerror) onerror(errorEvent);
			dispatch('error', { message: errorMessage });
			return;
		}

		errorMessage = '';
		uploadedFile = file;

		// Create preview URL
		if (uploadedImageUrl) {
			URL.revokeObjectURL(uploadedImageUrl);
		}
		uploadedImageUrl = URL.createObjectURL(file);
	}

	function triggerFileInput() {
		fileInputElement?.click();
	}

	function useUploadedImage() {
		if (uploadedFile) {
			const event = new CustomEvent('scan', { detail: { file: uploadedFile } });
			if (onscan) onscan(event);
			dispatch('scan', { file: uploadedFile });
			closeScanner();
		}
	}

	function retakeUpload() {
		resetUpload();
		if (fileInputElement) {
			fileInputElement.value = '';
		}
	}

	// Reset to selection mode when component becomes active
	$effect(() => {
		if (isActive) {
			if (scanMode !== 'selection') {
				scanMode = 'selection';
			}
		}
	});

	// Stop camera when component becomes inactive
	$effect(() => {
		if (!isActive && stream) {
			console.log('Stopping camera...');
			stopCamera();
		}
	});
</script>

{#if isActive}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
		<div class="mx-4 max-h-screen w-full max-w-4xl overflow-hidden rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900">Document Scanner</h3>
				<button
					type="button"
					onclick={closeScanner}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close document scanner"
				>
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

			<!-- Mode Selection -->
			{#if scanMode === 'selection'}
				<div class="space-y-6">
					<div class="text-center">
						<p class="mb-6 text-gray-600">Choose how you'd like to add your document:</p>
					</div>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<!-- Camera Option -->
						<button
							type="button"
							onclick={selectCameraMode}
							class="group flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50"
						>
							<div class="mb-4 rounded-full bg-blue-100 p-4 group-hover:bg-blue-200">
								<svg
									class="h-8 w-8 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
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
							</div>
							<h4 class="mb-2 text-lg font-medium text-gray-900 group-hover:text-blue-600">
								Use Camera
							</h4>
							<p class="text-sm text-gray-600">Take a photo of your document</p>
						</button>

						<!-- Upload Option -->
						<button
							type="button"
							onclick={selectUploadMode}
							class="group flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 p-8 text-center transition-all hover:border-green-500 hover:bg-green-50"
						>
							<div class="mb-4 rounded-full bg-green-100 p-4 group-hover:bg-green-200">
								<svg
									class="h-8 w-8 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
							</div>
							<h4 class="mb-2 text-lg font-medium text-gray-900 group-hover:text-green-600">
								Upload Image
							</h4>
							<p class="text-sm text-gray-600">Choose an existing image file</p>
						</button>
					</div>

					<div class="text-center">
						<button
							type="button"
							onclick={closeScanner}
							class="rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200"
						>
							Cancel
						</button>
					</div>
				</div>
			{/if}

			<!-- Camera Mode -->
			{#if scanMode === 'camera'}
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
							<div
								class="absolute bottom-4 left-4 h-6 w-6 border-b-4 border-l-4 border-white"
							></div>
							<div
								class="absolute bottom-4 right-4 h-6 w-6 border-b-4 border-r-4 border-white"
							></div>
						</div>
					{/if}
				</div>

				<!-- Camera instructions and controls -->
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
							onclick={() => (scanMode = 'selection')}
							class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
						>
							Back
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
			{/if}

			<!-- Upload Mode -->
			{#if scanMode === 'upload'}
				<div class="space-y-6">
					<!-- File Input (Hidden) -->
					<input
						bind:this={fileInputElement}
						type="file"
						accept={supportedFormats.join(',')}
						onchange={handleFileSelect}
						class="hidden"
					/>

					{#if !uploadedFile}
						<!-- Upload Area -->
						<button
							type="button"
							class="w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							onclick={triggerFileInput}
						>
							<div class="mx-auto mb-4 h-12 w-12 text-gray-400">
								<svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-lg font-medium text-gray-900">Upload an image</h3>
							<p class="mb-4 text-gray-600">Choose an image file from your device</p>
							<p class="text-sm text-gray-500">
								Supports {supportedFormats.map((f) => f.split('/')[1].toUpperCase()).join(', ')} files
								up to 10MB
							</p>
						</button>
					{:else}
						<!-- Image Preview -->
						<div class="space-y-4">
							<div class="relative">
								<img
									src={uploadedImageUrl}
									alt="Uploaded document"
									class="max-h-96 w-full rounded-lg object-contain"
								/>

								<!-- Document frame guide overlay -->
								<div class="pointer-events-none absolute inset-0">
									<div
										class="absolute inset-4 rounded-lg border-2 border-dashed border-white opacity-75"
									></div>
									<div
										class="absolute left-4 top-4 h-6 w-6 border-l-4 border-t-4 border-white"
									></div>
									<div
										class="absolute right-4 top-4 h-6 w-6 border-r-4 border-t-4 border-white"
									></div>
									<div
										class="absolute bottom-4 left-4 h-6 w-6 border-b-4 border-l-4 border-white"
									></div>
									<div
										class="absolute bottom-4 right-4 h-6 w-6 border-b-4 border-r-4 border-white"
									></div>
								</div>
							</div>

							<div class="rounded bg-gray-50 p-3 text-sm text-gray-600">
								<p class="font-medium">File: {uploadedFile.name}</p>
								<p>Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
							</div>
						</div>
					{/if}

					<!-- Upload controls -->
					<div class="flex justify-center space-x-4">
						<button
							type="button"
							onclick={() => (scanMode = 'selection')}
							class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
						>
							Back
						</button>

						{#if uploadedFile}
							<button
								type="button"
								onclick={retakeUpload}
								class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
							>
								Choose Different File
							</button>

							<button
								type="button"
								onclick={useUploadedImage}
								class="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>Use This Image</span>
							</button>
						{:else}
							<button
								type="button"
								onclick={triggerFileInput}
								class="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									/>
								</svg>
								<span>Browse Files</span>
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Hidden canvas for image capture -->
			<canvas bind:this={canvasElement} class="hidden"></canvas>
		</div>
	</div>
{/if}
