// SvelteKit API route for local development
// This provides the same functionality as the Vercel function but works in SvelteKit dev server

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Re-use the same logic as Vercel function but adapted for SvelteKit
export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('SvelteKit API: Processing document with Google Document AI...');

		// Parse the request
		const body = await request.json();
		const { content: fileData, mimeType } = body;

		if (!fileData || !mimeType) {
			return json(
				{
					success: false,
					error: 'Missing file content or MIME type'
				},
				{ status: 400 }
			);
		}

		// Use real Google Document AI in development too
		console.log('Calling Google Document AI...');
		console.log('File data length:', fileData.length);
		console.log('MIME type:', mimeType);

		try {
			// Import Google Document AI client
			const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');

			// Configuration from your values
			const projectId = '765754879203';
			const location = 'us';
			const processorId = 'c9b8c6fb78e18f74';

			// Get GCP credentials using Vercel pattern
			const getGCPCredentials = () => {
				// for Vercel, use environment variables
				return process.env.GCP_PRIVATE_KEY
					? {
							credentials: {
								client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
								private_key: process.env.GCP_PRIVATE_KEY
							},
							projectId: process.env.GCP_PROJECT_ID || projectId
						}
					: // for local development, use gcloud CLI or Application Default Credentials
						{ projectId };
			};

			// Instantiates a client with Vercel-style credentials
			const client = new DocumentProcessorServiceClient(getGCPCredentials());

			// The full resource name of the processor (exactly like official example)
			const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

			console.log('Using processor:', name);

			// Create request - exactly matching official example structure
			const request = {
				name,
				rawDocument: {
					content: fileData, // Already base64 encoded (like encodedImage in example)
					mimeType: mimeType
				}
			};

			console.log('Calling processDocument...');
			// Recognizes text entities in the document - exactly like official example
			const [result] = await client.processDocument(request);
			const { document } = result;

			// Get all of the document text as one big string - like official example
			const { text } = document;

			console.log('✅ Document processing completed');
			console.log('📄 Full text length:', text?.length || 0);

			// Process tables and form fields using the same getText function as official example
			const processedResult = processDocumentAIResultLikeOfficial(document, text);

			return json(processedResult);
		} catch (error) {
			console.error('Google Document AI processing failed:', error);

			// If Google Document AI fails, return error (don't fall back to mock data)
			return json(
				{
					success: false,
					error: `Google Document AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					details: error instanceof Error ? error.stack : undefined,
					note: 'Make sure GOOGLE_APPLICATION_CREDENTIALS environment variable is set with path to service account JSON file'
				},
				{ status: 500 }
			);
		}

		return json(result);
	} catch (error) {
		console.error('SvelteKit API error:', error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
};

/**
 * Process Document AI result using the official example approach
 */
function processDocumentAIResultLikeOfficial(document: any, text: string) {
	// Extract shards from the text field - exactly like official example
	const getText = (textAnchor: any) => {
		if (!textAnchor || !textAnchor.textSegments || textAnchor.textSegments.length === 0) {
			return '';
		}

		// First shard in document doesn't have startIndex property - exactly like official example
		const startIndex = textAnchor.textSegments[0].startIndex || 0;
		const endIndex = textAnchor.textSegments[0].endIndex;

		return text.substring(startIndex, endIndex);
	};

	// Extract tables (enhanced from official example)
	const tables = [];
	if (document.pages) {
		for (const page of document.pages) {
			if (page.tables) {
				for (const table of page.tables) {
					const extractedTable = extractTableFromDocumentAI(text, table, getText);
					if (extractedTable) {
						tables.push(extractedTable);
					}
				}
			}
		}
	} // Form parsing - exactly like official example
	console.log('The following form key/value pairs were detected:');
	const formFields = [];
	if (document.pages && document.pages[0]?.formFields) {
		const { formFields: fields } = document.pages[0];
		for (const field of fields) {
			const fieldName = getText(field.fieldName?.textAnchor);
			const fieldValue = getText(field.fieldValue?.textAnchor);

			console.log('Extracted key value pair:');
			console.log(`\t(${fieldName}, ${fieldValue})`);

			if (fieldName && fieldValue) {
				formFields.push({ name: fieldName, value: fieldValue });
			}
		}
	}

	// Log paragraphs like official example
	console.log('The document contains the following paragraphs:');
	if (document.pages && document.pages[0]?.paragraphs) {
		const [page1] = document.pages;
		const { paragraphs } = page1;

		for (const paragraph of paragraphs) {
			const paragraphText = getText(paragraph.layout?.textAnchor);
			console.log(`Paragraph text:\n${paragraphText}`);
		}
	}

	return {
		success: true,
		text: text || '',
		tables: tables,
		formFields: formFields,
		confidence: calculateAverageConfidence(document.pages),
		pages: document.pages?.length || 0
	};
}

/**
 * Extract text from text anchor
 */
function getTextFromAnchor(fullText: string, textAnchor: any): string {
	if (!textAnchor?.textSegments || textAnchor.textSegments.length === 0) {
		return '';
	}

	const startIndex = textAnchor.textSegments[0].startIndex || 0;
	const endIndex = textAnchor.textSegments[0].endIndex;

	return fullText.substring(parseInt(startIndex), parseInt(endIndex));
}

/**
 * Extract table data using official example's getText approach
 */
function extractTableFromDocumentAI(fullText: string, table: any, getText: Function) {
	try {
		const headers: string[] = [];
		const rows: string[][] = [];

		// Extract headers using official getText function
		if (table.headerRows && table.headerRows.length > 0) {
			const headerRow = table.headerRows[0];
			if (headerRow.cells) {
				for (const cell of headerRow.cells) {
					const cellText = getText(cell.layout?.textAnchor);
					headers.push(cellText.trim());
				}
			}
		}

		// Extract data rows using official getText function
		if (table.bodyRows) {
			for (const bodyRow of table.bodyRows) {
				if (bodyRow.cells) {
					const row: string[] = [];
					for (const cell of bodyRow.cells) {
						const cellText = getText(cell.layout?.textAnchor);
						row.push(cellText.trim());
					}
					rows.push(row);
				}
			}
		}

		// If no headers, use first row as headers
		if (headers.length === 0 && rows.length > 0) {
			headers.push(...rows[0]);
			rows.shift();
		}

		console.log(`Extracted table with ${headers.length} columns and ${rows.length} rows`);

		return {
			headers,
			rows,
			confidence: table.layout?.confidence || 0
		};
	} catch (error) {
		console.error('Error extracting table:', error);
		return null;
	}
}

/**
 * Calculate average confidence
 */
function calculateAverageConfidence(pages: any[]): number {
	if (!pages || pages.length === 0) return 0;

	let totalConfidence = 0;
	let count = 0;

	for (const page of pages) {
		if (page.layout?.confidence !== undefined) {
			totalConfidence += page.layout.confidence;
			count++;
		}
	}

	return count > 0 ? totalConfidence / count : 0;
}
