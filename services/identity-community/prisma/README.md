# Identity schema

`identity-community` owns the identity and community persistence boundary for MS-01.

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

The runtime in this branch still uses the current service contract while the dedicated identity database bootstrap is prepared here for the next wiring step.
