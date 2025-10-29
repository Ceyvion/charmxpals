import { test, expect } from '@playwright/test';

test.describe('Explore roster experience', () => {
  test('spotlight mirrors the first roster item by default', async ({ page }) => {
    await page.goto('/explore');

    const firstRosterName = await page.locator('[data-roster-item] [data-roster-name]').first().innerText();
    await expect(page.locator('[data-spotlight-name]')).toHaveText(firstRosterName);
  });

  test('selecting another roster entry updates the spotlight', async ({ page }) => {
    await page.goto('/explore');

    const second = page.locator('[data-roster-item]').nth(1);
    await second.scrollIntoViewIfNeeded();
    const secondName = await second.locator('[data-roster-name]').innerText();
    await second.click();

    await expect(page.locator('[data-spotlight-name]')).toHaveText(secondName);
    await expect(second).toHaveAttribute('data-active', 'true');
  });

  test('filtering to rare characters only shows the rare roster', async ({ page }) => {
    await page.goto('/explore');

    await page.locator('[data-filter="rare"]').click();

    const rareRows = page.locator('[data-roster-item][data-rarity="rare"]');
    const rareCount = await rareRows.count();
    expect(rareCount).toBeGreaterThan(0);

    await expect(page.locator('[data-roster-item][data-rarity="legendary"]')).toHaveCount(0);
    await expect(page.locator('[data-roster-item][data-rarity="epic"]')).toHaveCount(0);

    const spotlightName = await page.locator('[data-spotlight-name]').innerText();
    const firstRareName = await rareRows.first().locator('[data-roster-name]').innerText();
    expect(spotlightName).toBe(firstRareName);
  });
});
