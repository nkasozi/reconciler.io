// Vercel serverless function for Google Document AI processing
// This runs in Vercel's serverless environment

const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;

// Your Google Document AI configuration
const CONFIG = {
	projectId: '765754879203',
	location: 'us',
	processorId: 'c9b8c6fb78e18f74'
};

// Get GCP credentials using Vercel pattern
const getGCPCredentials = () => {
	// for Vercel, use environment variables
	return process.env.GCP_PRIVATE_KEY
		? {
				credentials: {
					client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
					private_key: process.env.GCP_PRIVATE_KEY
				},
				projectId: process.env.GCP_PROJECT_ID || CONFIG.projectId
			}
		: // fallback to Application Default Credentials
			{ projectId: CONFIG.projectId };
};

// Initialize Document AI client with Vercel-style credentials
let client;
try {
	client = new DocumentProcessorServiceClient(getGCPCredentials());
} catch (error) {
	console.error('Failed to initialize Document AI client:', error);
}

/**
 * Vercel serverless function handler
 * Processes documents using Google Document AI
 */
module.exports = async (req, res) => {
	// Enable CORS for frontend calls
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	// Handle preflight OPTIONS request
	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}

	// Only allow POST requests
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}

	try {
		console.log('Processing document with Google Document AI...');

		// Parse the request body
		let fileData;
		let mimeType;

		if (req.body) {
			// Handle JSON body (base64 encoded file)
			if (typeof req.body === 'string') {
				const parsed = JSON.parse(req.body);
				fileData = parsed.content;
				mimeType = parsed.mimeType;
			} else {
				fileData = req.body.content;
				mimeType = req.body.mimeType;
			}
		} else {
			throw new Error('No file data provided');
		}

		if (!fileData || !mimeType) {
			throw new Error('Missing file content or MIME type');
		}

		// The full resource name of the processor
		const name = `projects/${CONFIG.projectId}/locations/${CONFIG.location}/processors/${CONFIG.processorId}`;

		console.log('Using processor:', name);
		console.log('MIME type:', mimeType);

		// Create the request
		const request = {
			name,
			rawDocument: {
				content: fileData, // Base64 encoded content
				mimeType: mimeType
			}
		};

		// Process the document
		console.log('Calling Document AI...');
		const [result] = await client.processDocument(request);
		const { document } = result;

		// Extract text and tables (similar to Node.js example)
		const { text } = document;
		console.log('Document text length:', text?.length || 0);

		// Extract tables
		const tables = [];
		if (document.pages) {
			for (const page of document.pages) {
				if (page.tables) {
					for (const table of page.tables) {
						const extractedTable = extractTableFromDocumentAI(text, table);
						if (extractedTable) {
							tables.push(extractedTable);
						}
					}
				}
			}
		}

		// Extract form fields
		const formFields = [];
		if (document.pages && document.pages[0]?.formFields) {
			for (const field of document.pages[0].formFields) {
				const fieldName = getTextFromAnchor(text, field.fieldName?.textAnchor);
				const fieldValue = getTextFromAnchor(text, field.fieldValue?.textAnchor);
				if (fieldName && fieldValue) {
					formFields.push({ name: fieldName, value: fieldValue });
				}
			}
		}

		console.log('Extracted tables:', tables.length);
		console.log('Extracted form fields:', formFields.length);

		// Return processed result
		res.status(200).json({
			success: true,
			text: text || '',
			tables: tables,
			formFields: formFields,
			confidence: calculateAverageConfidence(document.pages),
			pages: document.pages?.length || 0
		});
	} catch (error) {
		console.error('Document processing error:', error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to process document',
			details: error.stack
		});
	}
};

/**
 * Extract text from text anchor (from Node.js example)
 */
function getTextFromAnchor(fullText, textAnchor) {
	if (!textAnchor?.textSegments || textAnchor.textSegments.length === 0) {
		return '';
	}

	// First shard in document doesn't have startIndex property
	const startIndex = textAnchor.textSegments[0].startIndex || 0;
	const endIndex = textAnchor.textSegments[0].endIndex;

	return fullText.substring(parseInt(startIndex), parseInt(endIndex));
}

/**
 * Extract table data from Document AI table structure
 */
function extractTableFromDocumentAI(fullText, table) {
	try {
		const headers = [];
		const rows = [];

		// Extract headers from headerRows or first bodyRow
		if (table.headerRows && table.headerRows.length > 0) {
			const headerRow = table.headerRows[0];
			if (headerRow.cells) {
				for (const cell of headerRow.cells) {
					const cellText = getTextFromAnchor(fullText, cell.layout?.textAnchor);
					headers.push(cellText.trim());
				}
			}
		}

		// Extract data rows
		if (table.bodyRows) {
			for (const bodyRow of table.bodyRows) {
				if (bodyRow.cells) {
					const row = [];
					for (const cell of bodyRow.cells) {
						const cellText = getTextFromAnchor(fullText, cell.layout?.textAnchor);
						row.push(cellText.trim());
					}
					rows.push(row);
				}
			}
		}

		// If no headers found, use first data row as headers
		if (headers.length === 0 && rows.length > 0) {
			headers.push(...rows[0]);
			rows.shift(); // Remove first row as it's now headers
		}

		return {
			headers: headers,
			rows: rows,
			confidence: table.layout?.confidence || 0
		};
	} catch (error) {
		console.error('Error extracting table:', error);
		return null;
	}
}

/**
 * Calculate average confidence from pages
 */
function calculateAverageConfidence(pages) {
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
