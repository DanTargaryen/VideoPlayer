import { expect, test } from '@playwright/test';

test('public homepage renders the VideoPlayer application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/观澜视频平台/);
  await expect(page.locator('#app')).toBeVisible();
});

test('frontend proxy exposes the backend health contract', async ({ request }) => {
  const response = await request.get('/api/v1/health');

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    code: 0,
    message: 'ok',
    data: {
      status: 'ok',
      service: 'backend',
    },
  });
});
