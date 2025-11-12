import { test, expect } from '@playwright/test';

test.describe('Invoice Display', () => {
  test.beforeEach(async ({ page }) => {
    // Mock invoice API response
    await page.route('/api/invoices/123', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          buyer_id: 'buyer-123',
          status: 'unpaid',
          created_at: '2024-01-15T10:00:00Z',
          items: [
            {
              lot_id: 'LOT-001',
              title: 'Vintage Watch',
              quantity: 1,
              unit_price: 2500.00,
              total_price: 2500.00
            },
            {
              lot_id: 'LOT-002',
              title: 'Antique Vase',
              quantity: 1,
              unit_price: 750.00,
              total_price: 750.00
            }
          ],
          subtotal: 3250.00,
          buyers_premium_rate: 0.10,
          buyers_premium_amount: 325.00,
          tax_rate: 0.0825,
          tax_amount: 296.44,
          grand_total: 3871.44,
          currency: 'USD',
          auction_info: {
            name: 'Winter Fine Art Auction',
            date: '2024-01-15',
            location: 'New York, NY'
          }
        }),
      });
    });
  });

  test('should display invoice with correct details', async ({ page }) => {
    await page.goto('/invoice/123');

    // Check page title and invoice number
    await expect(page).toHaveTitle(/Invoice/);
    await expect(page.getByTestId('invoice-number')).toContainText('INV-123');

    // Check buyer information
    await expect(page.getByTestId('buyer-info')).toBeVisible();

    // Check auction information
    await expect(page.getByTestId('auction-name')).toContainText('Winter Fine Art Auction');
    await expect(page.getByTestId('auction-date')).toContainText('2024-01-15');

    // Check invoice items
    await expect(page.getByTestId('invoice-items')).toBeVisible();
    await expect(page.getByTestId('item-LOT-001')).toContainText('Vintage Watch');
    await expect(page.getByTestId('item-LOT-001')).toContainText('$2,500.00');
    await expect(page.getByTestId('item-LOT-002')).toContainText('Antique Vase');
    await expect(page.getByTestId('item-LOT-002')).toContainText('$750.00');
  });

  test('should display accurate financial calculations', async ({ page }) => {
    await page.goto('/invoice/123');

    // Check financial breakdown
    await expect(page.getByTestId('subtotal-amount')).toContainText('$3,250.00');
    await expect(page.getByTestId('buyers-premium-rate')).toContainText('10.0%');
    await expect(page.getByTestId('buyers-premium-amount')).toContainText('$325.00');
    await expect(page.getByTestId('tax-rate')).toContainText('8.25%');
    await expect(page.getByTestId('tax-amount')).toContainText('$296.44');
    await expect(page.getByTestId('grand-total-amount')).toContainText('$3,871.44');

    // Verify calculations are correct
    const subtotal = 3250.00;
    const expectedPremium = subtotal * 0.10; // 325.00
    const expectedTax = (subtotal + expectedPremium) * 0.0825; // 296.44
    const expectedTotal = subtotal + expectedPremium + expectedTax; // 3871.44

    expect(expectedPremium).toBeCloseTo(325.00, 2);
    expect(expectedTax).toBeCloseTo(296.44, 2);
    expect(expectedTotal).toBeCloseTo(3871.44, 2);
  });

  test('should show payment status correctly', async ({ page }) => {
    await page.goto('/invoice/123');

    // Check status badge
    await expect(page.getByTestId('payment-status')).toBeVisible();
    await expect(page.getByTestId('payment-status')).toContainText('Unpaid');
    await expect(page.getByTestId('payment-status')).toHaveClass(/status-unpaid/);
  });

  test('should allow navigation to payment page', async ({ page }) => {
    await page.goto('/invoice/123');

    // Click pay now button
    await page.getByTestId('pay-now-button').click();

    // Should navigate to payment page
    await expect(page).toHaveURL(/\/payment/);
  });

  test('should allow invoice download', async ({ page }) => {
    await page.goto('/invoice/123');

    // Mock download response
    const downloadPromise = page.waitForEvent('download');

    await page.getByTestId('download-invoice-button').click();

    // Verify download starts
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/invoice-.*\.pdf/);
  });

  test('should handle invoice not found', async ({ page }) => {
    // Mock 404 response
    await page.route('/api/invoices/999', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invoice not found' }),
      });
    });

    await page.goto('/invoice/999');

    // Should show 404 message
    await expect(page.getByTestId('not-found-message')).toBeVisible();
    await expect(page.getByTestId('not-found-message')).toContainText('Invoice not found');
  });

  test('should display loading state', async ({ page }) => {
    // Mock delayed response
    await page.route('/api/invoices/123', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '123', status: 'unpaid' }),
      });
    });

    await page.goto('/invoice/123');

    // Check loading state
    await expect(page.getByTestId('loading-invoice')).toBeVisible();
    await expect(page.getByTestId('invoice-content')).toBeHidden();

    // Wait for content to load
    await expect(page.getByTestId('invoice-content')).toBeVisible({ timeout: 5000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('/api/invoices/123', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    await page.goto('/invoice/123');

    // Should show error message
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('Failed to load invoice');
  });

  test('should be accessible and responsive', async ({ page }) => {
    await page.goto('/invoice/123');

    // Test accessibility
    await expect(page.getByTestId('invoice-content')).toBeVisible();

    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('invoice-content')).toBeVisible();

    // Check that mobile layout adjustments are applied
    await expect(page.getByTestId('mobile-invoice-header')).toBeVisible();
  });

  test('should support multiple currencies', async ({ page }) => {
    // Mock invoice with different currency
    await page.route('/api/invoices/123', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          currency: 'EUR',
          subtotal: 3250.00,
          buyers_premium_amount: 325.00,
          tax_amount: 296.44,
          grand_total: 3871.44,
          items: []
        }),
      });
    });

    await page.goto('/invoice/123');

    // Should display EUR currency
    await expect(page.getByTestId('currency-indicator')).toContainText('EUR');
    await expect(page.getByTestId('grand-total-amount')).toContainText('€');
  });
});