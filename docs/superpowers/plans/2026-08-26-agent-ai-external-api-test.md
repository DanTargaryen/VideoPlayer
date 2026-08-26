# Agent/AI External API Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and execute an isolated Jest/Supertest suite that validates implemented Agent/AI APIs with real DashScope/Qwen calls while excluding MinIO and marking the review Agent as pending.

**Architecture:** A dedicated E2E suite boots the full Nest application against the configured cloud MySQL, forces local storage, disables shared background workers, creates unique fixtures, calls public HTTP APIs, verifies Prisma persistence, and removes only its own artifacts. Costly external calls require an explicit opt-in flag and produce a separate JSON report.

**Tech Stack:** NestJS 11, Jest, Supertest, Prisma 6, FFmpeg, DashScope-compatible chat completions, cloud MySQL.

---

### Task 1: Add the isolated Agent/AI test entrypoint

**Files:**
- Modify: `package.json`
- Modify: `backend/package.json`

- [x] Add root and backend `test:agent-ai` scripts.
- [x] Require separate JSON output at `test-results/agent-ai-latest.json`.
- [x] Run the missing-suite command and confirm RED before creating the suite.

### Task 2: Build isolated fixtures and guards

**Files:**
- Create: `backend/test/agent-ai.e2e-spec.ts`

- [x] Require `INTEGRATION_DATABASE_URL`, `ALLOW_REMOTE_INTEGRATION_DATABASE=true`, `ALLOW_REAL_AI_CALLS=true`, and `DASHSCOPE_API_KEY`.
- [x] Force local storage and disable the comment worker/Grok initializer.
- [x] Create a unique user, session, local MP4 fixture, video asset, video and comment data.
- [x] Add targeted cleanup for AI summaries, chat sessions/messages, comment tasks/comments, video assets/videos, sessions/users and local files.
- [x] Compile the suite and fix only test-code errors.

### Task 3: Verify implemented Agent/AI APIs

**Files:**
- Modify: `backend/test/agent-ai.e2e-spec.ts`

- [x] Test structured site-help through `POST /assistant/chat`.
- [x] Test real-model chat through `POST /assistant/chat` and require `source=model` plus non-empty model/reply.
- [x] Test real video summary and its Prisma record.
- [x] Test real video chat and the history API.
- [x] Test `@grok` comment creation and the unique queued task without starting the worker.
- [x] Record `/agent` review and results endpoints as excluded Mock capabilities, not passing cases.

### Task 4: Execute and report

**Files:**
- Modify: `docs/集成与API测试报告-2026-08-26.md`

- [x] Run the dedicated suite with cloud database and real-model opt-ins.
- [x] Run the existing backend test suite, targeted ESLint, build and `git diff --check`.
- [x] Record totals, failures, failure reasons, duration, environment, model boundary, MinIO exclusion and review-Agent pending status.
- [x] Confirm test artifacts were removed from cloud MySQL and local storage.
