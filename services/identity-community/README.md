# identity-community

MS-01 owns account, profile, relationship, notification, direct-message, and dynamic-community persistence. The production entry point uses `PrismaIdentityStore`; the in-memory `IdentityStore` is available only when a test injects it explicitly into `createIdentityService`.

## Required runtime configuration

- `IDENTITY_DATABASE_URL`: URL for the identity-only MySQL database account. The service does not fall back to the monolith `DATABASE_URL`.
- `IDENTITY_ADMIN_SECRET`: administrator-login second factor. `ADMIN_SECRET` remains a temporary compatibility alias, but there is no hard-coded fallback.
- `SERVICE_JWT_SECRET`: at least 32 characters; used for internal user-summary, user-exists, and notification scopes.
- `PORT`, `GIT_SHA`: optional runtime metadata.

If the identity database URL or administrator secret is missing, `/health/live` and `/version` remain available, while `/health/ready` and all business routes return `503`. When a database URL is configured but MySQL is unavailable, readiness also remains `503`.

## Database lifecycle

```bash
npm --workspace @videoplayer/identity-community run prisma:generate
IDENTITY_DATABASE_URL='mysql://identity_app:<url-encoded-password>@127.0.0.1:3306/video_player_identity_test' \
  npm --workspace @videoplayer/identity-community run db:migrate
```

`db:migrate`, `db:seed`, and `db:test-reset` pass the identity URL through the repository safety guards. Reset requires a local database whose name contains `test`; destructive seed additionally requires the existing seed confirmation variables. The full mapping and rollback rules are documented in `prisma/README.md`.

## Validation surfaces

- Public UC01/UC04 foundation routes: registration, login, current user, profile, homepage, follow, notifications, direct messages, and dynamic community.
- Internal routes: batch user summary, user existence, and request-ID-idempotent notification creation protected by service JWT scopes.
- `npm run test`: fast memory-adapter contract tests.
- `npm run test:integration`: real-MySQL restart, persisted session/follow state, and two-instance notification concurrency test; requires `IDENTITY_TEST_DATABASE_URL`.
- `scripts/compose-microservices-smoke.sh`: builds the runtime and migration images, provisions an isolated identity database account, migrates the schema, and verifies health/version plus schema isolation.

This foundation does not switch Gateway business traffic, stop monolith writes, delete monolith tables, or give another service access to the identity Prisma Client.
