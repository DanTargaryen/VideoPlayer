# content-media

MS-02 foundation service for the content and media bounded context.

Implemented in this first foundation slice:

- `GET /health/live`, `GET /health/ready`, `GET /version`.
- Read-only public contracts for recommendation, search, video detail and related recommendations.
- Internal JWT-protected contracts for review decisions, text status updates, replay registration and video batch summaries.
- Authenticated and request-idempotent `POST /api/v1/videos/:videoId/submit-review` ownership/state transition, followed by a service-JWT call to governance-ai's review queue. Uncertain upstream failures retain the pending request for same-request retry; only definitive rejections restore the prior `DRAFT`/`REJECTED` state.
- Identity dependency is accessed only through the shared `IdentityBatchSummaryContract`; this service stores normalized string `creatorId`/`userId` external IDs and does not query identity tables. The first slice uses a mock client whose boundary shape matches the merged MS-01 numeric-ID HTTP contract.
- Media boundary helpers keep extension and MIME validation before object/database creation, then use `ffprobe` to require a real video stream before persistence. On database failure after upload, the helper calls the injected object store deletion hook for the current object only. The runtime image installs `ffmpeg`/`ffprobe`; tests inject the probe contract so unit tests remain hermetic.

Deliberately not switched in this PR:

- Gateway write traffic other than video review submission.
- Upload and interaction write paths.
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

`/health/ready` requires a reachable content database. `verify:container` starts an isolated MySQL 8 container, runs content migration and fixture, then starts the service image and checks `live`, `ready`, `version` and a real MP4 probe inside the image. `verify:minio` starts isolated MySQL and MinIO containers and verifies disguised MP4 rejection, a valid MP4 persisted to both systems, and current-object-only cleanup after a real database uniqueness failure.

The review-submission route additionally requires `GOVERNANCE_SERVICE_URL` and the shared `SERVICE_JWT_SECRET`; the Gateway supplies a signed `content.user.forward` principal after validating the user's bearer token. `reviewSubmissionRequestId` and `submittedAt` persist the client operation identity so a lost response can be retried without creating a second review or returning a state-conflict error.
