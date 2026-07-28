import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const envFilePath = path.join(__dirname, '..', '.env');

/**
 * Writes or updates a single key=value pair in the .env file without
 * disturbing any other existing variables in it.
 */
function updateEnvVariable(key, value) {
  let contents = '';
  if (fs.existsSync(envFilePath)) {
    contents = fs.readFileSync(envFilePath, 'utf8');
  }

  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  if (pattern.test(contents)) {
    contents = contents.replace(pattern, line);
  } else {
    contents = contents.trim().length > 0
      ? `${contents.trim()}\n${line}\n`
      : `${line}\n`;
  }

  fs.writeFileSync(envFilePath, contents);
}

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
  const password = 'Password@123';

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
  await passwordField.fill(password);
  await expect(passwordField).toHaveValue(password);
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

  // After submitting payment proof, this app redirects to the login page
  // (pending verification of the payment slip before dashboard access).
  await expect(page).toHaveURL(/\/login/i, { timeout: 15_000 });

  // --- Save the newly created credentials to .env so the separate ---
  // --- login test can read them back and log in with this account. ---
  updateEnvVariable('SIGNUP_USER_EMAIL', uniqueEmail);
  updateEnvVariable('SIGNUP_USER_PASSWORD', password);
  console.log(`Saved credentials to .env for ${uniqueEmail}`);

  // --- Log in using the same credentials just created above ---
  const loginEmailField = page.getByRole('textbox', { name: 'Enter your email' });
  const loginPasswordField = page.getByRole('textbox', { name: 'Enter your password' });
  const signInButton = page.getByRole('button', { name: 'Sign In' });

  await expect(loginEmailField).toBeVisible();
  await loginEmailField.click();
  await loginEmailField.fill(uniqueEmail);
  await expect(loginEmailField).toHaveValue(uniqueEmail);

  await loginPasswordField.click();
  await loginPasswordField.fill(password);
  await expect(loginPasswordField).toHaveValue(password);

  await signInButton.click();

  // --- OTP Verification: manual step ---
  // This environment sends a real, per-session OTP to the signup email
  // (visible on-screen as "Your OTP has been sent to di***@gmail.com").
  // There is no reliable static bypass code, so OTP retrieval/entry is
  // NOT automated here. Execution pauses below so the code can be
  // retrieved from the inbox and entered manually in the Inspector,
  // then resume the test to continue past this point.
  await expect(
    page.getByRole('heading', { name: 'OTP Verification' })
  ).toBeVisible();

  console.log(
    `Signup complete for ${uniqueEmail}. Check the inbox for the OTP, ` +
    `enter it manually in the paused browser, then resume the test.`
  );

  // Pauses execution and opens the Playwright Inspector so the OTP can
  // be entered by hand. Requires running with --headed (not fully headless).
  await page.pause();

  const verifyOtpButton = page.getByRole('button', { name: 'Verify OTP' });
  await expect(verifyOtpButton).toBeEnabled({ timeout: 120_000 });
  await verifyOtpButton.click();

  // Confirm login completed successfully after manual OTP verification.
  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 30_000 });
});

test('user should log in with saved signup credentials', async ({ page }) => {
  // Reads the credentials written to .env by the sign-up test above.
  // Run the sign-up test at least once first so these values exist —
  // after that, this test can be re-run independently as many times
  // as needed without repeating the sign-up/OTP flow.
  const email = process.env.SIGNUP_USER_EMAIL;
  const password = process.env.SIGNUP_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SIGNUP_USER_EMAIL / SIGNUP_USER_PASSWORD not found in .env. ' +
      'Run the sign-up test first so these values are saved.'
    );
  }

  await page.goto('http://156.67.27.148:3011/');

  const emailField = page.getByRole('textbox', { name: 'Enter your email' });
  const passwordField = page.getByRole('textbox', { name: 'Enter your password' });
  const signInButton = page.getByRole('button', { name: 'Sign In' });

  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await expect(signInButton).toBeEnabled();

  await emailField.click();
  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);

  await passwordField.click();
  await passwordField.fill(password);
  await expect(passwordField).toHaveValue(password);

  await signInButton.click();

  // Expected result: user should leave the login page.
  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 15_000 });

  console.log('Login successful with saved signup credentials:', page.url());
});