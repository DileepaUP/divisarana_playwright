import 'dotenv/config';
import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('http://156.67.27.148:3010/');
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.TEST_USER_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.goto('http://156.67.27.148:3010/Projects/Events');
  await page.getByRole('button', { name: 'New Event' }).click();

  await page.getByRole('textbox', { name: 'Title *' }).click();
  await page.getByRole('textbox', { name: 'Title *' }).fill('LLM_Dileepa');
  await page.getByRole('textbox', { name: 'Description *' }).click();
  await page.getByRole('textbox', { name: 'Description *' }).fill('sample description');
  await page.getByRole('textbox', { name: 'Goal *' }).click();
  await page.getByRole('textbox', { name: 'Goal *' }).fill('sample description for a goal');
  await page.getByRole('textbox', { name: 'Beneficiaries *' }).click();
  await page.getByRole('textbox', { name: 'Beneficiaries *' }).fill('sample description for beneficiaries');
  await page.locator('.css-8mmkcg').first().click();
  await page.getByRole('option', { name: 'Service' }).click();
  await page.locator('#startDate').fill('2026-08-11');
  await page.locator('#endDate').fill('2026-08-14');

  // Coordinators (multi-select): add each one by name.
  const coordinators = [
    'Dileepa_obs',
    'Dileepa Fernando',
    'Dileepa_tst11',
    'Dileepa_TRK',
    'Dileepa_oob',
  ];
  await page.locator('#coordinator > .css-jnw0ya-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer').click();
  await page.getByRole('option', { name: coordinators[0] }).click();
  for (const name of coordinators.slice(1)) {
    await page.locator('div:nth-child(3) > .css-8mmkcg').click();
    await page.getByRole('option', { name, exact: true }).click();
  }

  // Related volunteers (multi-select, searchable): search "Dileepa" then pick each match.
  const volunteers = [
    'DIleepa_DOM',
    'DileepaMBA',
    'DileepaOPL',
    'DileepaOLC',
    'DileepaPPC',
    'Dileepa_OOL',
    'Dileepa_ooa',
    'Dileepa_11',
    'Dileepa_OOC',
    'DileepaUP',
    'Dileepa_KDU',
    'Dileepa_NKV',
    'Dileepa_OOU',
  ];
  await page.locator('#donor > .css-jnw0ya-control > .css-1wy0on6 > .css-1xc3v61-indicatorContainer > .css-8mmkcg').click();
  for (const name of volunteers) {
    await page.locator('#react-select-5-input').fill('Dileepa');
    await page.getByRole('option', { name, exact: true }).click();
    await page.locator('.css-1gvy54h-control > .css-1wy0on6 > div:nth-child(3)').click();
  }

  await page.getByRole('textbox', { name: '+' }).click();
  await page.getByRole('textbox', { name: '+' }).fill('7744125896');
  await page.getByRole('textbox', { name: 'example@domain.com' }).click();
  await page.getByRole('textbox', { name: 'example@domain.com' }).fill('dileepabreadtech.12+LLM@gmail.com');
  await page.getByRole('checkbox', { name: 'Send Alert' }).check();
  await page.locator('select[name="location"]').selectOption('2437');
  await page.getByRole('button', { name: 'Save' }).click();
});
