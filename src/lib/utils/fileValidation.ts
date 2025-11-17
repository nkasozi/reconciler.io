/**
 * File validation utilities for Document AI processing
 */

export interface FileValidationResult {
	isValid: boolean;
	error?: string;
	warnings?: string[];
}

export interface FileValidationOptions {
	maxFileSizeMB?: number;
	maxPDFPages?: number;
	allowedTypes?: string[];
}

/**
 * Default validation limits based on Google Document AI constraints
 */
export const DEFAULT_VALIDATION_LIMITS = {
	// File size limits
	maxImageSizeMB: 35, // Google Document AI limit for images
	maxPDFSizeMB: 100, // More generous for PDFs since they're processed differently

	// Page limits
	maxPDFPages: 15, // Conservative limit (Document AI supports up to 30 in imageless mode)

	// Supported file types
	allowedTypes: [
		'application/pdf',
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/bmp',
		'image/webp',
		'image/tiff',
		'image/tif'
	]
};

/**
 * Validate file before processing with Google Document AI
 */
export async function validateFile(
	file: File,
	options: FileValidationOptions = {}
): Promise<FileValidationResult> {
	const {
		maxFileSizeMB = file.type === 'application/pdf'
			? DEFAULT_VALIDATION_LIMITS.maxPDFSizeMB
			: DEFAULT_VALIDATION_LIMITS.maxImageSizeMB,
		maxPDFPages = DEFAULT_VALIDATION_LIMITS.maxPDFPages,
		allowedTypes = DEFAULT_VALIDATION_LIMITS.allowedTypes
	} = options;

	const warnings: string[] = [];

	// Check file type
	const isValidType = allowedTypes.some(
		(type) => file.type === type || file.name.toLowerCase().endsWith('.' + type.split('/')[1])
	);

	if (!isValidType) {
		return {
			isValid: false,
			error: `Unsupported file type. Please upload ${formatAllowedTypes(allowedTypes)} files.`
		};
	}

	// Check file size
	const fileSizeMB = file.size / (1024 * 1024);
	if (fileSizeMB > maxFileSizeMB) {
		return {
			isValid: false,
			error: `File size too large (${fileSizeMB.toFixed(1)}MB). Maximum allowed: ${maxFileSizeMB}MB.`
		};
	}

	// Add warning for large files
	if (fileSizeMB > 10) {
		warnings.push(`Large file (${fileSizeMB.toFixed(1)}MB) may take longer to process.`);
	}

	// Check PDF page count if it's a PDF
	if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
		console.log(`📄 Checking PDF page count for: ${file.name}`);
		try {
			const pageCount = await getPDFPageCount(file);
			console.log(`📊 PDF page count result: ${pageCount} pages (limit: ${maxPDFPages})`);

			if (pageCount > maxPDFPages) {
				console.log(`❌ PDF rejected: ${pageCount} pages > ${maxPDFPages} limit`);
				return {
					isValid: false,
					error: `PDF has too many pages (${pageCount}). Maximum allowed: ${maxPDFPages} pages.`
				};
			}

			if (pageCount > 10) {
				warnings.push(`Large PDF (${pageCount} pages) may take longer to process.`);
			}

			console.log(`✅ PDF page count OK: ${pageCount} pages`);
		} catch (error) {
			console.error('❌ PDF page count error:', error);
			// If we can't read the PDF, reject it to be safe
			return {
				isValid: false,
				error: 'Unable to verify PDF page count. Please ensure the PDF is not corrupted.'
			};
		}
	}

	return {
		isValid: true,
		warnings: warnings.length > 0 ? warnings : undefined
	};
}

/**
 * Get the number of pages in a PDF file using multiple methods
 */
export async function getPDFPageCount(file: File): Promise<number> {
	// Only run in browser environment
	if (typeof window === 'undefined') {
		throw new Error('PDF page counting only available in browser');
	}

	try {
		const arrayBuffer = await file.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		// Method 1: Look for /Type /Page entries (most reliable)
		const text = new TextDecoder('latin1').decode(uint8Array);
		const pageMatches = text.match(/\/Type\s*\/Page(?!\w)/g);
		if (pageMatches && pageMatches.length > 0) {
			console.log(`PDF page count (Type/Page method): ${pageMatches.length}`);
			return pageMatches.length;
		}

		// Method 2: Look for /Count entry in Pages object
		const countMatches = text.match(/\/Pages\s*<<[^>]*\/Count\s+(\d+)[^>]*>>/g);
		if (countMatches) {
			for (const match of countMatches) {
				const countMatch = match.match(/\/Count\s+(\d+)/);
				if (countMatch) {
					const count = parseInt(countMatch[1], 10);
					console.log(`PDF page count (Count method): ${count}`);
					return count;
				}
			}
		}

		// Method 3: Count page references more carefully
		const pageRefMatches = text.match(/\d+\s+0\s+obj\s*<<[^>]*\/Type\s*\/Page[^>]*>>/g);
		if (pageRefMatches && pageRefMatches.length > 0) {
			console.log(`PDF page count (page refs method): ${pageRefMatches.length}`);
			return pageRefMatches.length;
		}

		// Method 4: Conservative estimate - if we can't parse it properly,
		// assume it's large to be safe
		const estimatedPages = Math.max(20, Math.ceil(file.size / (50 * 1024))); // Conservative estimate
		console.warn(
			`Unable to parse PDF structure, using conservative estimate: ${estimatedPages} pages`
		);
		return estimatedPages;
	} catch (error) {
		// If all else fails, assume it's too large to be safe
		console.error('Failed to determine PDF page count:', error);
		return 999; // This will trigger the "too many pages" error
	}
}

/**
 * Format allowed file types for user-friendly display
 */
function formatAllowedTypes(allowedTypes: string[]): string {
	const extensions = allowedTypes
		.map((type) => type.split('/')[1]?.toUpperCase())
		.filter(Boolean)
		.filter((ext, index, arr) => arr.indexOf(ext) === index); // Remove duplicates

	if (extensions.length <= 2) {
		return extensions.join(' and ');
	} else {
		return extensions.slice(0, -1).join(', ') + ', and ' + extensions[extensions.length - 1];
	}
}

/**
 * Quick file type check without full validation
 */
export function isValidFileType(file: File): boolean {
	return DEFAULT_VALIDATION_LIMITS.allowedTypes.some(
		(type) => file.type === type || file.name.toLowerCase().endsWith('.' + type.split('/')[1])
	);
}

/**
 * Quick file size check without full validation
 */
export function isValidFileSize(file: File): boolean {
	const maxSize =
		file.type === 'application/pdf'
			? DEFAULT_VALIDATION_LIMITS.maxPDFSizeMB
			: DEFAULT_VALIDATION_LIMITS.maxImageSizeMB;
	const fileSizeMB = file.size / (1024 * 1024);
	return fileSizeMB <= maxSize;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Test function for debugging PDF page counting
 * Usage in browser console: window.testPDFPageCount(file)
 */
export async function testPDFPageCount(file: File): Promise<void> {
	if (typeof window !== 'undefined') {
		// Make this available globally for testing
		(window as any).testPDFPageCount = async (file: File) => {
			try {
				console.log(`Testing PDF: ${file.name} (${formatFileSize(file.size)})`);
				const pageCount = await getPDFPageCount(file);
				console.log(`Result: ${pageCount} pages`);
				return pageCount;
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		};
	}
}
