ALTER TABLE `ModerationDecision`
  ADD COLUMN `reportId` INTEGER NULL,
  ADD COLUMN `notificationRecipientId` INTEGER NULL;

CREATE INDEX `ModerationDecision_reportId_idx` ON `ModerationDecision`(`reportId`);
