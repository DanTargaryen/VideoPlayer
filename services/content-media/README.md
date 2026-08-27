# content-media

MS-02 foundation service for the content and media bounded context.

Implemented in this first foundation slice:

- `GET /health/live`, `GET /health/ready`, `GET /version`.
- Read-only public contracts for recommendation, search, video detail and related recommendations.
- Internal JWT-protected contracts for review decisions, text status updates, replay registration and video batch summaries.
- Identity dependency is accessed only through the batch-summary client contract; this service stores `creatorId` and `userId` as external IDs and does not query identity tables.
- Media boundary helpers keep extension and MIME validation before object/database creation, then use `ffprobe` to require a real video stream before persistence. The runtime image installs `ffmpeg`/`ffprobe`; tests inject the probe contract so unit tests remain hermetic.

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
docker build -f services/content-media/Dockerfile -t video-player/content-media:local .
docker run --rm -d --name content-media-smoke -p 3102:3000 -e GIT_SHA=smoke video-player/content-media:local
curl http://127.0.0.1:3102/health/live
curl http://127.0.0.1:3102/health/ready
curl http://127.0.0.1:3102/version
docker exec content-media-smoke ffprobe -version
docker rm -f content-media-smoke
npm --workspace @videoplayer/content-media run verify:container
```
