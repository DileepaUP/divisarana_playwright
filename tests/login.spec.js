import 'dotenv/config';
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const credentialsLogPath = path.join(__dirname, 'fixtures', 'signup-credentials-log.csv');

function getLatestSignupCredentials() {
  if (!fs.existsSync(credentialsLogPath)) {
    throw new Error(
      `Credentials log not found at ${credentialsLogPath}. ` +
      `Run the sign-up test at least once first so this file is created.`
    );
  }

  const content = fs.readFileSync(credentialsLogPath, 'utf8').trim();
  const lines = content.split('\n');

  if (lines.length < 2) {
    throw new Error(
      `Credentials log at ${credentialsLogPath} has no saved runs yet. ` +
      `Run the sign-up test at least once first.`
    );
  }

  const lastLine = lines[lines.length - 1];
  const [, username, email, password] = lastLine.split(',');

  if (!email || !password) {
    throw new Error(`Could not parse credentials from last log line: "${lastLine}"`);
  }

  return { username, email, password };
}

test('user should log in with the most recently signed-up credentials', async ({ page }) => {
  const { username, email, password } = getLatestSignupCredentials();
  console.log(`Using latest signup credentials — username: ${username}, email: ${email}`);

  await page.goto('http://156.67.27.148:3011/', {
    waitUntil: 'domcontentloaded',
  });

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

  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await expect(signInButton).toBeEnabled();

  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);

  await passwordField.fill(password);
  await expect(passwordField).toHaveValue(password);

  await signInButton.click();

  await expect(page).not.toHaveURL(/\/login\/?$/, {
    timeout: 15_000,
  });

  console.log('Login successful. Current URL:', page.url());
});
