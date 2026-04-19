import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const ADMIN_SECRET = '123456';
const ADMIN_USER = {
  username: 'demo_admin',
  email: 'admin@guanlan.dev',
  password: 'Admin123456!',
  nickname: '平台管理员',
} as const;
const BUILTIN_USERS = [
  {
    username: 'live_user_1',
    email: 'live_user_1@guanlan.dev',
    password: 'Live123456!',
    nickname: 'LiveTester1',
  },
  {
    username: 'live_user_2',
    email: 'live_user_2@guanlan.dev',
    password: 'Live123456!',
    nickname: 'LiveTester2',
  },
] as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(payload: { username: string; password: string; nickname?: string }) {
    const generatedEmail = this.buildRegistrationEmail(payload.username);
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: payload.username }, { email: generatedEmail }],
      },
    });

    if (exists) {
      throw new UnauthorizedException('Username or email already exists');
    }

    const createdUser = await this.prisma.user.create({
      data: {
        username: payload.username,
        email: generatedEmail,
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

  private buildRegistrationEmail(username: string) {
    const encoded = Buffer.from(username, 'utf8').toString('hex');
    return `user-${encoded}@local.invalid`;
  }

  async login(account?: string, password?: string, adminSecret?: string) {
    if (adminSecret && !account && !password) {
      return this.loginWithAdminSecret(adminSecret);
    }

    if (!account || !password) {
      throw new UnauthorizedException('Account and password are required');
    }

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
      phone: user.phone,
      bio: user.bio,
    };
  }

  private async loginWithAdminSecret(adminSecret: string) {
    if (adminSecret !== ADMIN_SECRET) {
      throw new UnauthorizedException('Admin secret is invalid');
    }

    const adminUser = await this.ensureAdminUser();

    return {
      token: `mock-token-${adminUser.id}`,
      userId: adminUser.id,
      role: adminUser.role,
      nickname: adminUser.nickname,
      phone: adminUser.phone,
      bio: adminUser.bio,
    };
  }

  private async ensureAdminUser() {
    const existingDemoAdmin = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: ADMIN_USER.username }, { email: ADMIN_USER.email }],
      },
    });

    if (existingDemoAdmin) {
      if (existingDemoAdmin.role === 'ADMIN') {
        return existingDemoAdmin;
      }

      return this.prisma.user.update({
        where: { id: existingDemoAdmin.id },
        data: {
          role: 'ADMIN',
        },
      });
    }

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    return this.prisma.user.create({
      data: {
        username: ADMIN_USER.username,
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        role: 'ADMIN',
        nickname: ADMIN_USER.nickname,
      },
    });
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
          // 保留现有的字段
          ...(existing.phone && { phone: existing.phone }),
          ...(existing.nickname && { nickname: existing.nickname }),
          ...(existing.bio && { bio: existing.bio }),
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

  async resetPasswordByPhone(username: string, phone: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        phone,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名与手机号不匹配');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { password: newPassword },
    });

    return {
      id: updated.id,
      username: updated.username,
      phone: updated.phone,
    };
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
