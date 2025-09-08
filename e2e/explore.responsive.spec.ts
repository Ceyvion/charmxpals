import { test, expect } from '@playwright/test';

async function firstRowCount(page) {
  const cards = page.locator('.cp-explore-grid > *');
  const n = await cards.count();
  if (n === 0) return 0;
  const top0 = (await cards.nth(0).boundingBox())!.y;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const box = await cards.nth(i).boundingBox();
    if (!box) break;
    if (Math.abs(box.y - top0) < 2) count++;
    else break;
  }
  return count;
}

test.describe('Explore grid responsiveness', () => {
  test('portrait phone → 1 col', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/explore');
    const count = await firstRowCount(page);
    expect(count).toBe(1);
  });

  test('phone landscape → 2 cols', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/explore');
    const count = await firstRowCount(page);
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('desktop → 3+ cols', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/explore');
    const count = await firstRowCount(page);
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

