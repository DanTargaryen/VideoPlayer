---
name: videoplayer-commit-pr
description: Prepare, validate, commit, push, and draft or update pull requests for the VideoPlayer repository with traceable task/UC links and exact test evidence. Use when asked to commit, push, create or update a PR, or hand off changes in DanTargaryen/VideoPlayer; do not apply to unrelated repositories.
---

# VideoPlayer Commit and PR Workflow

Produce reviewable Git history and PR evidence for VideoPlayer without overstating completion or expanding external-action authorization.

## Load the repository policy

Before staging, committing, pushing, or preparing a PR:

1. Resolve the repository root and verify this is VideoPlayer by its root path or `origin` URL.
2. Read applicable `AGENTS.md` instructions.
3. Read `docs/practice-2026/09-commit-pr-convention.md` completely when present.
4. Read `.github/pull_request_template.md` completely before drafting or creating a PR.
5. Read `docs/practice-2026/00-progress.md` when the change relates to the 2026 practice work.

Treat the repository files as the maintained source of truth. If they conflict with this skill, follow the user's current request and higher-priority instructions, then flag the policy mismatch.

## Preserve authorization boundaries

- File-edit permission does not imply permission to commit, push, create a PR, merge, tag, release, delete a branch, or rewrite history.
- Commit only when requested or clearly included in the requested workflow.
- Push only when the user authorizes push.
- Create or update a PR only when the user authorizes that external action.
- Never infer permission for force-push, merge, branch deletion, release, or moving/deleting `monolith-start`.
- If only a commit or push was requested, stop after that outcome.

## Enforce an isolated, current PR branch

Treat the intended PR target and shared baseline branches such as `main`, `master`, `develop`, and release branches as protected. Before the first task commit, every push, and PR creation or update:

1. Run `git fetch origin --prune` and identify the exact PR target.
2. Never commit task changes on, push task changes directly to, or use a protected/target branch as the PR head. If task changes are currently on such a branch, preserve them and move them to a compliant task branch before staging, committing, or pushing; never discard or overwrite user-owned changes to do so.
3. Keep one independently named task branch per reviewable objective. For new work, create it from the fetched `origin/<target>` so it starts at the latest target commit. For an existing local task branch, rebase it onto `origin/<target>` before its first push and before opening or updating the PR.
4. Verify `git merge-base --is-ancestor origin/<target> HEAD` succeeds and the target-side count from `git rev-list --left-right --count origin/<target>...HEAD` is `0`. If either check fails, stop; do not push or create/update the PR.
5. Push only the task branch, and verify the PR head differs from its base. Never use a refspec that writes the task commit to the protected/target branch.
6. If the task branch was already published and rebasing would rewrite its remote history, explain the exact branch and risk and obtain separate authorization before rebasing or using `--force-with-lease`. Without that authorization, stop. Never use plain `--force`, and do not merge the target branch as an unapproved substitute for the required rebase.

Creating a new task branch directly from the fetched target satisfies the rebase/current-base requirement for a branch with no task commits. A target branch moving again after that requires another fetch, rebase, and verification before the next push or PR update.

## Keep commits core-only

Default to versioning only reproducible source inputs:

- application source and configuration;
- test source and test configuration;
- dependency manifests and the matching lockfile;
- database migrations and seed source;
- Docker, CI, Kubernetes, proxy, and deployment source configuration;
- repository governance files or authored source documentation only when the user explicitly requests them or the course deliverable requires them.

Do not stage generated or local results:

- `artifacts/`, `playwright-report/`, `test-results/`, `coverage/`, `dist/`, `build/`, caches, temporary files, logs, PID files, local databases, uploads, screenshots, archives, or generated reports;
- compiled bundles, downloaded binaries, runtime storage, or credentials.

Store runtime reports as ignored local files or CI Artifacts. Before committing, audit the changed-file list and confirm generated-result paths have zero tracked files. If a user asks for core-code-only delivery, omit authored analysis/report files unless they were separately and explicitly requested; do not silently remove previously requested repository skills, templates, migrations, tests, or required delivery source files.

## Prepare a commit

1. Inspect `git status --short --branch`, the current branch/upstream, remotes, unstaged diff, staged diff, and recent commits.
2. Apply the isolated/current-branch gate above. Do not stage or commit task changes while checked out on the protected/target branch.
3. Distinguish branch names from commit titles:
   - Branches use `<category>/<task-id>-<short-slug>`.
   - Use `feature/`, `bug/`, `hotfix/`, `test/`, `docs/`, `build/`, `ci/`, `refactor/`, `perf/`, or `chore/` according to the work.
   - Examples: `feature/UC03-review-resubmission`, `bug/UC05-viewer-reconnect`, `test/TEST-02-video-api`.
   - Do not rename or rewrite an already-pushed historical branch merely to adopt the convention.
4. Preserve unrelated and user-owned changes. Stage explicit paths for the current logical task; do not use an indiscriminate `git add .` when unknown files exist.
5. Separate unrelated changes into distinct commits. Keep dependency declarations and their lockfile in the same commit.
6. Scan the staged diff for `.env` files, real passwords, tokens, database credentials, private keys, logs, PID files, build output, and local artifacts.
7. Run tests proportional to the change. Prefer repository commands such as:
   - `npm run lint:backend`
   - `npm run lint:frontend`
   - `npm run build:backend`
   - `npm run build:frontend`
   - `npm run test:backend`
   - `npm run test:frontend`
   - `npm run test:e2e`
   - `npm run test:ci`
8. Record exact commands, counts, PASS/FAIL/BLOCKED status, and meaningful failure/fix history. Never convert an unrun check into PASS.
9. For practice tasks, update `docs/practice-2026/00-progress.md` in the same logical commit. Mark `[x]` only after observable completion and verification; keep configuration-only or environment-blocked work unchecked with a partial-status explanation.
10. Run staged diff checks. This repository contains CRLF files, so use `git -c core.whitespace=cr-at-eol diff --cached --check` when the default check only reports CR-at-EOL.
11. Use `type(scope): concise summary` for the commit title. Choose `feat`, `fix`, `test`, `build`, `ci`, `docs`, `refactor`, `perf`, or `chore` according to the actual result. A `feature/` branch normally contains `feat` commits; `bug/` and `hotfix/` normally contain `fix` commits.
12. Every commit must include a concise body with at least:
    - `Changes:` followed by short bullets describing what changed;
    - `Tests:` followed by exact commands/results, or `NOT RUN`/`BLOCKED` with a reason.
    - For practice work also include `Task:`, `UC:`, and `Evidence:`; use `N/A` with a reason when appropriate.
13. After committing, verify `git show --format=fuller --stat HEAD`, including the branch/category, title, body, file scope, test claims, and working-tree status.

## Push safely

When push is authorized:

1. Re-run the isolated/current-branch gate above: fetch, resolve the target, reject a protected/target head, rebase the task branch when required, and verify the target-side count is `0`.
2. Reconfirm the current repository, task branch, upstream, and exact destination ref. Stop if the push would update the protected/target branch.
3. For the first push, use `git push --set-upstream origin <task-branch>`; otherwise use ordinary `git push` only when no history rewrite is required.
4. Do not use `--force` or `--force-with-lease` unless the user separately authorizes history rewriting after seeing the exact branch and risk. If authorized, use only `--force-with-lease` against the named task branch.
5. Verify the remote-tracking task branch and report the pushed commit range.
6. Do not create a PR merely because push succeeded unless the user also requested a PR.

## Prepare or create a PR

1. Re-run the isolated/current-branch gate. Stop unless the head is a compliant task branch, differs from the base, contains the latest fetched target, and has a target-side count of `0`.
2. Inspect `target...HEAD`, commit list, diff stat, changed files, and migration/config implications.
3. Use `type(scope): concise summary` for the PR title.
4. Fill `.github/pull_request_template.md`; do not omit sections silently.
5. Link the task ID, REQ/UC, board/Issue, and evidence. Use `N/A` with a reason when genuinely inapplicable.
6. State what the PR does not include, especially when a larger course task remains partial.
7. List only tests actually run, including exact counts and environment. Preserve useful failed-attempt and repair evidence.
8. Explain API, data, service-boundary, configuration/Secret, risk, rollback, and AI/open-source impacts.
9. Use a Draft PR when applicable checks or dependencies are incomplete. Never check boxes solely to make the template appear complete.
10. Create/update the PR only after authorization, then verify the final URL, base/head branches, title, draft state, rendered body, and recorded rebase/current-base evidence.
11. Do not merge the PR unless separately requested and authorized.

## Handoff

Report:

- branch and upstream;
- commit hash(es) and logical scope;
- exact tests and results;
- progress Markdown changes;
- push range or PR URL when performed;
- unrun/blocked checks and required next authority;
- whether the working tree is clean.

Keep claims precise: a Dockerfile with static checks is not a successful container run; a local CI-equivalent command is not a GitHub Actions run; a service-boundary draft is not a reviewed architecture decision.
