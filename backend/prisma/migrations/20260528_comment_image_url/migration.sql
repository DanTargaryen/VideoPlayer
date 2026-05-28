-- Comment image support (图文评论)
ALTER TABLE `Comment`
  ADD COLUMN `imageUrl` VARCHAR(255) NULL AFTER `content`;
