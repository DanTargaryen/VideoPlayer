import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
  liked: boolean;
};

export type DynamicPostCommentItem = {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    nickname: string;
    avatarUrl: string | null;
  };
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

type DynamicPostRecord = {
  id: number;
  authorId: number;
  likeCount: number;
  commentCount: number;
};

type DynamicPostCommentRow = {
  id: number;
  postId: number;
  content: string;
  createdAt: Date;
  userId: number;
  userNickname: string;
  userAvatarUrl: string | null;
};

@Injectable()
export class DynamicPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  async listPosts(currentUserId?: number, take = 20, skip = 0, authorIds?: number[]) {
    const posts = authorIds && authorIds.length === 0
      ? []
      : authorIds && authorIds.length > 0
        ? await this.prisma.$queryRaw<DynamicPostRow[]>(
            Prisma.sql`
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
                AND p.authorId IN (${Prisma.join(authorIds)})
              ORDER BY p.createdAt DESC, p.id DESC
              LIMIT ${take} OFFSET ${skip}
            `,
          )
        : await this.prisma.$queryRaw<DynamicPostRow[]>`
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

    const likedPostIds = await this.findLikedPostIds(currentUserId, posts.map((post) => post.id));

    return {
      list: posts.map((post) => this.toItem(post, likedPostIds.has(post.id))),
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

    return this.toItem(created, false);
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

  async likePost(postId: number, user: { id: number; nickname: string }) {
    const post = await this.requirePost(postId);
    const result = await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$executeRaw`
        INSERT IGNORE INTO DynamicPostLike (postId, userId, createdAt)
        VALUES (${postId}, ${user.id}, NOW(3))
      `;

      if (inserted > 0) {
        await tx.$executeRaw`
          UPDATE DynamicPost
          SET likeCount = likeCount + 1, updatedAt = NOW(3)
          WHERE id = ${postId}
        `;
      }

      const rows = await tx.$queryRaw<Array<{ likeCount: number }>>`
        SELECT likeCount
        FROM DynamicPost
        WHERE id = ${postId}
        LIMIT 1
      `;

      return {
        inserted,
        likeCount: Number(rows[0]?.likeCount ?? post.likeCount),
      };
    });

    if (result.inserted > 0 && post.authorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: user.id,
          type: 'LIKE',
          title: '收到新的点赞',
          content: `${user.nickname} 点赞了你的动态`,
          relatedType: 'DYNAMIC_POST',
          relatedId: postId,
        },
      });
    }

    return {
      postId,
      liked: true,
      likeCount: result.likeCount,
    };
  }

  async unlikePost(postId: number, user: { id: number }) {
    await this.requirePost(postId);
    const likeCount = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.$executeRaw`
        DELETE FROM DynamicPostLike
        WHERE postId = ${postId} AND userId = ${user.id}
      `;

      if (deleted > 0) {
        await tx.$executeRaw`
          UPDATE DynamicPost
          SET likeCount = GREATEST(likeCount - 1, 0), updatedAt = NOW(3)
          WHERE id = ${postId}
        `;
      }

      const rows = await tx.$queryRaw<Array<{ likeCount: number }>>`
        SELECT likeCount
        FROM DynamicPost
        WHERE id = ${postId}
        LIMIT 1
      `;

      return Number(rows[0]?.likeCount ?? 0);
    });

    return {
      postId,
      liked: false,
      likeCount,
    };
  }

  async listComments(postId: number) {
    await this.requirePost(postId);
    const comments = await this.prisma.$queryRaw<DynamicPostCommentRow[]>`
      SELECT
        c.id,
        c.postId,
        c.content,
        c.createdAt,
        u.id AS userId,
        u.nickname AS userNickname,
        u.avatarUrl AS userAvatarUrl
      FROM DynamicPostComment c
      INNER JOIN User u ON u.id = c.userId
      WHERE c.postId = ${postId} AND c.status = 'NORMAL'
      ORDER BY c.createdAt ASC, c.id ASC
    `;

    return {
      postId,
      items: comments.map((comment) => this.toCommentItem(comment)),
    };
  }

  async createComment(postId: number, user: { id: number; nickname: string }, content: string) {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new BadRequestException('Comment content is required');
    }

    const post = await this.requirePost(postId);
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO DynamicPostComment (postId, userId, content, status, createdAt, updatedAt)
        VALUES (${postId}, ${user.id}, ${normalizedContent}, 'NORMAL', NOW(3), NOW(3))
      `;

      const idRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT LAST_INSERT_ID() AS id
      `;
      const createdId = idRows[0]?.id;
      if (!createdId) {
        throw new Error('Failed to create dynamic post comment');
      }

      await tx.$executeRaw`
        UPDATE DynamicPost
        SET commentCount = commentCount + 1, updatedAt = NOW(3)
        WHERE id = ${postId}
      `;

      const rows = await tx.$queryRaw<DynamicPostCommentRow[]>`
        SELECT
          c.id,
          c.postId,
          c.content,
          c.createdAt,
          u.id AS userId,
          u.nickname AS userNickname,
          u.avatarUrl AS userAvatarUrl
        FROM DynamicPostComment c
        INNER JOIN User u ON u.id = c.userId
        WHERE c.id = ${createdId}
        LIMIT 1
      `;

      return this.toCommentItem(rows[0]);
    });

    if (post.authorId !== user.id) {
      await this.prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: user.id,
          type: 'COMMENT',
          title: '收到新的评论',
          content: `${user.nickname} 评论了你的动态：${normalizedContent.slice(0, 80)}`,
          relatedType: 'DYNAMIC_POST',
          relatedId: postId,
        },
      });
    }

    return created;
  }

  private async requirePost(postId: number): Promise<DynamicPostRecord> {
    const rows = await this.prisma.$queryRaw<DynamicPostRecord[]>`
      SELECT id, authorId, likeCount, commentCount
      FROM DynamicPost
      WHERE id = ${postId} AND status = 'NORMAL'
      LIMIT 1
    `;

    const post = rows[0];
    if (!post) {
      throw new NotFoundException('Dynamic post not found');
    }

    return {
      id: Number(post.id),
      authorId: Number(post.authorId),
      likeCount: Number(post.likeCount),
      commentCount: Number(post.commentCount),
    };
  }

  private async findLikedPostIds(currentUserId: number | undefined, postIds: number[]) {
    if (!currentUserId || postIds.length === 0) {
      return new Set<number>();
    }

    const rows = await this.prisma.$queryRaw<Array<{ postId: number }>>(
      Prisma.sql`
        SELECT postId
        FROM DynamicPostLike
        WHERE userId = ${currentUserId}
          AND postId IN (${Prisma.join(postIds)})
      `,
    );

    return new Set(rows.map((row) => Number(row.postId)));
  }

  private toCommentItem(comment: DynamicPostCommentRow): DynamicPostCommentItem {
    return {
      id: Number(comment.id),
      postId: Number(comment.postId),
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: Number(comment.userId),
        nickname: comment.userNickname,
        avatarUrl: comment.userAvatarUrl ?? null,
      },
    };
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
  }, liked: boolean): DynamicPostItem {
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
      liked,
    };
  }
}
