import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('user should log in with valid credentials', async ({ page }) => {
  await page.goto('http://156.67.27.148:3011/', {
    waitUntil: 'domcontentloaded',
  });

  // Open the login page.
  await page.getByRole('link', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/login\/?$/);

  const emailField = page.getByRole('textbox', {
    name: 'Enter your email',
  });

  const passwordField = page.getByRole('textbox', {
    name: 'Enter your password',
  });

  const signInButton = page.getByRole('button', {
    name: 'Sign In',
  });

  // Confirm that the login form is available.
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await expect(signInButton).toBeEnabled();

  // Enter test credentials.
  await emailField.fill(process.env.TEST_USER_EMAIL);
  await passwordField.fill(process.env.TEST_USER_PASSWORD);

  // Submit login.
  await signInButton.click();

  // Expected result: user should leave the login page.
  await expect(page).not.toHaveURL(/\/login\/?$/, {
    timeout: 15_000,
  });

  console.log('Login successful. Current URL:', page.url());
});
