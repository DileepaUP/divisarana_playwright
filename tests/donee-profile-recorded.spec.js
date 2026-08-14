import 'dotenv/config';
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { waitForEmailTo } from './utils/gmail.js';

// File where every run's donee name/email/password/account type gets appended.
const credentialsLogPath = path.join(__dirname, 'fixtures', 'donee-profile-log.csv');

/**
 * Appends a single row to the CSV log, creating the file with a header
 * row if it doesn't exist yet. Never overwrites previous runs.
 */
function saveDoneeCredentials({ name, email, password, accountType }) {
  const dir = path.dirname(credentialsLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileExists = fs.existsSync(credentialsLogPath);
  const header = 'timestamp,name,email,password,accountType\n';
  const timestamp = new Date().toISOString();
  const row = `${timestamp},${name},${email},${password},${accountType}\n`;

  if (!fileExists) {
    fs.writeFileSync(credentialsLogPath, header + row);
  } else {
    fs.appendFileSync(credentialsLogPath, row);
  }
}

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
const streets = ['Uptown Ave', 'Lake Road', 'Hillside Drive', 'Palm Street', 'River Lane', 'New York'];

test('test', async ({ page }) => {
  test.setTimeout(150_000);

  await page.goto('http://156.67.27.148:3010/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.TEST_USER_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'right' }).click();
  await page.getByRole('menuitem', { name: 'Donee' }).click();
  await page.getByRole('link', { name: 'Donee Profile' }).click();
  await page.getByRole('button', { name: 'New Donee' }).click();

  const doneeName = `${randomItem(firstNames)} ${randomItem(lastNames)}`;
  const doneeEmail = `dileepabreadtech.12+${randomDigits(6)}@gmail.com`;

  await page.getByRole('textbox', { name: 'Name *' }).click();
  await page.getByRole('textbox', { name: 'Name *' }).fill(doneeName);
  await page.getByRole('textbox', { name: 'E.M. Perera Mawatha, Colombo' }).click();
  await page.getByRole('textbox', { name: 'E.M. Perera Mawatha, Colombo' }).fill(`${randomDigits(2)} ${randomItem(streets)}`);
  await page.getByRole('textbox', { name: '+' }).click();
  await page.getByRole('textbox', { name: '+' }).fill(randomDigits(12));
  await page.getByRole('textbox', { name: '1234567892' }).click();
  await page.getByRole('textbox', { name: '1234567892' }).fill(randomDigits(10));

  // Country: pick a random real option, then a random state for that country.
  // The state list is fetched async per country, so wait for that exact
  // network response instead of reading the <select> options immediately —
  // doing so can read the *previous* country's stale state list.
  await page.waitForFunction(() => document.querySelectorAll('select[name="country"] option').length > 1);
  const countryValues = (await page.locator('select[name="country"] option').evaluateAll(els => els.map(e => e.value))).filter(Boolean);

  let states = [];
  for (let attempt = 0; attempt < 10 && states.length === 0; attempt++) {
    const chosenCountry = randomItem(countryValues);
    const [statesResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`statesByCountry?country_id=${chosenCountry}`)),
      page.locator('select[name="country"]').selectOption(chosenCountry),
    ]);
    ({ states } = await statesResponse.json());
  }

  if (states.length === 0) {
    throw new Error('Unable to find a country with available state options');
  }

  await page.locator('select[name="state"]').selectOption(String(randomItem(states).id));

  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).click();
  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).fill(doneeEmail);
  await page.getByText('click to select files').click();
  const proofFilePath = path.join(__dirname, 'fixtures', 'sample_image_3.jpeg');
  await page.getByRole('button', { name: 'Proof Document *' }).setInputFiles(proofFilePath);

  const beforeSaveEpochSeconds = Math.floor(Date.now() / 1000);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('a').filter({ hasText: 'Close modal' }).click();

  // Confirm the app actually sent a notification email to the donee's
  // address, and pull the auto-generated login credentials out of it.
  const receivedEmail = await waitForEmailTo(doneeEmail, { afterEpochSeconds: beforeSaveEpochSeconds, timeoutMs: 100_000 });
  expect(receivedEmail, `No email received at ${doneeEmail} after donee creation`).not.toBeNull();
  console.log(`Received email for ${doneeEmail}: "${receivedEmail.subject}"`);
  console.log(`Account details — Email: ${receivedEmail.email}, Password: ${receivedEmail.password}, Account Type: ${receivedEmail.accountType}`);

  // Persist this run's donee name/email/password/account type for record-keeping.
  saveDoneeCredentials({
    name: doneeName,
    email: receivedEmail.email ?? doneeEmail,
    password: receivedEmail.password,
    accountType: receivedEmail.accountType,
  });
  console.log(`Saved donee credentials for ${doneeEmail} to ${credentialsLogPath}`);
});
