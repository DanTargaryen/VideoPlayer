# live-reward Prisma boundary

This schema is owned by `live-reward`. User and video identifiers are external IDs;
there are intentionally no foreign keys to identity-community or content-media.
`ReplayRegistration.contentVideoId` is a string because content-media owns UUID video IDs.

Set `LIVE_REWARD_DATABASE_URL` to an isolated MySQL database, then run:

```bash
npm --workspace @videoplayer/live-reward run prisma:generate
npm --workspace @videoplayer/live-reward run db:migrate
```

Production and integration deployments must set the variable so database state is
the source of truth across restarts. Missing or unavailable persistence makes the
runtime unready; the in-memory adapter is only an explicitly injected test/local
development boundary.

`ReplayRegistration.requestId` is globally unique. A replay is idempotent only when
session, object key, request ID, and MIME type all match. `CoinTransaction` stores a
canonical `requestPayload`; ledger replays must match user, transaction type,
resource, and amount, while conflicts return 409.

`db:migrate` uses the repository database-target guard. Local databases whose name
contains `test` are accepted by default; other hosts/databases require an exact
`MIGRATION_DEPLOY_ALLOWED_TARGET` plus `MIGRATION_DEPLOY_CONFIRM=DEPLOY_MIGRATIONS`.
