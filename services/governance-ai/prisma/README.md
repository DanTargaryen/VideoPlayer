# Governance schema

This directory owns only governance facts: `VideoReview`, `CommentAiTask`, `ReportRecord` and `ModerationDecision`. Content and identity identifiers are scalar external IDs; there are no cross-schema foreign keys.

Use an isolated governance database and account:

```bash
GOVERNANCE_DATABASE_URL=mysql://governance_app:password@127.0.0.1:3306/video_player_governance_test \
npm --workspace @videoplayer/governance-ai run db:migrate
```

Migration deployment is repeatable. The opt-in integration suite rejects URLs whose database name is not an explicit governance test target.
