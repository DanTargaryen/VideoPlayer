import { Injectable } from '@nestjs/common';

import { resolveCategoryCode } from '../../common/constants/categories';
import { LiveService } from '../live/live.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

interface ListOptions {
  page?: number;
  pageSize?: number;
  categoryCode?: string;
}

interface SearchOptions extends ListOptions {
  keyword: string;
  tab?: 'video' | 'live' | 'user';
  sortBy?: 'hot' | 'latest';
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
    private readonly liveService: LiveService,
  ) {}

  async getRecommendFeed(options: ListOptions = {}) {
    return this.videoService.getRecommendFeed({
      categoryCode: options.categoryCode,
      page: options.page,
      pageSize: options.pageSize,
    });
  }

  async getHotFeed(targetType: string) {
    if (targetType === 'LIVE') {
      return this.liveService.listRooms({
        status: 'LIVING',
        limit: 10,
      });
    }

    return this.videoService.getRecommendFeed({
      page: 1,
      pageSize: 10,
      sortBy: 'hot',
    });
  }

  async search(options: SearchOptions) {
    const normalizedKeyword = options.keyword.trim();
    const normalizedTab = options.tab ?? 'video';
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const skip = (page - 1) * pageSize;
    const category = resolveCategoryCode(options.categoryCode);

    const video = await this.videoService.searchPublishedVideos(normalizedKeyword, {
      categoryCode: options.categoryCode,
      sortBy: options.sortBy,
      page,
      pageSize,
    });

    const user = await this.prisma.user.findMany({
      where: normalizedKeyword
        ? {
            OR: [
              {
                nickname: {
                  contains: normalizedKeyword,
                },
              },
              {
                username: {
                  contains: normalizedKeyword,
                },
              },
            ],
          }
        : {},
      orderBy: { id: 'desc' },
      skip,
      take: pageSize,
    });

    const live = this.liveService.listRooms({
      keyword: normalizedKeyword,
      category: category ?? undefined,
      limit: pageSize,
    });

    return {
      keyword: normalizedKeyword,
      tab: normalizedTab,
      sortBy: options.sortBy ?? 'latest',
      categoryCode: options.categoryCode ?? 'recommend',
      page,
      pageSize,
      video,
      live,
      user,
      category: category ?? null,
    };
  }

  async getHotwords() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true },
      orderBy: [{ likeCount: 'desc' }, { favoriteCount: 'desc' }, { commentCount: 'desc' }],
      take: 5,
    });

    const titles = videos.map((item: (typeof videos)[number]) => item.title).filter(Boolean);
    const defaults = ['观澜推荐', '视频弹幕', '投稿审核', '直播互动'];
    return Array.from(new Set([...titles, ...defaults])).slice(0, 8);
  }

  private normalizePage(page?: number) {
    if (!page || !Number.isFinite(page) || page < 1) {
      return 1;
    }

    return Math.floor(page);
  }

  private normalizePageSize(pageSize?: number) {
    if (!pageSize || !Number.isFinite(pageSize) || pageSize < 1) {
      return 20;
    }

    return Math.min(50, Math.floor(pageSize));
  }
}
