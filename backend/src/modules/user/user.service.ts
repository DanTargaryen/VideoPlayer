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
      followers,
      following: followingCount,
      videos: videoCount,
      isFollowing,
      items: videos,
    };
  }

  updateProfile(payload: { nickname?: string; avatarUrl?: string; bio?: string }) {
    return payload;
  }
}
