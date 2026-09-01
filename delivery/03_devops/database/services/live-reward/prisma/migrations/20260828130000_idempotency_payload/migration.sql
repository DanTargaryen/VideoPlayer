ALTER TABLE `ReplayRegistration`
  DROP INDEX `ReplayRegistration_requestId_objectKey_key`,
  ADD UNIQUE KEY `ReplayRegistration_requestId_key` (`requestId`);

ALTER TABLE `CoinTransaction`
  ADD COLUMN `requestPayload` VARCHAR(512) NOT NULL DEFAULT '' AFTER `requestId`;
