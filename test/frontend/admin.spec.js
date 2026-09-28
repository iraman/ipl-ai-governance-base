const { test, expect } = require('@playwright/test');
const { loginAs, bookableDate } = require('./helpers');

test.describe('admin', () => {
  test('admin can view bookings for a date and assign a vehicle', async ({ page }) => {
    const date = bookableDate();
    await loginAs(page, 'testuser1@company.com');
    await page.getByTestId('booking-date').fill(date);
    await page.getByTestId('booking-slot').selectOption({ label: '5:00 PM - Office to Metro' });
    await page.getByTestId('book-submit').click();
    await expect(page.getByText('Booking confirmed.')).toBeVisible();
    await page.getByTestId('logout').click();

    await loginAs(page, 'admin@company.com');
    await page.getByTestId('nav-admin').click();
    await expect(page.getByRole('heading', { name: /Admin/ })).toBeVisible();
    await page.getByTestId('admin-date').fill(date);
    await expect(page.getByText('Test User 1')).toBeVisible();
    await expect(page.getByText(/active booking/)).toBeVisible();

    const vehicleSelect = page.locator('select').first();
    await vehicleSelect.selectOption({ value: '1' });
    await expect(vehicleSelect).toHaveValue('1');
  });
});
