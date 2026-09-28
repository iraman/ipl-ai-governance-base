const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');
const { nextWeekday } = require('../helpers/seed-store');

test.describe('my bookings', () => {
  test('shows an upcoming booking and can cancel it', async ({ page }) => {
    await loginAs(page, 'testuser2@company.com');
    const date = nextWeekday(new Date(), 6);

    await page.getByTestId('booking-date').fill(date);
    await page.getByTestId('booking-slot').selectOption({ label: '6:00 PM - Office to Metro' });
    await page.getByTestId('book-submit').click();
    await expect(page.getByText('Booking confirmed.')).toBeVisible();

    await page.getByTestId('nav-bookings').click();
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    await expect(page.getByText(date)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('(cancelled)')).toBeVisible();
  });
});
