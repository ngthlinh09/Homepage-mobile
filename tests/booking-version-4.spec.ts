import { expect, test, type Page } from '@playwright/test';

async function settle(page: Page) {
  await expect(page.locator('.v4-tools-root')).toHaveAttribute('data-switching', 'false');
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/?version=v4');
  await page.getByRole('button', { name: 'Book', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
});

test('Version 4 matches the compact divider-based reference', async ({ page }) => {
  await expect(page.locator('[data-phone-viewport]')).toHaveAttribute('data-design-version', 'v4');
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Flight status', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.v4-tool-book .route-fields').boundingBox()).toMatchObject({ x: 16, y: 249, width: 358, height: 66 });
  expect(await page.locator('.v4-tool-trips').boundingBox()).toMatchObject({ x: 16, y: 383, width: 358, height: 65 });
  expect(await page.locator('.v4-tool-status').boundingBox()).toMatchObject({ x: 16, y: 448, width: 358, height: 65 });
  await expect(page.getByRole('button', { name: 'Show all search options' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  expect(await page.locator('.v4-tool-trips').evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('1px');
  expect(await page.locator('.v4-tool-book').evaluate(element => getComputedStyle(element).borderRadius)).toBe('0px');
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/version-4-compact.png' });
});

test('expanded booking matches the reference and Show less restores compact booking without losing drafts', async ({ page }) => {
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await settle(page);
  await expect(page.getByRole('button', { name: 'Advanced search', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect((await page.locator('#advanced-search-panel').boundingBox())!.height).toBe(0);
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show less', exact: true })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.locator('.v4-tools-root').screenshot({ path: 'test-results/version-4-expanded.png' });
  await page.getByRole('button', { name: 'Advanced search', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Cabin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced search', exact: true }).click();
  expect((await page.locator('#advanced-search-panel').boundingBox())!.height).toBe(0);
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.getByRole('combobox', { name: 'Passengers', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Show less', exact: true }).click();
  await settle(page);
  await expect(page.getByRole('button', { name: 'Show all search options' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('LAX');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await expect(page.getByRole('combobox', { name: 'Passengers', exact: true })).toHaveValue('2');
});

test('switching visibly finishes closing the old section before opening the next', async ({ page }) => {
  await page.evaluate(() => {
    const state = { samples: [] as { open: number; book: number; trips: number }[], running: true };
    (window as unknown as { v4Trace: typeof state }).v4Trace = state;
    const record = () => {
      state.samples.push({
        open: document.querySelectorAll('.v4-travel-tools > .aileron-accordion-item--open').length,
        book: document.querySelector('#v4-book-panel')!.getBoundingClientRect().height,
        trips: document.querySelector('#v4-trips-panel')!.getBoundingClientRect().height,
      });
      if (state.running) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  const trips = page.getByRole('button', { name: 'Your trip & check-in', exact: true });
  await trips.click();
  await settle(page);
  const samples = await page.evaluate(() => {
    const trace = (window as unknown as { v4Trace: { samples: { open: number; book: number; trips: number }[]; running: boolean } }).v4Trace;
    trace.running = false; return trace.samples;
  });
  expect(samples.length).toBeGreaterThan(5);
  expect(samples.every(sample => sample.open <= 1)).toBe(true);
  expect(samples.some(sample => sample.book > 1 && sample.book < 170 && sample.trips === 0)).toBe(true);
  expect(samples.some(sample => sample.book < 1 && sample.trips > 1)).toBe(true);
  expect(samples.every(sample => sample.book < 1 || sample.trips < 1)).toBe(true);
  await expect(trips).toBeFocused();
  await expect(page.locator('.v4-tools-root > [role="status"]')).toHaveText('Your trip & check-in opened. All other travel sections are closed.');
});

test('rapid changes end on the last requested section without concurrent open panels', async ({ page }) => {
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await page.getByRole('button', { name: 'Book', exact: true }).click();
  await settle(page);
  await expect(page.locator('.v4-travel-tools > .aileron-accordion-item--open')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('textbox', { name: 'Last name', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveCount(0);
});

test('headers support keyboard navigation, toggling, and Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Book', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await settle(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: 'Find trip', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Flight status', exact: true })).toBeFocused();
  await page.keyboard.press('Space');
  await settle(page);
  await expect(page.getByRole('button', { name: 'Flight status', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await settle(page);
  await expect(page.locator('.v4-travel-tools > .aileron-accordion-item--open')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Flight status', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toBeFocused();
});

test('trip and status drafts survive exclusive switches and submit demo results', async ({ page }) => {
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await settle(page);
  await page.getByRole('textbox', { name: 'Last name', exact: true }).fill('Smith');
  await page.getByRole('textbox', { name: 'Confirmation code or ticket number', exact: true }).fill('ABCDEF');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.v4-tool-trips .demo-result')).toContainText('design demo');
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await settle(page);
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await page.getByRole('textbox', { name: 'Flight number', exact: true }).fill('123');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.v4-tool-status .demo-result')).toContainText('live flight status');
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await settle(page);
  await expect(page.getByRole('textbox', { name: 'Last name', exact: true })).toHaveValue('Smith');
  await page.getByRole('tab', { name: 'Find travel credit', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Travel credit number or ticket number', exact: true })).toHaveValue('ABCDEF');
  await page.getByRole('button', { name: 'Flight status', exact: true }).click();
  await settle(page);
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('123');
});

test('shared calendars preserve the active accordion and keep dates independent', async ({ page }) => {
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('LAX');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('DFW');
  await page.locator('.booking-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  await calendar.locator('[data-date="2027-01-08"]').click();
  await calendar.locator('[data-date="2027-01-09"]').click();
  await calendar.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Search flights', exact: true }).click();
  await expect(page.locator('.v4-tool-book .demo-result')).toContainText('design demo');
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await settle(page);
  await expect(page.locator('.trip-date-picker').getByTestId('date-input-first')).toHaveValue('01/20/27');
  await page.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.trip-date-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
});

test('reduced motion switches immediately without a staged delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
  await expect(page.locator('.v4-tools-root')).toHaveAttribute('data-switching', 'false');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toHaveAttribute('aria-expanded', 'true');
  expect(await page.locator('#v4-trips-panel').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
});

test('Version 4 is selectable and the carousel retains its state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/versions?version=v3');
  await page.getByRole('button', { name: 'Show offer 2', exact: true }).click();
  await page.getByRole('combobox', { name: 'Design version', exact: true }).selectOption('v4');
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Show offer 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Open clean preview' })).toHaveAttribute('href', '/?version=v4&reveal=baseline');
});

for (const width of [320, 390, 430, 1280]) {
  test(`Version 4 fits ${width}px across all sections and expanded booking`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.getByRole('button', { name: 'Show all search options' }).click();
    await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.mouse.move(0, 0);
    await page.locator('.v4-tools-root').screenshot({ path: `test-results/version-4-expanded-${width}.png` });
    for (const name of ['Your trip & check-in', 'Flight status', 'Book']) {
      const trigger = page.getByRole('button', { name, exact: true });
      await trigger.click();
      await settle(page);
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect((await trigger.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    }
  });
}
