import { expect, test } from '@playwright/test';

const adminToken = process.env.SERVICES_MODE_ADMIN_TOKEN;
const servicesAdminToken = adminToken ?? '';

test.describe('admin dashboard through the services-mode gateway', () => {
  test.skip(!adminToken, 'SERVICES_MODE_ADMIN_TOKEN is provided by the isolated Compose smoke');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('vp_token', token);
      localStorage.setItem('vp_user_id', '2');
      localStorage.setItem('vp_role', 'admin');
      localStorage.setItem('vp_nickname', '中文管理员');
    }, servicesAdminToken);
  });

  test('renders service-owned metrics and snapshots, then moderates the real text target', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page.getByRole('heading', { name: '审核后台' })).toBeVisible();
    await expect(page.getByText('待审视频', { exact: true })).toBeVisible();
    await expect(page.getByText('待处理举报', { exact: true })).toBeVisible();
    await expect(page.getByText('总视频数', { exact: true })).toHaveCount(0);
    await expect(page.getByText('异常评论', { exact: true })).toHaveCount(0);

    const videoCard = page.locator('.review-card').filter({ hasText: 'Spring Architecture Notes' }).first();
    await expect(videoCard.getByText('A published content fixture for recommendation, search and detail contracts.')).toBeVisible();
    await videoCard.getByRole('button', { name: '预览视频' }).click();
    const preview = page.locator('.preview-player');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', 'https://cdn.example.test/videos/video-001.mp4');
    await page.keyboard.press('Escape');

    const textCard = page.locator('.review-card').filter({ hasText: 'clear walkthrough' }).first();
    const moderationResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST'
      && response.url().endsWith('/api/v1/admin/reviews/text-content/COMMENT/comment-001'),
    );
    await textCard.getByRole('button', { name: '隐藏', exact: true }).click();
    expect((await moderationResponse).ok()).toBe(true);
  });
});
