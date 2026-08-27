# live-reward

MS-03 service for live rooms, sessions, viewers, messages, replay registration
and the coin ledger. The service owns its Prisma schema and never creates foreign
keys to identity-community or content-media.

## Runtime

Without `LIVE_REWARD_DATABASE_URL`, the service uses an in-memory store for local
development and unit tests. Set it to an isolated MySQL database for restart-safe
state, then run `npm run prisma:generate` and `npm run db:migrate` in this workspace.

The gateway should pass the authenticated user's external identity as
`x-user-id` and `x-user-nickname`; live-reward does not query the identity schema.
For the current monolith-compatible session format, `Bearer mock-token-<id>-…`
is also accepted for the user ID; nonce ownership and user lookup remain in
identity-community.
Set `SRS_API_BASE` to enable the SRS probe and RTC adapter. SRS calls have a 2s
timeout by default. Set `CONTENT_SERVICE_URL` to enable replay registration; the
client uses a 5s timeout, emits a service JWT, and preserves a retryable
registration state on failure. Replay object keys must end in `.webm` or `.mp4`,
and the stored MIME type must match the filename extension. Retry attempts are
audited with `attempts`, `lastError`, and `nextRetryAt`; after five failed
attempts the state is `FAILED_FINAL` and no further retry is accepted.

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
For an isolated local Kubernetes migration, rollout, Pod replacement, and
persistence check, follow [the live-reward Kind runbook](../../deploy/k8s/live-reward/README.md).
