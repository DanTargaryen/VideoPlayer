import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailCodeRecord {
  code: string;
  expiresAt: number;
  used: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly codeStore = new Map<string, EmailCodeRecord[]>();
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async generateCode(email: string): Promise<string> {
    this.cleanupExpiredCodes();
    const normalizedEmail = this.normalizeEmail(email);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + this.emailCodeExpireSeconds * 1000;

    const records = this.codeStore.get(normalizedEmail) ?? [];
    records.push({
      code,
      expiresAt,
      used: false,
    });
    this.codeStore.set(normalizedEmail, records.slice(-5));

    this.logger.log(
      `[Email Code Generated] email=${normalizedEmail}, code=${code}, expiresAt=${new Date(expiresAt).toISOString()}, activeCodes=${this.describeRecords(this.codeStore.get(normalizedEmail) ?? [])}`,
    );

    await this.sendVerificationEmail(normalizedEmail, code);
    return code;
  }

  verifyCode(email: string, code: string): boolean {
    this.cleanupExpiredCodes();
    const normalizedEmail = this.normalizeEmail(email);
    const records = this.codeStore.get(normalizedEmail);
    const now = Date.now();

    this.logger.log(
      `[Email Code Verify Attempt] rawEmail=${email}, normalizedEmail=${normalizedEmail}, submittedCode=${code}, activeCodes=${this.describeRecords(records ?? [])}`,
    );

    if (!records || records.length === 0) {
      this.logger.warn(
        `[Email Code Verify Failed] reason=no_active_codes, normalizedEmail=${normalizedEmail}, submittedCode=${code}`,
      );
      return false;
    }

    const matchedRecord = records.find((record) => {
      if (record.used) {
        return false;
      }
      if (now > record.expiresAt) {
        return false;
      }
      return record.code === code;
    });

    if (!matchedRecord) {
      const hasExactCode = records.some((record) => record.code === code);
      const hasExpiredExactCode = records.some((record) => record.code === code && now > record.expiresAt);
      const reason = hasExpiredExactCode
        ? 'matched_but_expired'
        : hasExactCode
          ? 'matched_but_used'
          : 'code_mismatch';
      this.logger.warn(
        `[Email Code Verify Failed] reason=${reason}, normalizedEmail=${normalizedEmail}, submittedCode=${code}, activeCodes=${this.describeRecords(records)}`,
      );
      return false;
    }

    matchedRecord.used = true;
    this.codeStore.set(
      normalizedEmail,
      records.filter((record) => record !== matchedRecord),
    );
    this.logger.log(
      `[Email Code Verify Success] normalizedEmail=${normalizedEmail}, submittedCode=${code}, remainingCodes=${this.describeRecords(this.codeStore.get(normalizedEmail) ?? [])}`,
    );
    return true;
  }

  private cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [email, records] of this.codeStore.entries()) {
      const activeRecords = records.filter((record) => now <= record.expiresAt && !record.used);
      if (activeRecords.length === 0) {
        this.codeStore.delete(email);
      } else {
        this.codeStore.set(email, activeRecords);
      }
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private describeRecords(records: EmailCodeRecord[]) {
    const now = Date.now();
    return JSON.stringify(
      records.map((record) => ({
        code: record.code,
        used: record.used,
        expiresInMs: Math.max(0, record.expiresAt - now),
        expiresAt: new Date(record.expiresAt).toISOString(),
      })),
    );
  }

  private get deliveryMode() {
    return (this.configService.get<string>('EMAIL_DELIVERY_MODE') ?? 'mock').toLowerCase();
  }

  private get shouldUseSmtp() {
    return this.deliveryMode === 'smtp';
  }

  private get emailCodeExpireSeconds() {
    const configured = Number(this.configService.get<string>('EMAIL_CODE_EXPIRE_SECONDS') ?? 300);
    if (!Number.isFinite(configured) || configured <= 0) {
      return 300;
    }
    return configured;
  }

  private get smtpConfig() {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 465);
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.trim();
    const from = this.configService.get<string>('SMTP_FROM')?.trim() || user;
    const secure = (this.configService.get<string>('SMTP_SECURE') ?? 'true').toLowerCase() === 'true';

    return {
      host,
      port,
      user,
      pass,
      from,
      secure,
    };
  }

  private canUseSmtp() {
    const { host, port, user, pass, from } = this.smtpConfig;
    return Boolean(host && Number.isFinite(port) && user && pass && from);
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const { host, port, user, pass, secure } = this.smtpConfig;

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  private async sendVerificationEmail(email: string, code: string) {
    const expireText = this.emailCodeExpireSeconds >= 60
      ? `${Math.floor(this.emailCodeExpireSeconds / 60)} 分钟`
      : `${this.emailCodeExpireSeconds} 秒`;

    if (this.shouldUseSmtp && this.canUseSmtp()) {
      const transporter = this.getTransporter();
      const { from } = this.smtpConfig;

      if (!transporter || !from) {
        this.logger.warn('SMTP transporter unavailable, falling back to mock email logging');
        this.logger.log(`[Email Mock] Sending email to ${email}, code: ${code}`);
        return;
      }

      await transporter.sendMail({
        from,
        to: email,
        subject: '观澜视频平台邮箱验证码',
        text: `您的验证码是 ${code}，${expireText}内有效。`,
        html: `<p>您的验证码是 <strong>${code}</strong>，${expireText}内有效。</p>`,
      });

      this.logger.log(`Verification email sent to ${email}`);
      return;
    }

    if (this.shouldUseSmtp && !this.canUseSmtp()) {
      this.logger.warn('EMAIL_DELIVERY_MODE=smtp but SMTP config is incomplete, falling back to mock email logging');
    }

    this.logger.log(`[Email Mock] Sending email to ${email}, code: ${code}`);
  }
}
