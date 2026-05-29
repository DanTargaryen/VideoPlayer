-- CreateTable
CREATE TABLE `DynamicPostLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DynamicPostLike_postId_userId_key`(`postId`, `userId`),
    INDEX `DynamicPostLike_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DynamicPostComment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `status` ENUM('NORMAL', 'HIDDEN', 'DELETED') NOT NULL DEFAULT 'NORMAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DynamicPostComment_postId_createdAt_idx`(`postId`, `createdAt`),
    INDEX `DynamicPostComment_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DynamicPostLike` ADD CONSTRAINT `DynamicPostLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DynamicPostLike` ADD CONSTRAINT `DynamicPostLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DynamicPostComment` ADD CONSTRAINT `DynamicPostComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DynamicPostComment` ADD CONSTRAINT `DynamicPostComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
