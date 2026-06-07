import { Injectable } from '@nestjs/common';

import { CATEGORY_DEFINITIONS, resolveCategoryCode } from '../../common/constants/categories';
import { LiveService } from '../live/live.service';
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

interface SearchCounts {
  video: number;
  user: number;
  live: number;
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
      currentUserId: options.currentUserId,
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
    const counts = await this.countSearchResults({
      keyword: normalizedKeyword,
      categoryCode: options.categoryCode,
      sortBy: options.sortBy,
    });

    const video =
      normalizedTab === 'user' || normalizedTab === 'live'
        ? []
        : await this.videoService.searchPublishedVideos(normalizedKeyword, {
            currentUserId: options.currentUserId,
            categoryCode: options.categoryCode,
            sortBy: options.sortBy,
            page,
            pageSize,
          });

    const user =
      normalizedTab === 'user'
        ? await this.prisma.user.findMany({
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
          })
        : [];

    const live =
      normalizedTab === 'live'
        ? this.liveService.listRooms({
            keyword: normalizedKeyword,
            category: category ?? undefined,
            limit: pageSize,
          })
        : [];

    return {
      keyword: normalizedKeyword,
      tab: normalizedTab,
      sortBy: options.sortBy ?? 'best',
      categoryCode: options.categoryCode ?? 'recommend',
      page,
      pageSize,
      counts,
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

  private async countSearchResults(options: Pick<SearchOptions, 'keyword' | 'categoryCode' | 'sortBy'>) {
    const [video, user, live] = await Promise.all([
      this.countVideoResults(options),
      this.countUserResults(options.keyword),
      this.countLiveResults(options.keyword, options.categoryCode),
    ]);

    return {
      video,
      user,
      live,
    } satisfies SearchCounts;
  }

  private countUserResults(keyword: string) {
    const normalizedKeyword = keyword.trim();

    return this.prisma.user.count({
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
    });
  }

  private countLiveResults(keyword: string, categoryCode?: string) {
    const category = resolveCategoryCode(categoryCode);

    return this.liveService.countRooms({
      keyword,
      category: category ?? undefined,
    });
  }

  private countVideoResults(options: Pick<SearchOptions, 'keyword' | 'categoryCode' | 'sortBy'>) {
    const normalizedKeyword = options.keyword.trim();
    const category = resolveCategoryCode(options.categoryCode);
    const categoryWhere = this.buildOptionalCategoryWhere(category);
    const keywordCategoryCodes = this.resolveSearchCategoryCodes(normalizedKeyword);

    if (!normalizedKeyword) {
      return this.prisma.video.count({
        where: {
          status: 'PUBLISHED',
          ...categoryWhere,
        },
      });
    }

    if (options.sortBy === 'latest' || options.sortBy === 'hot') {
      const keywordWhere = {
        OR: [
          {
            title: {
              contains: normalizedKeyword,
            },
          },
          {
            description: {
              contains: normalizedKeyword,
            },
          },
          {
            creator: {
              nickname: {
                contains: normalizedKeyword,
              },
            },
          },
          ...(keywordCategoryCodes.length > 0
            ? [
                {
                  categories: {
                    some: {
                      code: {
                        in: keywordCategoryCodes,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      };

      return this.prisma.video.count({
        where: {
          status: 'PUBLISHED',
          ...(category ? { AND: [categoryWhere, keywordWhere] } : keywordWhere),
        },
      });
    }

    const tokens = this.tokenizeSearchKeyword(normalizedKeyword);
    const recallTerms = [...new Set([normalizedKeyword.toLowerCase(), ...tokens])];
    const recallWhere = {
      OR: recallTerms.flatMap((term) => [
        {
          title: {
            contains: term,
          },
        },
        {
          description: {
            contains: term,
          },
        },
        {
          creator: {
            nickname: {
              contains: term,
            },
          },
        },
        {
          categories: {
            some: {
              code: {
                in: this.resolveSearchCategoryCodes(term),
              },
            },
          },
        },
      ]),
    };

    return this.prisma.video.count({
      where: {
        status: 'PUBLISHED',
        ...(category ? { AND: [categoryWhere, recallWhere] } : recallWhere),
      },
    });
  }

  private buildOptionalCategoryWhere(category?: string) {
    if (!category) {
      return {};
    }

    return {
      OR: [
        { category: { in: [category] } },
        {
          categories: {
            some: {
              code: {
                in: [category],
              },
            },
          },
        },
      ],
    };
  }

  private resolveSearchCategoryCodes(keyword: string) {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return [];
    }

    return CATEGORY_DEFINITIONS.filter(
      (item) =>
        item.id !== null &&
        item.code !== 'live' &&
        (item.code.toLowerCase().includes(normalizedKeyword) || item.label.toLowerCase().includes(normalizedKeyword)),
    ).map((item) => item.code);
  }

  private tokenizeSearchKeyword(keyword: string) {
    const lowered = keyword.toLowerCase().trim();
    const splitTokens = lowered.split(/\s+/).filter(Boolean);

    if (splitTokens.length > 1) {
      return splitTokens;
    }

    const compact = lowered.replace(/\s+/g, '');
    if (compact.length <= 2) {
      return compact ? [compact] : [];
    }

    const grams = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
      grams.push(compact.slice(index, index + 2));
      if (grams.length >= 6) {
        break;
      }
    }

    return [...new Set([compact, ...grams])];
  }
}
