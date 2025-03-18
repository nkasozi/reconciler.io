import { expect, test } from '@playwright/test';

test.describe('Reconciliation Flow', () => {
  test('complete reconciliation process from upload to results', async ({ page }) => {
    // Go to the upload page
    await page.goto('/upload');
    await expect(page.locator('h1')).toContainText('Upload Files');
    
    // Create mock CSV data
    const primaryCSV = 'ID,Name,Amount,Date\n1,John Doe,100,2023-01-01\n2,Jane Smith,200,2023-01-02\n3,Bob Johnson,300,2023-01-03';
    const comparisonCSV = 'ID,FullName,Value,TransactionDate\n1,John Doe,100,2023-01-01\n2,Jane Smith,250,2023-01-02\n4,Eve Williams,400,2023-01-04';
    
    // Mock file upload for primary file
    await page.setInputFiles('input[data-testid="primary-file-input"]', {
      name: 'primary.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(primaryCSV)
    });
    
    // Check if the primary file is uploaded
    await expect(page.locator('[data-testid="primary-file-name"]')).toContainText('primary.csv');
    
    // Mock file upload for comparison file
    await page.setInputFiles('input[data-testid="comparison-file-input"]', {
      name: 'comparison.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(comparisonCSV)
    });
    
    // Check if the comparison file is uploaded
    await expect(page.locator('[data-testid="comparison-file-name"]')).toContainText('comparison.csv');
    
    // Click continue button
    await page.click('button:has-text("Continue")');
    
    // Column Selection Page
    await expect(page).toHaveURL('/column-selection');
    await expect(page.locator('h1')).toContainText('Column Mapping');
    
    // Wait for the column selection UI to load
    await page.waitForSelector('[data-testid="id-column-mapping"]');
    
    // Select ID mapping
    await page.selectOption('[data-testid="primary-id-column"]', 'ID');
    await page.selectOption('[data-testid="comparison-id-column"]', 'ID');
    
    // Map one column for comparison
    await page.click('[data-testid="add-column-mapping"]');
    await page.selectOption('[data-testid="primary-column-0"]', 'Name');
    await page.selectOption('[data-testid="comparison-column-0"]', 'FullName');
    
    // Add another column mapping
    await page.click('[data-testid="add-column-mapping"]');
    await page.selectOption('[data-testid="primary-column-1"]', 'Amount');
    await page.selectOption('[data-testid="comparison-column-1"]', 'Value');
    
    // Add one more column mapping
    await page.click('[data-testid="add-column-mapping"]');
    await page.selectOption('[data-testid="primary-column-2"]', 'Date');
    await page.selectOption('[data-testid="comparison-column-2"]', 'TransactionDate');
    
    // Click the reconcile button
    await page.click('button:has-text("Start Reconciliation")');
    
    // Reconciliation Progress Page
    await expect(page).toHaveURL('/reconciliation-progress');
    await expect(page.locator('h1')).toContainText('Reconciliation in Progress');
    
    // Wait for reconciliation to complete
    await page.waitForSelector('text=Reconciliation Complete', { timeout: 10000 });
    
    // Click the view results button
    await page.click('button:has-text("View Results")');
    
    // Reconciliation Results Page
    await expect(page).toHaveURL('/reconciliation-results');
    await expect(page.locator('h1')).toContainText('Reconciliation Failure Analysis');
    
    // Check summary statistics
    await expect(page.locator('text=Total Records')).toBeVisible();
    await expect(page.locator('text=Matched')).toBeVisible();
    await expect(page.locator('text=Failures')).toBeVisible();
    
    // Verify that failures are detected
    await expect(page.locator('text=Failure 1 of')).toBeVisible();
    
    // Check for partial matches (Jane Smith record has different Amount/Value)
    await expect(page.locator('text=Partial Match')).toBeVisible();
    
    // Check that the download button is available
    await expect(page.locator('button:has-text("Download Results")')).toBeVisible();
    
    // Navigate through failures
    const nextButton = page.locator('button[aria-label="Next failure"]');
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      // Should show the next failure
      await expect(page.locator('text=Failure 2 of')).toBeVisible();
    }
  });

  test('handles row limit exceeded error', async ({ page }) => {
    // Go to the upload page
    await page.goto('/upload');
    await expect(page.locator('h1')).toContainText('Upload Files');
    
    // Create a CSV with more than MAX_FREE_TIER_ROWS rows
    // Generate a large CSV (for this test, we'll actually use a small one and mock the error)
    let largeCSV = 'ID,Name,Amount\n';
    for (let i = 1; i <= 5; i++) {
      largeCSV += `${i},User${i},${i * 100}\n`;
    }
    
    // Enable request interception to simulate the row limit error
    await page.route('**/api/parse', async route => {
      // Respond with a custom error
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'RowLimitExceeded',
          message: 'Free tier limit of 10,000 rows exceeded',
          rowCount: 10001 
        })
      });
    });
    
    // Upload a "large" file
    await page.setInputFiles('input[data-testid="primary-file-input"]', {
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeCSV)
    });
    
    // Try to continue
    await page.click('button:has-text("Continue")');
    
    // Should see an error message
    await expect(page.locator('text="Free tier limit of 10,000 rows exceeded"')).toBeVisible();
    
    // Should have a button to upgrade
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible();
    
    // Click the upgrade button
    await page.click('button:has-text("Upgrade to Pro")');
    
    // Should be redirected to the pricing page
    await expect(page).toHaveURL('/pricing');
    
    // Pro tier should be highlighted
    await expect(page.locator('.highlighted-plan')).toContainText('Pro');
  });
});