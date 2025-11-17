// Google Document AI integration for OCR and table extraction
// TypeScript implementation based on Node.js @google-cloud/documentai example

/**
 * Configuration based on your Python sample:
 * project_id="765754879203"
 * location="us"
 * processor_id="c9b8c6fb78e18f74"
 */
export interface GoogleDocumentAIConfig {
	projectId: string; // YOUR_PROJECT_ID: '765754879203'
	location: string; // YOUR_PROJECT_LOCATION: 'us' or 'eu'
	processorId: string; // YOUR_PROCESSOR_ID: 'c9b8c6fb78e18f74'
	apiKey: string; // API key for REST API authentication
}

export interface GoogleDocumentAIResult {
	text: string;
	tables: GoogleDocumentTable[];
	confidence: number;
	pages: GoogleDocumentPage[];
	success: boolean;
	error?: string;
}

export interface GoogleDocumentTable {
	headers: string[];
	rows: string[][];
	confidence: number;
	boundingBox?: BoundingBox;
}

export interface GoogleDocumentPage {
	pageNumber: number;
	text: string;
	width: number;
	height: number;
}

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

// Internal interfaces matching Google Document AI response format
interface TextAnchor {
	textSegments: Array<{
		startIndex?: string;
		endIndex: string;
	}>;
}

interface DocumentAITableCell {
	layout: {
		textAnchor: TextAnchor;
		confidence: number;
		boundingPoly?: {
			normalizedVertices: Array<{ x: number; y: number }>;
		};
	};
	rowSpan?: number;
	colSpan?: number;
}

interface DocumentAITableRow {
	cells: DocumentAITableCell[];
}

interface DocumentAITable {
	layout: {
		textAnchor: TextAnchor;
		confidence: number;
		boundingPoly?: {
			normalizedVertices: Array<{ x: number; y: number }>;
		};
	};
	headerRows?: DocumentAITableRow[];
	bodyRows?: DocumentAITableRow[];
}

interface FormField {
	fieldName: {
		textAnchor: TextAnchor;
	};
	fieldValue: {
		textAnchor: TextAnchor;
	};
}

interface DocumentAIPage {
	pageNumber: number;
	dimension?: {
		width: number;
		height: number;
		unit: string;
	};
	layout?: {
		textAnchor: TextAnchor;
		confidence: number;
	};
	tables?: DocumentAITable[];
	formFields?: FormField[];
	paragraphs?: Array<{
		layout: {
			textAnchor: TextAnchor;
		};
	}>;
}

interface DocumentAIResponse {
	document: {
		text: string;
		pages: DocumentAIPage[];
	};
}

/**
 * Google Document AI processor - TypeScript browser implementation
 * Based on Node.js DocumentProcessorServiceClient example
 */
export class GoogleDocumentAIProcessor {
	private config: GoogleDocumentAIConfig;
	private processorName: string;

	constructor(config: GoogleDocumentAIConfig) {
		this.config = config;
		// The full resource name of the processor
		// projects/project-id/locations/location/processors/processor-id
		this.processorName = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;
	}

	/**
	 * Process a document using Google Document AI
	 * Equivalent to client.processDocument(request) in Node.js
	 */
	async processDocument(file: File): Promise<GoogleDocumentAIResult> {
		try {
			console.log('Processing document with Google Document AI...');
			console.log('Processor:', this.processorName);

			// Convert file to base64 (equivalent to fs.readFile + Buffer.from().toString('base64'))
			const encodedImage = await this.fileToBase64(file);

			// Determine MIME type
			const mimeType = this.getMimeType(file);

			// Create request matching Node.js example structure
			const request = {
				name: this.processorName,
				rawDocument: {
					content: encodedImage,
					mimeType: mimeType
				}
			};

			// Call the Document AI REST API
			const response = await this.callDocumentAI(request);

			// Parse the response (equivalent to processing result.document)
			return this.parseDocumentAIResponse(response);
		} catch (error) {
			console.error('Google Document AI processing error:', error);
			return {
				text: '',
				tables: [],
				confidence: 0,
				pages: [],
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	/**
	 * Convert File to base64 string
	 * Equivalent to: Buffer.from(imageFile).toString('base64')
	 */
	private async fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Remove the data URL prefix and get just the base64 content
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	/**
	 * Get MIME type from file
	 */
	private getMimeType(file: File): string {
		if (file.type) {
			return file.type;
		}

		// Fallback based on file extension
		const extension = file.name.toLowerCase().split('.').pop();
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
	 * Call Google Document AI REST API
	 * Browser equivalent of: await client.processDocument(request)
	 */
	private async callDocumentAI(request: any): Promise<DocumentAIResponse> {
		const endpoint = `https://documentai.googleapis.com/v1/${this.processorName}:process`;

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.config.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(request)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Google Document AI API error: ${response.status} - ${errorText}`);
		}

		return await response.json();
	}

	/**
	 * Parse Document AI response into our format
	 * Based on Node.js example: const {document} = result;
	 */
	private parseDocumentAIResponse(response: DocumentAIResponse): GoogleDocumentAIResult {
		const { document } = response;
		const { text } = document;

		console.log('Document text length:', text?.length || 0);

		// Extract pages
		const pages: GoogleDocumentPage[] =
			document.pages?.map((page) => ({
				pageNumber: page.pageNumber || 1,
				text: this.getText(text, page.layout?.textAnchor),
				width: page.dimension?.width || 0,
				height: page.dimension?.height || 0
			})) || [];

		// Extract tables from pages
		const tables: GoogleDocumentTable[] = [];

		document.pages?.forEach((page) => {
			page.tables?.forEach((table) => {
				const extractedTable = this.extractTable(text, table);
				if (extractedTable) {
					tables.push(extractedTable);
				}
			});
		});

		// Log form fields (like in Node.js example)
		this.logFormFields(text, document.pages);

		// Calculate overall confidence
		const avgConfidence =
			pages.length > 0
				? pages.reduce((sum, page) => {
						const pageData = document.pages?.find((p) => p.pageNumber === page.pageNumber);
						return sum + (pageData?.layout?.confidence || 0);
					}, 0) / pages.length
				: 0;

		console.log('Extracted tables:', tables.length);
		console.log('Average confidence:', avgConfidence);

		return {
			text: text || '',
			tables,
			confidence: avgConfidence,
			pages,
			success: true
		};
	}

	/**
	 * Extract text from text anchor
	 * Equivalent to getText() function in Node.js example
	 */
	private getText(fullText: string, textAnchor?: TextAnchor): string {
		if (!textAnchor?.textSegments || textAnchor.textSegments.length === 0) {
			return '';
		}

		// First shard in document doesn't have startIndex property
		const segment = textAnchor.textSegments[0];
		const startIndex = parseInt(segment.startIndex || '0');
		const endIndex = parseInt(segment.endIndex || '0');

		return fullText.substring(startIndex, endIndex);
	}

	/**
	 * Extract table data from Document AI table structure
	 */
	private extractTable(fullText: string, table: DocumentAITable): GoogleDocumentTable | null {
		try {
			// Extract headers
			const headers: string[] = [];
			table.headerRows?.forEach((row) => {
				row.cells?.forEach((cell, index) => {
					if (index >= headers.length) {
						headers.push('');
					}
					const cellText = this.getText(fullText, cell.layout?.textAnchor);
					if (cellText.trim()) {
						headers[index] = cellText.trim();
					}
				});
			});

			// If no header rows, use first body row as headers
			if (headers.length === 0 && table.bodyRows && table.bodyRows.length > 0) {
				table.bodyRows[0]?.cells?.forEach((cell) => {
					const cellText = this.getText(fullText, cell.layout?.textAnchor);
					headers.push(cellText.trim() || `Column ${headers.length + 1}`);
				});
				// Remove the first body row as it's now the header
				table.bodyRows = table.bodyRows.slice(1);
			}

			// Extract body rows
			const rows: string[][] = [];
			table.bodyRows?.forEach((row) => {
				const rowData: string[] = [];
				row.cells?.forEach((cell, index) => {
					const cellText = this.getText(fullText, cell.layout?.textAnchor);
					rowData[index] = cellText.trim();
				});

				// Ensure row has same length as headers
				while (rowData.length < headers.length) {
					rowData.push('');
				}

				rows.push(rowData);
			});

			const tableConfidence = table.layout?.confidence || 0;
			const boundingBox = this.calculateBoundingBox(table.layout?.boundingPoly);

			console.log(`Extracted table with ${headers.length} columns and ${rows.length} rows`);

			return {
				headers,
				rows,
				confidence: tableConfidence,
				boundingBox
			};
		} catch (error) {
			console.error('Error extracting table:', error);
			return null;
		}
	}

	/**
	 * Log form fields like in Node.js example
	 */
	private logFormFields(fullText: string, pages?: DocumentAIPage[]): void {
		if (!pages || pages.length === 0) return;

		console.log('Form key/value pairs detected:');
		const [page1] = pages;
		const { formFields } = page1;

		if (formFields) {
			for (const field of formFields) {
				const fieldName = this.getText(fullText, field.fieldName.textAnchor);
				const fieldValue = this.getText(fullText, field.fieldValue.textAnchor);
				console.log(`Key-value pair: (${fieldName}, ${fieldValue})`);
			}
		}
	}

	/**
	 * Calculate bounding box from polygon vertices
	 */
	private calculateBoundingBox(boundingPoly?: {
		normalizedVertices: Array<{ x: number; y: number }>;
	}): BoundingBox | undefined {
		if (!boundingPoly?.normalizedVertices || boundingPoly.normalizedVertices.length === 0) {
			return undefined;
		}

		const vertices = boundingPoly.normalizedVertices;
		const minX = Math.min(...vertices.map((v) => v.x));
		const minY = Math.min(...vertices.map((v) => v.y));
		const maxX = Math.max(...vertices.map((v) => v.x));
		const maxY = Math.max(...vertices.map((v) => v.y));

		return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY
		};
	}
}

/**
 * Factory function to create a Google Document AI processor
 */
export function createGoogleDocumentAIProcessor(
	config: GoogleDocumentAIConfig
): GoogleDocumentAIProcessor {
	return new GoogleDocumentAIProcessor(config);
}

/**
 * Convenience function to process a document with your specific configuration
 */
export async function processDocumentWithGoogleAI(
	file: File,
	apiKey: string
): Promise<GoogleDocumentAIResult> {
	const processor = createGoogleDocumentAIProcessor({
		projectId: '765754879203',
		location: 'us',
		processorId: 'c9b8c6fb78e18f74',
		apiKey: apiKey
	});

	return await processor.processDocument(file);
}
