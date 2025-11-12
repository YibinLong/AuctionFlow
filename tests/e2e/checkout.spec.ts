import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to checkout page
    await page.goto('/checkout');
  });

  test('should display checkout page with correct elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Checkout/);

    // Check main elements are present
    await expect(page.getByTestId('checkout-form')).toBeVisible();
    await expect(page.getByTestId('invoice-summary')).toBeVisible();
    await expect(page.getByTestId('payment-button')).toBeVisible();
  });

  test('should allow user to fill out checkout form', async ({ page }) => {
    // Fill in personal information
    await page.getByTestId('first-name-input').fill('John');
    await page.getByTestId('last-name-input').fill('Doe');
    await page.getByTestId('email-input').fill('john.doe@example.com');
    await page.getByTestId('phone-input').fill('+1234567890');

    // Fill in billing address
    await page.getByTestId('address-line1-input').fill('123 Main St');
    await page.getByTestId('city-input').fill('New York');
    await page.getByTestId('state-input').fill('NY');
    await page.getByTestId('zip-input').fill('10001');
    await page.getByTestId('country-input').selectOption('US');

    // Verify form is filled correctly
    await expect(page.getByTestId('first-name-input')).toHaveValue('John');
    await expect(page.getByTestId('email-input')).toHaveValue('john.doe@example.com');
    await expect(page.getByTestId('address-line1-input')).toHaveValue('123 Main St');
  });

  test('should validate required fields', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.getByTestId('payment-button').click();

    // Check for validation errors
    await expect(page.getByTestId('first-name-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('address-line1-error')).toBeVisible();
  });

  test('should show live calculation updates', async ({ page }) => {
    // Fill in sample data to trigger calculations
    await page.getByTestId('first-name-input').fill('John');
    await page.getByTestId('last-name-input').fill('Doe');
    await page.getByTestId('email-input').fill('john.doe@example.com');

    // Check that calculations are displayed
    await expect(page.getByTestId('subtotal-amount')).toBeVisible();
    await expect(page.getByTestId('buyers-premium-amount')).toBeVisible();
    await expect(page.getByTestId('tax-amount')).toBeVisible();
    await expect(page.getByTestId('grand-total-amount')).toBeVisible();

    // Verify calculation format
    const subtotalText = await page.getByTestId('subtotal-amount').textContent();
    expect(subtotalText).toMatch(/\$\d+\.\d{2}/);
  });

  test('should navigate to payment page when form is valid', async ({ page }) => {
    // Fill in all required fields
    await page.getByTestId('first-name-input').fill('John');
    await page.getByTestId('last-name-input').fill('Doe');
    await page.getByTestId('email-input').fill('john.doe@example.com');
    await page.getByTestId('phone-input').fill('+1234567890');
    await page.getByTestId('address-line1-input').fill('123 Main St');
    await page.getByTestId('city-input').fill('New York');
    await page.getByTestId('state-input').fill('NY');
    await page.getByTestId('zip-input').fill('10001');
    await page.getByTestId('country-input').selectOption('US');

    // Check terms and conditions
    await page.getByTestId('terms-checkbox').check();

    // Click payment button
    await page.getByTestId('payment-button').click();

    // Should navigate to payment page
    await expect(page).toHaveURL(/\/payment/);
  });

  test('should handle form submission errors gracefully', async ({ page }) => {
    // Mock a network error
    await page.route('/api/checkout', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    // Fill in valid form data
    await page.getByTestId('first-name-input').fill('John');
    await page.getByTestId('last-name-input').fill('Doe');
    await page.getByTestId('email-input').fill('john.doe@example.com');
    await page.getByTestId('address-line1-input').fill('123 Main St');
    await page.getByTestId('city-input').fill('New York');
    await page.getByTestId('state-input').fill('NY');
    await page.getByTestId('zip-input').fill('10001');
    await page.getByTestId('country-input').selectOption('US');
    await page.getByTestId('terms-checkbox').check();

    // Submit form
    await page.getByTestId('payment-button').click();

    // Should show error message
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('Server error');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that mobile layout is applied
    await expect(page.getByTestId('checkout-form')).toBeVisible();
    await expect(page.getByTestId('mobile-menu-button')).toBeVisible();

    // Verify form is still usable on mobile
    await page.getByTestId('first-name-input').fill('John');
    await expect(page.getByTestId('first-name-input')).toHaveValue('John');
  });

  test('should show loading state during form submission', async ({ page }) => {
    // Mock a delayed response
    await page.route('/api/checkout', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill in valid form data
    await page.getByTestId('first-name-input').fill('John');
    await page.getByTestId('last-name-input').fill('Doe');
    await page.getByTestId('email-input').fill('john.doe@example.com');
    await page.getByTestId('address-line1-input').fill('123 Main St');
    await page.getByTestId('city-input').fill('New York');
    await page.getByTestId('state-input').fill('NY');
    await page.getByTestId('zip-input').fill('10001');
    await page.getByTestId('country-input').selectOption('US');
    await page.getByTestId('terms-checkbox').check();

    // Submit form
    await page.getByTestId('payment-button').click();

    // Check loading state
    await expect(page.getByTestId('loading-spinner')).toBeVisible();
    await expect(page.getByTestId('payment-button')).toBeDisabled();
  });
});