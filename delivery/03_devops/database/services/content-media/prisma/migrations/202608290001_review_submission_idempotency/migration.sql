ALTER TABLE `Video`
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewSubmissionRequestId` VARCHAR(128) NULL;

CREATE UNIQUE INDEX `Video_reviewSubmissionRequestId_key`
  ON `Video`(`reviewSubmissionRequestId`);
