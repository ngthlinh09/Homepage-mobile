import { expect, test, type Page } from '@playwright/test';

const ready = async (page: Page) => {
  await page.getByRole('textbox', { name: 'From', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
};
const style = (page: Page, selector: string, pseudo: string | null, props: string[]) => page.locator(selector).first()
  .evaluate((element, [pseudoElement, keys]) => {
    const css = getComputedStyle(element, pseudoElement as string | null);
    return Object.fromEntries((keys as string[]).map(key => [key, css.getPropertyValue(key)]));
  }, [pseudo, props] as const);

test('airport field follows the Figma empty, hover, focus, and filled states', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const from = page.getByRole('textbox', { name: 'From', exact: true });
  const to = page.getByRole('textbox', { name: 'To', exact: true });
  expect(await page.locator('.route-fields').boundingBox()).toMatchObject({ height: 66 });
  expect(await style(page, '.airport-field-from input', '::placeholder', ['font-size', 'color'])).toEqual({ 'font-size': '18px', color: 'rgb(94, 109, 122)' });
  await expect(page.locator('.airport-field-label')).toHaveCount(0);

  const box = (await page.locator('.airport-field-from').boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  expect((await style(page, '.airport-field-from', '::before', ['background-color']))['background-color']).toBe('rgb(224, 242, 255)');

  await from.click();
  await page.keyboard.type('lax');
  await expect(page.locator('.airport-field-from .airport-field-label')).toHaveText('From');
  expect(await style(page, '.airport-field-from', '::before', ['border-top-width', 'border-top-color'])).toEqual({ 'border-top-width': '2px', 'border-top-color': 'rgb(0, 109, 192)' });
  expect(await style(page, '.airport-field-from', '::after', ['border-top-color'])).toEqual({ 'border-top-color': 'rgb(0, 144, 251)' });
  expect(await style(page, '.airport-field-from input', null, ['font-size', 'font-weight'])).toEqual({ 'font-size': '20px', 'font-weight': '700' });

  await to.click();
  await page.keyboard.type('dfw');
  await page.getByRole('button', { name: 'Swap origin and destination' }).focus();
  await expect(from).toHaveValue('LAX');
  await expect(to).toHaveValue('DFW');
  await expect(page.locator('.airport-field-from .airport-field-city')).toHaveText('Los Angeles');
  await expect(page.locator('.airport-field-to .airport-field-city')).toHaveText('Dallas/Fort Worth');
  const city = (await page.locator('.airport-field-from .airport-field-city').evaluate(element => element.scrollWidth <= element.clientWidth));
  expect(city).toBe(true);
  expect(await page.locator('.route-fields').boundingBox()).toMatchObject({ height: 66 });
});

test('empty airports show the Figma error state and clear as each field is fixed', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.getByRole('button', { name: 'Search flights' }).click();
  const from = page.getByRole('textbox', { name: 'From', exact: true });
  const to = page.getByRole('textbox', { name: 'To', exact: true });
  await expect(from).toBeFocused();
  await expect(from).toHaveAttribute('aria-invalid', 'true');
  await expect(to).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#route-from-error')).toHaveText('Enter a departure airport.');
  await expect(page.locator('#route-to-error')).toHaveText('Enter an arrival airport.');
  await expect(to).toHaveAttribute('aria-describedby', 'route-to-error');
  expect(await style(page, '.airport-field-to', '::before', ['border-top-color'])).toEqual({ 'border-top-color': 'rgb(214, 0, 27)' });
  expect(await style(page, '.route-field-captions', null, ['font-size', 'color'])).toEqual({ 'font-size': '12px', color: 'rgb(214, 0, 27)' });
  await expect(page.locator('.airport-field-to .field-error-icon')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);

  await from.fill('LAX');
  await expect(from).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#route-from-error')).toHaveText('');
  await expect(page.locator('#route-to-error')).toHaveText('Enter an arrival airport.');
  await to.fill('DFW');
  await expect(page.locator('.route-field-captions')).toHaveCount(0);
});

test('date field follows the Figma default, hover, focus, filled, and error states', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  const wrapper = '.booking-date-picker .aileron-date-input__wrapper';
  expect(await style(page, wrapper, null, ['height', 'border-top-color', 'border-radius', 'background-color'])).toEqual({
    height: '66px', 'border-top-color': 'rgb(208, 218, 224)', 'border-radius': '16px', 'background-color': 'rgb(255, 255, 255)',
  });
  const label = page.locator('.booking-date-picker .aileron-date-input__label-wrapper');
  expect((await label.boundingBox())!.width).toBeLessThanOrEqual(1);

  const box = (await page.locator(wrapper).boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + 30);
  expect((await style(page, wrapper, null, ['background-color']))['background-color']).toBe('rgb(224, 242, 255)');
  await page.mouse.move(0, 0);

  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.getByRole('button', { name: 'Search flights' }).click();
  await expect(page.getByTestId('date-input-first')).toBeFocused();
  expect(await style(page, wrapper, null, ['border-top-width', 'border-top-color', 'height'])).toEqual({ 'border-top-width': '2px', 'border-top-color': 'rgb(0, 109, 192)', height: '66px' });
  expect((await style(page, wrapper, '::before', ['border-top-color']))['border-top-color']).toBe('rgb(0, 144, 251)');
  await page.getByRole('combobox', { name: 'Trip type' }).focus();
  await expect.poll(async () => (await style(page, wrapper, null, ['border-top-color']))['border-top-color']).toBe('rgb(214, 0, 27)');
  expect((await label.boundingBox())!.height).toBe(20);
  await expect(page.locator('.booking-date-picker .aileron-date-input__error-message').first()).toBeVisible();

  await page.goto('/?version=v2');
  await ready(page);
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  const trip = page.locator('.trip-date-picker');
  await expect(trip.locator('.aileron-date-input__label')).toHaveText('Date');
  expect(await style(page, '.trip-date-picker [data-testid="date-input-first"]', null, ['font-size', 'font-weight', 'color'])).toEqual({ 'font-size': '16px', 'font-weight': '500', color: 'rgb(27, 31, 35)' });
  const labelBox = (await trip.locator('.aileron-date-input__label-wrapper').boundingBox())!;
  const valueBox = (await trip.getByTestId('date-input-first').boundingBox())!;
  const fieldBox = (await trip.locator('.aileron-date-input__wrapper').boundingBox())!;
  expect(labelBox.y - fieldBox.y).toBe(9);
  expect(fieldBox.y + fieldBox.height - (valueBox.y + valueBox.height)).toBe(9);
});

test('Version 1 lookup tabs use the text and date field components with ADS error states', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await page.getByRole('tab', { name: 'Your trips / Check-in' }).click();
  const lastName = page.getByRole('textbox', { name: 'Last name', exact: true });
  expect(await page.locator('.text-field-box').first().boundingBox()).toMatchObject({ height: 66 });
  await expect(lastName).toHaveAttribute('placeholder', 'Last name');
  await page.getByRole('button', { name: 'Find your trip' }).click();
  await expect(lastName).toBeFocused();
  await expect(lastName).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter the last name on the reservation.')).toBeVisible();
  await expect(page.getByText('Enter your 6-character confirmation code.')).toBeVisible();
  expect(await style(page, '.text-field-box', null, ['border-top-width', 'border-top-color'])).toEqual({ 'border-top-width': '2px', 'border-top-color': 'rgb(0, 109, 192)' });
  expect((await style(page, '.text-field:nth-of-type(2) .text-field-box', null, ['border-top-color']))['border-top-color']).toBe('rgb(214, 0, 27)');
  await lastName.fill('Smith');
  await expect(lastName).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('.text-field-label').first()).toHaveText('Last name');
  expect(await style(page, '.text-field input', null, ['font-size', 'font-weight'])).toEqual({ 'font-size': '16px', 'font-weight': '500' });

  await page.getByRole('tab', { name: 'Flight status', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('');
  await page.getByRole('textbox', { name: 'Flight number', exact: true }).fill('123');
  await page.getByRole('button', { name: 'Find flight' }).click();
  await expect(page.locator('.status-date-picker .aileron-date-input__error-message').first()).toBeVisible();
  await expect(page.locator('.status-date-picker .aileron-date-input__label')).toContainText('Flight date');
  expect(await page.locator('.status-date-picker .aileron-date-input__wrapper').boundingBox()).toMatchObject({ height: 66 });
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('Version 2 trip and status cards use the shared input field components', async ({ page }) => {
  await page.goto('/?version=v2');
  await ready(page);
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  const card = page.locator('.booking-tool-card-trips');
  await expect(card.locator('.text-field')).toHaveCount(2);
  await expect(card.locator('.date-field')).toHaveCount(1);
  await card.getByRole('textbox', { name: 'Last name', exact: true }).fill('Smith');
  await card.getByRole('textbox', { name: 'Last name', exact: true }).press('Enter');
  const identifier = card.getByRole('textbox', { name: 'Confirmation code or ticket number' });
  await expect(identifier).toBeFocused();
  await expect(identifier).toHaveAttribute('aria-invalid', 'true');
  await expect(card.getByText('Enter a confirmation code or ticket number.')).toBeVisible();
  await card.getByRole('button', { name: 'About the last name' }).click();
  await expect(card.getByRole('textbox', { name: 'Last name', exact: true })).toHaveAttribute('aria-describedby', 'trip-name-help');

  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  const status = page.locator('.booking-tool-card-status');
  await expect(status.locator('.route-field')).toHaveCount(1);
  await expect(status.locator('.date-field')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await expect(status.locator('.text-field')).toHaveCount(1);
  await expect(status.locator('.date-field')).toHaveCount(1);
});
