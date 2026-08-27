CREATE TABLE IF NOT EXISTS `Video` (
  `id` VARCHAR(191) NOT NULL,
  `creatorId` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'HIDDEN') NOT NULL DEFAULT 'DRAFT',
  `coverUrl` VARCHAR(191) NULL,
  `playUrl` VARCHAR(191) NULL,
  `durationSeconds` INTEGER NOT NULL DEFAULT 0,
  `publishedAt` DATETIME(3) NULL,
  `reviewDecisionId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Video_reviewDecisionId_key` (`reviewDecisionId`),
  KEY `Video_creatorId_idx` (`creatorId`),
  KEY `Video_status_publishedAt_idx` (`status`, `publishedAt`),
  KEY `Video_categoryId_idx` (`categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoCategory` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoCategory_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoAsset` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `kind` ENUM('ORIGINAL', 'TRANSCODED', 'COVER', 'REPLAY') NOT NULL,
  `bucket` VARCHAR(191) NOT NULL,
  `objectKey` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `url` VARCHAR(191) NOT NULL,
  `sizeBytes` BIGINT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoAsset_objectKey_key` (`objectKey`),
  KEY `VideoAsset_videoId_idx` (`videoId`),
  CONSTRAINT `VideoAsset_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `UserVideoWatch` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `progressSeconds` INTEGER NOT NULL DEFAULT 0,
  `completed` BOOLEAN NOT NULL DEFAULT false,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserVideoWatch_userId_videoId_key` (`userId`, `videoId`),
  KEY `UserVideoWatch_videoId_idx` (`videoId`),
  CONSTRAINT `UserVideoWatch_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Comment` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Comment_videoId_status_idx` (`videoId`, `status`),
  KEY `Comment_userId_idx` (`userId`),
  CONSTRAINT `Comment_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoLike` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoLike_videoId_userId_key` (`videoId`, `userId`),
  UNIQUE KEY `VideoLike_requestId_key` (`requestId`),
  KEY `VideoLike_userId_idx` (`userId`),
  CONSTRAINT `VideoLike_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `FavoriteFolder` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FavoriteFolder_userId_name_key` (`userId`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Favorite` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `folderId` VARCHAR(191) NULL,
  `requestId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Favorite_videoId_userId_key` (`videoId`, `userId`),
  UNIQUE KEY `Favorite_requestId_key` (`requestId`),
  KEY `Favorite_userId_idx` (`userId`),
  KEY `Favorite_folderId_idx` (`folderId`),
  CONSTRAINT `Favorite_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Favorite_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `FavoriteFolder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoDanmaku` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `body` VARCHAR(191) NOT NULL,
  `offsetSeconds` INTEGER NOT NULL,
  `status` ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoDanmaku_videoId_status_idx` (`videoId`, `status`),
  KEY `VideoDanmaku_userId_idx` (`userId`),
  CONSTRAINT `VideoDanmaku_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `CreatorPlayDaily` (
  `id` VARCHAR(191) NOT NULL,
  `creatorId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `plays` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `CreatorPlayDaily_creatorId_date_key` (`creatorId`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoAiSummary` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `summary` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'READY',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoAiSummary_videoId_idx` (`videoId`),
  CONSTRAINT `VideoAiSummary_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoAiChatSession` (
  `id` VARCHAR(191) NOT NULL,
  `videoId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoAiChatSession_videoId_idx` (`videoId`),
  KEY `VideoAiChatSession_userId_idx` (`userId`),
  CONSTRAINT `VideoAiChatSession_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `VideoAiChatMessage` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `content` TEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoAiChatMessage_sessionId_idx` (`sessionId`),
  CONSTRAINT `VideoAiChatMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `VideoAiChatSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ReplayRegistration` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(191) NOT NULL,
  `objectKey` VARCHAR(191) NOT NULL,
  `contentVideoId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ReplayRegistration_requestId_key` (`requestId`),
  UNIQUE KEY `ReplayRegistration_objectKey_key` (`objectKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
