ALTER TABLE `ReportRecord`
  ADD COLUMN `pendingKey` VARCHAR(128) NULL;

UPDATE `ReportRecord`
SET `pendingKey` = CONCAT(
  `reporterId`,
  ':',
  `targetType`,
  ':',
  COALESCE(`videoId`, `commentId`, `danmakuId`)
)
WHERE `status` = 'PENDING';

UPDATE `ReportRecord` AS duplicate_report
INNER JOIN `ReportRecord` AS keeper_report
  ON duplicate_report.`pendingKey` = keeper_report.`pendingKey`
  AND duplicate_report.`id` > keeper_report.`id`
SET
  duplicate_report.`status` = 'REJECTED',
  duplicate_report.`handleNote` = COALESCE(
    duplicate_report.`handleNote`,
    'Duplicate pending report consolidated during idempotency migration'
  ),
  duplicate_report.`handledAt` = COALESCE(duplicate_report.`handledAt`, CURRENT_TIMESTAMP),
  duplicate_report.`pendingKey` = NULL
WHERE duplicate_report.`status` = 'PENDING'
  AND keeper_report.`status` = 'PENDING';

CREATE UNIQUE INDEX `ReportRecord_pendingKey_key`
  ON `ReportRecord`(`pendingKey`);
