# Replay Media Type Implementation Plan

> **Execution:** Follow test-driven development and systematic debugging. Keep `BUG-BASE01-UC03-01` validation changes out of this independent branch.

**Goal:** Preserve a browser-playable replay MIME through multipart upload and refuse to register non-video replay assets.

**Architecture:** Canonicalize MediaRecorder output at the frontend source boundary, then enforce a narrow playable-MIME invariant at the live-service registration boundary.

**Tech Stack:** Vue 3, TypeScript, MediaRecorder, NestJS, Node test runner, Vitest.

---

### Task 1: Frontend recording container normalization

**Files:**
- Create: `frontend/src/utils/replayMedia.ts`
- Create: `frontend/src/utils/replayMedia.spec.ts`
- Modify: `frontend/src/views/live/LiveRoomView.vue`

- [ ] Write failing tests for parameterized WebM, plain WebM, empty MIME fallback, and generated filename/type consistency.
- [ ] Run the focused Vitest file and confirm RED because the utility does not exist.
- [ ] Implement container MIME normalization and replay File creation.
- [ ] Use the utility when stopping a recording and preparing the upload.
- [ ] Rerun the focused frontend test and confirm PASS.

### Task 2: Backend replay registration guard

**Files:**
- Modify: `backend/src/modules/live/live.service.ts`
- Modify: `test/unit/live.service.test.js`

- [ ] Add a failing requirements test proving `text/plain` replay assets are rejected before room mutation or `createVideo`.
- [ ] Add assertions that WebM registration returns the original URL and MP4 remains accepted.
- [ ] Run the focused requirements test and confirm RED.
- [ ] Implement a normalized `video/webm` / `video/mp4` replay MIME guard before state mutation.
- [ ] Rerun the focused requirements test and confirm PASS.

### Task 3: Evidence and full verification

**Files:**
- Modify: `docs/practice-2026/00-progress.md`

- [ ] Record the confirmed root cause, automated evidence, and unchanged historical Smoke result.
- [ ] Run frontend/backend lint and build, requirements, backend Jest, frontend Vitest, and root `npm run test:ci`.
- [ ] Run CRLF-aware diff checking plus staged secret/generated-artifact audits.
- [ ] Commit explicit files with Task/UC/Changes/Tests/Evidence fields.
- [ ] Push `bug/BUG-BASE01-UC05-01-replay-media-type`, create a Draft PR, and verify base/head/tree/diff/test claims.
