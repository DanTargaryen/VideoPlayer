ALTER TABLE `VideoAsset`
  ADD COLUMN `uploaderId` VARCHAR(191) NULL,
  ADD INDEX `VideoAsset_uploaderId_createdAt_idx` (`uploaderId`, `createdAt`);

CREATE TABLE `ContentIdSequence` (
  `name` VARCHAR(64) NOT NULL,
  `nextId` BIGINT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
