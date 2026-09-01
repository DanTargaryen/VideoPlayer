ALTER TABLE `ModerationDecision`
  MODIFY COLUMN `applyStatus` ENUM(
    'PENDING',
    'DECIDED',
    'APPLY_PENDING',
    'APPLYING',
    'APPLIED',
    'APPLY_FAILED_RETRYABLE',
    'APPLY_FAILED_FINAL'
  ) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `leaseToken` VARCHAR(128) NULL,
  ADD COLUMN `leaseExpiresAt` DATETIME(3) NULL;

CREATE INDEX `ModerationDecision_applyStatus_leaseExpiresAt_idx`
  ON `ModerationDecision`(`applyStatus`, `leaseExpiresAt`);
