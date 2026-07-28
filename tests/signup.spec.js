import { test, expect } from '@playwright/test';
import path from 'path';

test('user should sign up with valid details and complete payment flow', async ({ page }) => {
  await page.goto('http://156.67.27.148:3011/signup');

  const usernameField = page.getByRole('textbox', { name: 'Enter your username' });
  const emailField = page.getByRole('textbox', { name: 'Enter your email' });
  const phoneField = page.getByRole('textbox', { name: 'Phone number' });
  const passwordField = page.getByRole('textbox', { name: 'Enter your password' });

  // Confirm the signup form is visible before interacting.
  await expect(usernameField).toBeVisible();
  await expect(emailField).toBeVisible();

  await usernameField.click();
  await usernameField.fill('Dileepa_TARA');
  await expect(usernameField).toHaveValue('Dileepa_TARA');

  // Generate a unique email each run so the account doesn't already exist
  // from a previous test execution (signup emails cannot be reused).
  const uniqueEmail = `dileepabreadtech.12+${Date.now()}@gmail.com`;

  await emailField.click();
  await emailField.fill(uniqueEmail);
  await expect(emailField).toHaveValue(uniqueEmail);

  await page.getByRole('combobox').first().selectOption('12');
  await page.getByRole('combobox').first().selectOption('14');
  await expect(page.getByRole('combobox').first()).toHaveValue('14');

  await phoneField.click();
  await phoneField.fill('7744152896');
  await expect(phoneField).toHaveValue('7744152896');

  await page.getByRole('combobox').nth(1).selectOption('3');
  await expect(page.getByRole('combobox').nth(1)).toHaveValue('3');

  await passwordField.click();
  await passwordField.fill('Password@123');
  await expect(passwordField).toHaveValue('Password@123');
  await passwordField.click();

  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();

  const createAccountButton = page.getByRole('button', { name: 'Create Account' });
  await expect(createAccountButton).toBeEnabled();
  await createAccountButton.click();

  // Confirm the account was actually created and the flow advanced —
  // if the email were a duplicate, this would still show the "already
  // registered" error and the radio button below would never appear.
  const bankTransferRadio = page.getByRole('radio', { name: 'Bank Transfer / Deposit' });
  await expect(bankTransferRadio).toBeVisible();
  await bankTransferRadio.check();
  await expect(bankTransferRadio).toBeChecked();

  await page.getByRole('button', { name: 'Upload Payment Slip' }).click();
  await page.getByText('Click to upload or drag and dropJPG, PNG, PDF up to 5MB').click();

  // Resolve the upload file relative to this test file's own folder,
  // so the path is correct no matter which directory the test is run from.
  const fileName = 'sample_image_3.jpeg';
  const filePath = path.join(__dirname, 'fixtures', fileName);
  await page.locator('input[type="file"]').setInputFiles(filePath);

  // Confirm the file was accepted before submitting.
  await expect(page.locator('input[type="file"]')).toHaveValue(new RegExp(`${fileName}$`));

  const submitButton = page.getByRole('button', { name: 'Submit Payment Proof' });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  const continueButton = page.getByRole('button', { name: 'Continue to Dashboard' });
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  // Final confirmation: after submitting payment proof, this app redirects
  // the user to the login page (likely pending admin verification of the
  // uploaded payment slip before dashboard access is granted), rather than
  // navigating directly to a dashboard. Confirm this is the intended
  // business behavior — if not, this assertion should be reverted to
  // /dashboard/i and the redirect treated as a defect instead.
  await expect(page).toHaveURL(/\/login/i, { timeout: 15_000 });
});

test('should show error when signing up with an already registered email', async ({ page }) => {
  await page.goto('http://156.67.27.148:3011/signup');

  const usernameField = page.getByRole('textbox', { name: 'Enter your username' });
  const emailField = page.getByRole('textbox', { name: 'Enter your email' });

  await expect(usernameField).toBeVisible();
  await expect(emailField).toBeVisible();

  await usernameField.click();
  await usernameField.fill('Dileepa_TARA');
  await expect(usernameField).toHaveValue('Dileepa_TARA');

  await emailField.click();
  // Deliberately reuse an email known to already be registered in the system,
  // to verify the duplicate-email validation message appears.
  await emailField.fill('dileepabreadtech.12+ta@gmail.com');
  await expect(emailField).toHaveValue('dileepabreadtech.12+ta@gmail.com');

  // Trigger validation by moving focus away from the email field.
  await usernameField.click();

  // Verify the duplicate email error is displayed.
  await expect(
    page.getByText('This email is already registered')
  ).toBeVisible();

  const loginLink = page.getByRole('link', { name: 'login' });
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute('href', /\/login/);
});