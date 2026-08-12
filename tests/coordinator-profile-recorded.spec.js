import 'dotenv/config';
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { waitForEmailTo } from './utils/gmail.js';

// File where every run's coordinator name/email gets appended.
const credentialsLogPath = path.join(__dirname, 'fixtures', 'coordinator-profile-log.csv');

/**
 * Appends a single row to the CSV log, creating the file with a header
 * row if it doesn't exist yet. Never overwrites previous runs.
 */
function saveCoordinatorCredentials({ name, email, password, accountType }) {
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
const streets = ['New York', 'Uptown Ave', 'Lake Road', 'Hillside Drive', 'Palm Street', 'River Lane'];

test('test', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://156.67.27.148:3010/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.TEST_USER_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'right' }).click();
  await page.locator('span').filter({ hasText: 'Coordinator' }).click();
  await page.getByRole('link', { name: 'Coordinator Profile' }).click();
  await page.getByRole('button', { name: 'New Coordinator' }).click();

  const coordinatorName = `${randomItem(firstNames)} ${randomItem(lastNames)}`;
  const emailTag = randomDigits(3);
  const coordinatorEmail = `dileepabreadtech.12+${emailTag}@gmail.com`;

  // Title: pick a random real option (skip the "Select Title" placeholder).
  await page.waitForFunction(() => document.querySelectorAll('select[name="title"] option').length > 1);
  const titleValues = (await page.locator('select[name="title"] option').evaluateAll(els => els.map(e => e.value))).filter(Boolean);
  await page.locator('select[name="title"]').selectOption(randomItem(titleValues));

  await page.getByRole('textbox', { name: 'John Smith' }).click();
  await page.getByRole('textbox', { name: 'John Smith' }).fill(coordinatorName);
  await page.getByRole('textbox', { name: 'No.17,New York,USA' }).click();
  await page.getByRole('textbox', { name: 'No.17,New York,USA' }).fill(`${randomDigits(2)} ${randomItem(streets)}`);

  // Country: pick a random real option, then a random state for that country.
  // The state list is fetched async per country, so wait for that exact
  // network response instead of the <select> options — reading the DOM
  // right after selectOption() can still show the *previous* country's
  // stale state list, causing a state/country mismatch that the backend
  // silently drops.
  await page.waitForFunction(() => document.querySelectorAll('select[name="country"] option').length > 1);
  const countryValues = (await page.locator('select[name="country"] option').evaluateAll(els => els.map(e => e.value))).filter(Boolean);

  let states = [];
  let chosenCountry;
  for (let attempt = 0; attempt < 10 && states.length === 0; attempt++) {
    chosenCountry = randomItem(countryValues);
    const [statesResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`statesByCountry?country_id=${chosenCountry}`)),
      page.locator('select[name="country"]').selectOption(chosenCountry),
    ]);
    ({ states } = await statesResponse.json());
  }

  if (states.length === 0) {
    throw new Error('Unable to find a country with available state options');
  }

  const chosenState = String(randomItem(states).id);
  await page.locator('select[name="state"]').selectOption(chosenState);

  await page.getByRole('textbox', { name: '(+1)' }).click();
  await page.getByRole('textbox', { name: '(+1)' }).fill(`77${randomDigits(8)}`);
  await page.getByRole('textbox', { name: '123456334422' }).click();
  await page.getByRole('textbox', { name: '123456334422' }).fill(randomDigits(10));
  await page.locator('div').filter({ hasText: /^Email \*$/ }).click();
  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).fill(coordinatorEmail);

  const beforeSaveEpochSeconds = Math.floor(Date.now() / 1000);
  await page.getByRole('button', { name: 'Save' }).click();

  // Confirm the app actually sent a notification email to the coordinator's
  // address, and pull the auto-generated login credentials out of it.
  const receivedEmail = await waitForEmailTo(coordinatorEmail, { afterEpochSeconds: beforeSaveEpochSeconds });
  expect(receivedEmail, `No email received at ${coordinatorEmail} after coordinator creation`).not.toBeNull();
  console.log(`Received email for ${coordinatorEmail}: "${receivedEmail.subject}"`);
  console.log(`Account details — Email: ${receivedEmail.email}, Password: ${receivedEmail.password}, Account Type: ${receivedEmail.accountType}`);

  // Persist this run's coordinator name/email/password/account type for record-keeping.
  saveCoordinatorCredentials({
    name: coordinatorName,
    email: receivedEmail.email ?? coordinatorEmail,
    password: receivedEmail.password,
    accountType: receivedEmail.accountType,
  });
  console.log(`Saved coordinator credentials for ${coordinatorEmail} to ${credentialsLogPath}`);
});
