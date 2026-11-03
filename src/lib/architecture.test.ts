import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const LIBRARY_DIRECTORY = join(process.cwd(), 'src/lib');
const SOURCE_DIRECTORY = join(process.cwd(), 'src');
const MAXIMUM_LINES_PER_FILE = 400;
const INFRASTRUCTURE_PACKAGES = ['papaparse', 'xlsx', 'pdfjs-dist', 'tesseract.js', 'dexie'];

type LayerRule = { layerDirectory: string; forbiddenImportPatterns: RegExp[] };

const LAYER_RULES: LayerRule[] = [
	{ layerDirectory: 'engine', forbiddenImportPatterns: [/\$lib\/(adapters|components|application)\//, /\$app\//, ...INFRASTRUCTURE_PACKAGES.map((packageName) => new RegExp(`from '${packageName}`))] },
	{ layerDirectory: 'ports', forbiddenImportPatterns: [/\$lib\/(adapters|components|application)\//, /\$app\//, ...INFRASTRUCTURE_PACKAGES.map((packageName) => new RegExp(`from '${packageName}`))] },
	{ layerDirectory: 'application', forbiddenImportPatterns: [/\$lib\/(adapters|components)\//, /\$app\//, ...INFRASTRUCTURE_PACKAGES.map((packageName) => new RegExp(`from '${packageName}`))] },
	{ layerDirectory: 'components', forbiddenImportPatterns: [/\$lib\/adapters\//, ...INFRASTRUCTURE_PACKAGES.map((packageName) => new RegExp(`from '${packageName}`))] }
];

function listSourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entryName) => {
		const entryPath = join(directory, entryName);
		if (statSync(entryPath).isDirectory()) return listSourceFiles(entryPath);
		return /\.(ts|svelte)$/.test(entryName) ? [entryPath] : [];
	});
}

function isTestFile(filePath: string): boolean {
	return /\.test\.ts$/.test(filePath);
}

describe('ports and adapters architecture', () => {
	for (const layerRule of LAYER_RULES) {
		it(`keeps ${layerRule.layerDirectory} free of the layers it must not depend on`, () => {
			const violations = listSourceFiles(join(LIBRARY_DIRECTORY, layerRule.layerDirectory))
				.filter((filePath) => !isTestFile(filePath))
				.flatMap((filePath) => {
					const importLines = readFileSync(filePath, 'utf8').split('\n').filter((line) => /^\s*import\b/.test(line));
					return importLines.filter((importLine) => layerRule.forbiddenImportPatterns.some((pattern) => pattern.test(importLine))).map((importLine) => `${relative(SOURCE_DIRECTORY, filePath)}: ${importLine.trim()}`);
				});
			expect(violations).toEqual([]);
		});
	}

	it(`keeps every source file under ${MAXIMUM_LINES_PER_FILE} lines`, () => {
		const oversizedFiles = listSourceFiles(SOURCE_DIRECTORY)
			.map((filePath) => ({ filePath: relative(SOURCE_DIRECTORY, filePath), lineCount: readFileSync(filePath, 'utf8').split('\n').length }))
			.filter((sourceFile) => sourceFile.lineCount > MAXIMUM_LINES_PER_FILE)
			.map((sourceFile) => `${sourceFile.filePath} (${sourceFile.lineCount} lines)`);
		expect(oversizedFiles).toEqual([]);
	});
});
