import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://156.67.27.148:3011/signup');
  await page.getByRole('textbox', { name: 'Enter your username' }).click();
  await page.getByRole('textbox', { name: 'Enter your username' }).fill('DileepaOBU');
  await page.getByRole('textbox', { name: 'Enter your email' }).click();
  await page.getByRole('textbox', { name: 'Enter your email' }).fill('dileepabreadtech.12+546@gmail.com');
  await page.getByRole('combobox').first().selectOption('14');
  await page.getByRole('textbox', { name: 'Phone number' }).click();
  await page.getByRole('textbox', { name: 'Phone number' }).fill('748596321');
  await page.getByRole('combobox').nth(1).selectOption('2');
  await page.getByRole('textbox', { name: 'Enter your password' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('Password@123');
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.getByText('Offline/Online bank transfer').click();
  await page.getByRole('button', { name: 'Upload Payment Slip' }).click();
  await page.getByText('JPG, PNG, PDF up to 5MB').click();
  await page.locator('input[type="file"]').setInputFiles('sample_upload_03.png');
  await page.getByRole('button', { name: 'Submit Payment Proof' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
});
