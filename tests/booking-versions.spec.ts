import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.getByRole('textbox', { name: 'From', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
}

test('Version 2 matches the Figma stacked-card geometry at 390px', async ({ page }) => {
  await page.goto('/?version=v2');
  await ready(page);
  await expect(page.getByRole('tablist', { name: 'Travel tools' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Flight status', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.airline-header').boundingBox()).toMatchObject({ y: 54, height: 79 });
  expect(await page.locator('.booking-tool-card-book').boundingBox()).toMatchObject({ x: 16, y: 149, width: 358, height: 232 });
  expect(await page.locator('.booking-tool-card-trips').boundingBox()).toMatchObject({ x: 16, y: 397, width: 358, height: 58 });
  expect(await page.locator('.booking-tool-card-status').boundingBox()).toMatchObject({ x: 16, y: 471, width: 358, height: 58 });
  expect(await page.locator('.booking-tool-card-book .route-fields').boundingBox()).toMatchObject({ x: 33, y: 258, width: 324, height: 66 });
  expect(await page.locator('.promotion').boundingBox()).toMatchObject({ x: 16, y: 633, width: 358, height: 214 });
  expect(await page.getByRole('textbox', { name: 'From', exact: true }).evaluate(element => getComputedStyle(element).fontVariationSettings)).toBe('"wght" 400');
  const assets = await page.locator('.airline-header img').evaluateAll(images => images.map(image => ({
    loaded: (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
    src: image.getAttribute('src'),
  })));
  expect(assets.every(asset => asset.loaded && asset.src?.startsWith('/assets/'))).toBe(true);
  expect(await page.locator('.airline-header .menu-button img').boundingBox()).toMatchObject({ width: 24, height: 24 });
  expect((await page.locator('.v2-header-divider').boundingBox())!.width).toBeCloseTo(390, 0);
  await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/booking-version-2.png', fullPage: true });
});

test('Version 2 cards open, close, submit, and retain their input drafts', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/?version=v2');
  await ready(page);
  const trip = page.getByRole('button', { name: 'Your trip & check-in', exact: true });
  const status = page.getByRole('button', { name: 'Flight status', exact: true });
  const book = page.getByRole('button', { name: 'Book', exact: true });
  await trip.click();
  await expect(book).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Last name', exact: true }).fill('Smith');
  await page.getByLabel('Confirmation code or ticket number').fill('ABCDEF');
  await page.getByRole('button', { name: 'Find trip', exact: true }).click();
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /find-your-reservation/);
  await status.click();
  await expect(trip).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('tab', { name: 'Flight number', exact: true }).click();
  await page.getByRole('textbox', { name: 'Flight number', exact: true }).fill('123');
  await page.locator('.status-range-picker').getByRole('button', { name: 'Open calendar' }).click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).getByRole('button', { name: 'Clear', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).locator('[data-date="2027-01-08"]').click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).locator('[data-date="2027-01-09"]').click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.status-range-picker').getByTestId('date-input-first')).toHaveValue('01/08/27');
  await page.getByRole('button', { name: 'Find flight', exact: true }).click();
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /flights\/status/);
  await status.click();
  await expect(status).toHaveAttribute('aria-expanded', 'false');
  await trip.click();
  await expect(page.getByRole('textbox', { name: 'Last name', exact: true })).toHaveValue('Smith');
  await expect(page.getByLabel('Confirmation code or ticket number')).toHaveValue('ABCDEF');
  await status.click();
  await expect(page.getByRole('textbox', { name: 'Flight number', exact: true })).toHaveValue('123');
  await book.click();
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
  await trip.click();
  await book.click();
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('LAX');
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
});

test('Version 2 supports keyboard disclosure and the same phone-contained calendar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?version=v2');
  await ready(page);
  const trip = page.getByRole('button', { name: 'Your trip & check-in', exact: true });
  await trip.focus();
  await page.keyboard.press('Enter');
  await expect(trip).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: 'Find trip', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Last name', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Book', exact: true }).click();
  await page.getByRole('button', { name: 'Show all search options' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  expect(await calendar.boundingBox()).toMatchObject({ x: phone.x, y: 0, width: phone.width, height: 800 });
  await expect(calendar.locator('.agc-calendar')).toHaveClass(/mobile-view/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open calendar' })).toBeFocused();
});

test('developer version control stays outside the phone and preserves the ad component and state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/versions');
  await ready(page);
  const versions = page.getByRole('combobox', { name: 'Design version', exact: true });
  await expect(versions).toHaveValue('v1');
  expect(await versions.evaluate(element => Boolean(element.closest('[data-phone-viewport]')))).toBe(false);
  await expect(page.getByRole('tab', { name: 'Book', exact: true })).toBeVisible();
  const ad = await page.locator('.promotional-carousel').elementHandle();
  await page.getByRole('button', { name: 'Show offer 2', exact: true }).click();
  await versions.selectOption('v2');
  await expect(page.locator('[data-phone-viewport]')).toHaveAttribute('data-design-version', 'v2');
  await expect(page.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Your trip & check-in', exact: true })).toBeVisible();
  expect(await ad!.evaluate(element => element.isConnected && element === document.querySelector('.promotional-carousel'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Show offer 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Open clean preview' })).toHaveAttribute('href', '/?version=v2&reveal=baseline');
  await expect(page.getByRole('combobox', { name: 'Treatment', exact: true })).toHaveCount(0);
  await versions.selectOption('v1');
  await expect(page.getByRole('tab', { name: 'Book', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show offer 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('the ad, offers, news, and footer remain visually unchanged between versions', async ({ page }) => {
  const selectors = ['.promotional-carousel', '.todays-offers', '.news-and-offers', '.page-footer'];
  const original: Buffer[] = [];
  const originalStyles: unknown[] = [];
  const fingerprint = (root: Element) => {
    const properties = ['font-family', 'font-size', 'font-weight', 'font-variation-settings', 'line-height', 'letter-spacing', 'color', 'background-color', 'background-image', 'opacity', 'border', 'border-radius', 'padding', 'margin', 'box-shadow', 'width', 'height', 'object-fit'];
    const origin = root.getBoundingClientRect();
    return [root, ...root.querySelectorAll('*')].map(element => {
      const css = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        text: element.children.length ? '' : element.textContent,
        src: element.getAttribute('src'),
        href: element.getAttribute('href'),
        geometry: { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height },
        styles: Object.fromEntries(properties.map(property => [property, css.getPropertyValue(property)])),
      };
    });
  };
  await page.goto('/?version=v1');
  await ready(page);
  for (const selector of selectors) {
    originalStyles.push(await page.locator(selector).evaluate(fingerprint));
    original.push(await page.locator(selector).screenshot());
  }
  await page.goto('/?version=v2');
  await ready(page);
  for (const [index, selector] of selectors.entries()) {
    expect(await page.locator(selector).evaluate(fingerprint), `${selector} styling, assets, or layout changed`).toEqual(originalStyles[index]);
    const current = await page.locator(selector).screenshot();
    const difference = await page.evaluate(async ([before, after]) => {
      const decode = (source: string) => new Promise<{ width: number; height: number; pixels: Uint8ClampedArray }>(resolve => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          resolve({ width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data });
        };
        image.src = `data:image/png;base64,${source}`;
      });
      const [a, b] = await Promise.all([decode(before), decode(after)]);
      let maxChannelDelta = 0;
      if (a.width === b.width && a.height === b.height) {
        for (let pixel = 0; pixel < a.pixels.length; pixel++) maxChannelDelta = Math.max(maxChannelDelta, Math.abs(a.pixels[pixel] - b.pixels[pixel]));
      }
      return { sameDimensions: a.width === b.width && a.height === b.height, maxChannelDelta };
    }, [original[index].toString('base64'), current.toString('base64')]);
    expect(difference.sameDimensions, `${selector} dimensions changed`).toBe(true);
    // Styling, assets, text, and geometry above must match exactly. Permit only
    // small gradient-dither and image-edge raster differences in the PNGs.
    expect(difference.maxChannelDelta, `${selector} changed between versions`).toBeLessThanOrEqual(8);
  }
});

for (const width of [320, 390, 430, 1280]) {
  test(`Version 2 has no overflow at ${width}px, including its expanded controls`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?version=v2');
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    const from = page.getByRole('textbox', { name: 'From', exact: true });
    const field = page.locator('.booking-tool-card-book .route-fields');
    const before = (await field.boundingBox())!.y;
    await from.fill('DFW');
    await expect(from).toBeFocused();
    await expect(page.getByRole('button', { name: 'Flights', exact: true })).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.booking-reveal')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
    expect((await field.boundingBox())!.y).toBe(before);
    await page.getByRole('tab', { name: 'Cash + miles', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Cash + miles', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Advanced search', exact: true }).click();
    await page.getByRole('combobox', { name: 'Cabin', exact: true }).selectOption('business');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/booking-version-2-${width}.png`, fullPage: true });
  });
}
