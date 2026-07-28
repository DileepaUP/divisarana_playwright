import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://156.67.27.148:3010/');
  // await page.getByRole('textbox', { name: 'Email Address' }).click();
  // await page.getByRole('textbox', { name: 'Email Address' }).click();
  // await page.getByRole('textbox', { name: 'Email Address' }).fill('ra');
  // await page.getByRole('textbox', { name: 'Email Address' }).click();
  // await page.getByRole('textbox', { name: 'Email Address' }).press('ControlOrMeta+a');
  // await page.getByRole('textbox', { name: 'Email Address' }).click({
  //   modifiers: ['ControlOrMeta']
  // });
  await page.getByRole('textbox', { name: 'Email Address' }).fill('rarathnasri@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).press('ControlOrMeta+a');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Password@123');
  await page.getByRole('button').filter({ hasText: /^$/ }).click();
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).press('ControlOrMeta+a');
  await page.getByRole('textbox', { name: 'Email Address' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).press('ControlOrMeta+a');
  await page.getByRole('textbox', { name: 'Email Address' }).fill('rathnasri@gmail.com');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'right' }).click();
  await page.getByRole('menuitem', { name: 'Donee' }).click();
  await page.getByRole('link', { name: 'Donee Profile' }).click();
  await page.getByRole('button', { name: 'New Donee' }).click();
  await page.getByRole('textbox', { name: 'Name *' }).click();
  await page.getByRole('textbox', { name: 'Name *' }).fill('Dileepa_OLM');
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
  await page.getByRole('textbox', { name: 'johnsmith@gmail.com' }).fill('dileepabreadtech.12+OLM@gmail.com');
  await page.getByText('click to select files').click();
  await page.getByRole('button', { name: 'Proof Document *' }).setInputFiles('sample_upload_03.png');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('a').filter({ hasText: 'Close modal' }).click();
});
