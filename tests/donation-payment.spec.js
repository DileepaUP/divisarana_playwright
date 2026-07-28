import { test, expect } from '@playwright/test';

test.describe('Donation flow', () => {
  test('should open the payment gateway after entering donor details', async ({
    page,
  }) => {
    // Open the website.
    await page.goto('http://156.67.27.148:3011/', {
      waitUntil: 'domcontentloaded',
    });

    // Confirm that the website loaded.
    await expect(page.locator('body')).toBeVisible();

    // Open the donation modal.
    await page
      .getByRole('button', { name: 'Open donation modal' })
      .click();

    // Confirm that the donation form is visible.
    const firstNameField = page.getByRole('textbox', {
      name: 'First Name',
    });

    await expect(firstNameField).toBeVisible();

    // Complete the donor details.
    await firstNameField.fill('Dileepa');

    await page
      .getByRole('textbox', { name: 'Last Name' })
      .fill('Pathirana');

    await page
      .getByRole('textbox', {
        name: 'Your Email',
        exact: true,
      })
      .fill('dileepa.playwright@example.com');

    // Accept the terms and conditions.
    await page
      .getByText('I agree to the terms and')
      .click();

    // Continue to the payment gateway.
    await page
      .getByRole('button', {
        name: 'Donate now',
        exact: true,
      })
      .click();

    // Access the Paycorp iframe.
    const paymentFrame = page.frameLocator(
      'iframe[title="Paycorp Payment Gateway"]',
    );

    // Verify that the payment gateway loaded.
    await expect(
      paymentFrame.getByRole('textbox', {
        name: 'Name on Card',
      }),
    ).toBeVisible({
      timeout: 50_000,
    });
  });
});
