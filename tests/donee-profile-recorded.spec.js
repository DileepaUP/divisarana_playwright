import 'dotenv/config';
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// File where every run's donee name/email gets appended.
const credentialsLogPath = path.join(__dirname, 'fixtures', 'donee-profile-log.csv');

/**
 * Appends a single row to the CSV log, creating the file with a header
 * row if it doesn't exist yet. Never overwrites previous runs.
 */
function saveDoneeCredentials({ name, email }) {
  const dir = path.dirname(credentialsLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileExists = fs.existsSync(credentialsLogPath);
  const header = 'timestamp,name,email\n';
  const timestamp = new Date().toISOString();
  const row = `${timestamp},${name},${email}\n`;

  if (!fileExists) {
    fs.writeFileSync(credentialsLogPath, header + row);
  } else {
    fs.appendFileSync(credentialsLogPath, row);
  }
}

test('test', async ({ page }) => {
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

  const doneeName = 'Dileepa_OLM';
  const doneeEmail = 'dileepabreadtech.12+OLM@gmail.com';

  await page.getByRole('textbox', { name: 'Name *' }).click();
  await page.getByRole('textbox', { name: 'Name *' }).fill(doneeName);
  await page.getByRole('textbox', { name: 'E.M. Perera Mawatha, Colombo' }).click();
  await page.getByRole('textbox', { name: 'E.M. Perera Mawatha, Colombo' }).fill('21 Uptown ');
  await page.getByRole('textbox', { name: '+' }).click();
  await page.getByRole('textbox', { name: '+' }).click();
  await page.getByRole('textbox', { name: '+' }).fill('+');
  await page.getByRole('textbox', { name: '+' }).press('NumLock');
  await page.getByRole('textbox', { name: '+' }).press('Home');
  await page.getByRole('textbox', { name: '+' }).click();
  await page.getByRole('textbox', { name: '+' }).press('NumLock');
  await page.getByRole('textbox', { name: '+' }).fill('741014826548');
  await page.getByRole('textbox', { name: '1234567892' }).click();
  await page.getByRole('textbox', { name: '1234567892' }).fill('9521364878');
  await page.locator('select[name="country"]').selectOption('22');
  await page.locator('select[name="state"]').selectOption('352');
  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).click();
  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).fill(doneeEmail);
  await page.getByText('click to select files').click();
  const proofFilePath = path.join(__dirname, 'fixtures', 'sample_image_3.jpeg');
  await page.getByRole('button', { name: 'Proof Document *' }).setInputFiles(proofFilePath);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('a').filter({ hasText: 'Close modal' }).click();

  // Persist this run's donee name/email for record-keeping.
  saveDoneeCredentials({ name: doneeName, email: doneeEmail });
  console.log(`Saved donee credentials for ${doneeEmail} to ${credentialsLogPath}`);
});
