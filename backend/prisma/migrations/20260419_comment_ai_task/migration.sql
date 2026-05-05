-- Comment AI mention task queue
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
