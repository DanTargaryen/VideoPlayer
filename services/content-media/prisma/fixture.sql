INSERT INTO `VideoCategory` (`id`, `code`, `name`, `sortOrder`)
VALUES
  ('cat-backend', 'backend', 'Backend', 10),
  ('cat-media', 'media', 'Media', 20),
  ('cat-live', 'live', 'Live Replay', 30)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sortOrder` = VALUES(`sortOrder`);

INSERT INTO `Video` (`id`, `creatorId`, `categoryId`, `title`, `description`, `status`, `coverUrl`, `playUrl`, `durationSeconds`, `publishedAt`)
VALUES
  ('1', '1', 'cat-backend', 'Spring Architecture Notes', 'A published content fixture for recommendation, search and detail contracts.', 'PUBLISHED', 'https://cdn.example.test/covers/video-001.jpg', 'https://cdn.example.test/videos/video-001.mp4', 92, '2026-08-27 02:00:00.000'),
  ('2', '2', 'cat-media', 'Media Pipeline Smoke', 'Published video used as related recommendation.', 'PUBLISHED', 'https://cdn.example.test/covers/video-002.jpg', 'https://cdn.example.test/videos/video-002.mp4', 121, '2026-08-27 03:00:00.000'),
  ('3', '1', 'cat-media', 'Draft Upload Is Private', 'Draft fixture must not leak to public read APIs.', 'DRAFT', NULL, NULL, 0, NULL)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `status` = VALUES(`status`);

INSERT INTO `VideoAsset` (`id`, `videoId`, `kind`, `bucket`, `objectKey`, `mimeType`, `url`, `sizeBytes`)
VALUES
  ('asset-001', '1', 'TRANSCODED', 'videoplayer-content', 'videos/video-001.mp4', 'video/mp4', 'https://cdn.example.test/videos/video-001.mp4', 4096)
ON DUPLICATE KEY UPDATE `mimeType` = VALUES(`mimeType`), `url` = VALUES(`url`);
