import { test, expect } from '@playwright/test';

test('loads welcome screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await expect(page).toHaveTitle(/CopyMaster/i);
});

test('navigates to tools', async ({ page }) => {
  await page.goto('/');
  const firstTool = page.getByRole('button').first();
  await expect(firstTool).toBeVisible();
});

test('responsive: mobile and desktop', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('#root')).toBeVisible();
});
