# Pending Report Idempotency Implementation Plan

> **Execution:** Follow test-driven development. Keep the API response shape and existing target types unchanged.

**Goal:** Guarantee at most one PENDING report for one reporter/target, including concurrent requests, while allowing a new report after handling.

**Architecture:** Use a deterministic nullable unique key as the database invariant, with fast-path lookup and P2002 winner recovery in the service.

**Tech Stack:** NestJS, Prisma, MySQL 8, Node test runner, Jest.

---

### Task 1: Service-level idempotency

**Files:**
- Modify: `test/unit/report.service.test.js`
- Modify: `backend/src/modules/report/report.service.ts`

- [ ] Add failing tests for sequential duplicate return and simulated concurrent P2002 recovery.
- [ ] Correct the existing danmaku test to use the public `VIDEO_DANMAKU` enum value.
- [ ] Run the focused requirements test and confirm RED.
- [ ] Implement pending-key derivation, fast-path lookup, and unique-conflict winner recovery.
- [ ] Rerun the focused test and confirm PASS.

### Task 2: Database invariant and release

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260827_pending_report_idempotency/migration.sql`
- Modify: `backend/src/modules/admin/admin.controller.ts`
- Modify: `backend/src/modules/admin/admin.controller.spec.ts`
- Modify: `test/unit/admin.controller.test.js`

- [ ] Add failing admin assertions that report handling clears `pendingKey`.
- [ ] Add the nullable unique Prisma field and a migration that consolidates historical duplicates before creating the unique index.
- [ ] Clear `pendingKey` in the same status-guarded admin update.
- [ ] Run Prisma format/validate/generate, focused admin tests, and requirements tests.

### Task 3: Evidence and publication

**Files:**
- Modify: `docs/practice-2026/00-progress.md`

- [ ] Record implemented semantics, exact automated evidence, and the unchanged historical Smoke result.
- [ ] Run backend/frontend lint and build, requirements, backend Jest, frontend Vitest, and root `npm run test:ci`.
- [ ] Run CRLF-aware diff checking and staged secret/generated-artifact audits.
- [ ] Commit explicit files with Task/UC/Changes/Tests/Evidence fields.
- [ ] Push `bug/BUG-BASE01-UC06-01-report-idempotency`, create a Draft PR, and verify base/head/tree/diff/test claims.
