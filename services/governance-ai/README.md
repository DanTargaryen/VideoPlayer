# governance-ai

MS-04 governance service. It owns review, report, AI-task and moderation-decision facts without importing another service's Prisma Client or writing another service's tables.

## Environment

- `GOVERNANCE_DATABASE_URL`: required MySQL connection for the dedicated governance schema/account.
- `SERVICE_JWT_SECRET`: required service JWT secret, at least 32 characters.
- `CONTENT_MEDIA_BASE_URL`: enables moderation application and background compensation through content internal APIs.
- `IDENTITY_COMMUNITY_BASE_URL`: enables idempotent report-result notifications through identity internal APIs.
- `GOVERNANCE_COMPENSATION_INTERVAL_MS`: optional retry poll interval, default 30 seconds.
- `PORT`: optional HTTP port, default `3104`.

Run `npm run prisma:generate`, `npm run db:migrate` and `npm run db:seed` in this workspace. `db:migrate` uses `prisma migrate deploy` and is safe to repeat; the target database and account remain deployment responsibilities.

## Implemented capabilities

- Independent `VideoReview`, `CommentAiTask`, `ReportRecord` and `ModerationDecision` schema, migration and fixture.
- Concurrent pending-report idempotency through nullable unique `pendingKey`; handling releases the key and writes an `APPLY_PENDING` moderation decision.
- Auditable background compensation with bounded exponential retry; 5xx/timeouts remain retryable, permanent 4xx failures stop, and successful content application becomes `APPLIED`.
- Database-aware `/health/ready`, plus `/health/live` and `/version`.
- `POST /internal/v1/reviews`, idempotent by `x-request-id`.
- `GET /internal/v1/reviews/:targetType/:targetId/latest`.
- Internal routes accept only `content-media` service JWTs with the matching audience, requestId and `governance.reviews.write` or `governance.reviews.read` scope.
- Public report creation plus administrator report listing and handling routes.
- Administrator video/text review queues, review decisions and governance dashboard.
- Local rules-only `POST /api/v1/agent/review-preview`; it performs no external paid-model call.
- Gateway-forwarded user identity verified by a short-lived `governance.user.forward` service JWT.
- Moderation application through content internal APIs and idempotent `REPORT` notifications through identity.

Cross-service contract tests cover identity summaries/notification idempotency and content review/text/replay behavior. `test/regression/` provides the REG-01 dual-target report and an opt-in executable UC06 flow. Gateway route mode remains reversible, and external AI calls are intentionally excluded.
