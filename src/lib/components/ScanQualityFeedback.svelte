<script lang="ts">
	export let scanResult: any = null;
	export let showDetails = false;

	interface QualityAssessment {
		overall: 'excellent' | 'good' | 'fair' | 'poor';
		score: number;
		confidence?: number;
		textAmount: 'excellent' | 'good' | 'fair' | 'poor';
		structure: 'detected' | 'partial' | 'none';
		issues: string[];
		suggestions: string[];
	}

	function assessQuality(result: any): QualityAssessment {
		if (!result) {
			return {
				overall: 'poor',
				score: 0,
				textAmount: 'poor',
				structure: 'none',
				issues: ['No scan result available'],
				suggestions: ['Please scan a document first']
			};
		}

		const assessment: QualityAssessment = {
			overall: 'good',
			score: 100,
			confidence: result.confidence,
			textAmount: 'good',
			structure: 'none',
			issues: [],
			suggestions: []
		};

		// Assess OCR confidence
		if (result.confidence !== undefined) {
			if (result.confidence < 50) {
				assessment.score -= 40;
				assessment.issues.push('Very low text recognition accuracy');
				assessment.suggestions.push('Improve lighting and ensure text is clearly visible');
			} else if (result.confidence < 70) {
				assessment.score -= 20;
				assessment.issues.push('Moderate text recognition accuracy');
				assessment.suggestions.push('Try better lighting or higher resolution');
			} else if (result.confidence < 85) {
				assessment.score -= 10;
				assessment.suggestions.push(
					'Good quality - minor improvements possible with better lighting'
				);
			}
		}

		// Assess text amount
		const textLength = result.text ? result.text.length : 0;
		if (textLength < 20) {
			assessment.textAmount = 'poor';
			assessment.score -= 30;
			assessment.issues.push('Very little text detected');
			assessment.suggestions.push('Ensure the entire document is visible in the frame');
		} else if (textLength < 100) {
			assessment.textAmount = 'fair';
			assessment.score -= 15;
			assessment.issues.push('Limited text detected');
			assessment.suggestions.push('Check that all document content is captured');
		} else if (textLength < 500) {
			assessment.textAmount = 'good';
		} else {
			assessment.textAmount = 'excellent';
		}

		// Assess table structure
		if (result.tableData && result.tableData.length > 0) {
			if (result.tableData.length > 5) {
				assessment.structure = 'detected';
			} else {
				assessment.structure = 'partial';
				assessment.score -= 10;
				assessment.suggestions.push('Some table structure detected - ensure all rows are visible');
			}
		} else {
			assessment.structure = 'none';
			assessment.score -= 15;
			assessment.issues.push('No structured table data detected');
			assessment.suggestions.push('Ensure tables have clear borders and spacing');
		}

		// Determine overall quality
		assessment.score = Math.max(0, assessment.score);
		if (assessment.score >= 85) {
			assessment.overall = 'excellent';
		} else if (assessment.score >= 70) {
			assessment.overall = 'good';
		} else if (assessment.score >= 50) {
			assessment.overall = 'fair';
		} else {
			assessment.overall = 'poor';
		}

		return assessment;
	}

	$: quality = assessQuality(scanResult);

	function getQualityColor(level: string): string {
		switch (level) {
			case 'excellent':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'good':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'fair':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'poor':
				return 'text-red-600 bg-red-50 border-red-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	}

	function getQualityIcon(level: string): string {
		switch (level) {
			case 'excellent':
				return '✓';
			case 'good':
				return '◐';
			case 'fair':
				return '◑';
			case 'poor':
				return '✗';
			default:
				return '?';
		}
	}
</script>

{#if scanResult}
	<div class="rounded-lg border p-4 {getQualityColor(quality.overall)}">
		<div class="mb-3 flex items-center justify-between">
			<div class="flex items-center space-x-2">
				<span class="text-xl">{getQualityIcon(quality.overall)}</span>
				<h3 class="font-medium capitalize">{quality.overall} Quality</h3>
				<span class="text-sm opacity-75">({quality.score}%)</span>
			</div>

			<button
				type="button"
				on:click={() => (showDetails = !showDetails)}
				class="text-sm opacity-75 transition-opacity hover:opacity-100"
			>
				{showDetails ? 'Hide' : 'Show'} Details
			</button>
		</div>

		<!-- Quick summary -->
		<div class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
			<div class="flex items-center space-x-2">
				<span
					class="h-2 w-2 rounded-full {quality.textAmount === 'excellent'
						? 'bg-green-400'
						: quality.textAmount === 'good'
							? 'bg-blue-400'
							: quality.textAmount === 'fair'
								? 'bg-yellow-400'
								: 'bg-red-400'}"
				></span>
				<span>Text: {quality.textAmount}</span>
			</div>

			{#if quality.confidence !== undefined}
				<div class="flex items-center space-x-2">
					<span
						class="h-2 w-2 rounded-full {quality.confidence >= 85
							? 'bg-green-400'
							: quality.confidence >= 70
								? 'bg-blue-400'
								: quality.confidence >= 50
									? 'bg-yellow-400'
									: 'bg-red-400'}"
					></span>
					<span>Accuracy: {quality.confidence.toFixed(1)}%</span>
				</div>
			{/if}

			<div class="flex items-center space-x-2">
				<span
					class="h-2 w-2 rounded-full {quality.structure === 'detected'
						? 'bg-green-400'
						: quality.structure === 'partial'
							? 'bg-yellow-400'
							: 'bg-red-400'}"
				></span>
				<span
					>Structure: {quality.structure === 'detected'
						? 'Good'
						: quality.structure === 'partial'
							? 'Partial'
							: 'None'}</span
				>
			</div>
		</div>

		<!-- Detailed feedback -->
		{#if showDetails}
			<div class="mt-4 space-y-3">
				{#if quality.issues.length > 0}
					<div>
						<h4 class="mb-2 font-medium">Issues Found:</h4>
						<ul class="space-y-1 text-sm opacity-90">
							{#each quality.issues as issue}
								<li>• {issue}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if quality.suggestions.length > 0}
					<div>
						<h4 class="mb-2 font-medium">Suggestions:</h4>
						<ul class="space-y-1 text-sm opacity-90">
							{#each quality.suggestions as suggestion}
								<li>• {suggestion}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if scanResult.text}
					<div>
						<h4 class="mb-2 font-medium">Detected Text (first 200 chars):</h4>
						<p class="rounded border bg-white bg-opacity-50 p-2 text-sm opacity-90">
							{scanResult.text.substring(0, 200)}{scanResult.text.length > 200 ? '...' : ''}
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
