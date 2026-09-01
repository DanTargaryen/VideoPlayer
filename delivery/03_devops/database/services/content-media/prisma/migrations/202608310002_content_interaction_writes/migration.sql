ALTER TABLE `Comment`
  MODIFY COLUMN `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE';

ALTER TABLE `VideoDanmaku`
  MODIFY COLUMN `status` ENUM('VISIBLE', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'VISIBLE';

CREATE TABLE `ContentWriteReceipt` (
  `requestId` VARCHAR(128) NOT NULL,
  `operation` VARCHAR(64) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `resourceId` VARCHAR(191) NOT NULL,
  `payload` JSON NOT NULL,
  `result` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`requestId`),
  INDEX `ContentWriteReceipt_operation_createdAt_idx` (`operation`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationOutbox` (
  `id` VARCHAR(191) NOT NULL,
  `requestId` VARCHAR(128) NOT NULL,
  `recipientId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `type` VARCHAR(32) NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `content` TEXT NOT NULL,
  `relatedType` VARCHAR(32) NULL,
  `relatedId` VARCHAR(191) NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `nextRetryAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deliveredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `NotificationOutbox_requestId_key` (`requestId`),
  INDEX `NotificationOutbox_status_nextRetryAt_idx` (`status`, `nextRetryAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
