const { test, expect } = require('@playwright/test');
const { loginAs } = require('./helpers');

test.describe('login', () => {
  test('shows Trimble ID and email sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Trimble WorkRide' })).toBeVisible();
    await expect(page.getByTestId('trimble-login')).toBeVisible();
    await expect(page.getByTestId('email-login')).toBeVisible();
    await expect(page.getByText('admin@company.com')).toBeVisible();
  });

  test('rejects an unknown email', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('nobody@company.com');
    await page.getByTestId('email-login').click();
    await expect(page.getByText('No account found for this email.')).toBeVisible();
  });

  test('logs in a test user with email and reaches Book Shuttle', async ({ page }) => {
    await loginAs(page, 'testuser2@company.com');
    await expect(page.getByRole('heading', { name: 'Book Shuttle' })).toBeVisible();
    await expect(page.getByTestId('nav-user')).toHaveText('Test User 2');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs out and returns to login', async ({ page }) => {
    await loginAs(page, 'testuser3@company.com');
    await page.getByTestId('logout').click();
    await expect(page.getByTestId('email-login')).toBeVisible();
  });
});
