import { expect, test } from '@playwright/test';

test('matches the frame geometry and loads every original asset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'From', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
  const images = await page.locator('img').evaluateAll(images => images.map(image => ({
    loaded: (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
    src: image.getAttribute('src'),
  })));
  expect(images.every(image => image.loaded)).toBe(true);
  expect(images.every(image => image.src?.startsWith('/assets/'))).toBe(true);
  expect(await page.locator('.route-fields').boundingBox()).toMatchObject({ x: 16, y: 217, width: 358, height: 66 });
  expect(await page.locator('.promotion').boundingBox()).toMatchObject({ x: 16, y: 427, width: 358, height: 214 });
  expect(await page.locator('.todays-offers').boundingBox()).toMatchObject({ y: 685 });
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/homepage-390.png', fullPage: true });
});

test('airport entry expands search options, swaps airports, and submits an honest demo result', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Show all search options' })).toBeVisible();
  await page.getByRole('textbox', { name: 'From', exact: true }).fill('DFW');
  await page.getByRole('textbox', { name: 'To', exact: true }).fill('LAX');
  await page.getByRole('button', { name: 'Swap origin and destination' }).click();
  await expect(page.getByRole('textbox', { name: 'From', exact: true })).toHaveValue('LAX');
  await expect(page.getByRole('textbox', { name: 'To', exact: true })).toHaveValue('DFW');
  await expect(page.getByRole('button', { name: 'Show all search options' })).toHaveCount(0);
  await expect(page.locator('.travel-categories')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flights', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Trip type' }).selectOption('one-way');
  await expect(page.getByTestId('date-input-second')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const calendar = page.getByRole('dialog', { name: 'Choose travel dates' });
  await calendar.locator('button[data-date]:not([disabled])').first().click();
  await calendar.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByLabel('Passengers', { exact: true }).selectOption('2');
  await page.getByRole('tab', { name: 'Cash + miles' }).click();
  await expect(page.getByRole('tab', { name: 'Cash + miles' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Cash', exact: true })).toHaveAttribute('aria-selected', 'false');
  const advanced = page.getByRole('button', { name: 'Advanced search' });
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('combobox', { name: 'Cabin' }).selectOption('business');
  await page.getByText('Nonstop flights only').click();
  await expect(page.getByRole('checkbox', { name: 'Nonstop flights only' })).toBeChecked();
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Search flights', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('one-way search from LAX to DFW');
  await expect(page.getByRole('status')).toContainText('design demo');
  await expect(page.getByRole('status')).toContainText('2 passengers');
  await expect(page.getByRole('status')).toContainText('paying with cash + miles');
});

test('expanded widget retains category chips, airport position, and keyboard focus styling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await expect(page.locator('#search-options')).toBeFocused();
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  expect(await page.locator('.route-fields').boundingBox()).toMatchObject({ x: 16, y: 217, width: 358, height: 66 });
  expect(await page.locator('.trip-type-field').boundingBox()).toMatchObject({ y: 299, height: 66 });
  expect(await page.locator('.booking-date-picker .aileron-date-input__wrapper').boundingBox()).toMatchObject({ y: 381, height: 66 });
  expect(await page.locator('.passengers-field').boundingBox()).toMatchObject({ y: 463, height: 66 });
  expect(await page.locator('.payment-switcher').boundingBox()).toMatchObject({ y: 553, height: 44 });
  expect(await page.locator('.advanced-search').boundingBox()).toMatchObject({ y: 613, height: 48 });
  expect(await page.locator('.search-flights-button .button').boundingBox()).toMatchObject({ y: 673, height: 48 });
  expect(await page.locator('.trip-type-field').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
  await page.locator('.booking-section').screenshot({ path: 'test-results/expanded-widget.png' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
  expect(await page.locator('.trip-type-field').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
});

test('payment indicator slides elastically under stationary labels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  const frames = await page.evaluate(() => new Promise<{ x: number; labels: number[] }[]>(resolve => {
    const root = document.querySelector('.payment-switcher')!;
    const indicator = root.querySelector('.payment-switcher-indicator')!;
    const labels = [...root.querySelectorAll('.payment-switcher-label')];
    const out: { x: number; labels: number[] }[] = [];
    const start = performance.now();
    root.querySelectorAll<HTMLButtonElement>('[role=tab]')[2].click();
    (function tick() {
      out.push({ x: indicator.getBoundingClientRect().x, labels: labels.map(label => label.getBoundingClientRect().x) });
      if (performance.now() - start < 650) requestAnimationFrame(tick); else resolve(out);
    })();
  }));
  const first = frames[0];
  const last = frames[frames.length - 1];
  expect(last.x - first.x).toBeGreaterThan(200);
  expect(Math.max(...frames.map(frame => frame.x))).toBeGreaterThan(last.x + 2);
  expect(frames.filter(frame => frame.x > first.x + 1 && frame.x < last.x - 1).length).toBeGreaterThan(3);
  expect(frames.every(frame => frame.labels.every((x, index) => Math.abs(x - first.labels[index]) < 0.5))).toBe(true);
  const selected = page.getByRole('tab', { name: 'Miles', exact: true });
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await selected.hover();
  expect(await selected.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});

test('keyboard activation of expansion focuses the first dropdown', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Trip type' })).toBeFocused();
});

for (const width of [320, 390, 430, 640, 1280]) {
  test(`calendar is contained in the phone viewport at browser width ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Show all search options' }).click();
    await page.getByRole('button', { name: 'Open calendar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
    await expect(dialog).toBeVisible();
    const dialogRect = await dialog.boundingBox();
    const phoneRect = (await page.locator('[data-phone-viewport]').boundingBox())!;
    const header = dialog.getByRole('button', { name: /^Depart:/ });
    expect(dialogRect).toMatchObject({ x: phoneRect.x, y: 0, width: phoneRect.width, height: 800 });
    await expect(dialog.locator('.calendar-dialog-heading')).not.toBeVisible();
    await expect(dialog.locator('.agc-calendar')).toHaveClass(/mobile-view/);
    await expect(header).toHaveAttribute('aria-pressed', 'true');
    expect(await dialog.locator('.cal__footer').boundingBox()).toMatchObject({ x: phoneRect.x, width: phoneRect.width });
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    const firstMonth = (await dialog.locator('.cal__month').nth(0).boundingBox())!;
    const secondMonth = (await dialog.locator('.cal__month').nth(1).boundingBox())!;
    expect(secondMonth.x).toBe(firstMonth.x);
    expect(secondMonth.y).toBeGreaterThanOrEqual(firstMonth.y + firstMonth.height);
    expect(firstMonth.x + firstMonth.width).toBeLessThanOrEqual(phoneRect.x + phoneRect.width);
    expect(await dialog.evaluate(element => getComputedStyle(element, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    for (const control of [header, dialog.getByRole('button', { name: 'Clear', exact: true }), dialog.getByRole('button', { name: 'Done', exact: true })]) {
      await expect(control).toBeVisible();
      const rect = await control.boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(dialogRect!.y);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(dialogRect!.y + dialogRect!.height);
      expect(rect!.x).toBeGreaterThanOrEqual(dialogRect!.x);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(dialogRect!.x + dialogRect!.width);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/calendar-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Open calendar' })).toBeFocused();
});
}

test('calendar stays within the offset mockup in the desktop interaction study', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/interactions?reveal=baseline');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
  await expect(dialog.locator('.agc-calendar')).toHaveClass(/mobile-view/);
  const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
  const overlay = (await dialog.boundingBox())!;
  expect(overlay.x).toBe(phone.x);
  expect(overlay.width).toBe(phone.width);
  expect(overlay.y).toBe(phone.y);
  expect(overlay.y + overlay.height).toBe(900);
  const months = await dialog.locator('.cal__month').evaluateAll(elements => elements.slice(0, 2).map(element => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y })));
  expect(months[1].x).toBe(months[0].x);
  expect(months[1].y).toBeGreaterThan(months[0].y);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('open calendar follows phone bounds when the desktop browser is resized', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
  await expect(dialog).toBeVisible();
  for (const viewport of [{ width: 1000, height: 650 }, { width: 430, height: 700 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const phone = (await page.locator('[data-phone-viewport]').boundingBox())!;
      const overlay = (await dialog.boundingBox())!;
      return { x: overlay.x - phone.x, width: overlay.width - phone.width, height: overlay.height };
    }).toEqual({ x: 0, width: 0, height: viewport.height });
    await expect(dialog.locator('.agc-calendar')).toHaveClass(/mobile-view/);
    const footer = (await dialog.locator('.cal__footer').boundingBox())!;
    expect(footer.y + footer.height).toBe(viewport.height);
  }
});

test('default Depart–Return input styling is unchanged after opening and closing the mobile calendar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.waitForFunction(() => document.querySelector('.booking-section')!.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
  await page.getByRole('tab', { name: 'Book', exact: true }).click();
  const input = page.locator('.booking-date-picker .aileron-date-input__wrapper');
  const before = await input.evaluate(element => {
    const css = getComputedStyle(element);
    return { width: css.width, height: css.height, padding: css.padding, border: css.border, borderRadius: css.borderRadius, background: css.backgroundColor };
  });
  expect(before).toMatchObject({ width: '358px', height: '66px', padding: '8px 16px', borderRadius: '16px' });
  await page.getByRole('button', { name: 'Open calendar' }).click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('tab', { name: 'Book', exact: true }).click();
  const after = await input.evaluate(element => {
    const css = getComputedStyle(element);
    return { width: css.width, height: css.height, padding: css.padding, border: css.border, borderRadius: css.borderRadius, background: css.backgroundColor };
  });
  expect(after).toEqual(before);
  await expect(page.getByTestId('date-input-first')).toHaveAttribute('placeholder', 'Depart');
  await expect(page.getByTestId('date-input-second')).toHaveAttribute('placeholder', 'Return');
  expect(await page.getByTestId('date-input-first').evaluate(element => getComputedStyle(element).fontSize)).toBe('18px');
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('mobile date selection uses ADS active tabs, range highlighting, and a stationary header/footer', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Show all search options' }).click();
  await page.getByRole('button', { name: 'Open calendar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose travel dates' });
  const depart = dialog.getByRole('button', { name: /^Depart:/ });
  const returning = dialog.getByRole('button', { name: /^Return:/ });
  await expect(depart).toHaveAttribute('aria-pressed', 'true');
  expect(await depart.evaluate(element => getComputedStyle(element).borderBottomColor)).toBe('rgb(0, 109, 192)');
  expect(await dialog.locator('.mobile-header').boundingBox()).toMatchObject({ x: 0, y: 54, width: 390, height: 64 });
  await dialog.locator('[data-date="2027-01-08"]').click();
  await expect(returning).toHaveAttribute('aria-pressed', 'true');
  await dialog.locator('[data-date="2027-01-15"]').click();
  await expect(dialog.locator('[data-date="2027-01-08"]')).toHaveClass(/cal__day--start/);
  await expect(dialog.locator('[data-date="2027-01-15"]')).toHaveClass(/cal__day--end/);
  await expect(dialog.locator('[data-date="2027-01-12"]')).toHaveClass(/cal__day--range/);
  const headerBefore = await dialog.locator('.mobile-header').boundingBox();
  const footerBefore = await dialog.locator('.cal__footer').boundingBox();
  await dialog.locator('.cal__container').evaluate(element => { element.scrollTop = 500; });
  expect(await dialog.locator('.mobile-header').boundingBox()).toEqual(headerBefore);
  expect(await dialog.locator('.cal__footer').boundingBox()).toEqual(footerBefore);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId('date-input-first')).not.toHaveValue('');
  await expect(page.getByTestId('date-input-second')).not.toHaveValue('');
  await page.getByTestId('date-input-second').click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Return:/ })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(dialog.locator('.cal__day--start')).toHaveCount(0);
  await expect(dialog.locator('.cal__day--end')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('date-input-first')).toHaveValue('');
  await expect(page.getByTestId('date-input-second')).toHaveValue('');
});

test('supports keyboard tab selection and both travel lookups', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-06T12:00:00Z'));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Book', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Your trips / Check-in' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Your trips / Check-in' })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Last name').fill('Smith');
  await page.getByLabel('Confirmation code').fill('ABCDEF');
  await page.getByRole('button', { name: 'Find your trip' }).click();
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /find-your-reservation/);
  await page.getByRole('tab', { name: 'Flight status', exact: true }).click();
  await page.getByLabel('Flight number').fill('123');
  await page.locator('.status-date-picker').getByRole('button', { name: 'Open calendar' }).click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).locator('[data-date="2027-01-08"]').click();
  await page.getByRole('dialog', { name: 'Choose travel dates' }).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('.status-date-picker').getByTestId('date-input-first')).toHaveValue(/Jan 8/);
  await page.getByRole('button', { name: 'Find flight' }).click();
  await expect(page.getByRole('status').getByRole('link')).toHaveAttribute('href', /flights\/status/);
});

test('opens and closes navigation, alerts, and switches offers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await page.getByRole('button', { name: 'Travel alerts', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View current travel alerts' })).toBeVisible();
  await page.getByRole('button', { name: 'Travel alerts', exact: true }).click();
  await expect(page.getByRole('link', { name: 'View current travel alerts' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show offer 2' }).click();
  await expect(page.getByRole('button', { name: 'Show offer 2' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.promotion-content h2')).toHaveText('A little getaway. A lot to discover.');
  await page.getByRole('button', { name: 'Show offer 1' }).click();
  await expect(page.locator('.promotion-content h2')).toHaveText('Earn up to 90,000 bonus miles');
});

for (const width of [320, 430, 1280]) {
  test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('button', { name: 'Show all search options' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.waitForFunction(() => [...document.querySelectorAll('.icon-host')].every(icon => icon.querySelector('svg')));
    await page.screenshot({ path: `test-results/homepage-${width}-expanded.png`, fullPage: true });
  });
}
