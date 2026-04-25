import { NotFoundException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface VideoSourceInfo {
  videoId: number;
  title: string;
  sourceType: 'object' | 'url';
  objectKey?: string;
  sourceUrl?: string;
}

@Injectable()
export class AiVideoService {
  constructor(private readonly prisma: PrismaService) {}

  async getVideoSource(videoId: number): Promise<VideoSourceInfo> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        playUrl: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const assets = await this.prisma.videoAsset.findMany({
      where: {
        videoId,
        assetType: {
          in: ['TRANSCODED', 'ORIGINAL'],
        },
      },
      select: {
        assetType: true,
        objectKey: true,
        url: true,
      },
    });

    const preferredAsset =
      assets.find((item) => item.assetType === 'TRANSCODED') ??
      assets.find((item) => item.assetType === 'ORIGINAL');

    // For cloud DB scenarios, asset.url is often the true reachable source.
    // Prefer explicit URL to avoid relying on local MinIO endpoint alignment.
    if (preferredAsset?.url) {
      return {
        videoId: video.id,
        title: video.title,
        sourceType: 'url',
        sourceUrl: preferredAsset.url,
      };
    }

    if (preferredAsset) {
      return {
        videoId: video.id,
        title: video.title,
        sourceType: 'object',
        objectKey: preferredAsset.objectKey,
      };
    }

    if (video.playUrl) {
      return {
        videoId: video.id,
        title: video.title,
        sourceType: 'url',
        sourceUrl: video.playUrl,
      };
    }

    throw new NotFoundException('Video file not found');
  }
}
