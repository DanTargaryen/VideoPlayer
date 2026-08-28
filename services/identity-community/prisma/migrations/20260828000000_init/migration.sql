CREATE TABLE `User` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(128) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('USER', 'ADMIN') NOT NULL,
  `nickname` VARCHAR(64) NOT NULL,
  `avatarUrl` VARCHAR(255) NULL,
  `bio` VARCHAR(255) NULL,
  `coinBalance` INT NOT NULL DEFAULT 10,
  `messagePrivacy` ENUM('ALLOW_ALL', 'FOLLOWING_ONLY', 'DISABLED') NOT NULL DEFAULT 'ALLOW_ALL',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `DirectMessage` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `senderId` INT NOT NULL,
  `recipientId` INT NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DirectMessage_senderId_createdAt_idx` (`senderId`, `createdAt`),
  KEY `DirectMessage_recipientId_isRead_createdAt_idx` (`recipientId`, `isRead`, `createdAt`),
  KEY `DirectMessage_senderId_recipientId_createdAt_idx` (`senderId`, `recipientId`, `createdAt`),
  CONSTRAINT `DirectMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DirectMessage_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserProfileSummary` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `activityScore` INT NOT NULL DEFAULT 0,
  `activityLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
  `behaviorSignalCount` INT NOT NULL DEFAULT 0,
  `viewerScore` INT NOT NULL DEFAULT 0,
  `creatorScore` INT NOT NULL DEFAULT 0,
  `creatorViewerTendency` ENUM('COLD_START', 'VIEWER', 'CREATOR', 'BALANCED') NOT NULL DEFAULT 'COLD_START',
  `isColdStart` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserProfileSummary_userId_key` (`userId`),
  CONSTRAINT `UserProfileSummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserCategoryPreference` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `categoryId` INT NOT NULL,
  `score` DOUBLE NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserCategoryPreference_userId_categoryId_key` (`userId`, `categoryId`),
  KEY `UserCategoryPreference_userId_score_idx` (`userId`, `score`),
  CONSTRAINT `UserCategoryPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserCreatorPreference` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `creatorId` INT NOT NULL,
  `score` DOUBLE NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserCreatorPreference_userId_creatorId_key` (`userId`, `creatorId`),
  KEY `UserCreatorPreference_userId_score_idx` (`userId`, `score`),
  CONSTRAINT `UserCreatorPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `UserCreatorPreference_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `DynamicPost` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `authorId` INT NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `imageUrls` JSON NULL,
  `status` ENUM('NORMAL', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'NORMAL',
  `likeCount` INT NOT NULL DEFAULT 0,
  `commentCount` INT NOT NULL DEFAULT 0,
  `favoriteCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DynamicPost_authorId_createdAt_idx` (`authorId`, `createdAt`),
  KEY `DynamicPost_status_createdAt_idx` (`status`, `createdAt`),
  CONSTRAINT `DynamicPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `DynamicPostLike` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `postId` INT NOT NULL,
  `userId` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `DynamicPostLike_postId_userId_key` (`postId`, `userId`),
  KEY `DynamicPostLike_userId_createdAt_idx` (`userId`, `createdAt`),
  CONSTRAINT `DynamicPostLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DynamicPostLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `DynamicPostComment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `postId` INT NOT NULL,
  `userId` INT NOT NULL,
  `content` VARCHAR(1000) NOT NULL,
  `status` ENUM('NORMAL', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'NORMAL',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `DynamicPostComment_postId_createdAt_idx` (`postId`, `createdAt`),
  KEY `DynamicPostComment_userId_createdAt_idx` (`userId`, `createdAt`),
  CONSTRAINT `DynamicPostComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DynamicPostComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `FollowRelation` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `followerId` INT NOT NULL,
  `followingId` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FollowRelation_followerId_followingId_key` (`followerId`, `followingId`),
  KEY `FollowRelation_followingId_createdAt_idx` (`followingId`, `createdAt`),
  CONSTRAINT `FollowRelation_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FollowRelation_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `recipientId` INT NOT NULL,
  `actorId` INT NULL,
  `type` ENUM('COMMENT', 'REPLY', 'FOLLOW', 'SYSTEM', 'LIKE', 'FAVORITE', 'REPORT') NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `content` VARCHAR(255) NOT NULL,
  `relatedType` VARCHAR(32) NULL,
  `relatedId` INT NULL,
  `requestId` VARCHAR(128) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Notification_requestId_key` (`requestId`),
  KEY `Notification_recipientId_isRead_createdAt_idx` (`recipientId`, `isRead`, `createdAt`),
  CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Notification_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `CreatorFollowerDaily` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `creatorId` INT NOT NULL,
  `statDate` VARCHAR(10) NOT NULL,
  `followerCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `CreatorFollowerDaily_creatorId_statDate_key` (`creatorId`, `statDate`),
  KEY `CreatorFollowerDaily_creatorId_statDate_idx` (`creatorId`, `statDate`),
  CONSTRAINT `CreatorFollowerDaily_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
