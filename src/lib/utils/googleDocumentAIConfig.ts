// Configuration for Google Document AI
import type { GoogleDocumentAIConfig } from './googleDocumentAI.js';

/**
 * Google Document AI configuration
 *
 * Based on your Node.js sample constants:
 * const projectId = '765754879203';
 * const location = 'us'; // Format is 'us' or 'eu'
 * const processorId = 'c9b8c6fb78e18f74'; // Create processor in Cloud Console
 */
export const GOOGLE_DOCUMENT_AI_CONFIG: GoogleDocumentAIConfig = {
	projectId: '765754879203',
	location: 'us',
	processorId: 'c9b8c6fb78e18f74',
	apiKey: '' // You need to provide an API key for REST API access
};

/**
 * Development configuration
 */
export const DEVELOPMENT_CONFIG: GoogleDocumentAIConfig = {
	...GOOGLE_DOCUMENT_AI_CONFIG
	// Same config for development
};

/**
 * Get configuration for Google Document AI
 */
export function getGoogleDocumentAIConfig(): GoogleDocumentAIConfig {
	return GOOGLE_DOCUMENT_AI_CONFIG;
}

/**
 * Validate configuration
 */
export function validateConfig(config: GoogleDocumentAIConfig): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!config.apiKey) {
		errors.push('API key is required for REST API access');
	}

	if (!config.projectId) {
		errors.push('Project ID is required');
	}

	if (!config.processorId) {
		errors.push('Processor ID is required');
	}

	if (config.location && !['us', 'eu'].includes(config.location)) {
		errors.push('Location must be "us" or "eu"');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Instructions for setup
 */
export const SETUP_INSTRUCTIONS = `
Google Document AI Setup Instructions:

1. Your configuration is already set up based on the Node.js example:
   - Project ID: 765754879203
   - Location: us
   - Processor ID: c9b8c6fb78e18f74

2. You need to create an API key:
   - Go to Google Cloud Console: https://console.cloud.google.com/
   - Navigate to project "765754879203"
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key and add it to the config

3. Ensure Document AI API is enabled:
   - Go to APIs & Services > Library
   - Search for "Document AI API"
   - Make sure it's enabled for project 765754879203

4. Your processor (c9b8c6fb78e18f74) should already exist in the Cloud Console.

5. Test the integration by uploading a document through the DocumentScanner.

The processor name will be:
projects/765754879203/locations/us/processors/c9b8c6fb78e18f74
`;

console.log('Google Document AI configuration loaded');
console.log('Project ID:', GOOGLE_DOCUMENT_AI_CONFIG.projectId);
console.log('Processor ID:', GOOGLE_DOCUMENT_AI_CONFIG.processorId);
console.log('Location:', GOOGLE_DOCUMENT_AI_CONFIG.location);
