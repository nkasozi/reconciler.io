import { expect, test } from '@playwright/test';

test.describe('Reconciliation flow', () => {
	test('reconciles two CSV files and lists the differences', async ({ page }) => {
		await page.goto('/reconcile');
		const fileInputs = page.locator('input[type="file"]');
		await fileInputs.nth(0).setInputFiles({
			name: 'ledger.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from('Ref,Amount,Date\nINV-1,100.00,2024-01-01\nINV-2,200.00,2024-01-02\nINV-3,300.00,2024-01-03')
		});
		await fileInputs.nth(1).setInputFiles({
			name: 'bank.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from('Reference,Value,Posted\ninv1,100,2024-01-01\nINV 2,250,2024-01-02\nINV-4,400,2024-01-04')
		});
		await expect(page.getByRole('heading', { name: 'Which columns belong together?' })).toBeVisible();
		await page.getByRole('button', { name: 'Match them →' }).click();
		await expect(page.getByRole('heading', { level: 2 }).filter({ hasText: 'need' })).toBeVisible();
		await expect(page.getByText('INV-2')).toBeVisible();
		await expect(page.getByText('Off by -50.00')).toBeVisible();
	});

	test('redirects retired pages to the new flow', async ({ page }) => {
		await page.goto('/upload');
		await expect(page).toHaveURL(/\/reconcile$/);
	});
});
