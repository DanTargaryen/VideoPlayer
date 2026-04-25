import { Controller, Get, Headers } from '@nestjs/common';

import { ok } from '../../common/dto/api-response.dto';
import { AuthService } from '../auth/auth.service';
import { FollowService } from '../follow/follow.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

@Controller('creator')
export class CreatorController {
  constructor(
    private readonly authService: AuthService,
    private readonly videoService: VideoService,
    private readonly followService: FollowService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    const counts = await this.videoService.countVideosByStatus(user.id);
    const [aggregates, followerCount, followingCount, recentRejectedVideos] = await Promise.all([
      this.prisma.video.aggregate({
        where: { creatorId: user.id },
        _sum: {
          likeCount: true,
          favoriteCount: true,
          commentCount: true,
        },
      }),
      this.followService.getFollowerCount(user.id),
      this.prisma.followRelation.count({ where: { followerId: user.id } }),
      this.prisma.video.findMany({
        where: {
          creatorId: user.id,
          status: 'REJECTED',
        },
        select: {
          id: true,
          title: true,
          rejectReason: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return ok({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      email: user.email,
      bio: user.bio,
      coinBalance: user.coinBalance,
      followerCount,
      followingCount,
      totalLikes: aggregates._sum.likeCount ?? 0,
      totalFavorites: aggregates._sum.favoriteCount ?? 0,
      totalComments: aggregates._sum.commentCount ?? 0,
      recentRejectedVideos,
      ...counts,
    });
  }

  @Get('videos')
  async getMyVideos(@Headers('authorization') authorization?: string) {
    const user = await this.authService.requireUser(authorization);
    return ok(await this.videoService.getCreatorVideos(user));
  }
}
