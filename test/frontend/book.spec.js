const { test, expect } = require('@playwright/test');
const { loginAs, bookableDate } = require('./helpers');
const { nextWeekday } = require('../helpers/seed-store');

test.describe('book shuttle', () => {
  test('books an evening slot and blocks a second booking that day', async ({ page }) => {
    await loginAs(page, 'testuser3@company.com');
    const date = bookableDate();

    await page.getByTestId('booking-date').fill(date);
    await page.getByTestId('booking-slot').selectOption({ label: '5:00 PM - Office to Metro' });
    await expect(page.getByTestId('book-submit')).toBeEnabled();
    await page.getByTestId('book-submit').click();
    await expect(page.getByText('Booking confirmed.')).toBeVisible();

    await page.getByTestId('booking-date').fill(nextWeekday(new Date(), 10));
    await page.getByTestId('booking-date').fill(date);
    await expect(page.getByText(/already have a booking on this date/i)).toBeVisible();
    await expect(page.getByTestId('book-submit')).toBeDisabled();
  });

  test('shows weekend booking is not available', async ({ page }) => {
    await loginAs(page, 'testuser2@company.com');
    await page.getByTestId('booking-date').fill('2026-10-03');
    await expect(page.getByText(/not available on weekends/i)).toBeVisible();
  });
});
