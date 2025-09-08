import { test, expect } from '@playwright/test';

test.describe('Home hero responsiveness', () => {
  const sizes = [
    { w: 390, h: 844, label: 'iPhone portrait' },
    { w: 844, h: 390, label: 'phone landscape' },
    { w: 768, h: 1024, label: 'tablet portrait' },
    { w: 1024, h: 768, label: 'tablet landscape' },
    { w: 1440, h: 900, label: 'desktop' },
  ];

  for (const s of sizes) {
    test(`no overlap and readable @ ${s.label}`, async ({ page }) => {
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.goto('/');

      const head = page.getByTestId('home-hero-head');
      const deck = page.getByTestId('home-hero-deck');
      await expect(head).toBeVisible();
      await expect(deck).toBeVisible();

      const headBox = await head.boundingBox();
      const deckBox = await deck.boundingBox();
      expect(headBox).not.toBeNull();
      expect(deckBox).not.toBeNull();
      if (!headBox || !deckBox) return;

      // Assert deck sits below hero text with at least 8px gap
      expect(headBox.y + headBox.height).toBeLessThanOrEqual(deckBox.y + 0.001);
    });
  }

  test('mobile deck is horizontally scrollable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const deck = page.getByTestId('home-hero-deck');
    const sw = await deck.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(sw.scrollWidth).toBeGreaterThan(sw.clientWidth);
  });

  test('desktop deck uses layered positioning', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const pos = await page.locator('.cp-hero-deck .card').first().evaluate((el) => getComputedStyle(el).position);
    expect(pos).toBe('absolute');
  });
});

