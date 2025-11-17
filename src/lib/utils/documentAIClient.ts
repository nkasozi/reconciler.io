// Frontend client for Google Document AI processing
// Works with both local development (SvelteKit API) and production (Vercel function)

export interface DocumentProcessingResult {
	success: boolean;
	text: string;
	tables: Array<{
		headers: string[];
		rows: string[][];
		confidence: number;
	}>;
	formFields: Array<{
		name: string;
		value: string;
	}>;
	confidence: number;
	pages: number;
	isDevelopmentMock?: boolean;
	note?: string;
	error?: string;
}

/**
 * Process a document using Google Document AI
 * Automatically detects environment and calls appropriate endpoint
 */
export async function processDocumentWithBackend(file: File): Promise<DocumentProcessingResult> {
	try {
		console.log('Processing document via backend:', file.name);

		// Convert file to base64
		const base64Content = await fileToBase64(file);

		// Determine MIME type
		const mimeType = file.type || getMimeTypeFromFileName(file.name);

		// Prepare request body
		const requestBody = {
			content: base64Content,
			mimeType: mimeType,
			fileName: file.name,
			fileSize: file.size
		};

		// Determine which endpoint to call
		const endpoint = getProcessingEndpoint();
		console.log('Using endpoint:', endpoint);

		// Make the API call
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API call failed: ${response.status} - ${errorText}`);
		}

		const result: DocumentProcessingResult = await response.json();

		// Log the result
		if (result.success) {
			console.log('✅ Document processed successfully');
			console.log('📄 Text length:', result.text.length);
			console.log('📊 Tables found:', result.tables.length);
			console.log('📋 Form fields found:', result.formFields.length);
			console.log('🎯 Confidence:', result.confidence);

			if (result.isDevelopmentMock) {
				console.log('🔧 Development mode: Using mock data');
			}
		} else {
			console.error('❌ Document processing failed:', result.error);
		}

		return result;
	} catch (error) {
		console.error('Document processing error:', error);
		return {
			success: false,
			text: '',
			tables: [],
			formFields: [],
			confidence: 0,
			pages: 0,
			error: error instanceof Error ? error.message : 'Unknown error occurred'
		};
	}
}

/**
 * Get the appropriate processing endpoint based on environment
 */
function getProcessingEndpoint(): string {
	if (typeof window === 'undefined') {
		// Server-side rendering
		return '/api/process-document';
	}

	const hostname = window.location.hostname;
	const isProduction =
		hostname.includes('vercel.app') ||
		hostname.includes('.com') ||
		hostname.includes('.net') ||
		hostname.includes('.org');

	if (isProduction) {
		// Production: use Vercel function
		return '/api/process-document';
	} else {
		// Development: use SvelteKit API route
		return '/api/process-document';
	}
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// Remove data URL prefix to get just base64 content
			const base64 = result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Get MIME type from file name if not provided
 */
function getMimeTypeFromFileName(fileName: string): string {
	const extension = fileName.toLowerCase().split('.').pop();
	const mimeTypes: Record<string, string> = {
		pdf: 'application/pdf',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		tiff: 'image/tiff',
		tif: 'image/tiff',
		bmp: 'image/bmp',
		webp: 'image/webp'
	};
	return mimeTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Convert backend result to OCR format for compatibility
 */
export function convertToOCRResult(backendResult: DocumentProcessingResult) {
	return {
		tables: backendResult.tables.map((table) => ({
			headers: table.headers,
			rows: table.rows,
			confidence: table.confidence,
			rawText: backendResult.text
		})),
		success: backendResult.success,
		error: backendResult.error
	};
}

/**
 * Test the backend connection
 */
export async function testBackendConnection(): Promise<{
	success: boolean;
	endpoint: string;
	environment: string;
}> {
	const endpoint = getProcessingEndpoint();
	const isLocal = !window.location.hostname.includes('vercel.app');

	try {
		// Test with a small dummy request
		const testResponse = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				content: 'dGVzdA==', // "test" in base64
				mimeType: 'text/plain'
			})
		});

		return {
			success: testResponse.ok,
			endpoint,
			environment: isLocal ? 'Local Development' : 'Production (Vercel)'
		};
	} catch (error) {
		return {
			success: false,
			endpoint,
			environment: isLocal ? 'Local Development' : 'Production (Vercel)'
		};
	}
}
