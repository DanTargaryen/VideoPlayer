const assert = require('node:assert/strict');
const { beforeEach, describe, it } = require('node:test');

const { EmailService } = require('../../backend/dist/modules/email/email.service.js');

function makeConfig(values = {}) {
  return {
    get(key) {
      return values[key];
    },
  };
}

let service;

beforeEach(() => {
  service = new EmailService(makeConfig({ EMAIL_CODE_EXPIRE_SECONDS: '60' }));
  service.sendVerificationEmail = async (...args) => {
    service.sentEmails.push(args);
  };
  service.sentEmails = [];
});

describe('EmailService verification code rules', () => {
  it('normalizes email addresses and sends a six-digit code', async () => {
    const code = await service.generateCode(' USER@Example.COM ');

    assert.match(code, /^\d{6}$/);
    assert.equal(service.sentEmails.length, 1);
    assert.deepEqual(service.sentEmails[0], ['user@example.com', code]);
    assert.equal(service.codeStore.has('user@example.com'), true);
  });

  it('verifies a matching code once and rejects reuse or mismatched email', async () => {
    const code = await service.generateCode('user@example.com');

    assert.equal(service.verifyCode(' USER@example.com ', code), true);
    assert.equal(service.verifyCode('user@example.com', code), false);
    assert.equal(service.verifyCode('other@example.com', code), false);
  });

  it('rejects expired codes and removes expired records during cleanup', async () => {
    const code = await service.generateCode('user@example.com');
    service.codeStore.get('user@example.com')[0].expiresAt = Date.now() - 1;

    assert.equal(service.verifyCode('user@example.com', code), false);
    assert.equal(service.codeStore.has('user@example.com'), false);
  });

  it('keeps only the latest five active codes per email', async () => {
    const codes = [];
    for (let index = 0; index < 6; index += 1) {
      codes.push(await service.generateCode('user@example.com'));
    }

    const storedCodes = service.codeStore.get('user@example.com').map((record) => record.code);
    assert.equal(storedCodes.length, 5);
    assert.equal(storedCodes.includes(codes[0]), false);
    assert.deepEqual(storedCodes, codes.slice(1));
  });

  it('falls back to mock delivery when smtp configuration is incomplete', async () => {
    const smtpService = new EmailService(makeConfig({ EMAIL_DELIVERY_MODE: 'smtp' }));

    assert.equal(smtpService.shouldUseSmtp, true);
    assert.equal(smtpService.canUseSmtp(), false);
    assert.equal(smtpService.getTransporter(), null);
    assert.equal(new EmailService(makeConfig({ EMAIL_CODE_EXPIRE_SECONDS: '-1' })).emailCodeExpireSeconds, 300);
  });
});
