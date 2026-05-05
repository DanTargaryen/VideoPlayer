import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const DAILY_CLAIM_AMOUNT = 2;

@Injectable()
export class GiftService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: number) {
    const [user, claimedTotal, spentTotal, todayClaim] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.coinTransaction.aggregate({
        where: { userId, type: 'DAILY_CLAIM' },
        _sum: { amount: true },
      }),
      this.prisma.coinTransaction.aggregate({
        where: { userId, type: 'VIDEO_COIN' },
        _sum: { amount: true },
      }),
      this.prisma.dailyCoinClaim.findUnique({
        where: { userId_claimDate: { userId, claimDate: this.getTodayClaimDate() } },
      }),
    ]);

    return {
      balance: user.coinBalance,
      totalClaimed: claimedTotal._sum.amount ?? 0,
      totalSpent: Math.abs(spentTotal._sum.amount ?? 0),
      claimedToday: Boolean(todayClaim),
      todayClaimAmount: DAILY_CLAIM_AMOUNT,
    };
  }

  async claimDaily(userId: number) {
    const claimDate = this.getTodayClaimDate();

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.dailyCoinClaim.create({
          data: {
            userId,
            claimDate,
            amount: DAILY_CLAIM_AMOUNT,
          },
        });

        const user = await tx.user.update({
          where: { id: userId },
          data: { coinBalance: { increment: DAILY_CLAIM_AMOUNT } },
        });

        await tx.coinTransaction.create({
          data: {
            userId,
            type: 'DAILY_CLAIM',
            amount: DAILY_CLAIM_AMOUNT,
            balanceAfter: user.coinBalance,
          },
        });

        return {
          claimed: true,
          amount: DAILY_CLAIM_AMOUNT,
          balance: user.coinBalance,
          claimedToday: true,
        };
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        return {
          claimed: false,
          amount: 0,
          balance: user.coinBalance,
          claimedToday: true,
        };
      }
      throw error;
    }
  }

  private getTodayClaimDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
