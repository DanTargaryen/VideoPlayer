import { Injectable } from '@nestjs/common';

interface SmsCodeRecord {
  code: string;
  expiresAt: number;
  used: boolean;
}

@Injectable()
export class SmsService {
  private readonly codeStore = new Map<string, SmsCodeRecord>();

  generateCode(phone: string): string {
    this.cleanupExpiredCodes();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000;

    this.codeStore.set(phone, {
      code,
      expiresAt,
      used: false,
    });

    console.log(`[SMS Mock] Sending SMS to ${phone}, code: ${code}`);
    return code;
  }

  verifyCode(phone: string, code: string): boolean {
    this.cleanupExpiredCodes();
    const record = this.codeStore.get(phone);

    if (!record) {
      return false;
    }

    if (record.used) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.codeStore.delete(phone);
      return false;
    }

    if (record.code !== code) {
      return false;
    }

    record.used = true;
    this.codeStore.delete(phone);
    return true;
  }

  private cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [phone, record] of this.codeStore.entries()) {
      if (now > record.expiresAt || record.used) {
        this.codeStore.delete(phone);
      }
    }
  }
}