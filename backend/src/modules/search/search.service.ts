import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  async getRecommendFeed() {
    return this.videoService.getRecommendFeed();
  }

  async search(keyword: string) {
    const normalized = keyword.trim();
    const video = await this.videoService.searchPublishedVideos(normalized);
    const user = await this.prisma.user.findMany({
      where: normalized
        ? {
            nickname: {
              contains: normalized,
            },
          }
        : {},
      orderBy: { id: 'desc' },
      take: 20,
    });

    return {
      keyword,
      video,
      live: [],
      user,
    };
  }
}
