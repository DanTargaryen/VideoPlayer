import { Injectable } from '@nestjs/common';

import { resolveCategoryId } from '../../common/constants/categories';
import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

interface ListOptions {
  currentUserId?: number;
  page?: number;
  pageSize?: number;
  categoryCode?: string;
}

interface SearchOptions extends ListOptions {
  keyword: string;
  tab?: 'video' | 'live' | 'user';
  sortBy?: 'best' | 'hot' | 'latest';
}

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  async getRecommendFeed(options: ListOptions = {}) {
    return this.videoService.getRecommendFeed({
      currentUserId: options.currentUserId,
      categoryCode: options.categoryCode,
      page: options.page,
      pageSize: options.pageSize,
    });
  }

  async getHotFeed(targetType: string) {
    if (targetType === 'LIVE') {
      return [];
    }

    return this.videoService.getRecommendFeed({
      page: 1,
      pageSize: 10,
      sortBy: 'hot',
    });
  }

  async search(options: SearchOptions) {
    const normalizedKeyword = options.keyword.trim();//去掉空格
    const normalizedTab = options.tab ?? 'video';//搜索分区
    const page = this.normalizePage(options.page);//页码处理为合法值
    const pageSize = this.normalizePageSize(options.pageSize);//每页条数
    const skip = (page - 1) * pageSize;//跳过多少条数据
    const categoryId = resolveCategoryId(options.categoryCode);//前端的分类代码，转换为系统内部真正使用的ID

    const video =
      normalizedTab === 'user'
        ? []
        : await this.videoService.searchPublishedVideos(normalizedKeyword, {
            currentUserId: options.currentUserId,
            categoryCode: options.categoryCode,//分类
            sortBy: options.sortBy,//排序方式
            page,//第几页
            pageSize,//每页第几条
          });

    const user =
      normalizedTab === 'video'
        ? []
        : await this.prisma.user.findMany({//从user表里查多条用户数据
            where: normalizedKeyword//有关键词，就按照关键词筛选
              ? {
                  OR: [
                    {
                      nickname: {//用户昵称
                        contains: normalizedKeyword,
                      },
                    },
                    {
                      username: {//账号唯一标识
                        contains: normalizedKeyword,
                      },
                    },
                  ],
                }
              : {},
            orderBy: { id: 'desc' },//按照id倒序排列
            skip,//跳过前面多少条
            take: pageSize,//取多少数据
          });

    const live = normalizedTab === 'user' ? [] : [];//直播搜索逻辑

    return {
      keyword: normalizedKeyword,
      tab: normalizedTab,
      sortBy: options.sortBy ?? 'best',
      categoryCode: options.categoryCode ?? 'recommend',
      page,
      pageSize,
      video,
      live,
      user,
      categoryId: categoryId ?? null,
    };//把搜索条件和结果一起返回
  }

  async getHotwords() {
    const videos = await this.prisma.video.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true },
      orderBy: [{ likeCount: 'desc' }, { favoriteCount: 'desc' }, { commentCount: 'desc' }],
      take: 5,
    });

    const titles = videos.map((item) => item.title).filter(Boolean);
    const defaults = ['观澜推荐', '视频弹幕', '投稿审核', '直播互动'];
    return Array.from(new Set([...titles, ...defaults])).slice(0, 8);
  }

  async suggest(keyword: string) {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return { list: [] };
    }

    const videos = await this.prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        title: {
          contains: normalizedKeyword,
        },
      },
      select: {
        title: true,
      },
      orderBy: [{ likeCount: 'desc' }, { favoriteCount: 'desc' }, { commentCount: 'desc' }, { publishedAt: 'desc' }],
      take: 20,
    });

    return {
      list: Array.from(new Set(videos.map((item) => item.title).filter(Boolean))).slice(0, 10),
    };
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
