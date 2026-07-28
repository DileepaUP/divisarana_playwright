import { test, expect } from '@playwright/test';

test.describe('User login', () => {
  test('user should log in with valid credentials', async ({ page }) => {
    const consoleErrors = [];
    const pageErrors = [];

    // Collect browser console and JavaScript errors.
    page.on('console', message => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Open login page.
    const response = await page.goto(
      'http://156.67.27.148:3011/login',
      {
        waitUntil: 'domcontentloaded',
      }
    );

    // Check that the page loaded successfully.
    expect(response).not.toBeNull();
    expect(response.ok()).toBeTruthy();

    const emailField = page.getByRole('textbox', {
      name: 'Enter your email',
    });

    const passwordField = page.getByRole('textbox', {
      name: 'Enter your password',
    });

    const signInButton = page.getByRole('button', {
      name: 'Sign In',
    });

    // Check that login elements are visible.
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();

    // Enter credentials using environment variables.
    await emailField.fill(process.env.TEST_USER_EMAIL);
    await passwordField.fill(process.env.TEST_USER_PASSWORD);

    // Save evidence before submission.
    await page.screenshot({
      path: 'test-results/login-before-submit.png',
      fullPage: true,
    });

    await signInButton.click();

    // Expected result: user should leave the login page.
    await expect(page).not.toHaveURL(/\/login\/?$/, {
      timeout: 15_000,
    });

    // Expected result: login form should disappear.
    await expect(emailField).toBeHidden();

    // Save evidence after successful login.
    await page.screenshot({
      path: 'test-results/login-success.png',
      fullPage: true,
    });

    // Attach detected browser errors to the report.
    await test.info().attach('console-errors', {
      body: consoleErrors.length
        ? consoleErrors.join('\n')
        : 'No console errors detected',
      contentType: 'text/plain',
    });

    await test.info().attach('page-errors', {
      body: pageErrors.length
        ? pageErrors.join('\n')
        : 'No JavaScript page errors detected',
      contentType: 'text/plain',
    });

    // Optionally fail when JavaScript page errors occur.
    expect(
      pageErrors,
      `JavaScript errors detected:\n${pageErrors.join('\n')}`
    ).toEqual([]);
  });
});
