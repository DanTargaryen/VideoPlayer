# Content Schema

This directory contains the MS-02 content-media owned schema.

- `schema.prisma` defines only content-owned models.
- `creatorId` and `userId` are external identity IDs; no cross-schema foreign keys are created.
- `migrations/20260827000000_content_foundation/migration.sql` is written with `CREATE TABLE IF NOT EXISTS` so it can be applied repeatedly to a fresh content test database during foundation review.
- `fixture.sql` inserts the minimum published and draft videos needed for read-only contract checks.

Use `CONTENT_DATABASE_URL` for this service. The database account used by content-media must only have privileges on the content schema/database.
