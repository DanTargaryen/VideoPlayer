# content-media

MS-02 foundation service for the content and media bounded context.

Implemented in this first foundation slice:

- `GET /health/live`, `GET /health/ready`, `GET /version`.
- Read-only public contracts for recommendation, search, video detail and related recommendations.
- Internal JWT-protected contracts for review decisions, text status updates, replay registration and video batch summaries.
- Identity dependency is accessed only through the batch-summary client contract; this service stores `creatorId` and `userId` as external IDs and does not query identity tables.
- Media boundary helpers keep extension and MIME validation before object/database creation, then use `ffprobe` to require a real video stream before persistence. On database failure after upload, the helper calls the injected object store deletion hook for the current object only. The runtime image installs `ffmpeg`/`ffprobe`; tests inject the probe contract so unit tests remain hermetic.

Deliberately not switched in this PR:

- Gateway write traffic.
- Upload/submission/interaction write paths.
- `VideoAi*` write paths.
- Monolith tables or fallback paths.

## Independent verification

```bash
npm --workspace @videoplayer/content-media run lint
npm --workspace @videoplayer/content-media run build
npm --workspace @videoplayer/content-media run test
npm --workspace @videoplayer/content-media run verify:container
npm --workspace @videoplayer/content-media run verify:minio
```

`/health/ready` requires a reachable content database. `verify:container` starts an isolated MySQL 8 container, runs content migration and fixture, then starts the service image and checks `live`, `ready`, `version` and a real MP4 probe inside the image. `verify:minio` starts an isolated MinIO container and verifies disguised MP4 rejection, valid MP4 acceptance and current-object-only cleanup when the database write callback fails.
