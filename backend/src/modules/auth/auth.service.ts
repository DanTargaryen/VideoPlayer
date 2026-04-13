import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const ADMIN_SECRET = '123456';
const BUILTIN_USERS = [
  {
    username: 'live_user_1',
    email: 'live_user_1@guanlan.dev',
    password: 'live123456',
    nickname: 'LiveTester1',
  },
  {
    username: 'live_user_2',
    email: 'live_user_2@guanlan.dev',
    password: 'live123456',
    nickname: 'LiveTester2',
  },
] as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(payload: { username: string; email: string; password: string; nickname?: string }) {
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: payload.username }, { email: payload.email }],
      },
    });

    if (exists) {
      throw new UnauthorizedException('Username or email already exists');
    }

    const createdUser = await this.prisma.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: 'USER',
        nickname: payload.nickname || payload.username,
      },
    });

    return {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
      nickname: createdUser.nickname,
    };
  }

  async login(account: string, password: string, adminSecret?: string) {
    const builtin = BUILTIN_USERS.find(
      (item) => (item.username === account || item.email === account) && item.password === password,
    );
    const user =
      (builtin ? await this.ensureBuiltinUser(builtin) : null) ??
      (await this.prisma.user.findFirst({
        where: {
          OR: [{ username: account }, { email: account }],
        },
      }));

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    if (user.role === 'ADMIN' && adminSecret !== ADMIN_SECRET) {
      throw new UnauthorizedException('Admin secret is required');
    }

    return {
      token: `mock-token-${user.id}`,
      userId: user.id,
      role: user.role,
      nickname: user.nickname,
    };
  }

  private async ensureBuiltinUser(payload: (typeof BUILTIN_USERS)[number]) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: payload.username }, { email: payload.email }],
      },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          username: payload.username,
          email: payload.email,
          password: payload.password,
          role: 'USER',
          nickname: payload.nickname,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        role: 'USER',
        nickname: payload.nickname,
      },
    });
  }

  async getCurrentUser(authHeader?: string) {
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return null;
    }

    const userId = Number(token.replace('mock-token-', ''));

    if (!Number.isFinite(userId)) {
      return null;
    }

    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async requireUser(authHeader?: string) {
    const user = await this.getCurrentUser(authHeader);

    if (!user) {
      throw new UnauthorizedException('Login required');
    }

    return user;
  }
}
