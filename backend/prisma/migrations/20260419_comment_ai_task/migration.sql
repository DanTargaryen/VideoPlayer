-- Comment AI mention task queue
ALTER TABLE `User`
  ADD COLUMN `coinBalance` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `Video`
  ADD COLUMN `coinCount` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `CommentAiTask` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `commentId` INT NOT NULL,
  `videoId` INT NOT NULL,
  `requesterId` INT NOT NULL,
  `prompt` VARCHAR(1000) NOT NULL,
  `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `replyCommentId` INT NULL,
  `errorMessage` VARCHAR(1024) NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CommentAiTask_commentId_key`(`commentId`),
  UNIQUE INDEX `CommentAiTask_replyCommentId_key`(`replyCommentId`),
  INDEX `CommentAiTask_status_updatedAt_idx`(`status`, `updatedAt`),
  INDEX `CommentAiTask_requesterId_createdAt_idx`(`requesterId`, `createdAt`),
  INDEX `CommentAiTask_videoId_createdAt_idx`(`videoId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CommentAiTask`
  ADD CONSTRAINT `CommentAiTask_commentId_fkey`
    FOREIGN KEY (`commentId`) REFERENCES `Comment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentAiTask`
  ADD CONSTRAINT `CommentAiTask_videoId_fkey`
    FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentAiTask`
  ADD CONSTRAINT `CommentAiTask_requesterId_fkey`
    FOREIGN KEY (`requesterId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CommentAiTask`
  ADD CONSTRAINT `CommentAiTask_replyCommentId_fkey`
    FOREIGN KEY (`replyCommentId`) REFERENCES `Comment`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `CoinTransaction` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `type` ENUM('DAILY_CLAIM', 'VIDEO_COIN') NOT NULL,
  `amount` INT NOT NULL,
  `balanceAfter` INT NOT NULL,
  `videoId` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CoinTransaction_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `CoinTransaction_videoId_createdAt_idx`(`videoId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CoinTransaction`
  ADD CONSTRAINT `CoinTransaction_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CoinTransaction`
  ADD CONSTRAINT `CoinTransaction_videoId_fkey`
    FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `DailyCoinClaim` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `claimDate` DATE NOT NULL,
  `amount` INT NOT NULL DEFAULT 2,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `DailyCoinClaim_claimDate_idx`(`claimDate`),
  UNIQUE INDEX `DailyCoinClaim_userId_claimDate_key`(`userId`, `claimDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DailyCoinClaim`
  ADD CONSTRAINT `DailyCoinClaim_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `VideoCoinContribution` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `videoId` INT NOT NULL,
  `userId` INT NOT NULL,
  `amount` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `VideoCoinContribution_userId_createdAt_idx`(`userId`, `createdAt`),
  UNIQUE INDEX `VideoCoinContribution_videoId_userId_key`(`videoId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `VideoCoinContribution`
  ADD CONSTRAINT `VideoCoinContribution_videoId_fkey`
    FOREIGN KEY (`videoId`) REFERENCES `Video`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `VideoCoinContribution`
  ADD CONSTRAINT `VideoCoinContribution_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
