# Pending Report Idempotency Design

## Scope and behavior

Fix `BUG-BASE01-UC06-01` for VIDEO, COMMENT, and VIDEO_DANMAKU targets. When the same reporter submits another report for the same target while one record is `PENDING`, return the existing record and do not create another row. Once an administrator changes that record to `PROCESSED` or `REJECTED`, a later report is allowed.

The HTTP contract remains the existing report object wrapped by `ok(...)`; repeat calls can therefore compare the returned report ID. No DTO or target-type changes are introduced.

## Root cause

`ReportService.createReport` validates the target and calls `reportRecord.create` on every request. `ReportRecord` has indexes on status and target type but no uniqueness invariant. A pre-create query alone would still race when concurrent requests both observe no pending row.

## Data model

Add nullable unique `pendingKey` to `ReportRecord`. A pending report key is deterministic:

```text
<reporterId>:<targetType>:<targetId>
```

All newly created PENDING rows receive the key. Administrative handling clears it in the same conditional update that changes status. Nullable uniqueness permits any number of historical processed/rejected records while allowing only one active key.

The migration backfills existing PENDING rows, keeps the earliest row for each key active, and marks later duplicates `REJECTED` with an automatic consolidation note before adding the unique index. This prevents migration failure and leaves an auditable record instead of deleting history.

## Service algorithm

1. Trim and validate the reason; derive `pendingKey`.
2. Read by unique key and return the existing row if present.
3. Confirm the target exists.
4. Create the PENDING row with the key.
5. If create loses a concurrent race with Prisma `P2002`, read the winning row and return it; rethrow if no winner is found.

The target existence check is retained for a new report. Idempotent repeats return the already validated existing record.

## Verification boundary

Requirements tests cover sequential repeats, a simulated concurrent unique conflict, all target types, and creation after no pending row exists. Admin tests verify the key is cleared during handling. Prisma validation and migration SQL inspection cover the database invariant. Full lint/build/test evidence is recorded separately; a real concurrent MySQL API test remains `NOT RUN` unless actually executed.
