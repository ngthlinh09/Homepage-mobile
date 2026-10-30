import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.locator('.v3-compact-booking').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/?version=v3');
  await ready(page);
});

test('Version 3 compact homepage matches the reference layout', async ({ page }) => {
  await expect(page.locator('[data-phone-viewport]')).toHaveAttribute('data-design-version', 'v3');
  await expect(page.getByRole('heading', { name: 'Where can we take you today?', exact: true })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Travel tools' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show all search options' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('.airline-header').boundingBox()).toMatchObject({ y: 54, height: 79 });
  expect(await page.locator('.v3-compact-booking .route-fields').boundingBox()).toMatchObject({ x: 16, y: 241, width: 358, height: 66 });
  expect(await page.getByRole('button', { name: 'Trips & check-in', exact: true }).boundingBox()).toMatchObject({ y: 335, height: 54 });
  expect(await page.getByRole('button', { name: 'Flight status', exact: true }).boundingBox()).toMatchObject({ y: 335, height: 54 });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/version-3-home.png' });
});

for (const airport of ['From', 'To'] as const) {
  test(`focusing ${airport} opens booking, keeps typing focus, and retains the draft after closing`, async ({ page }) => {
    await page.getByRole('textbox', { name: airport, exact: true }).focus();
    const dialog = page.getByRole('dialog', { name: 'Where can we take you today?', exact: true });
    const input = dialog.getByRole('textbox', { name: airport, exact: true });
    await expect(input).toBeFocused();
    await page.keyboard.type('LAX');
    await expect(input).toHaveValue('LAX');
    await expect(dialog.getByRole('combobox', { name: 'Trip type', exact: true })).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: 'Last name', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Passengers', exact: true }).selectOption('2');
    await dialog.getByRole('button', { name: 'Close search', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Where can we take you today?', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: airport, exact: true })).toHaveValue('LAX');
    await page.getByRole('textbox', { name: airport, exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: 'Passengers', exact: true })).toHaveValue('2');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('booking supports calendar selection, payment, advanced search, and a demo submission', async ({ page }) => {
  await page.getByRole('textbox', { name: 'From', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Where can we take you today?', exact: true });
  await dialog.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await dialog.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await dialog.getByRole('button', { name: 'Swap origin and destination', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
  await dialog.locator('.booking-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  await calendar.locator('[data-date="2027-01-08"]').click();
  await calendar.locator('[data-date="2027-01-09"]').click();
  await calendar.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog.locator('.booking-date-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
  await dialog.getByRole('heading', { name: 'Where can we take you today?', exact: true }).focus();
  await expect(dialog.locator('.booking-date-picker').getByTestId('date-input-first')).toHaveValue('01/08/2027');
  await dialog.getByRole('tab', { name: 'Miles', exact: true }).click();
  await dialog.getByRole('button', { name: 'Advanced search', exact: true }).click();
  await dialog.getByText('Nonstop flights only', { exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Nonstop flights only', exact: true })).toBeChecked();
  await dialog.getByRole('button', { name: 'Search flights', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('paying with miles');
  await expect(dialog.getByRole('status').getByRole('link')).toHaveAttribute('href', /find-flights/);
});

test('trip panel has a persistent bottom Search, validates, and preserves its draft', async ({ page }) => {
  const shortcut = page.getByRole('button', { name: 'Trips & check-in', exact: true });
  await shortcut.click();
  const dialog = page.getByRole('dialog', { name: 'Trips & check-in', exact: true });
  await expect(dialog.getByRole('tab', { name: 'Find trip', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await expect(dialog.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/version-3-trips.png' });
  await dialog.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Last name', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await dialog.getByRole('textbox', { name: 'Last name', exact: true }).fill('Smith');
  await dialog.getByRole('textbox', { name: 'Confirmation code or ticket number', exact: true }).fill('ABCDEF');
  await dialog.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('design demo');
  await page.keyboard.press('Escape');
  await expect(shortcut).toBeFocused();
  await shortcut.click();
  await expect(dialog.getByRole('textbox', { name: 'Last name', exact: true })).toHaveValue('Smith');
  await dialog.getByRole('tab', { name: 'Find travel credit', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Travel credit number or ticket number', exact: true })).toHaveValue('ABCDEF');
});

test('status opens on Flight number and supports both modes and its range calendar', async ({ page }) => {
  const shortcut = page.getByRole('button', { name: 'Flight status', exact: true });
  await shortcut.click();
  const dialog = page.getByRole('dialog', { name: 'Flight status', exact: true });
  await expect(dialog.getByRole('tab', { name: 'Flight number', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/version-3-status.png' });
  await dialog.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await dialog.getByRole('textbox', { name: 'Flight number', exact: true }).fill('123');
  await dialog.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('live flight status');
  await dialog.getByRole('tab', { name: 'Cities', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await dialog.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await dialog.locator('.status-range-picker').getByRole('button', { name: 'Open calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  await calendar.locator('[data-date="2027-01-08"]').click();
  await calendar.locator('[data-date="2027-01-09"]').click();
  await calendar.getByRole('button', { name: 'Done', exact: true }).click();
  await dialog.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('live flight status');
  await dialog.getByRole('button', { name: 'Close search' }).click();
  await expect(shortcut).toBeFocused();
  await shortcut.click();
  await expect(dialog.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('LAX');
});

test('nested calendar Escape returns to the panel; panel Escape returns home', async ({ page }) => {
  await page.getByRole('button', { name: 'Trips & check-in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Trips & check-in', exact: true });
  await dialog.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose travel dates' })).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

test('version picker exposes Version 3 without resetting the shared carousel', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/versions?version=v2');
  await page.getByRole('button', { name: 'Show offer 2', exact: true }).click();
  await page.getByRole('combobox', { name: 'Design version', exact: true }).selectOption('v3');
  await ready(page);
  await expect(page.getByRole('button', { name: 'Show offer 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Open clean preview' })).toHaveAttribute('href', '/?version=v3&reveal=baseline');
  await expect(page.getByRole('combobox', { name: 'Treatment', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trips & check-in', exact: true }).click();
  const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
  const header = (await page.locator('.airline-header').boundingBox())!;
  expect(await page.getByRole('dialog', { name: 'Trips & check-in', exact: true }).boundingBox()).toMatchObject({ x: phone.x, y: header.y + header.height, width: phone.width });
});

test('open panels track viewport resizing and respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Trips & check-in', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Trips & check-in', exact: true });
  await dialog.getByRole('tab', { name: 'Find travel credit', exact: true }).click();
  expect(await dialog.locator('.v3-trip-panel .trip-mode-indicator').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await page.setViewportSize({ width: 320, height: 640 });
  await expect.poll(async () => (await dialog.boundingBox())?.width).toBe(320);
  expect(await dialog.boundingBox()).toMatchObject({ x: 0, y: 133, width: 320, height: 507 });
  await dialog.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  expect(await calendar.boundingBox()).toMatchObject({ x: 0, y: 0, width: 320, height: 640 });
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('button', { name: 'Trips & check-in', exact: true })).toBeFocused();
});

for (const viewport of [{ width: 320, height: 640 }, { width: 390, height: 773 }, { width: 430, height: 850 }, { width: 1280, height: 800 }]) {
  test(`Version 3 fits ${viewport.width}×${viewport.height} with contained panels and reachable actions`, async ({ page }) => {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    for (const tool of ['Book', 'Trips & check-in', 'Flight status']) {
      if (tool === 'Book') await page.getByRole('textbox', { name: 'From', exact: true }).click();
      else await page.getByRole('button', { name: tool, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: tool === 'Book' ? 'Where can we take you today?' : tool, exact: true });
      const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
      const box = (await dialog.boundingBox())!;
      expect(box).toMatchObject({ x: phone.x, y: 133, width: phone.width, height: viewport.height - 133 });
      const action = dialog.getByRole('button', { name: tool === 'Book' ? 'Search flights' : 'Search', exact: true });
      await action.scrollIntoViewIfNeeded();
      const actionBox = (await action.boundingBox())!;
      expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(viewport.height - 15);
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.mouse.move(0, 0);
      if (tool === 'Book') {
        await dialog.getByRole('heading', { name: 'Where can we take you today?', exact: true }).focus();
        await page.screenshot({ path: `test-results/version-3-book-${viewport.width}.png` });
      }
      await dialog.getByRole('button', { name: 'Close search' }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    }
  });
}
