// Demo/test for Google Document AI integration
import { scanDocument } from './documentScanner.js';
import { extractTablesFromImage } from './ocrProcessor.js';

/**
 * Demo function to test Google Document AI integration
 *
 * Usage:
 * 1. Get an API key from Google Cloud Console for project 765754879203
 * 2. Call this function with a File and your API key
 * 3. Check the console for results
 */
export async function demoGoogleDocumentAI(file: File, apiKey: string) {
	console.log('=== Google Document AI Demo ===');
	console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);

	try {
		// Method 1: Direct OCR processor usage
		console.log('\n--- Method 1: Direct OCR Processor ---');
		const ocrResult = await extractTablesFromImage(file, {
			useGoogleDocumentAI: true,
			googleApiKey: apiKey,
			language: 'eng'
		});

		console.log('OCR Success:', ocrResult.success);
		console.log('Tables found:', ocrResult.tables.length);

		ocrResult.tables.forEach((table, index) => {
			console.log(`Table ${index + 1}:`);
			console.log('  Headers:', table.headers);
			console.log('  Rows:', table.rows.length);
			console.log('  Confidence:', table.confidence);
		});

		// Method 2: Document scanner usage
		console.log('\n--- Method 2: Document Scanner ---');
		const scanResult = await scanDocument(file, {
			useOCR: true,
			extractTables: true,
			googleApiKey: apiKey,
			useGoogleDocumentAI: true
		});

		console.log('Scan Type:', scanResult.type);
		console.log('Columns:', scanResult.columns?.length || 0);
		console.log('Rows:', scanResult.rows?.length || 0);
		console.log('Confidence:', scanResult.confidence);

		return {
			ocrResult,
			scanResult,
			success: true
		};
	} catch (error) {
		console.error('Demo failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Quick test to validate configuration
 */
export function validateGoogleDocumentAISetup(apiKey?: string) {
	console.log('=== Google Document AI Setup Validation ===');

	const issues: string[] = [];

	// Check if API key is provided
	if (!apiKey) {
		issues.push('No API key provided');
		console.log('❌ API key is missing');
	} else {
		console.log('✅ API key provided:', apiKey.substring(0, 10) + '...');
	}

	// Check configuration
	console.log('📋 Configuration:');
	console.log('  - Project ID: 765754879203');
	console.log('  - Location: us');
	console.log('  - Processor ID: c9b8c6fb78e18f74');
	console.log('  - Processor Name: projects/765754879203/locations/us/processors/c9b8c6fb78e18f74');

	// Instructions
	if (issues.length > 0) {
		console.log('\n🔧 Setup required:');
		console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
		console.log('2. Navigate to project 765754879203');
		console.log('3. Go to APIs & Services > Credentials');
		console.log('4. Create an API key');
		console.log('5. Enable Document AI API if not already enabled');
		console.log('6. Pass the API key to the demo function');
	} else {
		console.log('\n✅ Setup looks good! Ready to test.');
	}

	return {
		isValid: issues.length === 0,
		issues
	};
}

// Auto-validate setup when module loads
if (typeof window !== 'undefined') {
	console.log('🚀 Google Document AI demo module loaded');
	validateGoogleDocumentAISetup();

	// Add to window for easy testing in browser console
	(window as any).demoGoogleDocumentAI = demoGoogleDocumentAI;
	(window as any).validateGoogleDocumentAISetup = validateGoogleDocumentAISetup;

	console.log('💡 Test in browser console:');
	console.log('  validateGoogleDocumentAISetup("your-api-key")');
	console.log('  demoGoogleDocumentAI(fileFromInput, "your-api-key")');
}
