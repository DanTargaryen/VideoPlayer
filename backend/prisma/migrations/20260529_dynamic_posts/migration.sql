-- CreateTable
CREATE TABLE `DynamicPost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `authorId` INTEGER NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `imageUrls` JSON NULL,
    `status` ENUM('NORMAL', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'NORMAL',
    `likeCount` INTEGER NOT NULL DEFAULT 0,
    `commentCount` INTEGER NOT NULL DEFAULT 0,
    `favoriteCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DynamicPost_authorId_createdAt_idx`(`authorId`, `createdAt`),
    INDEX `DynamicPost_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DynamicPost` ADD CONSTRAINT `DynamicPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
