import { expect, test, type Page } from '@playwright/test';

const concepts = ['a', 'b', 'c'] as const;
const viewports = [
  { width: 375, height: 548 },
  { width: 360, height: 640 },
  { width: 390, height: 664 },
  { width: 430, height: 740 },
];

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.locator('[data-fold="book-from"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
}

async function fold(page: Page) {
  return page.evaluate(() => {
    const height = window.innerHeight;
    const obstruction = document.querySelector('[data-fold-obstruction]');
    const obstructionTop = obstruction ? obstruction.getBoundingClientRect().top : height;
    return ['book-from', 'book-to', 'trip', 'status', 'ad-headline'].map(key => {
      const element = document.querySelector(`[data-fold="${key}"]`);
      if (!element) return { key, ok: false };
      const inside = Boolean(obstruction?.contains(element));
      const limit = inside ? height : Math.min(height, obstructionTop);
      const rect = element.getBoundingClientRect();
      return { key, ok: rect.height > 0 && rect.top >= 0 && rect.bottom <= limit + 0.5 && rect.right <= window.innerWidth + 0.5 };
    });
  });
}

for (const concept of concepts) {
  test.describe(`concept ${concept.toUpperCase()}`, () => {
    for (const viewport of viewports) {
      test(`passes the above-the-fold matrix at ${viewport.width}×${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await open(page, `/concepts/${concept}`);
        expect(await fold(page)).toEqual(['book-from', 'book-to', 'trip', 'status', 'ad-headline'].map(key => ({ key, ok: true })));
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      });
    }

    test('has no horizontal overflow at 320px and loads without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width: 320, height: 568 });
      await open(page, `/concepts/${concept}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/concepts/${concept}-320.png`, fullPage: true });
    });

    test('From and To accept input on load, autocomplete by keyboard, and validate before search', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 664 });
      await open(page, `/concepts/${concept}`);
      const from = page.getByRole('combobox', { name: 'From' });
      const to = page.getByRole('combobox', { name: 'To' });
      await from.fill('');
      await from.fill('chic');
      await expect(page.getByRole('option', { name: /ORD/ })).toBeVisible();
      await from.press('Enter');
      await expect(from).toHaveAttribute('aria-expanded', 'false');
      await to.fill('qqq');
      await expect(page.locator('.ac-popup-status')).toContainText('No airports match');
      await to.fill('Miami');
      await page.getByRole('option', { name: /MIA/ }).click();
      await (concept === 'c' ? page.getByRole('button', { name: /Search/ }).last() : page.getByRole('button', { name: /^Search/ }).first()).click();
      if (concept === 'c') {
        await expect(page.getByRole('dialog', { name: 'When are you flying?' })).toBeVisible();
        await page.keyboard.press('Escape');
      }
      const datesButton = page.getByRole('button', { name: /dates|Depart/i }).first();
      await expect(datesButton).toHaveAttribute('aria-describedby', /dates-error/);
      await expect(page.getByText('Choose your travel dates.')).toBeVisible();
      const events = await page.evaluate(() => window.dataLayer?.map(event => event.event) ?? []);
      expect(events).toEqual(expect.arrayContaining(['homepage_impression', 'field_focus', 'airport_selected', 'booking_start', 'search_submit', 'search_validation_error', 'autocomplete_no_result']));
      expect(await page.evaluate(() => window.dataLayer?.every(event => event.variant.startsWith('concept-') && event.viewport.width > 0))).toBe(true);
    });

    test('links a missing-airport error to the field', async ({ page }) => {
      await open(page, `/concepts/${concept}`);
      const from = page.getByRole('combobox', { name: 'From' });
      await from.fill('');
      await (concept === 'c' ? page.getByRole('button', { name: /Search/ }).last() : page.getByRole('button', { name: /^Search/ }).first()).click();
      await expect(from).toHaveAttribute('aria-invalid', 'true');
      await expect(from).toBeFocused();
      const describedBy = await from.getAttribute('aria-describedby');
      const message = await page.evaluate(ids => ids!.split(' ').map(id => document.getElementById(id)?.textContent).join(' '), describedBy);
      expect(message).toContain('flying from');
    });

    test('falls back to a typed airport code when autocomplete is offline and keeps input', async ({ page }) => {
      await open(page, `/concepts/${concept}?sim=offline`);
      const to = page.getByRole('combobox', { name: 'To' });
      await to.fill('lhr');
      await expect(page.locator('.ac-popup-status')).toContainText('suggestions are unavailable');
      await page.getByRole('option', { name: /LHR/ }).click();
      await expect(to).toHaveValue(/LHR/);
      await page.reload();
      await expect(page.getByRole('combobox', { name: 'To' })).toHaveValue(/LHR/);
    });

    test('gives disruption alerts precedence in irregular operations', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 664 });
      await open(page, `/concepts/${concept}?ops=irregular`);
      await expect(page.getByRole('heading', { name: /Winter weather/ })).toBeInViewport();
      const results = await fold(page);
      expect(results.filter(result => result.key !== 'ad-headline').every(result => result.ok)).toBe(true);
    });
  });
}

test('concept A swaps the canvas to trip lookup and back without losing the booking draft', async ({ page }) => {
  await open(page, '/concepts/a');
  await page.getByRole('combobox', { name: 'To' }).fill('Cancún');
  await page.getByRole('option', { name: /CUN/ }).click();
  await page.getByRole('button', { name: 'Trips & check-in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Find your trip' })).toBeFocused();
  await page.getByRole('button', { name: 'Find your trip' }).click();
  await expect(page.getByLabel('Last name')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Book a flight' }).click();
  await expect(page.getByRole('combobox', { name: 'To' })).toHaveValue('Cancún (CUN)');
});

test('concept B tracks a flight inline from the homepage', async ({ page }) => {
  await open(page, '/concepts/b');
  await page.getByRole('textbox', { name: 'Flight number' }).fill('AA 2245');
  await expect(page.getByRole('textbox', { name: 'Flight number' })).toHaveValue('2245');
  await page.getByRole('button', { name: 'Track flight' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Illustrative data' })).toBeVisible();
  await page.getByRole('button', { name: 'Find trip' }).click();
  await expect(page.getByRole('textbox', { name: 'Confirmation code' })).toBeFocused();
});

test('concept C opens servicing in a sheet, keeps input, and returns focus', async ({ page }) => {
  await open(page, '/concepts/c');
  const trigger = page.getByRole('button', { name: 'Trips & check-in' });
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Trips & check-in' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Last name').fill('Rivera');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Trips & check-in' }).getByLabel('Last name')).toHaveValue('Rivera');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Cancún/ }).click();
  await expect(page.getByRole('dialog', { name: 'When are you flying?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Search DFW → CUN/ })).toBeVisible();
});

test('touch targets in the first viewport are at least 44 by 44 CSS pixels', async ({ page }) => {
  for (const concept of concepts) {
    await page.setViewportSize({ width: 375, height: 548 });
    await open(page, `/concepts/${concept}`);
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, main a, main select, main input, nav button')]
      .filter(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 1 && style.visibility !== 'hidden'
          && !element.closest('.visually-hidden, [hidden], dialog');
      })
      .map(element => {
        const target = element.closest('label, .ac-control, .a-token, .b-field, .c-half') ?? element;
        const rect = target.getBoundingClientRect();
        return { text: (element.textContent || element.getAttribute('aria-label') || element.tagName).trim().slice(0, 30), width: Math.round(rect.width), height: Math.round(rect.height) };
      })
      .filter(target => target.width < 44 || target.height < 44));
    expect(small, `concept ${concept}`).toEqual([]);
  }
});
