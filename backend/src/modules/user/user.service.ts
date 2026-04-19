import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

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

  async deleteAccount(userId: number, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.password !== password) {
      throw new UnauthorizedException('密码验证失败');
    }

    await this.prisma.$transaction(async (tx) => {
      const videos = await tx.video.findMany({
        where: { creatorId: userId },
        select: { id: true },
      });
      const videoIds = videos.map((v) => v.id);

      // Nullify references to preserve audit records
      await tx.videoReview.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } });
      await tx.reportRecord.updateMany({ where: { handlerId: userId }, data: { handlerId: null } });
      await tx.notification.updateMany({ where: { actorId: userId }, data: { actorId: null } });

      // Delete leaf records owned by user
      await tx.userVideoWatch.deleteMany({ where: { userId } });
      await tx.userCategoryPreference.deleteMany({ where: { userId } });
      await tx.userCreatorPreference.deleteMany({ where: { userId } });
      await tx.userCreatorPreference.deleteMany({ where: { creatorId: userId } });
      await tx.userProfileSummary.deleteMany({ where: { userId } });
      await tx.videoLike.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.followRelation.deleteMany({
        where: { OR: [{ followerId: userId }, { followingId: userId }] },
      });
      await tx.notification.deleteMany({ where: { recipientId: userId } });
      await tx.reportRecord.deleteMany({ where: { reporterId: userId } });

      if (videoIds.length > 0) {
        await tx.userVideoWatch.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.videoLike.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.favorite.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.reportRecord.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.videoDanmaku.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.comment.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.videoReview.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.videoAsset.deleteMany({ where: { videoId: { in: videoIds } } });
        await tx.video.deleteMany({ where: { creatorId: userId } });
      }

      // Delete user's own interactions on other videos
      await tx.comment.deleteMany({ where: { userId } });
      await tx.videoDanmaku.deleteMany({ where: { userId } });

      await tx.user.delete({ where: { id: userId } });
    });
  }

  async updateProfile(
    userId: number,
    payload: { nickname?: string; avatarUrl?: string; bio?: string; phone?: string },
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
      phone: updated.phone,
      role: updated.role,
    };
  }
}
