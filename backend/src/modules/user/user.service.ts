import { Injectable, NotFoundException } from '@nestjs/common';

import { FollowService } from '../follow/follow.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly followService: FollowService,
  ) {}

  async getHomepage(id: number, currentUserId?: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [videoCount, followers, followingCount, videos, isFollowing] = await Promise.all([
      this.prisma.video.count({ where: { creatorId: id, status: 'PUBLISHED' } }),
      this.followService.getFollowerCount(id),
      this.prisma.followRelation.count({ where: { followerId: id } }),
      this.prisma.video.findMany({
        where: { creatorId: id, status: 'PUBLISHED' },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 12,
      }),
      this.followService.isFollowing(id, currentUserId),
    ]);

    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      followers,
      following: followingCount,
      videos: videoCount,
      isFollowing,
      items: videos,
    };
  }

  async updateProfile(
    userId: number,
    payload: { nickname?: string; avatarUrl?: string; bio?: string },
  ) {
    const data = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      role: updated.role,
    };
  }
}
