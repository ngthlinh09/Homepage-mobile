import { expect, test, type Page } from '@playwright/test';

const settle = async (page: Page) => {
  await page.waitForFunction(() => document.querySelector('.booking-tool-cards')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/?version=v2');
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await settle(page);
});

test('Cities state matches the empty reference layout', async ({ page }) => {
  const card = page.locator('.booking-tool-card-status');
  await expect(page.getByRole('tab', { name: 'Cities', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(card.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('');
  await expect(card.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('');
  await expect(card.getByTestId('date-input-first')).toHaveValue('');
  await expect(card.getByTestId('date-input-second')).toHaveValue('');
  await expect(card.getByRole('button', { name: 'Find flight', exact: true })).toHaveCount(0);
  expect(await card.boundingBox()).toMatchObject({ width: 358, height: 304 });
  expect(await card.locator('.route-fields').boundingBox()).toMatchObject({ width: 324, height: 66 });
  expect(await card.locator('.status-range-picker').boundingBox()).toMatchObject({ width: 324, height: 64 });
  await page.mouse.move(0, 0);
  await card.screenshot({ path: 'test-results/flight-status-cities.png' });
});

test('Flight number state matches the populated date-range reference', async ({ page }) => {
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await settle(page);
  const card = page.locator('.booking-tool-card-status');
  await expect(card.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('');
  await expect(card.locator('.aileron-date-input__label')).toHaveText('Flight dates');
  await expect(card.getByTestId('date-input-first')).toHaveValue('01/20/27');
  await expect(card.getByTestId('date-input-second')).toHaveValue('02/12/27');
  await expect(card.getByRole('button', { name: 'Find flight', exact: true })).toHaveCount(0);
  expect(await card.boundingBox()).toMatchObject({ width: 358, height: 294 });
  expect(await card.locator('.text-field-box').boundingBox()).toMatchObject({ width: 324, height: 56 });
  await page.mouse.move(0, 0);
  await card.screenshot({ path: 'test-results/flight-status-number.png' });
});

test('keyboard mode changes retain independent drafts and clear submitted results', async ({ page }) => {
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.getByRole('button', { name: 'Swap origin and destination' }).click();
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('LAX');
  await page.getByRole('tab', { name: 'Cities', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Flight number', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Flight number', exact: true }).fill('123');
  await page.getByRole('button', { name: 'Find flight', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('live flight status');
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /flights\/status/);
  await page.getByRole('tab', { name: 'Flight number', exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Cities', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('LAX');
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('');
  await page.keyboard.press('End');
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('123');
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('123');
});

test('city date range uses the shared calendar and does not change other search dates', async ({ page }) => {
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.locator('.status-range-picker').getByRole('button', { name: 'Open calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
  await dialog.locator('[data-date="2027-01-08"]').click();
  await dialog.locator('[data-date="2027-01-09"]').click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('01/08/27');
  await expect(page.locator('.status-range-picker').getByTestId('date-input-second')).toHaveValue('01/09/27');
  await page.getByRole('button', { name: 'Find flight', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('live flight status');
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await page.locator('.status-range-picker').getByTestId('date-input-second').press('Enter');
  await expect(dialog.getByRole('button', { name: /^Return:/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('');
  await page.getByRole('tab', { name: 'Cities', exact: true }).click();
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('01/08/27');
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await page.getByRole('button', { name: 'Book', exact: true }).click();
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await expect(page.locator('.booking-date-picker').getByTestId('date-input-first')).toHaveValue('');
});

test('incomplete searches validate without showing a demo result', async ({ page }) => {
  await page.getByRole('textbox', { name: 'From', exact: true }).press('Enter');
  await expect(page.getByText('Enter a departure airport.')).toBeVisible();
  await expect(page.getByText('Enter an arrival airport.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveAttribute('aria-describedby', 'status-route-from-error');
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.getByRole('textbox', { name: 'To', exact: true }).press('Enter');
  await expect(page.locator('.status-range-picker .aileron-date-input__error-message').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await page.getByRole('textbox', { name: 'Flight number', exact: true }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('status')).toHaveCount(0);
});

for (const width of [320, 390, 430, 1280]) {
  test(`both status states fit ${width}px and the calendar stays inside the phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ['Cities', 'Flight number']) {
      await page.getByRole('tab', { name: mode, exact: true }).click();
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
      await page.locator('.status-range-picker').getByRole('button', { name: 'Open calendar' }).click();
      const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
      expect(await dialog.boundingBox()).toMatchObject({ x: phone.x, width: phone.width, height: 900 });
      await page.keyboard.press('Escape');
      await expect(page.locator('.status-range-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
    }
  });
}
