import { expect, test } from '@playwright/test';

async function waitForPrototype(page: import('@playwright/test').Page) {
  await page.getByRole('textbox', { name: 'From', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
}

for (const airport of ['From', 'To']) {
  test(`airport-focus opens from ${airport} without stealing focus or moving the airport field`, async ({ page }) => {
    await page.goto('/?reveal=airport-focus');
    await waitForPrototype(page);
    const input = page.getByRole('textbox', { name: airport, exact: true });
    const field = page.locator('.route-fields');
    const before = await field.boundingBox();
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
    await input.click();
    await input.pressSequentially('DFW');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('DFW');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    expect((await field.boundingBox())!.y).toBe(before!.y);
    await page.getByRole('tab', { name: 'Book', exact: true }).click();
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveValue('DFW');
  });
}

for (const airport of ['From', 'To']) {
  test(`current treatment keeps the button but also opens from ${airport} without interrupting typing`, async ({ page }) => {
    await page.goto('/?reveal=baseline');
    await waitForPrototype(page);
    await expect(page.getByRole('button', { name: 'Show all search options' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
    const input = page.getByRole('textbox', { name: airport, exact: true });
    const airportY = (await page.locator('.route-fields').boundingBox())!.y;
    await input.click();
    await input.pressSequentially('DFW');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('DFW');
    await expect(input).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Show all search options' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('DFW');
    expect((await page.locator('.route-fields').boundingBox())!.y).toBe(airportY);
    await expect(page.getByRole('button', { name: 'Flights', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vacations', exact: true })).toBeVisible();
  });
}

test('reveal pushes page content down over multiple frames, never jumps the airport input, and keeps focus', async ({ page }) => {
  await page.goto('/?reveal=airport-focus');
  await waitForPrototype(page);
  const samples = await page.evaluate(() => new Promise<{ promoY: number; airportY: number; focused: boolean }[]>(resolve => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="From"]')!;
    const promotion = document.querySelector('.promotion')!;
    const field = document.querySelector('.route-fields')!;
    const sample = () => ({ promoY: promotion.getBoundingClientRect().y, airportY: field.getBoundingClientRect().y, focused: document.activeElement === input });
    const start = performance.now();
    input.focus();
    const frames = [sample()];
    const tick = () => {
      frames.push(sample());
      if (performance.now() - start < 500) requestAnimationFrame(tick);
      else resolve(frames);
    };
    requestAnimationFrame(tick);
  }));
  const first = samples[0];
  const last = samples[samples.length - 1];
  expect(last.promoY - first.promoY).toBeGreaterThan(200);
  expect(samples.filter(sample => sample.promoY > first.promoY + 1 && sample.promoY < last.promoY - 1).length).toBeGreaterThan(3);
  expect(samples.every(sample => sample.airportY === first.airportY && sample.focused)).toBe(true);
  expect(samples.every((sample, index) => index === 0 || sample.promoY >= samples[index - 1].promoY - 0.1)).toBe(true);
});

for (const treatment of [
  { id: 'details-preview', trigger: 'Add dates and passengers' },
  { id: 'attached-handle', trigger: 'Expand trip details' },
]) {
  test(`${treatment.id} waits for its explicit control, preserving entered airports`, async ({ page }) => {
    await page.goto(`/?reveal=${treatment.id}`);
    await waitForPrototype(page);
    await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
    await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: treatment.trigger }).click();
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('DFW');
    await expect(page.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('LAX');
    await expect(page.getByRole('button', { name: treatment.trigger })).toHaveCount(0);
    await expect(page.locator('.travel-categories')).toBeVisible();
  });
}

test('keyboard users can type airports and tab to the expanded fields in normal order', async ({ page }) => {
  await page.goto('/?reveal=airport-focus');
  await waitForPrototype(page);
  const from = page.getByRole('textbox', { name: 'From', exact: true });
  await from.focus();
  await from.pressSequentially('DFW');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Swap origin and destination' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
});

test('reduced motion disables reveal transitions without changing focus or functionality', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?reveal=airport-focus');
  await waitForPrototype(page);
  expect(await page.locator('.booking-reveal').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  const from = page.getByRole('textbox', { name: 'From', exact: true });
  await from.click();
  await expect(from).toBeFocused();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
});

test('comparison changes only the booking widget and reset restores a collapsed draft', async ({ page }) => {
  await page.goto('/interactions');
  await waitForPrototype(page);
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
  await expect(page.getByText('Expanded — reset to try again')).toBeVisible();
  await page.getByRole('button', { name: 'Reset interaction' }).click();
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('');
  await expect(page.getByText('Collapsed — ready to try')).toBeVisible();
  await page.getByRole('combobox', { name: 'Treatment', exact: true }).selectOption('details-preview');
  await expect(page.getByRole('button', { name: 'Add dates and passengers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open clean preview' })).toHaveAttribute('href', '/?version=v1&reveal=details-preview');
  await page.getByRole('combobox', { name: 'Treatment', exact: true }).selectOption('baseline');
  await expect(page.getByRole('button', { name: 'Show all search options' })).toBeVisible();
  await expect(page.locator('.promotion-content h2')).toHaveText('Earn up to 90,000 bonus miles');
});

test('current button opens smoothly while keeping the categories and airports stationary', async ({ page }) => {
  await page.goto('/?reveal=baseline');
  await waitForPrototype(page);
  const samples = await page.evaluate(() => new Promise<{ promoY: number; airportY: number }[]>(resolve => {
    const airport = document.querySelector<HTMLInputElement>('input[aria-label="From"]')!;
    const promotion = document.querySelector('.promotion')!;
    const button = document.querySelector<HTMLButtonElement>('.more-options-button button')!;
    const sample = () => ({ promoY: promotion.getBoundingClientRect().y, airportY: airport.getBoundingClientRect().y });
    const start = performance.now();
    const frames = [sample()];
    button.click();
    const tick = () => {
      frames.push(sample());
      if (performance.now() - start < 500) requestAnimationFrame(tick);
      else resolve(frames);
    };
    requestAnimationFrame(tick);
  }));
  expect(samples[0].promoY).toBe(427);
  expect(samples[samples.length - 1].promoY).toBe(825);
  expect(samples.every(sample => sample.airportY === samples[0].airportY)).toBe(true);
  await expect(page.getByRole('button', { name: 'Flights', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vacations', exact: true })).toBeVisible();
  expect(samples.filter(sample => sample.promoY > 428 && sample.promoY < 824).length).toBeGreaterThan(3);
  expect(samples.every((sample, index) => index === 0 || sample.promoY >= samples[index - 1].promoY - 0.1)).toBe(true);
});

test('route-ready waits for both airports and only reveals when the route picker is left', async ({ page }) => {
  await page.goto('/?reveal=route-ready');
  await waitForPrototype(page);
  const from = page.getByRole('textbox', { name: 'From', exact: true });
  const to = page.getByRole('textbox', { name: 'To', exact: true });
  await from.fill('DFW');
  await to.click();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Book', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  await to.fill('LAX');
  await from.click();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Book', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Book', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
  await expect(from).toHaveValue('DFW');
  await expect(to).toHaveValue('LAX');
});

test('route-ready forwards keyboard focus to the revealed fields instead of skipping them', async ({ page }) => {
  await page.goto('/?reveal=route-ready');
  await waitForPrototype(page);
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
  const field = (await page.locator('.trip-type-field').boundingBox())!;
  const reveal = (await page.locator('.booking-reveal-body').boundingBox())!;
  expect(field.x - 5).toBeGreaterThanOrEqual(reveal.x);
  expect(field.x + field.width + 5).toBeLessThanOrEqual(reveal.x + reveal.width);
});

test('pull follows the pointer and opens on a sufficient downward drag', async ({ page }) => {
  await page.goto('/?reveal=pull-reveal');
  await waitForPrototype(page);
  const grabber = page.getByRole('button', { name: 'Reveal trip details', exact: true });
  const rect = (await grabber.boundingBox())!;
  const before = (await page.locator('.promotion').boundingBox())!.y;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 80, { steps: 8 });
  await expect(page.locator('.pull-reveal-surface')).toHaveAttribute('data-ready', 'true');
  expect((await page.locator('.promotion').boundingBox())!.y - before).toBe(80);
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
  await expect(page.locator('.booking-reveal')).toHaveAttribute('data-expanded', 'true');
});

test('a short pull returns to rest without turning the drag into an accidental click', async ({ page }) => {
  await page.goto('/?reveal=pull-reveal');
  await waitForPrototype(page);
  const grabber = page.getByRole('button', { name: 'Reveal trip details', exact: true });
  const rect = (await grabber.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 28, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('.booking-reveal')).toHaveAttribute('data-expanded', 'false');
  await expect(page.locator('.pull-reveal-surface')).toHaveAttribute('data-dragging', 'false');
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  expect((await grabber.boundingBox())!.y).toBe(rect.y);
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toHaveCount(0);
  await grabber.click();
  await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
});

test('pointer cancellation resets the pull and keyboard activation still opens it', async ({ page }) => {
  await page.goto('/?reveal=pull-reveal');
  await waitForPrototype(page);
  const grabber = page.getByRole('button', { name: 'Reveal trip details', exact: true });
  const rect = (await grabber.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 80, { steps: 4 });
  await grabber.dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
  await page.mouse.up();
  await expect(page.locator('.booking-reveal')).toHaveAttribute('data-expanded', 'false');
  await grabber.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
});

test.describe('mobile pull interaction', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 800 } });

  test('a native touch drag opens the fields', async ({ page }) => {
    await page.goto('/?reveal=pull-reveal');
    await waitForPrototype(page);
    const rect = (await page.getByRole('button', { name: 'Reveal trip details', exact: true }).boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
    for (const distance of [16, 32, 48, 64, 80]) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + distance, id: 0 }] });
    }
    await expect(page.locator('.pull-reveal-surface')).toHaveAttribute('data-ready', 'true');
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    await client.detach();
  });

  test('a native touch cancellation returns to rest and a tap remains available', async ({ page }) => {
    await page.goto('/?reveal=pull-reveal');
    await waitForPrototype(page);
    const grabber = page.getByRole('button', { name: 'Reveal trip details', exact: true });
    const rect = (await grabber.boundingBox())!;
    const client = await page.context().newCDPSession(page);
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 80, id: 0 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.booking-reveal')).toHaveAttribute('data-expanded', 'false');
    await expect(page.locator('.pull-reveal-surface')).toHaveAttribute('data-dragging', 'false');
    await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
    await grabber.tap();
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
    await client.detach();
  });
});

for (const treatment of ['baseline', 'route-ready', 'pull-reveal']) {
  test(`${treatment} respects reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?reveal=${treatment}`);
    await waitForPrototype(page);
    expect(await page.locator('.booking-reveal').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    if (treatment === 'baseline') await page.getByRole('button', { name: 'Show all search options' }).click();
    else if (treatment === 'pull-reveal') await page.getByRole('button', { name: 'Reveal trip details', exact: true }).click();
    else {
      await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
      await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
      await page.keyboard.press('Tab');
    }
    await expect(page.getByRole('button', { name: 'Search flights', exact: true })).toBeVisible();
  });
}

for (const width of [320, 390, 430, 1280]) {
  for (const treatment of ['airport-focus', 'details-preview', 'attached-handle', 'route-ready', 'pull-reveal']) {
    test(`${treatment} fits ${width}px before and after expansion and loads local assets`, async ({ page }) => {
      const errors: string[] = [];
      const iconRequests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => { if (request.url().includes('/aileron/icons/')) iconRequests.push(request.url()); });
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/?reveal=${treatment}`);
      await waitForPrototype(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (treatment === 'airport-focus') await page.getByRole('textbox', { name: 'From', exact: true }).click();
      else if (treatment === 'route-ready') {
        await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
        await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
        await page.keyboard.press('Tab');
      } else await page.getByRole('button', { name: treatment === 'details-preview' ? 'Add dates and passengers' : treatment === 'pull-reveal' ? 'Reveal trip details' : 'Expand trip details', exact: true }).click();
      await expect(page.locator('.booking-reveal')).toHaveAttribute('data-expanded', 'true');
      await page.waitForFunction(() => document.querySelector('.booking-reveal')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      expect(errors).toEqual([]);
      expect(iconRequests.length).toBeGreaterThan(0);
      expect(iconRequests.every(url => url.includes('127.0.0.1') || url.includes('localhost'))).toBe(true);
      await page.screenshot({ path: `test-results/interaction-${treatment}-${width}.png` });
    });
  }
}
