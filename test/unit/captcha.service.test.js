const assert = require('node:assert/strict');
const { beforeEach, describe, it } = require('node:test');

const { CaptchaService } = require('../../backend/dist/modules/captcha/captcha.service.js');

let service;

beforeEach(() => {
  service = new CaptchaService();
});

describe('CaptchaService', () => {
  it('generates a captcha id and SVG data URL', () => {
    const result = service.generateCaptcha();

    assert.match(result.id, /^[0-9a-f-]{36}$/);
    assert.match(result.dataUrl, /^data:image\/svg\+xml;base64,/);
    const svg = Buffer.from(result.dataUrl.split(',')[1], 'base64').toString('utf8');
    assert.match(svg, /^<svg /);
    assert.equal(service.captchaStore.size, 1);
  });

  it('verifies captcha codes case-insensitively and consumes them once', () => {
    const result = service.generateCaptcha();
    const storedCode = service.captchaStore.get(result.id).code;

    assert.equal(service.verifyCaptcha(result.id, storedCode.toLowerCase()), true);
    assert.equal(service.verifyCaptcha(result.id, storedCode), false);
  });

  it('rejects wrong, missing and expired captcha records', () => {
    const result = service.generateCaptcha();
    const record = service.captchaStore.get(result.id);
    record.expiresAt = Date.now() - 1;

    assert.equal(service.verifyCaptcha('missing-id', 'ABC123'), false);
    assert.equal(service.verifyCaptcha(result.id, record.code), false);

    const second = service.generateCaptcha();
    assert.equal(service.verifyCaptcha(second.id, 'WRONG1'), false);
  });

  it('generates six-character codes from the allowed character set', () => {
    const code = service.generateCode(6);

    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
