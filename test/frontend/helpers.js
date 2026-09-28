const { expect } = require('@playwright/test');
const { nextWeekday } = require('../helpers/seed-store');

async function loginAs(page, email) {
  await page.goto('/login');
  await expect(page.getByTestId('email-input')).toBeVisible();
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('email-login').click();
  await expect(page.getByTestId('nav-book')).toBeVisible();
}

function bookableDate() {
  return nextWeekday(new Date(), 3);
}

module.exports = { loginAs, bookableDate };
