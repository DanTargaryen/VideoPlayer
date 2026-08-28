# live-reward

MS-03 service for live rooms, sessions, viewers, messages, replay registration
and the coin ledger. The service owns its Prisma schema and never creates foreign
keys to identity-community or content-media.

## Runtime

Production startup requires `LIVE_REWARD_DATABASE_URL`. If it is missing or the
database is unavailable, `/health/ready` and business routes return 503. The
in-memory store is available only when tests or an explicit local-development
caller inject it into `LiveApplication`.

Clients cannot self-assert `x-user-id`. In services mode the Gateway validates the
Bearer token through identity-community, removes incoming user headers, and injects
`x-user-id`/`x-user-nickname` together with a short-lived service JWT carrying the
`live.user.forward` scope. live-reward accepts that identity context only when the
JWT caller is `gateway`, the audience is `live-reward`, and the signed request ID
matches `x-request-id`; it never queries the identity schema directly.
Set `SRS_API_BASE` to enable the SRS probe and RTC adapter. SRS calls have a 2s
timeout by default. Set `CONTENT_SERVICE_URL` to enable replay registration; the
client uses a 5s timeout, emits a service JWT, and preserves a retryable
registration state on failure. Replay object keys must end in `.webm` or `.mp4`,
and the stored MIME type must match the filename extension. Retry attempts are
audited with `attempts`, `lastError`, and `nextRetryAt`; after five failed
attempts the state is `FAILED_FINAL` and no further retry is accepted.
Content HTTP 400/401/409 responses are permanent failures. An existing replay or
ledger request is returned only when the complete idempotency payload matches;
conflicting request IDs, sessions, object keys, MIME types, users, resources, or
amounts return 409.

Internal retry/status routes require `SERVICE_JWT_SECRET` (at least 32 characters)
and the appropriate service JWT scope. No secret value belongs in this repository.

## Public routes

The service implements room creation/list/detail, start/stop, viewer join/leave,
messages, SRS publish/play, replay registration, wallet/daily claim/streak,
video coin and live gift routes under `/api/v1`. Internal replay retry and
session status and video-coin write routes are under `/internal/v1`; those routes
require the matching service JWT scope.

Build the image from the repository root because the Dockerfile installs the
workspace dependencies:

```bash
docker build -f services/live-reward/Dockerfile -t videoplayer-live-reward:<git-sha> .
```

The Dockerfile also exposes a `migration` target for `prisma migrate deploy`.
Migration commands pass `LIVE_REWARD_DATABASE_URL` through the repository target
safety guard; remote or non-acceptance targets require exact target authorization.
The standard microservice Compose stack provisions a dedicated live-reward MySQL
account, runs the migration target, and verifies restart persistence and schema
isolation.
For an isolated local Kubernetes migration, rollout, Pod replacement, and
persistence check, follow [the live-reward Kind runbook](../../deploy/k8s/live-reward/README.md).
