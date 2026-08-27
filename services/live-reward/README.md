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
Set `SRS_API_BASE` to enable the SRS probe and RTC adapter. SRS calls have a 2s
timeout by default. Set `CONTENT_SERVICE_URL` to enable replay registration; the
client uses a 5s timeout and preserves a retryable registration state on failure.

Internal retry/status routes require `SERVICE_JWT_SECRET` (at least 32 characters)
and the appropriate service JWT scope. No secret value belongs in this repository.

## Public routes

The service implements room creation/list/detail, start/stop, viewer join/leave,
messages, SRS publish/play, replay registration, wallet/daily claim/streak,
video coin and live gift routes under `/api/v1`. Internal replay retry and
session status routes are under `/internal/v1`.
