# identity-community

MS-01 identity-community keeps the current public contract surface for identity and community capabilities, with guarded Prisma schema, migration and seed entry points under `prisma/`.

The service still exposes the HTTP contract exercised by the first public batch through `/health/live`, `/health/ready`, `/version` and the identity/community routes in `src/service.ts`, while the dedicated database bootstrap lives beside the schema files.
