import { expect, test, type Page } from '@playwright/test';

async function openVacations(page: Page, version: string) {
  await page.goto(`/?version=${version}`);
  await page.getByRole('button', { name: 'Vacations', exact: true }).click();
  const form = page.getByRole('form', { name: 'Vacation packages', exact: true });
  await expect(form).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
  return form;
}

for (const version of ['v1', 'v2', 'v3', 'v4']) {
  test.describe(`${version} vacation packages`, () => {
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
    });

    test('uses the reference fields and defaults with the shared mobile components', async ({ page }) => {
      const form = await openVacations(page, version);
      await expect(page.getByRole('button', { name: 'Vacations', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', { name: 'Flights', exact: true })).toHaveAttribute('aria-pressed', 'false');
      await expect(form.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
      await expect(form.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('');
      await expect(form.getByRole('combobox', { name: 'Number of passengers', exact: true })).toHaveValue('1');
      await expect(form.getByRole('combobox', { name: 'Fare preference', exact: true })).toHaveValue('coach');
      await expect(form.getByTestId('date-input-first')).toHaveValue('');
      await expect(form.getByTestId('date-input-second')).toHaveValue('');
      await expect(page.getByRole('combobox', { name: 'Trip type', exact: true })).toHaveCount(0);
      await expect(page.getByRole('tablist', { name: 'Pay with' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Advanced search', exact: true })).toHaveCount(0);
      expect(await form.locator('.route-fields').boundingBox()).toMatchObject({ height: 66 });
      expect(await form.locator('.vacation-date-picker').boundingBox()).toMatchObject({ height: 66 });
      await expect(form.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
      await expect(form.getByText('Opens American Airlines Vacations in a new tab. Demo details aren’t sent.', { exact: true })).toHaveCount(0);
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `test-results/vacations-${version}.png` });
    });

    test('validates before opening the external vacation site and selects an independent round-trip range', async ({ page, context }) => {
      const form = await openVacations(page, version);
      await context.route('https://www.aavacations.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Vacation destination</title>' }));
      await form.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(form.getByRole('textbox', { name: 'To', exact: true })).toBeFocused();
      await expect(form.getByRole('textbox', { name: 'To', exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(form.getByText('Enter an arrival airport.')).toBeVisible();
      expect(context.pages()).toHaveLength(1);
      await form.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
      await form.getByRole('button', { name: 'Search', exact: true }).click();
      await expect(form.locator('.aileron-date-input__error-message').first()).toBeVisible();
      expect(context.pages()).toHaveLength(1);
      await form.locator('.vacation-date-picker').getByRole('button', { name: 'Open calendar' }).click();
      const calendar = page.getByRole('dialog', { name: 'Choose travel dates', exact: true });
      await calendar.locator('[data-date="2027-01-08"]').click();
      await calendar.locator('[data-date="2027-01-09"]').click();
      await calendar.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(form.locator('.vacation-date-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
      await expect(form.getByTestId('date-input-first')).toHaveValue(/Jan 8|01\/08\/2027/);
      await expect(form.getByTestId('date-input-second')).toHaveValue(/Jan 9|01\/09\/2027/);
      await form.getByRole('combobox', { name: 'Number of passengers', exact: true }).selectOption('2');
      await form.getByRole('combobox', { name: 'Fare preference', exact: true }).selectOption('business');
      const popupPromise = page.waitForEvent('popup');
      await form.getByRole('button', { name: 'Search', exact: true }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      expect(popup.url()).toBe('https://www.aavacations.com/');
      await expect(form.getByRole('status')).toContainText('2 passengers, flying Business');
      await expect(form.getByRole('status')).toContainText('details are not sent');
      await popup.close();
      await page.getByRole('button', { name: 'Flights', exact: true }).click();
      if (version !== 'v3') await page.getByRole('button', { name: 'Show all search options' }).click();
      const flights = page.getByRole('form', { name: 'Flight search', exact: true });
      await expect(flights.getByTestId('date-input-first')).toHaveValue('');
      await expect(flights.getByTestId('date-input-second')).toHaveValue('');
    });

    test('switching categories and travel tools preserves separate flight and vacation drafts', async ({ page }) => {
      await page.goto(`/?version=${version}`);
      await page.getByRole('textbox', { name: 'From', exact: true }).fill('MIA');
      await page.getByRole('textbox', { name: 'To', exact: true }).fill('JFK');
      await page.getByRole('button', { name: 'Vacations', exact: true }).click();
      const form = page.getByRole('form', { name: 'Vacation packages', exact: true });
      await expect(form.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
      await form.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
      await form.getByRole('button', { name: 'Swap origin and destination' }).click();
      await expect(form.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('LAX');
      await expect(form.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('DFW');
      await form.getByRole('combobox', { name: 'Fare preference', exact: true }).selectOption('first');
      await page.getByRole('button', { name: 'Flights', exact: true }).click();
      const flights = page.getByRole('form', { name: 'Flight search', exact: true });
      await expect(flights.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('MIA');
      await expect(flights.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('JFK');
      await page.getByRole('button', { name: 'Vacations', exact: true }).click();
      if (version === 'v3') {
        await page.getByRole('button', { name: 'Close search' }).click();
        await page.getByRole('button', { name: 'Trips & check-in', exact: true }).click();
        await page.getByRole('button', { name: 'Close search' }).click();
        await page.getByRole('textbox', { name: 'From', exact: true }).click();
        await expect(form.getByRole('textbox', { name: 'From', exact: true })).toBeFocused();
      } else if (version === 'v1') {
        await page.getByRole('tab', { name: 'Your trips / Check-in', exact: true }).click();
        await page.getByRole('tab', { name: 'Book', exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Your trip & check-in', exact: true }).click();
        await expect(page.getByRole('textbox', { name: 'Last name', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Book', exact: true }).click();
      }
      await expect(form).toBeVisible();
      await expect(form.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('LAX');
      await expect(form.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('DFW');
      await expect(form.getByRole('combobox', { name: 'Fare preference', exact: true })).toHaveValue('first');
    });

    for (const width of [320, 390, 430, 1280]) {
      test(`vacations fits ${width}px with its calendar contained in the phone`, async ({ page }) => {
        await page.setViewportSize({ width, height: 850 });
        const form = await openVacations(page, version);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await form.getByRole('combobox', { name: 'Fare preference', exact: true }).selectOption('premium-economy');
        await form.locator('.vacation-date-picker').getByRole('button', { name: 'Open calendar' }).click();
        const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
        const calendar = page.getByRole('dialog', { name: 'Choose travel dates', exact: true });
        expect(await calendar.boundingBox()).toMatchObject({ x: phone.x, width: phone.width, height: 850 });
        await page.keyboard.press('Escape');
        await expect(form.locator('.vacation-date-picker').getByRole('button', { name: 'Open calendar' })).toBeFocused();
        await form.getByRole('button', { name: 'Search', exact: true }).scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        if (width === 320) await page.screenshot({ path: `test-results/vacations-${version}-320.png` });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      });
    }
  });
}
