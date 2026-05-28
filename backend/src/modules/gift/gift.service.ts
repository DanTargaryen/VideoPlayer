import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const DAILY_CLAIM_AMOUNT = 2;
const STREAK_REWARD_AMOUNT = 10;
const STREAK_MILESTONE_DEFAULT = [3, 7, 14, 30];
const MILESTONE_INCREMENT = 30;

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

  async getStreakInfo(userId: number) {
    const [claims, todayClaim] = await Promise.all([
      this.prisma.dailyCoinClaim.findMany({
        where: { userId },
        orderBy: { claimDate: 'desc' },
        select: { claimDate: true },
      }),
      this.prisma.dailyCoinClaim.findUnique({
        where: { userId_claimDate: { userId, claimDate: this.getTodayClaimDate() } },
      }),
    ]);

    const streak = this.calculateStreak(claims);
    const milestones = this.getMilestoneNodes(streak);
    const claimedMilestones = await this.prisma.streakMilestoneClaim.findMany({
      where: { userId },
      select: { milestone: true },
    });
    const claimedSet = new Set(claimedMilestones.map((m) => m.milestone));

    return {
      streak,
      claimedToday: Boolean(todayClaim),
      milestones: milestones.map((m) => ({
        day: m,
        claimed: claimedSet.has(m),
        reached: streak >= m,
      })),
    };
  }

  async claimMilestoneReward(userId: number, milestone: number) {
    const milestones = this.getMilestoneNodesFromStreak(milestone);
    if (!milestones.includes(milestone)) {
      return { claimed: false, message: '无效的里程碑' };
    }

    const streak = await this.getStreakInfo(userId);
    if (streak.streak < milestone) {
      return { claimed: false, message: '未达到该里程碑' };
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.streakMilestoneClaim.create({
          data: { userId, milestone },
        });

        const user = await tx.user.update({
          where: { id: userId },
          data: { coinBalance: { increment: STREAK_REWARD_AMOUNT } },
        });

        await tx.coinTransaction.create({
          data: {
            userId,
            type: 'STREAK_REWARD',
            amount: STREAK_REWARD_AMOUNT,
            balanceAfter: user.coinBalance,
          },
        });

        return { claimed: true, amount: STREAK_REWARD_AMOUNT, balance: user.coinBalance };
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        return { claimed: false, message: '该里程碑已领取' };
      }
      throw error;
    }
  }

  private calculateStreak(claims: { claimDate: Date }[]): number {
    if (claims.length === 0) return 0;

    const today = this.getTodayClaimDate();
    const sortedDates = claims
      .map((c) => {
        const d = new Date(c.claimDate);
        d.setHours(0, 0, 0, 0);
        return d;
      })
      .sort((a, b) => b.getTime() - a.getTime());

    const latestClaim = sortedDates[0];
    const diffDays = Math.floor((today.getTime() - latestClaim.getTime()) / 86400000);

    if (diffDays > 1) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];
      const expectedDiff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (expectedDiff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getMilestoneNodes(streak: number): number[] {
    if (streak <= 30) return STREAK_MILESTONE_DEFAULT;

    const base = Math.floor((streak - 1) / MILESTONE_INCREMENT) * MILESTONE_INCREMENT;
    return [base + 30, base + 60, base + 90, base + 120];
  }

  private getMilestoneNodesFromStreak(milestone: number): number[] {
    if (STREAK_MILESTONE_DEFAULT.includes(milestone)) return STREAK_MILESTONE_DEFAULT;
    const base = Math.floor((milestone - 1) / MILESTONE_INCREMENT) * MILESTONE_INCREMENT;
    return [base + 30, base + 60, base + 90, base + 120];
  }

  private getTodayClaimDate() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private isUniqueConflict(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
