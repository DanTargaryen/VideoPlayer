-- CreateTable
CREATE TABLE `LiveRoom` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `broadcasterId` INTEGER NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `category` VARCHAR(64) NOT NULL DEFAULT 'live',
    `coverUrl` VARCHAR(512) NULL,
    `sourceMode` ENUM('camera', 'screen') NOT NULL DEFAULT 'camera',
    `streamKey` VARCHAR(128) NOT NULL,
    `rtmpUrl` VARCHAR(512) NOT NULL,
    `playUrl` VARCHAR(512) NOT NULL,
    `status` ENUM('IDLE', 'LIVING', 'ENDED') NOT NULL DEFAULT 'IDLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `LiveRoom_streamKey_key`(`streamKey`),
    INDEX `LiveRoom_broadcasterId_status_createdAt_idx`(`broadcasterId`, `status`, `createdAt`),
    INDEX `LiveRoom_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `status` ENUM('LIVING', 'ENDED') NOT NULL DEFAULT 'LIVING',
    `sourceMode` ENUM('camera', 'screen') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `replayStatus` ENUM('NONE', 'PENDING', 'REGISTERING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_FINAL') NOT NULL DEFAULT 'NONE',
    INDEX `LiveSession_roomId_startedAt_idx`(`roomId`, `startedAt`),
    INDEX `LiveSession_status_startedAt_idx`(`status`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `senderId` INTEGER NULL,
    `kind` ENUM('CHAT', 'SYSTEM') NOT NULL,
    `content` VARCHAR(200) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `LiveMessage_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `LiveViewerEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `viewerId` VARCHAR(128) NOT NULL,
    `eventType` ENUM('JOIN', 'LEAVE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `LiveViewerEvent_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    INDEX `LiveViewerEvent_viewerId_createdAt_idx`(`viewerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReplayRegistration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `objectKey` VARCHAR(512) NOT NULL,
    `contentVideoId` INTEGER NULL,
    `status` ENUM('NONE', 'PENDING', 'REGISTERING', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_FINAL') NOT NULL DEFAULT 'PENDING',
    `requestId` VARCHAR(128) NOT NULL,
    `mimeType` VARCHAR(128) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(1000) NULL,
    `nextRetryAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ReplayRegistration_sessionId_key`(`sessionId`),
    UNIQUE INDEX `ReplayRegistration_objectKey_key`(`objectKey`),
    INDEX `ReplayRegistration_status_nextRetryAt_idx`(`status`, `nextRetryAt`),
    UNIQUE INDEX `ReplayRegistration_requestId_objectKey_key`(`requestId`, `objectKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CoinAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `CoinAccount_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CoinTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` ENUM('DAILY_CLAIM', 'VIDEO_COIN', 'STREAK_REWARD', 'LIVE_GIFT') NOT NULL,
    `amount` INTEGER NOT NULL,
    `balanceAfter` INTEGER NOT NULL,
    `videoId` INTEGER NULL,
    `requestId` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `CoinTransaction_requestId_key`(`requestId`),
    INDEX `CoinTransaction_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `CoinTransaction_videoId_createdAt_idx`(`videoId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DailyCoinClaim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `claimDate` DATE NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 2,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `DailyCoinClaim_claimDate_idx`(`claimDate`),
    UNIQUE INDEX `DailyCoinClaim_userId_claimDate_key`(`userId`, `claimDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StreakMilestoneClaim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `milestone` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `StreakMilestoneClaim_userId_idx`(`userId`),
    UNIQUE INDEX `StreakMilestoneClaim_userId_milestone_key`(`userId`, `milestone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `VideoCoinContribution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `videoId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `VideoCoinContribution_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `VideoCoinContribution_videoId_userId_key`(`videoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LiveSession` ADD CONSTRAINT `LiveSession_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `LiveRoom`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `LiveMessage` ADD CONSTRAINT `LiveMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `LiveViewerEvent` ADD CONSTRAINT `LiveViewerEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReplayRegistration` ADD CONSTRAINT `ReplayRegistration_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `LiveSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
