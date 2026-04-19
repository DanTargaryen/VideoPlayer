import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

interface CaptchaRecord {
  code: string;
  expiresAt: number;
}

@Injectable()
export class CaptchaService {
  private readonly captchaStore = new Map<string, CaptchaRecord>();

  generateCaptcha(): { id: string; dataUrl: string } {
    const id = crypto.randomUUID();
    const code = this.generateCode(6);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    this.captchaStore.set(id, { code, expiresAt });

    const dataUrl = this.generateSvgDataUrl(code);

    return { id, dataUrl };
  }

  verifyCaptcha(id: string, code: string): boolean {
    this.cleanupExpiredCaptchas();
    const record = this.captchaStore.get(id);

    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.captchaStore.delete(id);
      return false;
    }

    const isValid = record.code.toLowerCase() === code.toLowerCase();
    this.captchaStore.delete(id);
    return isValid;
  }

  private generateCode(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[crypto.randomInt(chars.length)];
    }
    return result;
  }

  private generateSvgDataUrl(code: string): string {
    const width = 120;
    const height = 40;
    const svg = this.generateSvg(code, width, height);
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  private generateSvg(code: string, width: number, height: number): string {
    const lines = this.generateNoiseLines(code.length * 10);
    const chars = this.generateCharElements(code, width, height);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:#f0f0f0">
      ${lines}
      ${chars}
    </svg>`;
  }

  private generateNoiseLines(count: number): string {
    let lines = '';
    for (let i = 0; i < count; i++) {
      const x1 = Math.random() * 120;
      const y1 = Math.random() * 40;
      const x2 = Math.random() * 120;
      const y2 = Math.random() * 40;
      const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" opacity="0.3"/>`;
    }
    return lines;
  }

  private generateCharElements(code: string, width: number, height: number): string {
    const charWidth = width / code.length;
    let chars = '';
    for (let i = 0; i < code.length; i++) {
      const x = i * charWidth + charWidth / 2;
      const y = height / 2 + (Math.random() - 0.5) * 10;
      const rotate = (Math.random() - 0.5) * 30;
      const color = `hsl(${Math.random() * 360}, 70%, 30%)`;
      chars += `<text x="${x}" y="${y}" font-size="24" font-family="Arial" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotate} ${x} ${y})">${code[i]}</text>`;
    }
    return chars;
  }

  private cleanupExpiredCaptchas(): void {
    const now = Date.now();
    for (const [id, record] of this.captchaStore.entries()) {
      if (now > record.expiresAt) {
        this.captchaStore.delete(id);
      }
    }
  }
}