ALTER TABLE `VideoReview`
  MODIFY COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING';

ALTER TABLE `ModerationDecision`
  MODIFY COLUMN `applyStatus` ENUM(
    'PENDING',
    'DECIDED',
    'APPLY_PENDING',
    'APPLYING',
    'APPLIED',
    'WITHDRAWN',
    'APPLY_FAILED_RETRYABLE',
    'APPLY_FAILED_FINAL'
  ) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `withdrawRequestId` VARCHAR(128) NULL,
  ADD UNIQUE INDEX `ModerationDecision_withdrawRequestId_key` (`withdrawRequestId`);
