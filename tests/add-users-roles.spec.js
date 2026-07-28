import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://156.67.27.148:3010/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('');
});