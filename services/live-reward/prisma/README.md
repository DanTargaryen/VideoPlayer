# live-reward Prisma boundary

This schema is owned by `live-reward`. User and video identifiers are external IDs;
there are intentionally no foreign keys to identity-community or content-media.
`ReplayRegistration.contentVideoId` is a string because content-media owns UUID video IDs.

Set `LIVE_REWARD_DATABASE_URL` to an isolated MySQL database, then run:

```bash
npm --workspace @videoplayer/live-reward run prisma:generate
npm --workspace @videoplayer/live-reward run db:migrate
```

The service uses an in-memory adapter when the variable is absent, which keeps
health checks and unit tests independent of external infrastructure. Production
and integration deployments must set the variable so database state is the source
of truth across restarts.
