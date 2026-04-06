import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

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

  async login(account: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: account }, { email: account }],
      },
    });

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    return {
      token: `mock-token-${user.id}`,
      userId: user.id,
      role: user.role,
      nickname: user.nickname,
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
