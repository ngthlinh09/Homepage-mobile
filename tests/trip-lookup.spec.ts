import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?version=v2');
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.booking-tool-cards')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  await page.evaluate(() => document.fonts.ready);
});

test('Version 2 trip card matches the supplied Figma layout and initial state', async ({ page }) => {
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
  expect(await page.locator('.booking-tool-card-trips').boundingBox()).toMatchObject({ x: 16, y: 223, width: 358, height: 388 });
  expect(await page.locator('.booking-tool-card-trips .trip-mode-switcher').boundingBox()).toMatchObject({ x: 33, y: 288, width: 324, height: 44 });
  expect(await page.locator('.trip-last-name-field').boundingBox()).toMatchObject({ x: 33, y: 356, width: 324, height: 66 });
  expect(await page.locator('.trip-date-picker').boundingBox()).toMatchObject({ x: 33, y: 438, width: 324, height: 66 });
  expect(await page.locator('.trip-identifier-field').boundingBox()).toMatchObject({ x: 33, y: 520, width: 324, height: 66 });
  expect(await page.locator('.booking-tool-card-status').boundingBox()).toMatchObject({ y: 627, height: 58 });
  await expect(page.getByRole('tab', { name: 'Find trip', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-second')).toHaveValue('02/12/27');
  await expect(page.getByRole('button', { name: 'Find trip', exact: true })).toHaveCount(0);
  const input = (await page.locator('.trip-date-picker').getByTestId('date-input-first').boundingBox())!;
  const separator = (await page.locator('.trip-date-picker .aileron-date-input__range-separator').boundingBox())!;
  expect(separator.y).toBe(input.y);
  expect(separator.height).toBe(24);
  const dash = (await page.locator('.trip-date-picker .aileron-date-input__dash').boundingBox())!;
  expect(dash.x).toBeGreaterThanOrEqual(separator.x);
  expect(dash.x + dash.width).toBeLessThanOrEqual(separator.x + separator.width);
  await page.mouse.move(0, 0);
  await page.locator('.booking-tool-card-trips').screenshot({ path: 'test-results/trip-lookup-refined.png' });
});

test('Version 2 travel credit matches the supplied screen', async ({ page }) => {
  await page.getByRole('tab', { name: 'Find travel credit', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.trip-mode-switcher')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  await expect(page.getByRole('tab', { name: 'Find travel credit', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.trip-date-picker .aileron-date-input__label')).toHaveText('Date of birth');
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-second')).toHaveValue('02/12/27');
  await expect(page.getByLabel('Travel credit number or ticket number')).toBeVisible();
  await expect(page.getByLabel('Confirmation code or ticket number')).toHaveCount(0);
  expect(await page.locator('.booking-tool-card-trips').boundingBox()).toMatchObject({ width: 358, height: 362 });
  expect(await page.locator('.trip-last-name-field').boundingBox()).toMatchObject({ height: 52 });
  expect(await page.locator('.trip-date-picker').boundingBox()).toMatchObject({ height: 64 });
  expect(await page.locator('.trip-identifier-field').boundingBox()).toMatchObject({ height: 56 });
  await page.mouse.move(0, 0);
  await page.locator('.booking-tool-card-trips').screenshot({ path: 'test-results/travel-credit-refined.png' });
});

test('trip lookup modes support keyboard selection and retain form values', async ({ page }) => {
  await page.getByLabel('Last name', { exact: true }).fill('Smith');
  await page.getByLabel('Confirmation code or ticket number').fill('0012345678901');
  await page.getByRole('tab', { name: 'Find trip', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Find travel credit', exact: true })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Find travel credit', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Last name', { exact: true })).toHaveValue('Smith');
  await expect(page.getByLabel('Travel credit number or ticket number')).toHaveValue('0012345678901');
  await page.getByRole('button', { name: 'Find travel credit', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('look up your travel credit');
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /travel-credit.jsp/);
  await page.getByRole('tab', { name: 'Find trip', exact: true }).click();
  await page.getByLabel('Confirmation code or ticket number').press('Enter');
  await expect(page.getByRole('status')).toContainText('find your trip or check in');
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /find-your-reservation/);
});

test('the inline info action reveals accessible last-name guidance', async ({ page }) => {
  const info = page.getByRole('button', { name: 'About the last name', exact: true });
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  await info.click();
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('note')).toContainText('exactly as it appears on your reservation');
  await expect(page.getByLabel('Last name', { exact: true })).toHaveAttribute('aria-describedby', 'trip-name-help');
  await info.click();
  await expect(page.getByRole('note')).toHaveCount(0);
});

test('trip date range uses the shared phone calendar without changing Book dates', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
  const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
  await expect(dialog).toBeVisible();
  expect(await dialog.boundingBox()).toMatchObject({ x: phone.x, width: phone.width, height: 800 });
  await expect(dialog.locator('.agc-calendar')).toHaveClass(/mobile-view/);
  await expect(dialog.getByRole('button', { name: /^Start date:/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.locator('[data-date="2027-01-20"]')).toHaveClass(/cal__day--start/);
  await expect(dialog.locator('[data-date="2027-02-12"]')).toHaveClass(/cal__day--end/);
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('');
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-second')).toHaveValue('');
  await page.getByRole('button', { name: 'Book', exact: true }).click();
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await expect(page.locator('.booking-date-picker').getByTestId('date-input-first')).toHaveValue('');
  await expect(page.locator('.booking-date-picker').getByTestId('date-input-second')).toHaveValue('');
});

for (const width of [320, 390, 430, 1280]) {
  test(`refined trip card fits ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('tab', { name: 'Find travel credit', exact: true }).click();
    await page.getByLabel('Last name', { exact: true }).fill('Smith');
    await page.getByLabel('Travel credit number or ticket number').fill('0012345678901');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.getByRole('button', { name: 'Find travel credit', exact: true })).toBeVisible();
  });
}
