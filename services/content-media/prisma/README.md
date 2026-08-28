# Content Schema

This directory contains the MS-02 content-media owned schema.

- `schema.prisma` defines only content-owned models.
- `creatorId` and `userId` are external identity IDs; no cross-schema foreign keys are created.
- Live replay retry facts remain owned by `live-reward`; content only stores the resulting `Video` and `VideoAsset` rows, with `VideoAsset.requestId` and `VideoAsset.objectKey` uniqueness for idempotent receive semantics.
- `Video.reviewDecisionId`, `reviewDecision` and `reviewDecisionReason` store the payload needed to distinguish exact governance replays from conflicting idempotency-key reuse.
- `migrations/20260827000000_content_foundation/migration.sql` is written with `CREATE TABLE IF NOT EXISTS` so it can be applied repeatedly to a fresh content test database during foundation review.
- `fixture.sql` inserts the minimum published and draft videos needed for read-only contract checks; every `Video.categoryId` references a `VideoCategory.id`.

Use `CONTENT_DATABASE_URL` for this service. The database account used by content-media must only have privileges on the content schema/database.
