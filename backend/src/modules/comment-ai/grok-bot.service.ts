import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

type BotUser = {
  id: number;
  username: string;
  nickname: string;
};

@Injectable()
export class GrokBotService implements OnModuleInit {
  private readonly logger = new Logger(GrokBotService.name);
  private botUserId: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureBotUser();
  }

  async ensureBotUser(): Promise<BotUser> {
    const username = this.getBotUsername();
    const email = this.getBotEmail(username);
    const nickname = this.getBotNickname();
    const password = this.getBotPassword();

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: {
        id: true,
        username: true,
        nickname: true,
      },
    });

    if (existing) {
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          email,
          password,
          nickname,
          role: 'USER',
        },
        select: {
          id: true,
          username: true,
          nickname: true,
        },
      });

      this.botUserId = updated.id;
      return updated;
    }

    const created = await this.prisma.user.create({
      data: {
        username,
        email,
        password,
        nickname,
        role: 'USER',
      },
      select: {
        id: true,
        username: true,
        nickname: true,
      },
    });

    this.botUserId = created.id;
    this.logger.log(`Created bot user: ${created.username} (#${created.id})`);
    return created;
  }

  async getBotUser(): Promise<BotUser> {
    if (this.botUserId !== null) {
      const existing = await this.prisma.user.findUnique({
        where: { id: this.botUserId },
        select: {
          id: true,
          username: true,
          nickname: true,
        },
      });
      if (existing) {
        return existing;
      }
    }

    return this.ensureBotUser();
  }

  isBotUser(userId: number) {
    return this.botUserId !== null && this.botUserId === userId;
  }

  private getBotUsername() {
    return this.configService.get<string>('GROK_BOT_USERNAME') || 'grok_bot';
  }

  private getBotEmail(username: string) {
    return this.configService.get<string>('GROK_BOT_EMAIL') || `${username}@local.invalid`;
  }

  private getBotNickname() {
    return this.configService.get<string>('GROK_BOT_NICKNAME') || 'Grok 机器人';
  }

  private getBotPassword() {
    return this.configService.get<string>('GROK_BOT_PASSWORD') || 'GrokBot@123456';
  }
}
