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

test('newly registered user lands on a populated homepage feed', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `e2e_home_${suffix}`;

  await page.goto('/register');
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill('Test123456!');
  await page.getByLabel('昵称（可选）').fill(`首页回归${suffix}`);
  await page.getByRole('button', { name: '注册' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('加载推荐流失败')).toHaveCount(0);
  await expect(page.locator('[data-tour="home-recommend-list"]')).toBeVisible();
  await expect(page.locator('[data-tour="home-recommend-list"] a').first()).toBeVisible();
});
