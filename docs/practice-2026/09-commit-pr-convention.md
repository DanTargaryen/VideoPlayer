# Commit、Push 与 Pull Request 规范

> 适用范围：VideoPlayer 仓库的人工与 Codex 变更。
>
> 目标：让提交可审阅、测试结果可验证、课程任务可追溯、个人贡献有证据。

## 1. 授权边界

- 修改文件不自动代表允许 commit、push、创建 PR、合并、打标签或发布。
- 用户/组长明确要求 commit 时才提交；明确要求 push 时才推送；明确要求创建 PR 时才创建。
- 不自动 force-push、不删除远端分支、不合并 PR、不移动 `monolith-start`。
- 外部操作前再次核对仓库、分支、remote 和目标分支。

## 2. 分支命名

`feature/xxxx`、`bug/xxxx` 是<strong>分支名</strong>，不是 commit 标题。新分支统一采用：

```text
<category>/<task-id>-<short-slug>
```

允许的 category：

| Category | 用途 | 示例 |
| --- | --- | --- |
| `feature` | 新功能或新的业务能力 | `feature/UC03-review-resubmission` |
| `bug` | 普通缺陷修复 | `bug/UC05-viewer-reconnect` |
| `hotfix` | 需要优先上线的紧急修复 | `hotfix/AUTH-login-regression` |
| `test` | 测试和测试基础设施 | `test/TEST-02-video-api` |
| `docs` | 需求、设计、追溯和报告 | `docs/DOC-01-traceability` |
| `build` | Docker、依赖、构建和打包 | `build/CTR-01-backend-image` |
| `ci` | 流水线和自动部署 | `ci/CI-01-monolith-pipeline` |
| `refactor` | 不改变外部行为的结构调整 | `refactor/ARCH-01-service-boundary` |
| `perf` | 有测量目标的性能工作 | `perf/PERF-01-feed-benchmark` |
| `chore` | 其他维护 | `chore/GOV-01-project-templates` |

完整示例：

```text
feature/UC03-review-resubmission
bug/UC05-viewer-reconnect
test/TEST-02-video-api
ci/CI-01-monolith-pipeline
```

命名要求：

- 使用小写 category；`task-id` 保留课程/看板编号形式；slug 使用简短英文和连字符。
- 一个分支围绕一个可验收目标，不混入无关功能、格式化和个人文件。
- Codex 以后也使用此 category 规范；除非用户明确指定，不再默认创建新的 `codex/...` 分支。
- 已经存在的历史分支不为改名而强制重写或 force-push。

### 受保护基线与独立分支门禁

PR 的目标分支以及 `main`、`master`、`develop`、release 分支等共享基线均视为受保护分支。任务改动不得直接 commit 或 push 到受保护/目标分支，受保护/目标分支也不得作为 PR 的源分支。每个可审阅目标必须使用一个符合上述命名规范的独立任务分支。

在首次任务 commit、每次 push、创建 PR 或更新 PR 前，必须完成以下检查：

1. 执行 `git fetch origin --prune`，明确本次 PR 的准确目标分支。
2. 新任务应从最新的 `origin/<target>` 创建独立分支；这样创建、且尚无任务 commit 的分支，视为已经位于最新目标基线上。
3. 已有本地任务分支必须在该任务分支上执行 `git rebase origin/<target>`，把任务 commit 重放到最新目标分支之后。
4. 执行 `git merge-base --is-ancestor origin/<target> HEAD`，并使用 `git rev-list --left-right --count origin/<target>...HEAD` 确认目标侧计数为 `0`。任一检查失败时，禁止 push、创建 PR 或更新 PR。
5. 只允许 push 独立任务分支，并确认 PR 的源分支与目标分支不同；不得使用 refspec 把任务 commit 写入受保护/目标分支。
6. 如果目标分支在检查后再次前进，下一次 push 或 PR 更新前必须重新 fetch、rebase 和验证。

如果当前位于受保护/目标分支且已有未提交任务改动，必须保留这些改动并先迁移到合规的独立任务分支；不得通过丢弃、覆盖或重置用户改动来满足规则。如果任务分支已经推送，rebase 可能改写远端历史，则必须先说明准确分支与风险，并单独获得 rebase 和 `--force-with-lease` 授权；未获授权时停止交付。禁止普通 `--force`，也不得用 merge 目标分支替代本规范要求的 rebase。

## 3. Commit 格式

标题采用：

```text
type(scope): concise summary
```

允许的 `type`：

| Type | 用途 |
| --- | --- |
| `feat` | 新增用户可见业务能力 |
| `fix` | 修复缺陷或错误行为 |
| `test` | 新增/修改测试和测试基础设施 |
| `build` | Docker、依赖、构建和打包 |
| `ci` | 流水线和自动部署 |
| `docs` | 需求、模型、追溯、报告和说明 |
| `refactor` | 不改变外部行为的结构调整 |
| `perf` | 有测量证据的性能改进 |
| `chore` | 其他维护 |

常用 `scope`：`frontend`、`backend`、`auth`、`content`、`live`、`governance`、`devops`、`practice`。

要求：

- 标题描述结果，不写“update”“fix things”“new features”等模糊信息。
- 每个 commit 只有一个逻辑目标；依赖锁文件与对应依赖声明放在同一 commit。
- 完成课程任务时，同一 commit 更新 `docs/practice-2026/00-progress.md`，记录改动、测试、结果和 commit 关系。
- 不把未运行测试写成通过；未运行必须记录 `NOT RUN` 或 `BLOCKED`。
- 不为凑提交数机械拆分；也不把多项独立任务挤成一个巨大提交。

每个 commit 都必须有简短正文，至少包含 `Changes` 和 `Tests`。课程任务还要填写 `Task`、`UC` 和 `Evidence`；不适用时写 `N/A` 并说明。格式：

```text
test(backend): add health API contract tests

Task: TEST-01
UC: N/A

Changes:
- add Jest configuration and health controller unit test
- add Supertest coverage for GET /api/v1/health

Tests:
- npm run test:backend (2/2 PASS)
- npm run test:ci (PASS)

Evidence:
- docs/practice-2026/00-progress.md
```

缺陷提交示例：

```text
fix(live): preserve viewers during reconnect

Task: BUG-UC05-01
UC: UC05

Changes:
- keep viewer identity during a short network interruption
- expire the reconnect token after the configured grace period

Tests:
- npm run test:backend (18/18 PASS)
- npm run test:e2e (NOT RUN: Docker/SRS environment unavailable)

Evidence:
- docs/practice-2026/00-progress.md
```

## 4. 核心文件与生成产物边界

默认只提交可复现的源输入：应用源码/配置、测试源码/配置、依赖清单及对应 lockfile、migration/seed、Docker/CI/K8s/代理配置，以及用户明确要求或课程交付要求的仓库规范与人工源文档。

以下生成或本地结果不得进入 Git：

- `artifacts/`、`playwright-report/`、`test-results/`、`coverage/`、`dist/`、`build/`；
- 日志、PID、缓存、临时目录、本地数据库、上传文件、运行时存储；
- 测试截图、HTML 报告、压测原始输出、生成报告和下载二进制。

这些结果保存在 `.gitignore` 覆盖的本地目录，或由 CI 上传为 Artifact。Commit 前必须审计文件清单，确认生成产物的已跟踪数量为 0。明确要求入库的 skill、PR 模板、migration、测试源码和课程必需的可编辑源文档不属于生成产物，不应被静默删除。

## 5. Commit 前检查

1. 确认当前仓库、分支和 remote。
2. 执行第 2 节的受保护基线与独立分支门禁；当前分支为受保护/目标分支时禁止暂存或提交任务改动。
3. 查看 `git status --short --branch`、未暂存 diff 和已暂存 diff。
4. 只暂存本任务文件，不使用无条件 `git add .` 带入未知文件。
5. 检查没有 `.env`、真实口令、Token、Secret、日志、PID、构建产物和个人临时文件。
6. 运行与风险相称的 lint、build、unit、API、E2E、Docker/K8s 检查。
7. 更新 `00-progress.md`；只有实际完成并验证的项目才能打 `[x]`。
8. 运行 diff check；CRLF 仓库文件可使用 `git -c core.whitespace=cr-at-eol diff --cached --check`。
9. commit 前确认标题与当前分支 category 对应：`feature` 通常用 `feat`，`bug/hotfix` 通常用 `fix`。
10. commit 后核对 `git show --format=fuller --stat HEAD`，确认标题、`Changes`、`Tests`、文件范围和工作树状态。

## 6. Push 规则

- 每次 push 前重新执行第 2 节的门禁：fetch、确认目标、拒绝受保护/目标源分支、按需 rebase，并确认目标侧计数为 `0`。
- 再次核对当前任务分支、upstream 和准确的远端目标 ref；如果 push 会更新受保护/目标分支，立即停止。
- 首次推送只能使用 `git push --set-upstream origin <task-branch>`。
- 后续只有在不需要改写历史时才使用普通 `git push`。已发布任务分支需要 rebase 和改写远端历史时，必须先单独获得授权；获准后只能对明确命名的任务分支使用 `--force-with-lease`，禁止普通 `--force`。
- 推送失败时先报告原因并检查远端状态，不循环重试破坏性命令。
- 推送后核对本地 upstream、ahead/behind、远端任务分支以及实际推送的 commit 范围。

## 7. PR 标题与内容

PR 标题同样使用：

```text
type(scope): concise summary
```

PR 的源分支必须符合第 2 节 category 规范，必须是独立任务分支，且不得与目标分支相同。创建或更新 PR 前必须重新 fetch，将源分支 rebase 到最新 `origin/<target>`，并通过第 2 节的祖先关系和目标侧计数检查；否则停止，不能以 Draft PR 绕过此分支门禁。PR 正文必须记录同步基线及方式，Commit 清单要逐条简述每个 commit 的改动和测试结果。

PR 正文必须基于 `.github/pull_request_template.md`，至少包含：

- 变更摘要和明确排除项。
- 任务 ID、REQ/UC、看板/Issue。
- 架构、接口、数据库、配置和数据归属影响。
- 实际执行的命令、测试数和结果。
- 有价值的失败与修复记录。
- 日志、报告、截图或流水线证据。
- 风险、故障处理和回滚方式。
- AI/开源来源说明。

没有完成全部适用检查时创建 Draft PR，并清楚标记阻塞。不要为了让模板“全绿”而虚假勾选。

## 8. Review 与合并

- 重要代码、架构、数据、测试和部署变更至少由一名非作者审阅。
- reviewer 核对实际 diff，不只看 PR 描述和截图。
- 阻塞评论解决后再请求复审。
- PR 分支同步目标基线时必须遵守第 2 节的 rebase 门禁；PR 合并时是否 squash/rebase 则由组长按贡献证据和仓库策略决定。Codex 不得在未获单独授权时改写已经发布的任务分支历史。
- 合并后更新看板、进度 Markdown、追溯和证据索引。

## 9. Tag 与发布

- `monolith-start` 只有在教师确认范围、UC01-UC06 smoke、build 和 README 复现全部通过后创建。
- 使用 annotated tag，并记录 commit、执行环境和证据。
- 已推送基线标签不可移动、覆盖或删除。
- 镜像和部署版本使用 Git SHA 或明确版本号，不只使用 `latest`。
