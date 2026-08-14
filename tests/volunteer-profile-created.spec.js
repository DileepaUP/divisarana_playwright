import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { waitForEmailTo } from './utils/gmail.js';

const envFilePath = path.join(__dirname, '..', '.env');

// File where every run's volunteer name/email/password gets appended.
const credentialsLogPath = path.join(__dirname, 'fixtures', 'volunteer-profile-log.csv');

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDigits(length) {
  let digits = '';
  for (let i = 0; i < length; i++) {
    digits += Math.floor(Math.random() * 10);
  }
  return digits;
}

const firstNames = ['James', 'Nimal', 'Kasun', 'Amara', 'Priya', 'Sanjay', 'Ishara', 'Ruwan', 'Tharindu', 'Chamari'];
const lastNames = ['Fonseka', 'Perera', 'Silva', 'Fernando', 'Jayasuriya', 'Wickramasinghe', 'Bandara', 'Rathnayake'];

/**
 * Appends a single row to the CSV log, creating the file with a header
 * row if it doesn't exist yet. Never overwrites previous runs.
 */
function saveVolunteerCredentials({ name, email, password }) {
  const dir = path.dirname(credentialsLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileExists = fs.existsSync(credentialsLogPath);
  const header = 'timestamp,name,email,password\n';
  const timestamp = new Date().toISOString();
  const row = `${timestamp},${name},${email},${password}\n`;

  if (!fileExists) {
    fs.writeFileSync(credentialsLogPath, header + row);
  } else {
    fs.appendFileSync(credentialsLogPath, row);
  }
}

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

/**
 * Reads a single key=value pair straight off disk rather than from
 * process.env — dotenv only loads .env once, at the start of the whole
 * test run (via playwright.config.js), so process.env still holds
 * whatever was there before this run started. Since the sign-up test
 * above rewrites .env mid-run, a later test in the same run needs the
 * fresh on-disk value, not the stale in-memory one.
 */
function readEnvVariable(key) {
  if (!fs.existsSync(envFilePath)) return undefined;
  const contents = fs.readFileSync(envFilePath, 'utf8');
  const match = contents.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim() || undefined;
}

/**
 * This app sometimes requires OTP verification after login (observed right
 * after signup; a later login with the same account went straight through
 * without it, so it's not required on every attempt — likely a trusted-
 * session/device window). If the OTP screen shows up, retrieve the code via
 * Gmail and submit it; if login already went through directly, there's
 * nothing to do.
 */
async function completeOtpVerification(page, email) {
  const otpHeading = page.getByRole('heading', { name: 'OTP Verification' });
  const otpScreenAppeared = await otpHeading
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!otpScreenAppeared) {
    // Logged in directly — confirm we actually left the login page.
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 15_000 });
    console.log(`No OTP required for ${email} — logged in directly.`);
    return;
  }

  const otpBeforeEpochSeconds = Math.floor(Date.now() / 1000);
  const otpEmail = await waitForEmailTo(email, {
    afterEpochSeconds: otpBeforeEpochSeconds,
    subjectContains: 'OTP Code',
    timeoutMs: 90_000,
  });
  expect(otpEmail?.otpCode, `No OTP email received for ${email}`).not.toBeNull();
  console.log(`Retrieved OTP ${otpEmail.otpCode} for ${email}`);

  await page.getByPlaceholder('Enter OTP code').fill(otpEmail.otpCode);

  const verifyOtpButton = page.getByRole('button', { name: 'Verify OTP' });
  await expect(verifyOtpButton).toBeEnabled({ timeout: 15_000 });
  await verifyOtpButton.click();

  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 30_000 });
}

test('user should sign up with valid details and complete payment flow', async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto('http://156.67.27.148:3011/signup');

  const usernameField = page.getByRole('textbox', { name: 'Enter your username' });
  const emailField = page.getByRole('textbox', { name: 'Enter your email' });
  const phoneField = page.getByRole('textbox', { name: 'Phone number' });
  const passwordField = page.getByRole('textbox', { name: 'Enter your password' });

  // Confirm the signup form is visible before interacting.
  await expect(usernameField).toBeVisible();
  await expect(emailField).toBeVisible();

  const username = `${randomItem(firstNames)}_${randomItem(lastNames)}`;
  await usernameField.click();
  await usernameField.fill(username);
  await expect(usernameField).toHaveValue(username);

  // Generate a unique email each run so the account doesn't already exist
  // from a previous test execution (signup emails cannot be reused).
  const uniqueEmail = `dileepabreadtech.12+${randomDigits(3)}@gmail.com`;
  const password = 'Password@123';

  await emailField.click();
  await emailField.fill(uniqueEmail);
  await expect(emailField).toHaveValue(uniqueEmail);

  await page.getByRole('combobox').first().selectOption('12');
  await page.getByRole('combobox').first().selectOption('14');
  await expect(page.getByRole('combobox').first()).toHaveValue('14');

  const phoneNumber = `77${randomDigits(8)}`;
  await phoneField.click();
  await phoneField.fill(phoneNumber);
  await expect(phoneField).toHaveValue(phoneNumber);

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
  await expect(bankTransferRadio).toBeVisible({ timeout: 45_000 });
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

  // Persist this run's volunteer name/email/password for record-keeping.
  saveVolunteerCredentials({ name: username, email: uniqueEmail, password });
  console.log(`Saved volunteer credentials for ${uniqueEmail} to ${credentialsLogPath}`);

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

  // This app requires OTP verification on every login — retrieved
  // automatically via Gmail API rather than pausing for manual entry.
  await completeOtpVerification(page, uniqueEmail);
});

test('user should log in with saved signup credentials', async ({ page }) => {
  test.setTimeout(120_000);

  // Reads the credentials written to .env by the sign-up test above,
  // straight off disk (see readEnvVariable — process.env can be stale
  // within the same run). Run the sign-up test at least once first so
  // these values exist — after that, this test can be re-run
  // independently as many times as needed without repeating sign-up.
  const email = readEnvVariable('SIGNUP_USER_EMAIL');
  const password = readEnvVariable('SIGNUP_USER_PASSWORD');

  if (!email || !password) {
    throw new Error(
      'SIGNUP_USER_EMAIL / SIGNUP_USER_PASSWORD not found in .env. ' +
      'Run the sign-up test first so these values are saved.'
    );
  }

  await page.goto('http://156.67.27.148:3011/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Sign In' }).click();
  // Wait for the SPA to finish hydrating before typing — filling too early
  // can land on a pre-hydration input instance that gets reset to empty
  // once the real client-side handlers attach.
  await page.waitForLoadState('networkidle');

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

  // Re-confirm the values survived right before submitting — catches the
  // hydration-reset race above if it happens after the checks but before click.
  await expect(emailField).toHaveValue(email);
  await expect(passwordField).toHaveValue(password);

  await signInButton.click();

  // This app requires OTP verification on every login — retrieved
  // automatically via Gmail API rather than pausing for manual entry.
  await completeOtpVerification(page, email);

  console.log('Login successful with saved signup credentials:', page.url());
});