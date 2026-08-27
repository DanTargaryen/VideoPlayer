# Reject Invalid Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid video files from creating storage objects or database records.

**Architecture:** Use pure metadata validators on both sides, FFprobe the backend buffer before persistence, and compensate the MinIO write if the following database insert fails. Existing APIs and schema remain unchanged.

**Tech Stack:** Vue 3, TypeScript, NestJS, FFprobe, MinIO, Node test runner, Jest, Vitest.

---

### Task 1: Backend metadata rules

**Files:**
- Create: `backend/src/modules/video/video-upload-validation.ts`
- Create: `backend/test/video-upload-validation.spec.ts`

- [x] Write tests asserting MP4/WebM metadata is accepted and `.txt`, empty MIME, MIME mismatch, and FFprobe JSON without a video stream are rejected.
- [x] Run `npm --workspace backend test -- --runTestsByPath test/video-upload-validation.spec.ts` and confirm RED because the module does not exist.
- [x] Implement extension-to-MIME rules, `assertVideoUploadMetadata(file)`, and `hasVideoStream(ffprobeJson)` with `BadRequestException` for invalid input.
- [x] Rerun the focused Jest test and confirm PASS.

### Task 2: FFprobe before persistence

**Files:**
- Modify: `backend/src/modules/video/media.service.ts`
- Modify: `test/unit/video.service.test.js`
- Modify: `backend/src/modules/video/video.service.ts`

- [x] Add a failing Jest test that passes text bytes named `spoofed.mp4` with MIME `video/mp4` and expects `MediaService.validateVideoUpload` to reject it.
- [x] Add failing requirements tests proving validation rejection produces zero MinIO/Prisma calls and a database insert failure deletes the exact uploaded object.
- [x] Run the focused Jest and requirements files and confirm the expected RED failures.
- [x] Implement `MediaService.validateVideoUpload`: metadata assertion, non-empty buffer check, FFprobe binary discovery, temporary file write, `execFile`, parsed video-stream assertion, and `finally` cleanup.
- [x] Update `VideoService.uploadFile` to validate `ORIGINAL`/`RECORDING` before `uploadObject` and delete the uploaded object if `videoAsset.create` fails.
- [x] Rerun focused tests and confirm PASS.

### Task 3: Frontend double validation

**Files:**
- Create: `frontend/src/utils/mediaFileValidation.ts`
- Create: `frontend/src/utils/mediaFileValidation.spec.ts`
- Modify: `frontend/src/views/upload/UploadView.vue`

- [x] Write Vitest cases for accepted MP4/WebM and rejected `.txt`, missing MIME, and extension/MIME mismatch.
- [x] Run `npm --workspace frontend test -- --run frontend/src/utils/mediaFileValidation.spec.ts` and confirm RED because the module does not exist.
- [x] Implement `VIDEO_FILE_ACCEPT` and `getVideoFileValidationError` using the same extension/MIME pairs as the backend.
- [x] Bind the file input accept value, reject and clear invalid selections, and repeat validation before upload.
- [x] Rerun the focused frontend test and confirm PASS.

### Task 4: Practice evidence and full verification

**Files:**
- Modify: `docs/practice-2026/00-progress.md`

- [x] Record task scope, exact tests, and result without changing the historical Smoke outcome.
- [x] Run `npm run lint:backend`, `npm run lint:frontend`, `npm run build:backend`, `npm run build:frontend`, `npm run test:requirements`, `npm run test:backend`, and `npm run test:frontend`.
- [x] Run `git -c core.whitespace=cr-at-eol diff --check` and audit that no generated artifacts or secrets are tracked.
- [ ] Commit explicit task files with a `fix(content): reject invalid video uploads` message containing Task/UC/Changes/Tests/Evidence.
- [ ] Push `bug/BUG-BASE01-UC03-01-reject-invalid-media` and create a Draft PR targeting `main`; verify base/head/SHA/diff/test claims.
