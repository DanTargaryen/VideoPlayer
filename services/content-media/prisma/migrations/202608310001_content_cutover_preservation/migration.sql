ALTER TABLE `Video`
  MODIFY COLUMN `coverUrl` VARCHAR(255) NULL,
  MODIFY COLUMN `playUrl` VARCHAR(255) NULL,
  ADD COLUMN `playCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `likeCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `favoriteCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `commentCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `coinCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `legacyUploadToken` VARCHAR(255) NULL,
  ADD COLUMN `legacyCategory` VARCHAR(32) NULL,
  ADD COLUMN `tags` JSON NULL,
  ADD UNIQUE INDEX `Video_legacyUploadToken_key` (`legacyUploadToken`);

ALTER TABLE `VideoAsset`
  DROP FOREIGN KEY `VideoAsset_videoId_fkey`;

ALTER TABLE `VideoAsset`
  MODIFY COLUMN `videoId` VARCHAR(191) NULL,
  MODIFY COLUMN `bucket` VARCHAR(64) NOT NULL,
  MODIFY COLUMN `objectKey` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `mimeType` VARCHAR(128) NOT NULL,
  ADD COLUMN `originalName` VARCHAR(255) NULL,
  MODIFY COLUMN `url` VARCHAR(255) NOT NULL,
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ADD CONSTRAINT `VideoAsset_videoId_fkey`
    FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `UserVideoWatch`
  ADD COLUMN `playCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `totalWatchDurationSeconds` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastWatchDurationSeconds` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `videoDurationSeconds` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `maxWatchRatio` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `lastWatchRatio` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `completedCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `lastWatchedAt` DATETIME(3) NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `Comment`
  ADD COLUMN `parentId` VARCHAR(191) NULL,
  ADD COLUMN `rootId` VARCHAR(191) NULL,
  ADD COLUMN `imageUrl` VARCHAR(255) NULL,
  ADD COLUMN `replyCount` INTEGER NOT NULL DEFAULT 0,
  ADD INDEX `Comment_videoId_parentId_createdAt_idx` (`videoId`, `parentId`, `createdAt`);

ALTER TABLE `FavoriteFolder`
  ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false,
  ADD INDEX `FavoriteFolder_userId_isDefault_idx` (`userId`, `isDefault`);

ALTER TABLE `VideoDanmaku`
  MODIFY COLUMN `body` VARCHAR(255) NOT NULL,
  ADD COLUMN `timeOffsetMs` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `color` VARCHAR(16) NOT NULL DEFAULT '#FFFFFF',
  ADD INDEX `VideoDanmaku_videoId_timeOffsetMs_createdAt_idx` (`videoId`, `timeOffsetMs`, `createdAt`);

ALTER TABLE `VideoAiSummary`
  ADD COLUMN `frameCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `model` VARCHAR(64) NULL,
  DROP INDEX `VideoAiSummary_videoId_idx`,
  ADD UNIQUE INDEX `VideoAiSummary_videoId_key` (`videoId`);

ALTER TABLE `VideoAiChatSession`
  ADD UNIQUE INDEX `VideoAiChatSession_userId_videoId_key` (`userId`, `videoId`);

ALTER TABLE `VideoAiChatMessage`
  ADD COLUMN `model` VARCHAR(64) NULL,
  ADD COLUMN `frameCount` INTEGER NULL;
