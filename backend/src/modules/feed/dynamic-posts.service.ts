import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../storage/minio.service';

type DynamicPostAuthor = {
  id: string;
  username: string;
  avatar: string | null;
};

export type DynamicPostItem = {
  id: string;
  author: DynamicPostAuthor;
  content: string;
  images: string[];
  createdAt: string;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
};

type DynamicPostRow = {
  id: number;
  authorId: number;
  content: string;
  imageUrls: unknown;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  createdAt: Date;
  authorUserId: number;
  authorNickname: string;
  authorAvatarUrl: string | null;
};

@Injectable()
export class DynamicPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async listPosts(currentUserId?: number, take = 20, skip = 0) {
    const posts = await this.prisma.$queryRaw<DynamicPostRow[]>`
      SELECT
        p.id,
        p.authorId,
        p.content,
        p.imageUrls,
        p.likeCount,
        p.commentCount,
        p.favoriteCount,
        p.createdAt,
        u.id AS authorUserId,
        u.nickname AS authorNickname,
        u.avatarUrl AS authorAvatarUrl
      FROM DynamicPost p
      INNER JOIN User u ON u.id = p.authorId
      WHERE p.status = 'NORMAL'
      ORDER BY p.createdAt DESC, p.id DESC
      LIMIT ${take} OFFSET ${skip}
    `;

    return {
      list: posts.map((post) => this.toItem(post)),
      hasMore: posts.length === take,
      currentUserId: currentUserId ?? null,
    };
  }

  async createPost(input: { authorId: number; content: string; images: string[] }) {
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO DynamicPost (authorId, content, imageUrls, status, likeCount, commentCount, favoriteCount, createdAt, updatedAt)
        VALUES (${input.authorId}, ${input.content}, ${JSON.stringify(input.images)}, 'NORMAL', 0, 0, 0, NOW(3), NOW(3))
      `;

      const idRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT LAST_INSERT_ID() AS id
      `;
      const createdId = idRows[0]?.id;
      if (!createdId) {
        throw new Error('Failed to create dynamic post');
      }

      const rows = await tx.$queryRaw<DynamicPostRow[]>`
        SELECT
          p.id,
          p.authorId,
          p.content,
          p.imageUrls,
          p.likeCount,
          p.commentCount,
          p.favoriteCount,
          p.createdAt,
          u.id AS authorUserId,
          u.nickname AS authorNickname,
          u.avatarUrl AS authorAvatarUrl
        FROM DynamicPost p
        INNER JOIN User u ON u.id = p.authorId
        WHERE p.id = ${createdId}
        LIMIT 1
      `;
      return rows[0];
    });

    if (!created) {
      throw new Error('Failed to load created dynamic post');
    }

    return this.toItem(created);
  }

  async uploadPostImage(file: Express.Multer.File) {
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const objectKey = `dynamic-posts/${datePrefix}/${Date.now()}-${file.originalname}`;
    return this.minioService.uploadObject({
      objectKey,
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  private toItem(post: {
    id: number;
    authorId: number;
    content: string;
    imageUrls: unknown;
    likeCount: number;
    commentCount: number;
    favoriteCount: number;
    createdAt: Date;
    authorUserId: number;
    authorNickname: string;
    authorAvatarUrl: string | null;
  }): DynamicPostItem {
    const images = Array.isArray(post.imageUrls) ? post.imageUrls.filter((item): item is string => typeof item === 'string') : [];

    return {
      id: `dynamic-post-${post.id}`,
      author: {
        id: String(post.authorUserId),
        username: post.authorNickname,
        avatar: post.authorAvatarUrl ?? null,
      },
      content: post.content,
      images,
      createdAt: post.createdAt.toISOString(),
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      favoriteCount: post.favoriteCount,
    };
  }
}
