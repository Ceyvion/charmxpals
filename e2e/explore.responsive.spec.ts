import { test, expect, type Page } from '@playwright/test';

test.describe('Explore roster experience', () => {
  const visibleSpotlightName = (page: Page) => page.locator('[data-spotlight-name]:visible').first();

  test('spotlight mirrors the first roster item by default', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-roster-item]').first()).toBeVisible();

    const firstRosterName = await page.locator('[data-roster-item] [data-roster-name]').first().innerText();
    await expect(visibleSpotlightName(page)).toHaveText(firstRosterName);
  });

  test('selecting another roster entry updates the spotlight', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-roster-item]').nth(1)).toBeVisible();

    const second = page.locator('[data-roster-item]').nth(1);
    await second.scrollIntoViewIfNeeded();
    const secondName = await second.locator('[data-roster-name]').innerText();
    await second.click();

    await expect(visibleSpotlightName(page)).toHaveText(secondName);
    await expect(second).toHaveAttribute('data-active', 'true');
  });

  test('filtering to rare characters only shows the rare roster', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-filter="rare"]')).toBeVisible();

    await page.locator('[data-filter="rare"]').click();

    const rareRows = page.locator('[data-roster-item][data-rarity="rare"]');
    const rareCount = await rareRows.count();
    expect(rareCount).toBeGreaterThan(0);

    await expect(page.locator('[data-roster-item][data-rarity="legendary"]')).toHaveCount(0);
    await expect(page.locator('[data-roster-item][data-rarity="epic"]')).toHaveCount(0);

    const spotlightName = await visibleSpotlightName(page).innerText();
    const firstRareName = await rareRows.first().locator('[data-roster-name]').innerText();
    expect(spotlightName).toBe(firstRareName);
  });
});
