import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsPackageFolder = join(projectRoot, 'node_modules', 'pdfjs-dist');
const publicPdfjsFolder = join(projectRoot, 'static', 'pdfjs');
const ASSET_FOLDERS_NEEDED_IN_BROWSER = ['wasm', 'iccs', 'cmaps', 'standard_fonts'];

if (!existsSync(pdfjsPackageFolder)) {
	console.log('[copyPdfjsAssets] pdfjs-dist is not installed yet, skipping');
	process.exit(0);
}
mkdirSync(publicPdfjsFolder, { recursive: true });
for (const assetFolder of ASSET_FOLDERS_NEEDED_IN_BROWSER) {
	cpSync(join(pdfjsPackageFolder, assetFolder), join(publicPdfjsFolder, assetFolder), { recursive: true });
}
console.log(`[copyPdfjsAssets] Copied ${ASSET_FOLDERS_NEEDED_IN_BROWSER.join(', ')} to static/pdfjs`);
