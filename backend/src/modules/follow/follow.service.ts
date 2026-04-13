import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(targetUserId: number, currentUser: { id: number; nickname: string }) {
    if (targetUserId === currentUser.id) {
      throw new BadRequestException('Cannot follow yourself');
    }

    await this.prisma.followRelation.upsert({
      where: {
        followerId_followingId: {
          followerId: currentUser.id,
          followingId: targetUserId,
        },
      },
      create: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
      update: {},
    });

    await this.prisma.notification.create({
      data: {
        recipientId: targetUserId,
        actorId: currentUser.id,
        type: 'FOLLOW',
        title: '收到新的关注',
        content: `${currentUser.nickname} 关注了你`,
        relatedType: 'USER',
        relatedId: currentUser.id,
      },
    });

    return { id: targetUserId, followed: true };
  }

  async unfollow(targetUserId: number, currentUser: { id: number }) {
    await this.prisma.followRelation.deleteMany({
      where: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    });

    return { id: targetUserId, followed: false };
  }

  async isFollowing(targetUserId: number, currentUserId?: number) {
    if (!currentUserId) {
      return false;
    }

    const relation = await this.prisma.followRelation.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    });

    return Boolean(relation);
  }

  async getFollowingFeed(currentUser: { id: number }) {
    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: currentUser.id },
      select: { followingId: true },
    });

    const followingIds = relations.map((item: (typeof relations)[number]) => item.followingId);

    if (followingIds.length === 0) {
      return [];
    }

    return this.prisma.video.findMany({
      where: {
        creatorId: { in: followingIds },
        status: 'PUBLISHED',
      },
      include: {
        creator: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async getFollowerCount(targetUserId: number) {
    return this.prisma.followRelation.count({
      where: { followingId: targetUserId },
    });
  }

  async getFollowers(targetUserId: number) {
    const relations = await this.prisma.followRelation.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return relations.map((r) => ({
      id: r.follower.id,
      nickname: r.follower.nickname,
      avatarUrl: r.follower.avatarUrl,
      followedAt: r.createdAt,
    }));
  }

  async getFollowing(targetUserId: number) {
    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: targetUserId },
      include: {
        following: { select: { id: true, nickname: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return relations.map((r) => ({
      id: r.following.id,
      nickname: r.following.nickname,
      avatarUrl: r.following.avatarUrl,
      followedAt: r.createdAt,
    }));
  }
}
