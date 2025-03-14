<script lang="ts">
	import { onMount } from 'svelte';

	type FileData = {
		file: File | null;
		isUploading: boolean;
		isUploaded: boolean;
		progress: number;
	};

	let primaryFileData = $state<FileData>({
		file: null,
		isUploading: false,
		isUploaded: false,
		progress: 0
	});

	let comparisonFileData = $state<FileData>({
		file: null,
		isUploading: false,
		isUploaded: false,
		progress: 0
	});

	let currentText = $state('');
	let phrases = ['Easy', 'Simple', 'Quick'];
	let currentPhraseIndex = 2; // Start with "Quick"
	let isDeleting = $state(false);
	let typingSpeed = $state(100);

	onMount(() => {
		setupDragAndDrop();
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

	function setupDragAndDrop() {
		const primaryDropArea = document.querySelector('.upload .drop-here') as HTMLElement;
		const comparisonDropArea = document.querySelector('.compare .drop-here') as HTMLElement;

		if (primaryDropArea) {
			setupFileUploadArea(primaryDropArea, 'primary');
		}

		if (comparisonDropArea) {
			setupFileUploadArea(comparisonDropArea, 'comparison');
		}
	}

	function setupFileUploadArea(element: HTMLElement, type: 'primary' | 'comparison') {
		const fileData = type === 'primary' ? primaryFileData : comparisonFileData;
		const parent = element.parentElement as HTMLElement;

		['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
			element.addEventListener(eventName, preventDefaults, false);
		});

		function preventDefaults(e: Event) {
			e.preventDefault();
			e.stopPropagation();
		}

		['dragenter', 'dragover'].forEach((eventName) => {
			element.addEventListener(
				eventName,
				() => {
					parent.classList.add('highlight');
				},
				false
			);
		});

		['dragleave', 'drop'].forEach((eventName) => {
			element.addEventListener(
				eventName,
				() => {
					parent.classList.remove('highlight');
				},
				false
			);
		});

		element.addEventListener(
			'drop',
			(e: DragEvent) => {
				if (e.dataTransfer?.files.length) {
					handleFiles(e.dataTransfer.files, type);
				}
			},
			false
		);

		element.addEventListener(
			'change',
			(e: Event) => {
				const input = e.target as HTMLInputElement;
				if (input.files?.length) {
					handleFiles(input.files, type);
				}
			},
			false
		);
	}

	function handleFiles(files: FileList, type: 'primary' | 'comparison') {
		const fileData = type === 'primary' ? primaryFileData : comparisonFileData;
		const file = files[0];
		const parent =
			type === 'primary'
				? (document.querySelector('.upload') as HTMLElement)
				: (document.querySelector('.compare') as HTMLElement);

		// Check if file is a valid type (Excel, PDF, DOC, CSV, RTF)
		const validTypes = [
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'text/csv',
			'application/rtf',
			'text/plain' // For testing purposes
		];

		if (
			!validTypes.includes(file.type) &&
			!file.name.match(/\.(xlsx|xls|pdf|doc|docx|csv|rtf|txt)$/i)
		) {
			alert(
				`File type ${file.type} not supported. Please upload Excel, PDF, DOC, CSV, or RTF files.`
			);
			return;
		}

		// Start upload simulation
		startUpload(file, type, parent);
	}

	function startUpload(file: File, type: 'primary' | 'comparison', parent: HTMLElement) {
		const fileData = type === 'primary' ? primaryFileData : comparisonFileData;

		// Store file reference
		fileData.file = file;
		fileData.isUploading = true;
		fileData.isUploaded = false;
		fileData.progress = 0;

		parent.classList.add('uploading');

		// Simulate upload progress
		let progress = 0;
		const interval = setInterval(() => {
			progress += 5;
			updateProgress(type, progress);

			if (progress >= 100) {
				clearInterval(interval);
				completeUpload(type, parent);
			}
		}, 100);
	}

	function updateProgress(type: 'primary' | 'comparison', progress: number) {
		const fileData = type === 'primary' ? primaryFileData : comparisonFileData;
		fileData.progress = progress;

		const progressCircle =
			type === 'primary'
				? (document.querySelector('.upload .progress') as SVGCircleElement)
				: (document.querySelector('.compare .progress') as SVGCircleElement);

		if (progressCircle) {
			const radius = parseInt(progressCircle.getAttribute('r') || '115');
			const circumference = radius * 2 * Math.PI;
			const offset = circumference - (progress / 100) * circumference;
			progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
			progressCircle.style.strokeDashoffset = offset.toString();
		}
	}

	function completeUpload(type: 'primary' | 'comparison', parent: HTMLElement) {
		const fileData = type === 'primary' ? primaryFileData : comparisonFileData;

		fileData.isUploading = false;
		fileData.isUploaded = true;

		parent.classList.remove('uploading');
		parent.classList.add('uploaded');

		// Enable "Reconcile" button if both files are uploaded
		if (primaryFileData.isUploaded && comparisonFileData.isUploaded) {
			document
				.querySelector('.reconcile-button')
				?.classList.remove('opacity-50', 'cursor-not-allowed');
			document.querySelector('.reconcile-button')?.removeAttribute('disabled');
		}
	}

	function goToNextStep() {
		// Only proceed if both files are uploaded
		if (primaryFileData.isUploaded && comparisonFileData.isUploaded) {
			// Navigate to column selection page
			window.location.href = '/column-selection';
		}
	}
</script>

<div class="container mx-auto pt-16 pb-2 text-center">
	<div class="mb-8 flex justify-center"></div>
	<h1
		class="mb-8 px-8 text-2xl leading-tight font-semibold text-gray-700 sm:text-3xl md:text-5xl lg:px-0 lg:text-5xl xl:text-5xl"
	>
		<span class="font-extrabold text-red-500">Reconciliation</span> has <br /> never been so
		<span class="animated-text font-extrabold text-blue-600">{currentText}</span>
	</h1>

	<!-- File Upload Areas -->
	<div class="mx-auto flex max-w-4xl flex-wrap justify-center p-4">
		<div class="mb-4 w-1/2 p-4 sm:w-1/2 md:w-1/2 md:p-8 lg:w-1/2 xl:w-1/2">
			<div class="upload">
				<input
					type="file"
					title=""
					class="drop-here"
					accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt"
				/>
				<div
					class="text text-drop px-4 text-center text-sm sm:text-sm md:text-lg lg:text-lg xl:text-lg"
				>
					Drag &amp; Drop <br /> an Excel or CSV file here
				</div>
				<div class="text text-upload">uploading</div>
				<svg class="progress-wrapper" width="300" height="300">
					<circle class="progress" r="115" cx="150" cy="150"></circle>
				</svg>
				<svg class="check-wrapper" width="130" height="130">
					<polyline class="check" points="100.2,40.2 51.5,88.8 29.8,67.5"></polyline>
				</svg>
				<div class="shadow"></div>
			</div>
		</div>

		<div class="mb-4 w-1/2 p-4 sm:w-1/2 md:w-1/2 md:p-8 lg:w-1/2 xl:w-1/2">
			<div class="compare">
				<input
					type="file"
					title=""
					class="drop-here"
					accept=".xlsx,.xls,.pdf,.doc,.docx,.csv,.rtf,.txt"
				/>
				<div
					class="text text-drop text-center text-sm sm:text-sm md:px-4 md:text-lg lg:text-lg xl:text-lg"
				>
					Drag &amp; Drop <br /> another Excel or CSV file here
				</div>
				<div class="text text-upload">uploading</div>
				<svg class="progress-wrapper" width="300" height="300">
					<circle class="progress" r="115" cx="150" cy="150"></circle>
				</svg>
				<svg class="check-wrapper" width="130" height="130">
					<polyline class="check" points="100.2,40.2 51.5,88.8 29.8,67.5"></polyline>
				</svg>
				<div class="shadow"></div>
			</div>
		</div>
	</div>

	<!-- Reconcile Button -->
	<div class="mb-16 flex justify-center">
		<button
			onclick={goToNextStep}
			disabled={!primaryFileData.isUploaded || !comparisonFileData.isUploaded}
			class="reconcile-button btn-bottom-animation mt-2 cursor-not-allowed rounded border border-green-500 bg-green-500 px-4 py-4 font-semibold text-white opacity-50 hover:bg-green-600 hover:text-pink-100 lg:px-4 lg:py-2 lg:text-sm xl:px-4 xl:py-3 xl:text-base"
		>
			Next
		</button>
	</div>
</div>

<style>
	/* Drag & Drop styling */
	.upload,
	.compare {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		height: 200px;
		border: 2px dashed #ccc;
		border-radius: 10px;
		background-color: #f5f5f5;
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.upload.highlight,
	.compare.highlight {
		border-color: #4caf50;
		background-color: rgba(76, 175, 80, 0.1);
	}

	.upload .drop-here,
	.compare .drop-here {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		z-index: 10;
	}

	.text {
		position: relative;
		z-index: 5;
	}

	.text-upload {
		display: none;
	}

	.progress-wrapper,
	.check-wrapper {
		position: absolute;
		display: none;
		z-index: 5;
	}

	.progress {
		fill: none;
		stroke: #4caf50;
		stroke-width: 7;
		stroke-dasharray: 722.2794861437698;
		stroke-dashoffset: 722.2794861437698;
		transform: rotate(-90deg);
		transform-origin: 50% 50%;
		transition: stroke-dashoffset 0.3s ease;
	}

	.check {
		fill: none;
		stroke: #4caf50;
		stroke-width: 7;
		stroke-dasharray: 100;
		stroke-dashoffset: 100;
		transition: stroke-dashoffset 0.5s ease;
	}

	.shadow {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(255, 255, 255, 0.8);
		display: none;
		z-index: 1;
	}

	/* Upload States */
	.uploading .text-drop {
		display: none;
	}

	.uploading .text-upload {
		display: block;
	}

	.uploading .progress-wrapper {
		display: block;
	}

	.uploading .shadow {
		display: block;
	}

	.uploaded .text-drop {
		display: none;
	}

	.uploaded .text-upload {
		display: none;
	}

	.uploaded .check-wrapper {
		display: block;
	}

	.uploaded .check {
		stroke-dashoffset: 0;
	}

	.uploaded .shadow {
		display: block;
	}

	@keyframes btn-bottom-animation {
		0% {
			transform: translateY(-5px);
		}
		50% {
			transform: translateY(5px);
		}
		100% {
			transform: translateY(-5px);
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
		border-right: 0.1em solid #666;
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		from,
		to {
			border-color: transparent;
		}
		50% {
			border-color: #666;
		}
	}
</style>
