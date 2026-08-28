# Identity schema

`identity-community` owns the identity and community persistence boundary for MS-01.

The directory contains the first-pass Prisma schema, an initial migration and a small fixture file that mirror the service's owned models:

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

The runtime in this branch still uses an in-memory store for the first public batch, but the schema and migration are ready for the dedicated identity database that will be wired in the next step.
