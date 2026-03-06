import { test, expect } from '@playwright/test';

test.describe('Home hero', () => {
  test('hero renders without horizontal overflow', async ({ page }) => {
    await page.goto('/');

    const head = page.getByTestId('home-hero-head');
    const deck = page.getByTestId('home-hero-deck');

    await expect(head).toBeVisible();
    await expect(deck).toBeVisible();
    await expect(head.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('primary claim CTA is available and points to claim', async ({ page }) => {
    await page.goto('/');

    const claimCta = page.getByRole('link', { name: /claim your pal/i }).first();
    await expect(claimCta).toBeVisible();
    await expect(claimCta).toHaveAttribute('href', '/claim');
  });

  test('featured roster links to character profiles', async ({ page }) => {
    await page.goto('/');

    const profileLinks = page.locator('[data-testid="home-hero-deck"] a[href^="/character/"]');
    await expect(profileLinks.first()).toBeVisible();
    expect(await profileLinks.count()).toBeGreaterThan(0);
  });
});
