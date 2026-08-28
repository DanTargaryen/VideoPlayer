# Identity schema

`identity-community` owns the identity and community persistence boundary for MS-01. Runtime and Prisma CLI commands use only `IDENTITY_DATABASE_URL`; they never fall back to the monolith `DATABASE_URL`.

The directory contains the first-pass Prisma schema, an initial migration, a guarded seed entry point and a small fixture file that mirror the service's owned models:

- `User`
- `DirectMessage`
- `UserProfileSummary`
- `UserCategoryPreference`
- `UserCreatorPreference`
- `DynamicPost`
- `DynamicPostLike`
- `DynamicPostComment`
- `FollowRelation`
- `Notification`
- `CreatorFollowerDaily`

`Notification.requestId` is modeled as a unique column so internal notification writes can stay idempotent across retries and replay.

## Monolith-to-identity field mapping

| Monolith field / relation | Identity result | Reason / validation |
| --- | --- | --- |
| `User.id` | Preserve exact integer ID during later data migration | Cross-service references remain plain external IDs. |
| `username`, `email` | Preserve with unique constraints | Migration must compare row counts and duplicate scans before cutover. |
| `phone` | Preserve as nullable unique `User.phone` | Avoid silent loss of the existing account attribute. |
| `password`, `role`, `nickname`, `avatarUrl`, `bio`, `messagePrivacy`, timestamps | Preserve | Required by the current UC01/public API contract. |
| active session nonce | Persist as nullable `User.sessionNonce` | A second login invalidates an older token across restarts and replicas. |
| `coinBalance` | Not copied into identity | ARCH-01 assigns wallet and ledger facts to `live-reward`; identity must obtain balance through that service contract after read routing is introduced. |
| identity-owned relations and community rows | Preserve IDs/FKs inside this schema | No FK or Prisma relation is created to a different service schema. |

The initial migration targets a new, empty identity database. It is intentionally not an automatic baseline for an arbitrary non-empty or remote database. A later production migration must use a stop-write window, export the identity-owned rows, preserve IDs, validate source/target row counts and unique keys, sample account/relationship/notification records, then separately authorize any `prisma migrate resolve` operation.

## Safety and rollback

- `db:migrate` accepts local acceptance databases by default; other targets require the repository's exact target and confirmation variables.
- `db:test-reset` accepts only a local database whose name contains `test`.
- `db:seed` is destructive and uses the repository seed guard and explicit confirmation.
- Compose creates an `identity_app` account scoped to the identity database; the smoke script rejects access to the monolith `video_player` schema.
- Kubernetes receives `identity-database-url` and `identity-admin-secret` only through `videoplayer-microservice-secrets`; the migration Job completes before the identity Deployment rollout.
- Rollback before write cutover is to stop identity writes and leave Gateway in monolith/fallback mode. No monolith table is removed by this PR.

`seed.fixture.json` is executed by `seed.cjs`; repeated seed runs clear only the guarded identity test database and restore fixed user IDs, relationships, notifications, messages, and dynamic posts.
