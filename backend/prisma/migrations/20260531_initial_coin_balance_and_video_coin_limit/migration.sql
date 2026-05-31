ALTER TABLE `User`
  MODIFY COLUMN `coinBalance` INTEGER NOT NULL DEFAULT 10;

UPDATE `User` AS u
SET u.`coinBalance` = 10
WHERE u.`coinBalance` = 0
  AND NOT EXISTS (
    SELECT 1
    FROM `CoinTransaction` AS `ct`
    WHERE `ct`.`userId` = `u`.`id`
  );
