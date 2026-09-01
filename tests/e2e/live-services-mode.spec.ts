import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const creatorToken = requiredEnvironment('SERVICES_MODE_CREATOR_TOKEN');

test.describe('UC05 through the services-mode gateway', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      localStorage.setItem('vp_token', token);
      localStorage.setItem('vp_user_id', '1');
      localStorage.setItem('vp_role', 'user');
      localStorage.setItem('vp_nickname', '中文用户');

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (context) { context.fillStyle = '#2563eb'; context.fillRect(0, 0, 64, 64); }
      const stream = canvas.captureStream(5);
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => stream, getDisplayMedia: async () => stream },
      });
      Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: async () => undefined });

      class FakeMediaRecorder extends EventTarget {
        readonly mimeType = 'video/webm';
        state: 'inactive' | 'recording' = 'inactive';
        constructor(readonly stream: MediaStream) { super(); }
        static isTypeSupported(type: string) { return type.startsWith('video/webm'); }
        start() { this.state = 'recording'; }
        stop() {
          this.state = 'inactive';
          this.dispatchEvent(new BlobEvent('dataavailable', { data: new Blob(['browser-recording'], { type: this.mimeType }) }));
          this.dispatchEvent(new Event('stop'));
        }
      }
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
    }, creatorToken);
  });

  test('starts a room, sends a persisted message, stops, and saves the recording as a draft', async ({ page, request }, testInfo) => {
    const directory = mkdtempSync(join(tmpdir(), 'uc05-browser-'));
    const replayFilename = `uc05-browser-retry-${testInfo.retry}-${Date.now()}.mp4`;
    let uploaded: { assetId: number; uploadToken: string; url: string };
    try {
      const mediaPath = join(directory, replayFilename);
      execFileSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=green:s=32x32:d=0.2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mediaPath], { stdio: 'ignore' });
      const upload = await request.post('/api/v1/videos/upload?assetType=RECORDING', {
        headers: { authorization: `Bearer ${creatorToken}` },
        multipart: { file: { name: replayFilename, mimeType: 'video/mp4', buffer: readFileSync(mediaPath) } },
      });
      expect(upload.status()).toBe(200);
      uploaded = (await upload.json()).data;
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    await page.route('**/api/v1/videos/upload?assetType=RECORDING', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: uploaded }) });
    });

    await page.goto('/live');
    await expect(page.getByRole('heading', { name: '直播', exact: true })).toBeVisible();
    await expect(page.getByText('已认证', { exact: true })).toBeVisible();
    await page.locator('.live-settings input').first().fill('UC05 浏览器切流验收');
    await page.getByRole('button', { name: '准备预览', exact: true }).first().click();
    await expect(page.getByRole('button', { name: '立即开播', exact: true })).toBeEnabled();

    const startResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/v1\/lives\/rooms\/\d+\/start$/.test(response.url()));
    await page.getByRole('button', { name: '立即开播', exact: true }).click();
    expect((await startResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page).toHaveURL(/\/live\/\d+$/, { timeout: 15_000 });
    await expect(page.locator('.tag-live')).toHaveText('直播中', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'UC05 浏览器切流验收' })).toBeVisible();

    await page.getByPlaceholder('发一条弹幕，按回车发送').fill('浏览器真实弹幕');
    const messageResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/v1\/lives\/rooms\/\d+\/messages$/.test(response.url()));
    await page.getByRole('button', { name: '发送', exact: true }).click();
    expect((await messageResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.locator('.message-list .message-item p').filter({ hasText: '浏览器真实弹幕' })).toBeVisible();

    const stopResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/v1\/lives\/rooms\/\d+\/stop$/.test(response.url()));
    await page.getByRole('button', { name: '结束直播', exact: true }).click();
    expect((await stopResponse).headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.locator('.tag-ended')).toHaveText('已结束');
    await expect(page.getByRole('dialog', { name: '保存直播内容' })).toBeVisible();

    const replayResponse = page.waitForResponse((response) => response.request().method() === 'POST' && /\/api\/v1\/lives\/rooms\/\d+\/replay$/.test(response.url()));
    await page.getByRole('dialog', { name: '保存直播内容' }).getByRole('button', { name: '保存为稿件', exact: true }).click();
    const replay = await replayResponse;
    expect(replay.status()).toBe(200);
    expect(replay.headers()['x-gateway-upstream']).toBe('live-reward');
    await expect(page.getByText('录播已保存为稿件，可在用户中心继续编辑', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '保存直播内容' })).toBeHidden();
  });
});

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for services-mode browser tests; the suite must not skip`);
  }
  return value;
}
