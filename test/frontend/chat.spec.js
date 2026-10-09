const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');
const { nextWeekday } = require('../helpers/seed-store');

const API = 'http://127.0.0.1:3101';

async function blockUser(userId) {
  const d1 = nextWeekday(new Date(), 20);
  const d2 = nextWeekday(new Date(`${d1}T12:00:00`), 1);
  for (const date of [d1, d2]) {
    const created = await fetch(`${API}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, slot_id: 3, booking_date: date }),
    });
    const body = await created.json();
    if (!created.ok) throw new Error(body.error || 'book failed');
    const marked = await fetch(`${API}/api/bookings/${body.id}/no-show`, { method: 'PATCH' });
    if (!marked.ok) throw new Error('no-show failed');
  }
}

test.describe('chat booking', () => {
  test('books without an urgent reason when the employee is not blocked', async ({ page }) => {
    await loginAs(page, 'testuser3@company.com');
    await page.getByTestId('chat-launcher').click();
    const date = nextWeekday(new Date(), 14);
    await page.getByTestId('chat-date').fill(date);
    await page.getByTestId('chat-slot').selectOption({ label: '6:00 PM - Office to Metro' });
    await page.getByTestId('chat-send').click();
    await expect(page.getByText(`Booking confirmed for ${date}`)).toBeVisible();
    await expect(page.getByTestId('chat-urgent-category')).toHaveCount(0);
    await expect(page.getByTestId('policy-override-note')).toHaveCount(0);

    await page.getByTestId('nav-bookings').click();
    await expect(page.getByText(date)).toBeVisible();
  });

  test('keeps the Book page blocked and allows a medical emergency in chat', async ({ page }) => {
    await blockUser(2);
    await loginAs(page, 'testuser1@company.com');
    await expect(page.getByText(/Booking is blocked until/i)).toBeVisible();
    await expect(page.getByTestId('book-submit')).toBeDisabled();

    await page.getByTestId('chat-launcher').click();
    const date = nextWeekday(new Date(), 16);
    await page.getByTestId('chat-date').fill(date);
    await page.getByTestId('chat-slot').selectOption({ label: '6:00 PM - Office to Metro' });
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('chat-urgent-category')).toBeVisible();
    await page.getByTestId('chat-urgent-category').selectOption('medical_emergency');
    await page.getByTestId('chat-urgent-explanation').fill('Hospital appointment and I need the office shuttle.');
    await page.getByTestId('chat-urgent-send').click();

    const note = page.getByTestId('policy-override-note');
    await expect(note).toContainText('validate-chat-override');
    await expect(note.getByTestId('skill-trace')).toContainText('validate-booking-rules');
    await expect(note).toContainText(date);
    await expect(note).toContainText('Book page is still blocked');

    await page.getByTestId('nav-bookings').click();
    await expect(page.getByText(date)).toBeVisible();

    await page.getByTestId('nav-book').click();
    await expect(page.getByText(/Booking is blocked until/i)).toBeVisible();
  });
});
