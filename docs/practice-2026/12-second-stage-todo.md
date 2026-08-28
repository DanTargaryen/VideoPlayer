# 第二阶段微服务执行 TODO

> 状态：`MS-00 / MS-01 DONE / MS-02..04 READY`
>
> 冻结基线：`monolith-start` / `main@70d197dc1a1f6febfdc7dcb12d8661384ad5d31e`。
>
> 角色确认：组长在 2026-08-27 确认本人承担 A（平台与集成）；B/C/D/E 分别承担 MS-01/MS-02/MS-03/MS-04，真实姓名和个人备份人仍待组长补录。
>
> 使用方法：每个 owner 只勾选自己实际完成并验证的事项。设计、配置或代码未运行时必须写 `NOT RUN`/`BLOCKED`，不得把计划项提前标记为完成。

## 1. 开工顺序与总 Gate

- [x] UC01–UC06 单体最终 Smoke 全部 PASS。
- [x] annotated `monolith-start` 已创建并固定在最终单体基线。
- [x] ARCH-01 评审完成，全员同意默认方案。
- [x] `docs/ARCH-01-service-boundary-freeze` PR #40 已完成 Owner 自审记录并合并到 `main`。
- [x] A 完成 `build/MS-00-microservice-scaffold`，PR #41 已由 Owner 自审并 squash 合并到 `main@9181e2c9655b3f0b751a0544e95b8ec77dfd5737`。
- [ ] B/C/D/E 从包含 MS-00 的最新 `main` 创建各自 foundation 分支。
- [ ] 四个 foundation 服务均可独立安装、lint、build、test、构建镜像和返回 health/version。
- [ ] identity/content 只读路由完成并保留单体 fallback。
- [ ] identity/content/live/governance 写流量按顺序切换并保留回滚路径。
- [ ] REG-01 在微服务 Gateway 上完成全部公开 API 和 UC01–UC06 回归。

冻结执行顺序：

```text
ARCH-01 文档
→ MS-00 公共脚手架
→ MS-01/MS-02/MS-03/MS-04 foundation 并行
→ identity/content 只读路由
→ identity/content/live/governance 写流量切换
→ REG-01
```

第一批 foundation 不得删除单体表、停止单体写入、跨服务复用 Prisma Client，或在没有 fallback/rollback 的情况下切换 Gateway 写流量。

## 2. 所有成员统一 Git 工作流

### 2.1 owner 第一次创建分支

```bash
git fetch origin --prune
git switch main
git merge --ff-only origin/main
git switch -c <category>/<task-id>-<slug>
```

提交前：

```bash
git status --short --branch
git diff
git diff --cached
```

首次 push 前：

```bash
git fetch origin --prune
git rebase origin/main
git merge-base --is-ancestor origin/main HEAD
git rev-list --left-right --count origin/main...HEAD
```

只有目标侧计数为 `0` 时才能执行：

```bash
git push --set-upstream origin <自己的分支>
```

### 2.2 已存在远端分支的 owner

第一次获取：

```bash
git fetch origin --prune
git switch --track origin/<分支名>
```

本地已经存在：

```bash
git switch <分支名>
git pull --ff-only
```

### 2.3 Reviewer 只读检查

```bash
git fetch origin --prune
git switch --detach origin/<待审分支>
git log origin/main..HEAD --oneline
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Reviewer 默认不直接在作者分支提交。确需协作修改时，由作者明确同意提交方式；禁止未经授权的 force-push、合并、远端分支删除或标签操作。组长已确认 Owner 可以亲自审核并直接通过；采用 Owner 自审时，必须在 PR 留下范围、测试、风险、基线和结论的书面记录。

## 3. A（组长 / 平台与集成）TODO

### 3.1 主任务

- 任务：MS-00、K8S-01、Gateway、内部鉴权、Jenkins 微服务矩阵和集成节奏。
- 第一批分支：`build/MS-00-microservice-scaffold`。
- Reviewer：默认 E；MS-00 PR #41 按已确认规则由 Owner 自审通过。
- 计划 Gate：8/31 前公共骨架可独立构建、测试和部署。

### 3.2 公共目录与工作区

- [x] 从 ARCH-01 已合并的最新 `main` 创建 MS-00 分支。
- [x] 建立 `services/identity-community/`。
- [x] 建立 `services/content-media/`。
- [x] 建立 `services/live-reward/`。
- [x] 建立 `services/governance-ai/`。
- [x] 建立 `services/gateway/`。
- [x] 建立 `services/shared-contracts/`。
- [x] 每个服务拥有独立 `package.json`、`tsconfig.json`、入口和测试配置。
- [x] 根 workspace 能发现所有服务，依赖声明与 lockfile 同步。

每个服务统一目录：

```text
services/<service>/
├── src/
├── prisma/
│   └── schema.prisma
├── test/
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

### 3.3 统一运行契约

- [x] 四服务实现 `GET /health/live`。
- [x] 四服务实现 `GET /health/ready`。
- [x] 四服务实现 `GET /version`。
- [x] `/version` 返回 service name、Git SHA 和构建时间或版本号。
- [x] 统一 API response 结构。
- [x] 统一 requestId 生成、透传和日志字段。
- [x] 统一结构化日志格式。
- [x] 日志不打印 Token、密码、数据库口令或 Secret。
- [x] 每个服务有最小 health/version 单元或 API 测试。

### 3.4 内部 API 鉴权

- [x] 定义服务账号 JWT claim：`sub`、`aud`、`scope`、`requestId`、`iat`、`exp`。
- [x] 实现内部 API JWT Guard。
- [x] 验证调用方 service name 和 audience。
- [x] 验证 scope，不只验证签名。
- [x] Secret 通过环境变量/K8s Secret 注入，不提交真实值。
- [x] Token 过期、audience 错误、scope 缺失和签名错误均有测试。
- [x] 明确内部调用 timeout 默认值和允许覆盖方式。

### 3.5 Gateway 与 fallback

- [x] 建立 Gateway 配置骨架。
- [x] 初始所有生产路径仍指向单体。
- [x] 支持按路径切换至微服务。
- [x] 支持按配置快速切回单体。
- [x] 记录上游 service/version/requestId。
- [x] 上游 timeout、502/503 和 fallback 行为有测试或可复现脚本。
- [x] 第一批 MS-00 不切换现有业务写流量。

计划路径：

```text
/api/v1/auth/*     → identity-community
/api/v1/users/*    → identity-community
/api/v1/videos/*   → content-media
/api/v1/search/*   → content-media
/api/v1/lives/*    → live-reward
/api/v1/admin/*    → governance-ai
/api/v1/reports/*  → governance-ai
```

### 3.6 Docker、K8s 与 Jenkins

- [x] 提供可复用的多阶段 Dockerfile 模板。
- [x] 镜像使用 Git SHA，不只使用 `latest`。
- [x] 为四服务提供 Deployment/Service 模板。
- [x] 配置 readiness/liveness probes。
- [x] 配置 CPU/memory requests 和 limits。
- [x] Secret 只通过 Kubernetes Secret 引用。
- [x] Jenkins 能检测并构建 `services/`。
- [x] Jenkins 矩阵覆盖 install/lint/build/unit/contract/image/deploy/health。
- [x] 任一服务测试失败时阻断其镜像和部署阶段。
- [x] 提供 Kind 部署与清理入口。

### 3.7 A 第一批禁止事项

- [x] 未在 MS-00 中迁移具体用户、视频、直播或治理业务。
- [x] 未删除单体代码、表、migration 或 fallback。
- [x] 未在真实 Secret 缺失时提交临时口令。
- [x] 未把四服务 foundation 的业务实现全部塞入 MS-00。

### 3.8 A 第一批 Gate

- [x] 四服务可以独立安装。
- [x] 四服务可以独立 lint/build/test。
- [x] 四服务镜像可以构建。
- [x] health/live、health/ready、version 全部通过。
- [x] JWT Guard 测试通过。
- [x] Gateway 单体 fallback 通过。
- [x] Kind 可以部署四个空服务。
- [x] PR #41 完成 Owner 自审书面记录并 squash 合并；该记录按已确认规则替代 E 的非作者 Review。

## 4. B（身份与社区）TODO

### 4.1 主任务

- 任务：MS-01 `identity-community`。
- 分支：`feature/MS-01-identity-community`。
- Reviewer：C。
- 对应用例：UC01、UC04 用户/关注/通知部分。

### 4.2 数据 owner

- [x] `User`
- [x] `DirectMessage`
- [x] `UserProfileSummary`
- [x] `UserCategoryPreference`
- [x] `UserCreatorPreference`
- [x] `DynamicPost`
- [x] `DynamicPostLike`
- [x] `DynamicPostComment`
- [x] `FollowRelation`
- [x] `Notification`
- [x] `CreatorFollowerDaily`

### 4.3 Foundation

- [x] 基于已合并 MS-00 的最新 `main` 创建分支。
- [x] 建立独立 identity Prisma schema。
- [x] 跨域 ID 不建立到其他 schema 的外键。
- [x] migration 可在全新 identity 测试库首次和重复执行。
- [x] 提供最小 seed/fixture。
- [x] identity 数据库账号只能访问 identity schema。
- [x] 服务可独立启动、build、test 和构建镜像。

### 4.4 内部 API

- [x] `POST /internal/v1/users/batch-summary`。
- [x] `GET /internal/v1/users/:id/exists`。
- [x] `POST /internal/v1/notifications`。
- [x] batch-summary 支持批量、缺失 ID 和稳定返回顺序/映射。
- [x] notifications 使用 requestId 幂等。
- [x] 内部 API 使用 A 提供的服务 JWT Guard。

### 4.5 第一批公开能力与测试

- [x] 注册成功、重复用户名/邮箱拒绝。
- [x] 登录成功、错误密码拒绝。
- [x] 当前用户查询。
- [x] 资料读取与更新。
- [x] 重新登录使旧 Token 失效的单会话 nonce 行为保持。
- [x] batch-summary、exists、notification contract tests 通过。
- [x] UC01 API 主流程与异常流程通过。
- [x] UC04 的关注/通知最小链路通过。

### 4.6 B 第一批禁止事项

- [x] 未切换 Gateway 写流量。
- [x] 未删除单体 User/关系/通知表。
- [x] 未让 content/live/governance 使用 identity Prisma Client。
- [x] 未修改其他服务 schema。
- [x] 未把全部动态社区 UI 迁移混入 foundation。

### 4.7 B 验收证据

- [x] clean `npm ci` 与完整 `npm run test:ci` 通过：requirements 115、backend 16、frontend 22、services 18，共 171 项。
- [x] identity memory contract 5/5、真实 MySQL restart/multi-instance integration 1/1。
- [x] 初始 migration 首次/重复、guarded seed、test reset 通过；非 test reset 在连接前被拒绝。
- [x] Docker runtime/migration 镜像构建；Compose migration、五服务 live/ready/version、identity 重启后登录、12 表与账号 schema 隔离通过。
- [x] `phone` 保留，`sessionNonce` 持久化；`coinBalance` 不再属于 identity schema，迁移/回滚说明已同步。
- [x] Gateway 保持 monolith/fallback；没有停止单体写入或删除单体表。
- [ ] Kind 实际 rollout：`NOT RUN`；新增 Secret、migration Job、部署脚本已通过 Shell/Kustomize 静态检查，后续由平台集成批次在隔离 Kind 重跑。

## 5. C（内容与媒体）TODO

### 5.1 主任务

- 任务：MS-02 `content-media`。
- 分支：`feature/MS-02-content-media`。
- Reviewer：B。
- 对应用例：UC02、UC03、UC04 内容互动部分。

### 5.2 数据 owner

- [x] `Video`
- [x] `VideoCategory`
- [x] `VideoAiSummary`（首批不切写流量）
- [x] `VideoAiChatSession`（首批不切写流量）
- [x] `VideoAiChatMessage`（首批不切写流量）
- [x] `UserVideoWatch`
- [x] `VideoAsset`
- [x] `Comment`
- [x] `VideoLike`
- [x] `Favorite`
- [x] `FavoriteFolder`
- [x] `VideoDanmaku`
- [x] `CreatorPlayDaily`

### 5.3 Foundation 与只读 API

- [x] 基于已合并 MS-00 的最新 `main` 创建分支。
- [x] 建立独立 content Prisma schema、migration 和 fixture。
- [x] creatorId/userId 为外部 ID，不建立跨 schema FK。
- [x] `GET /api/v1/feeds/recommend`。
- [x] `GET /api/v1/search/all`。
- [x] `GET /api/v1/videos/:id`。
- [x] `GET /api/v1/videos/:id/recommendations`。
- [x] 使用 identity batch-summary client，不直接查询 User。
- [x] 第一批可以 mock identity，但 contract 必须与 B 一致。

### 5.4 内部 API contract

- [x] `POST /internal/v1/videos/:id/review-decision`，decisionId 幂等。
- [x] `POST /internal/v1/videos/:id/text-status`。
- [x] `POST /internal/v1/replays`，requestId/objectKey 幂等。
- [x] `POST /internal/v1/videos/batch-summary`。
- [x] 依赖 identity 不可用时有 timeout 和可解释 fallback。

### 5.5 媒体边界与测试

- [x] 保留扩展名/MIME/FFprobe 视频流验证。
- [x] 伪装 MP4 返回 400。
- [x] 无效媒体不创建 VideoAsset/Video/MinIO object。
- [x] 写入数据库失败时精确删除本次对象。
- [x] 推荐、无结果搜索、视频详情和草稿隔离测试通过。
- [x] review-decision/replay/batch-summary contract tests 通过。
- [x] 服务可独立 build/test/image/health/version。

说明：本轮已在 `content-media` foundation 中覆盖扩展名/MIME 前置拒绝、真实 `ffprobe` 视频流探测、伪装 MP4 400、无效媒体不创建内容记录、写库失败精确清理对象；运行时镜像安装 `ffmpeg`/`ffprobe`，并提供 `npm --workspace @videoplayer/content-media run verify:container` 用临时 MySQL 复测 image/migration/fixture/health/version/ffprobe。Docker Desktop 重启后已成功拉取 `node:22-bookworm-slim`，实际构建 `video-player/content-media:verify`，通过 `live`、`ready`、`container-smoke` version、`ffprobe` 和真实 MP4 服务探测；另用 `npm --workspace @videoplayer/content-media run verify:minio` 启动临时 MinIO，验证伪装 MP4 400 且 0 object/row、合法 MP4 201、数据库失败后只删除本次真实 object。

### 5.6 C 第一批禁止事项

- [x] 未切上传、投稿或互动写流量。
- [x] 未迁移 VideoAi 写路径。
- [x] 未直接查询 User/Notification/CoinTransaction。
- [x] 未删除单体 Video/Asset/Comment 等表。
- [x] 未自定义与 B 不兼容的用户摘要结构。

## 6. D（直播与礼物）TODO

### 6.1 主任务

- 任务：MS-03 `live-reward`。
- 分支：`feature/MS-03-live-reward`。
- Reviewer：A。
- 对应用例：UC05。

### 6.2 现有数据 owner

- [ ] `CoinTransaction`
- [ ] `DailyCoinClaim`
- [ ] `StreakMilestoneClaim`
- [ ] `VideoCoinContribution`

### 6.3 新增持久化模型

- [ ] `LiveRoom`
- [ ] `LiveSession`
- [ ] `LiveMessage`
- [ ] `LiveViewerEvent`
- [ ] `ReplayRegistration`
- [ ] 房间、Session、状态、开始/结束时间、streamKey 和 replay 状态以数据库为事实来源。
- [ ] 内存只保存 PeerConnection、SSE/长连接、临时媒体流和短期连接缓存。
- [ ] 后端重启后房间和 Session 状态仍可查询。

### 6.4 直播生命周期与 SRS

- [ ] `POST /api/v1/lives/rooms`。
- [ ] `POST /api/v1/lives/rooms/:id/start`。
- [ ] `POST /api/v1/lives/rooms/:id/stop`。
- [ ] `GET /api/v1/lives/rooms/:id`。
- [ ] `GET /api/v1/lives/sessions/:id`。
- [ ] SRS adapter 有明确 timeout。
- [ ] SRS 正常时开播成功。
- [ ] SRS 不可用时返回明确错误且不盲目无限重试。
- [ ] SRS 恢复后可重新开播。
- [ ] SRS 故障不影响其他服务 health。

### 6.5 回放登记

- [ ] ReplayRegistration 状态包含 PENDING/REGISTERING/COMPLETED/FAILED_RETRYABLE/FAILED_FINAL。
- [ ] 调用 content `/internal/v1/replays`。
- [ ] content 不可用时直播仍可正常结束。
- [ ] attempts、lastError 和 nextRetryAt 可审计。
- [ ] requestId/objectKey 保证不会重复创建 content video。
- [ ] WebM/MP4 文件名、数据库 MIME 和 MinIO Header 一致。

### 6.6 币账本与消息留存

- [ ] 所有余额写入只由 live-reward 执行。
- [ ] 视频投币通过内部 API 和 requestId 幂等。
- [ ] balanceAfter、videoId、userId 和 requestId 可审计。
- [ ] 普通直播消息保留 7 天。
- [ ] 每个 Session 最多 10,000 条普通消息。
- [ ] 超限清理最早消息，不删除房间、Session、回放和审计事实。

### 6.7 D 第一批禁止事项

- [ ] 未先改前端 UI 代替持久化工作。
- [ ] 未直接写 content 的 Video/VideoAsset。
- [ ] 未直接查 identity User。
- [ ] 未在持久化和回滚未完成前切换直播写流量。
- [ ] 未把全部币业务混入第一批持久化 PR。

## 7. E（治理、质量与文档）TODO

### 7.1 主任务

- 任务：MS-04 `governance-ai`、REG-01。
- 业务分支：`feature/MS-04-governance-ai`。
- 测试分支：`test/REG-01-microservice-contracts`。
- Reviewer：D。
- 对应用例：UC06，并协调全部 UC 回归证据。

### 7.2 数据 owner

- [ ] `VideoReview`
- [ ] `CommentAiTask`
- [ ] `ReportRecord`
- [ ] 新增 `ModerationDecision`
- [ ] requestId、decisionId、applyStatus、attempts、lastError 和审计字段进入 schema。

### 7.3 举报与审核状态

- [ ] 相同 reporter/target 并发请求只产生一条 PENDING。
- [ ] 处理后释放 pendingKey，允许再次举报。
- [ ] 重复处置明确拒绝。
- [ ] 审核决定状态包含 PENDING/DECIDED/APPLY_PENDING/APPLIED/APPLY_FAILED_RETRYABLE/APPLY_FAILED_FINAL。
- [ ] content 不可用时决定不丢失，保持 APPLY_PENDING。
- [ ] 后台补偿重试可审计。
- [ ] governance 不直接修改 Video/Comment/VideoDanmaku。
- [ ] governance 不直接查询 User/Notification 主表。

### 7.4 跨服务 contract tests

- [ ] identity batch-summary。
- [ ] identity notifications 幂等。
- [ ] content review-decision 幂等。
- [ ] content text-status。
- [ ] content replay registration 幂等。
- [ ] 服务 JWT 成功、过期、audience 和 scope 错误。
- [ ] timeout、502/503、fallback 和补偿状态。
- [ ] contract 版本和不兼容变更检测。

### 7.5 REG-01 骨架

- [ ] 同一套测试可配置 `MONOLITH_BASE_URL`。
- [ ] 同一套测试可配置 `MICROSERVICE_GATEWAY_BASE_URL`。
- [ ] 报告包含目标环境、Git SHA 和服务版本。
- [ ] 结果只使用 PASS/FAIL/BLOCKED/NOT RUN。
- [ ] 第一批只建立入口，不虚报微服务 UC01–UC06 已完成。

### 7.6 E 第一批禁止事项

- [ ] 未复制 Video/Comment/Danmaku 成为 governance 主表。
- [ ] 未直接修改 identity/content/live schema。
- [ ] 未把未授权的真实外部 AI 调用写成 PASS。
- [ ] 未在 content contract 未完成时直接写对方数据库。

## 8. 交叉 Review TODO

| 作者 | Reviewer | 必查事项 |
| --- | --- | --- |
| A | E（默认）/ Owner（经确认可自审） | contract、CI、Secret、Artifact、证据和回滚；Owner 自审必须书面留痕 |
| B | C | 用户摘要、identity owner、content 依赖 |
| C | B | 禁止直查 User、通知调用、MinIO/媒体边界 |
| D | A | SRS、K8s、持久化、回放、账本和故障恢复 |
| E | D | 举报幂等、审核补偿、目标状态应用和审计 |
| Gateway | A + 两侧 owner | 路由、timeout、fallback、兼容和回滚 |

每个 Review 必须完成：

- [ ] 核对 `origin/main...HEAD` 实际 diff。
- [ ] 核对 commit 正文中的 Tests 与真实结果一致。
- [ ] 核对没有跨 schema 查询或复用对方 Prisma Client。
- [ ] 核对没有 `.env`、Secret、日志、PID、dist、test-results 等产物。
- [ ] 核对 migration 可重跑、失败停止和 rollback。
- [ ] 核对内部写接口有 requestId/decisionId 幂等。
- [ ] 核对依赖失败有 timeout、状态和补偿/回滚。
- [ ] 阻塞评论解决后再批准合并。

## 9. 第一批 PR 统一 DoD

每个 foundation PR 至少满足：

- [ ] 分支从最新 `origin/main` 创建或已 rebase。
- [ ] `git merge-base --is-ancestor origin/main HEAD` 通过。
- [ ] `origin/main...HEAD` 目标侧计数为 0。
- [ ] 服务可以独立安装、lint、build、test。
- [ ] 独立 Docker image 可以构建。
- [ ] `/health/live`、`/health/ready`、`/version` 可访问。
- [ ] 有独立 Prisma schema、migration 和最小 fixture。
- [ ] 服务数据库账号不访问其他 schema。
- [ ] 不使用其他服务 Prisma Client。
- [ ] 内部 API 有 contract 和 JWT scope。
- [ ] 写操作有 requestId/decisionId 幂等。
- [ ] 依赖失败有 timeout 和明确业务状态。
- [ ] 有单体 fallback 和 rollback 说明。
- [ ] 至少一条对应 UC 的 API/contract test。
- [ ] 更新 `docs/practice-2026/00-progress.md`。
- [ ] PR 由指定非作者 Reviewer 检查，或按已确认规则完成 Owner 自审书面记录。
- [ ] 生成产物已跟踪数量为 0。

不得提交：

- `artifacts/`
- `playwright-report/`
- `test-results/`
- `coverage/`
- `dist/`、`build/`
- 日志、PID、缓存、本地数据库、上传文件
- `.env`、真实 Token、数据库口令、MinIO/云密钥
- 与本任务无关的格式化或业务改动

## 10. 集成与切流 TODO

### 10.1 Foundation 阶段

- [x] A 的 MS-00 已通过 PR #41 合并到 `main@9181e2c`。
- [ ] B/C/D/E foundation 均从同一最新 `main` 开始。
- [ ] 四服务独立 schema 与数据库账号就绪。
- [ ] 四服务 health/version 和镜像就绪。
- [ ] contract tests 在 mock/真实服务组合下可执行。

### 10.2 只读路由阶段

- [ ] identity 用户摘要内部 API 先就绪。
- [ ] content 推荐/搜索/详情通过 identity contract。
- [ ] Gateway 只读路由切换并保留单体 fallback。
- [ ] UC01–UC04 只读路径回归通过。
- [ ] 日志能按 requestId 串联 Gateway 与服务调用。

### 10.3 写流量阶段

- [ ] identity 登录/资料/关注写流量切换。
- [ ] content 上传/投稿/互动写流量切换。
- [ ] live 房间/Session/消息/回放/账本写流量切换。
- [ ] governance 审核/举报/处置写流量切换。
- [ ] 每一步切换前完成迁移、行数/唯一约束/抽样校验。
- [ ] 每一步切换后执行对应 UC，并演练 Gateway 切回单体。
- [ ] REG-01 全部通过前不停止单体写入、不删除单体表。

## 11. A（组长）每日检查清单

- [ ] 每个人同时最多 1–2 个 In Progress 任务。
- [ ] 每个任务只有一个 owner 和明确 Reviewer。
- [ ] 分支基于最新 `main`，没有直接 push `main`。
- [ ] 没有人跨服务直接查表。
- [ ] 没有人提前删除单体表或停止单体写入。
- [ ] 内部 API contract、JWT scope、timeout 和幂等明确。
- [ ] 每项运行结果有命令、数量和 PASS/FAIL/BLOCKED 证据。
- [ ] 每个 PR 有 rollback 和单体 fallback。
- [ ] `00-progress.md` 按真实状态更新。
- [ ] 当日站会与约 200 字简报已保存。
- [ ] 看板卡经过 Review 和 Verify 后再进入 Done。

## 12. 当前待补管理证据

- [ ] 补录 A（组长）的真实姓名。
- [ ] 补录 B/C/D/E 的真实姓名。
- [ ] 补录每个人 8/25–9/4 的可用时间。
- [ ] 补录每个人的真实备份人。
- [ ] 补录 ARCH-01 签到、聊天截图、录屏或会议纪要原件。
- [ ] 补录教师/助教确认回复的截图或链接。
- [ ] 指定次日 9:00 站会和 12:00 简报的实名负责人。

这些管理证据待办不改变已冻结的技术方案，但必须在中期检查和最终交付前补齐。
