import { Injectable, NotFoundException } from '@nestjs/common';

import { CATEGORY_DEFINITIONS } from '../../common/constants/categories';
import { PrismaService } from '../prisma/prisma.service';
import {
  USER_PROFILE_ACTIVITY_THRESHOLDS,
  USER_PROFILE_BEHAVIOR_WEIGHTS,
  USER_PROFILE_WATCH_THRESHOLDS,
  USER_PROFILE_WATCH_WEIGHTS,
} from './user-profile.constants';

interface UserProfileSummaryDto {
  activityScore: number;
  activityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  behaviorSignalCount: number;
  viewerScore: number;
  creatorScore: number;
  creatorViewerTendency: 'COLD_START' | 'VIEWER' | 'CREATOR' | 'BALANCED';
  isColdStart: boolean;
  updatedAt: Date;
}

interface UserCategoryPreferenceDto {
  categoryId: number;
  categoryCode: string;
  categoryLabel: string;
  score: number;
}

interface UserCreatorPreferenceDto {
  creatorId: number;
  creatorNickname: string;
  score: number;
}

export interface UserRecommendationProfileDto {
  userId: number;
  summary: UserProfileSummaryDto;
  categoryPreferences: UserCategoryPreferenceDto[];
  creatorPreferences: UserCreatorPreferenceDto[];
}

const CATEGORY_META = new Map(
  CATEGORY_DEFINITIONS.filter((item) => item.id !== null).map((item) => [
    item.id as number,
    { code: item.code, label: item.label },
  ]),
);

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number, autoBuild = true): Promise<UserRecommendationProfileDto> {
    await this.ensureUserExists(userId);

    const summary = await this.prisma.userProfileSummary.findUnique({ where: { userId } });

    if (!summary && autoBuild) {
      return this.buildAndSaveProfile(userId);
    }

    if (!summary) {
      throw new NotFoundException('User profile not found');
    }

    const [categoryPreferences, creatorPreferences] = await Promise.all([
      this.prisma.userCategoryPreference.findMany({
        where: { userId },
        orderBy: [{ score: 'desc' }, { categoryId: 'asc' }],
      }),
      this.prisma.userCreatorPreference.findMany({
        where: { userId },
        include: {
          creator: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy: [{ score: 'desc' }, { creatorId: 'asc' }],
      }),
    ]);

    return {
      userId,
      summary: {
        activityScore: summary.activityScore,
        activityLevel: summary.activityLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        behaviorSignalCount: summary.behaviorSignalCount,
        viewerScore: summary.viewerScore,
        creatorScore: summary.creatorScore,
        creatorViewerTendency: summary.creatorViewerTendency as
          | 'COLD_START'
          | 'VIEWER'
          | 'CREATOR'
          | 'BALANCED',
        isColdStart: summary.isColdStart,
        updatedAt: summary.updatedAt,
      },
      categoryPreferences: categoryPreferences.map((item) => this.toCategoryPreferenceDto(item.categoryId, item.score)),
      creatorPreferences: creatorPreferences.map((item) => ({
        creatorId: item.creatorId,
        creatorNickname: item.creator.nickname,
        score: item.score,
      })),
    };
  }

  async buildAndSaveProfile(userId: number): Promise<UserRecommendationProfileDto> {
    await this.ensureUserExists(userId);

    const [likes, favorites, comments, danmakus, follows, createdVideos, videoWatches] = await Promise.all([
      this.prisma.videoLike.findMany({
        where: {
          userId,
          video: {
            status: 'PUBLISHED',
          },
        },
        select: {
          video: {
            select: {
              categoryId: true,
              creatorId: true,
            },
          },
        },
      }),
      this.prisma.favorite.findMany({
        where: {
          userId,
          video: {
            status: 'PUBLISHED',
          },
        },
        select: {
          video: {
            select: {
              categoryId: true,
              creatorId: true,
            },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: {
          userId,
          status: 'NORMAL',
          video: {
            status: 'PUBLISHED',
          },
        },
        select: {
          video: {
            select: {
              categoryId: true,
              creatorId: true,
            },
          },
        },
      }),
      this.prisma.videoDanmaku.findMany({
        where: {
          userId,
          status: 'NORMAL',
          video: {
            status: 'PUBLISHED',
          },
        },
        select: {
          video: {
            select: {
              categoryId: true,
              creatorId: true,
            },
          },
        },
      }),
      this.prisma.followRelation.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      this.prisma.video.findMany({
        where: { creatorId: userId },
        select: {
          categoryId: true,
        },
      }),
      this.prisma.userVideoWatch.findMany({
        where: {
          userId,
          video: {
            status: 'PUBLISHED',
          },
        },
        select: {
          playCount: true,
          totalWatchDurationSeconds: true,
          lastWatchDurationSeconds: true,
          videoDurationSeconds: true,
          maxWatchRatio: true,
          lastWatchRatio: true,
          completedCount: true,
          video: {
            select: {
              categoryId: true,
              creatorId: true,
            },
          },
        },
      }),
    ]);

    const categoryScores = new Map<number, number>();
    const creatorScores = new Map<number, number>();

    // The first version of the profile is intentionally simple:
    // we aggregate category and creator preferences from explicit interaction signals.
    for (const item of likes) {
      this.addScore(categoryScores, item.video.categoryId, USER_PROFILE_BEHAVIOR_WEIGHTS.category.like);
      this.addScore(creatorScores, item.video.creatorId, USER_PROFILE_BEHAVIOR_WEIGHTS.creator.like);
    }

    for (const item of favorites) {
      this.addScore(categoryScores, item.video.categoryId, USER_PROFILE_BEHAVIOR_WEIGHTS.category.favorite);
      this.addScore(creatorScores, item.video.creatorId, USER_PROFILE_BEHAVIOR_WEIGHTS.creator.favorite);
    }

    for (const item of comments) {
      this.addScore(categoryScores, item.video.categoryId, USER_PROFILE_BEHAVIOR_WEIGHTS.category.comment);
      this.addScore(creatorScores, item.video.creatorId, USER_PROFILE_BEHAVIOR_WEIGHTS.creator.comment);
    }

    for (const item of danmakus) {
      this.addScore(categoryScores, item.video.categoryId, USER_PROFILE_BEHAVIOR_WEIGHTS.category.danmaku);
      this.addScore(creatorScores, item.video.creatorId, USER_PROFILE_BEHAVIOR_WEIGHTS.creator.danmaku);
    }

    for (const item of follows) {
      this.addScore(creatorScores, item.followingId, USER_PROFILE_BEHAVIOR_WEIGHTS.creator.follow);
    }

    for (const item of createdVideos) {
      this.addScore(categoryScores, item.categoryId, USER_PROFILE_BEHAVIOR_WEIGHTS.category.createdVideo);
    }

    // Watch behavior is weaker than explicit engagement, but deep watch/completion
    // should still move the user's category and creator preference.
    let meaningfulWatchSignalCount = 0;
    let watchActivityScore = 0;
    let watchViewerScore = 0;

    for (const item of videoWatches) {
      this.addScore(categoryScores, item.video.categoryId, this.calculateWatchCategoryScore(item));
      this.addScore(creatorScores, item.video.creatorId, this.calculateWatchCreatorScore(item));

      const isMeaningfulWatch =
        item.totalWatchDurationSeconds >= USER_PROFILE_WATCH_THRESHOLDS.coldStartWatchSeconds ||
        item.maxWatchRatio >= USER_PROFILE_WATCH_THRESHOLDS.coldStartWatchRatio;

      if (isMeaningfulWatch) {
        meaningfulWatchSignalCount += 1;
      }

      watchActivityScore += this.calculateWatchActivityScore(item);
      watchViewerScore += this.calculateWatchViewerScore(item);
    }

    const behaviorSignalCount =
      likes.length +
      favorites.length +
      comments.length +
      danmakus.length +
      follows.length +
      createdVideos.length +
      meaningfulWatchSignalCount;

    const activityScore =
      likes.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.like +
      favorites.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.favorite +
      comments.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.comment +
      danmakus.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.danmaku +
      follows.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.follow +
      createdVideos.length * USER_PROFILE_BEHAVIOR_WEIGHTS.activity.createdVideo +
      watchActivityScore;

    const viewerScore =
      likes.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerLike +
      favorites.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerFavorite +
      comments.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerComment +
      danmakus.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerDanmaku +
      follows.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.viewerFollow +
      watchViewerScore;

    const creatorScore = createdVideos.length * USER_PROFILE_BEHAVIOR_WEIGHTS.tendency.creatorVideo;
    const isColdStart = behaviorSignalCount === 0;
    const activityLevel = this.resolveActivityLevel(activityScore);
    const creatorViewerTendency = this.resolveCreatorViewerTendency(viewerScore, creatorScore, isColdStart);

    const categoryPreferences = this.sortScoreMap(categoryScores).map(([categoryId, score]) =>
      this.toCategoryPreferenceDto(categoryId, score),
    );
    const creatorPreferences = await this.buildCreatorPreferenceDtos(creatorScores);

    await this.prisma.$transaction(async (tx) => {
      await tx.userCategoryPreference.deleteMany({ where: { userId } });
      if (categoryPreferences.length > 0) {
        await tx.userCategoryPreference.createMany({
          data: categoryPreferences.map((item) => ({
            userId,
            categoryId: item.categoryId,
            score: item.score,
          })),
        });
      }

      await tx.userCreatorPreference.deleteMany({ where: { userId } });
      if (creatorPreferences.length > 0) {
        await tx.userCreatorPreference.createMany({
          data: creatorPreferences.map((item) => ({
            userId,
            creatorId: item.creatorId,
            score: item.score,
          })),
        });
      }

      await tx.userProfileSummary.upsert({
        where: { userId },
        create: {
          userId,
          activityScore,
          activityLevel,
          behaviorSignalCount,
          viewerScore,
          creatorScore,
          creatorViewerTendency,
          isColdStart,
        },
        update: {
          activityScore,
          activityLevel,
          behaviorSignalCount,
          viewerScore,
          creatorScore,
          creatorViewerTendency,
          isColdStart,
        },
      });
    });

    const summary = await this.prisma.userProfileSummary.findUniqueOrThrow({ where: { userId } });

    return {
      userId,
      summary: {
        activityScore: summary.activityScore,
        activityLevel: summary.activityLevel as 'LOW' | 'MEDIUM' | 'HIGH',
        behaviorSignalCount: summary.behaviorSignalCount,
        viewerScore: summary.viewerScore,
        creatorScore: summary.creatorScore,
        creatorViewerTendency: summary.creatorViewerTendency as
          | 'COLD_START'
          | 'VIEWER'
          | 'CREATOR'
          | 'BALANCED',
        isColdStart: summary.isColdStart,
        updatedAt: summary.updatedAt,
      },
      categoryPreferences,
      creatorPreferences,
    };
  }

  private async buildCreatorPreferenceDtos(scoreMap: Map<number, number>) {
    const sortedScores = this.sortScoreMap(scoreMap);

    if (sortedScores.length === 0) {
      return [];
    }

    const creators = await this.prisma.user.findMany({
      where: {
        id: {
          in: sortedScores.map(([creatorId]) => creatorId),
        },
      },
      select: {
        id: true,
        nickname: true,
      },
    });

    const creatorIndex = new Map(creators.map((item) => [item.id, item.nickname]));

    return sortedScores
      .map(([creatorId, score]) => {
        const creatorNickname = creatorIndex.get(creatorId);

        if (!creatorNickname) {
          return null;
        }

        return {
          creatorId,
          creatorNickname,
          score,
        };
      })
      .filter((item): item is UserCreatorPreferenceDto => item !== null);
  }

  private toCategoryPreferenceDto(categoryId: number, score: number): UserCategoryPreferenceDto {
    const meta = CATEGORY_META.get(categoryId);

    return {
      categoryId,
      categoryCode: meta?.code ?? `category-${categoryId}`,
      categoryLabel: meta?.label ?? `分区 ${categoryId}`,
      score,
    };
  }

  private sortScoreMap(scoreMap: Map<number, number>) {
    return [...scoreMap.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0]);
  }

  private addScore(scoreMap: Map<number, number>, key: number, score: number) {
    scoreMap.set(key, (scoreMap.get(key) ?? 0) + score);
  }

  private calculateWatchCategoryScore(item: {
    playCount: number;
    totalWatchDurationSeconds: number;
    maxWatchRatio: number;
    completedCount: number;
  }) {
    const durationBonus = Math.min(
      item.totalWatchDurationSeconds / USER_PROFILE_WATCH_WEIGHTS.category.durationSecondsDivisor,
      USER_PROFILE_WATCH_WEIGHTS.category.durationMaxBonus,
    );
    const playBonus =
      Math.min(item.playCount, USER_PROFILE_WATCH_WEIGHTS.category.maxPlayContribution) *
      USER_PROFILE_WATCH_WEIGHTS.category.play;
    const completionBonus =
      Math.min(item.completedCount, USER_PROFILE_WATCH_WEIGHTS.category.maxCompletedContribution) *
      USER_PROFILE_WATCH_WEIGHTS.category.completed;

    return (
      playBonus +
      this.resolveWatchRatioBonus(
        item.maxWatchRatio,
        USER_PROFILE_WATCH_WEIGHTS.category.warmRatio,
        USER_PROFILE_WATCH_WEIGHTS.category.deepRatio,
        USER_PROFILE_WATCH_WEIGHTS.category.completeRatio,
      ) +
      durationBonus +
      completionBonus
    );
  }

  private calculateWatchCreatorScore(item: {
    playCount: number;
    totalWatchDurationSeconds: number;
    maxWatchRatio: number;
    completedCount: number;
  }) {
    const durationBonus = Math.min(
      item.totalWatchDurationSeconds / USER_PROFILE_WATCH_WEIGHTS.creator.durationSecondsDivisor,
      USER_PROFILE_WATCH_WEIGHTS.creator.durationMaxBonus,
    );
    const playBonus =
      Math.min(item.playCount, USER_PROFILE_WATCH_WEIGHTS.creator.maxPlayContribution) *
      USER_PROFILE_WATCH_WEIGHTS.creator.play;
    const completionBonus =
      Math.min(item.completedCount, USER_PROFILE_WATCH_WEIGHTS.creator.maxCompletedContribution) *
      USER_PROFILE_WATCH_WEIGHTS.creator.completed;

    return (
      playBonus +
      this.resolveWatchRatioBonus(
        item.maxWatchRatio,
        USER_PROFILE_WATCH_WEIGHTS.creator.warmRatio,
        USER_PROFILE_WATCH_WEIGHTS.creator.deepRatio,
        USER_PROFILE_WATCH_WEIGHTS.creator.completeRatio,
      ) +
      durationBonus +
      completionBonus
    );
  }

  private calculateWatchActivityScore(item: { playCount: number; maxWatchRatio: number; completedCount: number }) {
    let score =
      Math.min(item.playCount, USER_PROFILE_WATCH_WEIGHTS.activity.maxPlayContribution) *
      USER_PROFILE_WATCH_WEIGHTS.activity.play;

    if (item.maxWatchRatio >= USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
      score += USER_PROFILE_WATCH_WEIGHTS.activity.deepWatch;
    } else if (item.maxWatchRatio >= USER_PROFILE_WATCH_THRESHOLDS.warmRatio) {
      score += USER_PROFILE_WATCH_WEIGHTS.activity.warmWatch;
    }

    score += item.completedCount * USER_PROFILE_WATCH_WEIGHTS.activity.complete;
    return score;
  }

  private calculateWatchViewerScore(item: { playCount: number; maxWatchRatio: number; completedCount: number }) {
    let score =
      Math.min(item.playCount, USER_PROFILE_WATCH_WEIGHTS.tendency.maxPlayContribution) *
      USER_PROFILE_WATCH_WEIGHTS.tendency.play;

    if (item.maxWatchRatio >= USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
      score += USER_PROFILE_WATCH_WEIGHTS.tendency.deepWatch;
    }

    score += item.completedCount * USER_PROFILE_WATCH_WEIGHTS.tendency.complete;
    return score;
  }

  private resolveWatchRatioBonus(ratio: number, warmScore: number, deepScore: number, completeScore: number) {
    if (ratio >= USER_PROFILE_WATCH_THRESHOLDS.completeRatio) {
      return completeScore;
    }

    if (ratio >= USER_PROFILE_WATCH_THRESHOLDS.deepRatio) {
      return deepScore;
    }

    if (ratio >= USER_PROFILE_WATCH_THRESHOLDS.warmRatio) {
      return warmScore;
    }

    return 0;
  }

  private resolveActivityLevel(activityScore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (activityScore >= USER_PROFILE_ACTIVITY_THRESHOLDS.high) {
      return 'HIGH';
    }

    if (activityScore >= USER_PROFILE_ACTIVITY_THRESHOLDS.medium) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveCreatorViewerTendency(
    viewerScore: number,
    creatorScore: number,
    isColdStart: boolean,
  ): 'COLD_START' | 'VIEWER' | 'CREATOR' | 'BALANCED' {
    if (isColdStart) {
      return 'COLD_START';
    }

    if (creatorScore >= Math.max(5, viewerScore * 1.5)) {
      return 'CREATOR';
    }

    if (viewerScore >= Math.max(5, creatorScore * 1.5)) {
      return 'VIEWER';
    }

    return 'BALANCED';
  }

  private async ensureUserExists(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }
}
