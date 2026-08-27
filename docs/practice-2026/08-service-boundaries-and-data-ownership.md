# 四业务服务边界、接口与数据归属（ARCH-01 冻结版）

> 状态：`FROZEN / TEAM APPROVED`（2026-08-27）
>
> 目标：满足“至少 3 个业务微服务、每张业务表有唯一管理服务、禁止跨服务直接查询、调用失败有处理”的课程要求。
>
> 冻结架构：`identity-community`、`content-media`、`live-reward`、`governance-ai`。API Gateway/Ingress、前端、MySQL、Redis、MinIO、SRS 不计入业务服务数量。
>
> 评审依据：组长于 2026-08-27 确认评审会已完成，全体同意本文默认方案，并明确本人承担 A（平台与集成）。当前仓库记录角色 A-E 及职责；真实姓名、签到或会议截图由组长后续补入管理证据索引，不在本文虚构。

## 0. 评审结论与执行分工

### 0.1 已冻结的七项决策

| 决策项 | 冻结结论 | 约束 / 后续动作 |
| --- | --- | --- |
| `DynamicPost*` 范围与归属 | 保留在本次范围，归 `identity-community` | 动态、点赞和评论只访问 identity schema |
| `VideoAi*` 范围与归属 | 数据 owner 为 `content-media`，第一批微服务不切换其写流量 | 单体兼容入口保留；后续迁移必须另立任务并补外部模型验证 |
| 礼物币与视频投币 | 统一由 `live-reward` 管理账本，同时支持直播奖励和视频投币 | 其他服务不得直接修改余额；使用 requestId 幂等内部接口 |
| 内部 API 鉴权 | 服务账号 JWT + Kubernetes Secret | JWT 包含调用方、受众、scope 和过期时间；Secret 不入库、日志不打印完整 Token |
| 数据迁移 | 短暂停写窗口 + 可重复执行脚本，不采用复杂双写 | 校验行数、唯一约束和抽样结果；失败停止；保留网关切回单体和数据库恢复路径 |
| 直播消息留存 | 普通消息保留 7 天，每个 Session 最多 10,000 条 | 超限按最早消息清理；房间、Session、回放登记与审计事实不随聊天清理 |
| 平台与备份责任 | A 负责平台/K8s/Jenkins；组长负责授权和最终 Gate；E 负责合同测试与证据；各服务 owner 负责本域 migration/rollback | 真实姓名、可用时间和个人备份人仍需组长补入 `05-kickoff-and-standup.md` |

### 0.2 第二阶段分工与 Review

| 角色 | 任务 | 主要范围 | 建议分支 | 主 Reviewer | 计划 Gate |
| --- | --- | --- | --- | --- | --- |
| 组长 / A 平台与集成 | ARCH-01 / MS-00 / K8S-01 | 决策冻结、依赖解除、合并顺序、公共脚手架、Gateway、服务 JWT、Docker/K8s/Jenkins 和最终验收 | `docs/ARCH-01-service-boundary-freeze`、`build/MS-00-microservice-scaffold` | 全员核对 ARCH-01；E review MS-00 | ARCH-01 文档先合并；8/31 骨架可独立构建/部署 |
| B 身份与社区 | MS-01 | 账号、资料、关注、私信、通知、动态社区和用户摘要 API | `feature/MS-01-identity-community` | C | 8/31 UC01 与 UC04 用户侧通过 |
| C 内容与媒体 | MS-02 | 视频、资产、MinIO、推荐搜索、投稿、评论弹幕、观看和创作者统计 | `feature/MS-02-content-media` | B | 8/31 UC02/03/04 内容侧通过 |
| D 直播与礼物 | MS-03 | 直播持久化、SRS、观众/消息、录播重试、币与奖励账本 | `feature/MS-03-live-reward` | A | 9/1 UC05 与依赖故障路径通过 |
| E 治理、质量与文档 | MS-04 / REG-01 | 审核、举报、处置审计、AI 辅助、contract tests、全 UC 回归和证据 | `feature/MS-04-governance-ai`、`test/REG-01-microservice-contracts` | D | 9/1 UC06；9/2 全量回归 |

执行顺序冻结为：ARCH-01 文档 → MS-00 公共骨架 → 四服务 foundation 并行 → 只读路由 → 写流量切换 → REG-01。第一批 foundation 只建立独立启动、schema、migration、health/version、测试和镜像，不删除单体表、不提前切写流量。

各角色逐项可勾选的执行清单见 `12-second-stage-todo.md`。

## 1. 统一边界规则

1. 每个 Prisma model 只有一个 owner 服务。
2. 同一 MySQL 服务器可使用多个数据库/Schema，但服务使用独立账号，只能访问自己的 Schema。
3. 跨服务不建立数据库外键、不联表、不复用对方 Prisma Client。
4. 跨服务引用只保存外部 ID；显示用昵称/标题等通过批量 API 或事件快照获取。
5. 第一版优先使用 REST + 明确 timeout + 幂等键 + 有限重试；不为课程展示强行引入复杂消息平台。
6. 主操作成功、通知失败时，不回滚已完成的主体操作；记录待重试状态。
7. 涉及发布、扣币、审核决定等关键写操作必须有幂等键和审计字段。
8. 所有服务提供 `/health/live`、`/health/ready` 和 `/version`，镜像以 Git SHA 版本化。

## 2. 服务职责

### 2.1 identity-community

负责账号、资料、身份凭据、关注关系、私信、通知和动态社区。

现有模块来源：`auth`、`user`、`follow`、`message`、`notification`、`feed` 中的动态部分、`captcha`、`email`。

不负责：视频状态、媒体对象、视频评论、直播房间、审核决定。

### 2.2 content-media

负责视频稿件、媒体资产、分类、搜索/推荐、观看记录、视频互动和创作者内容统计。

现有模块来源：`video`、`storage`、`media-proxy`、`creator`、`search`、`comment`、`feed` 中的视频发现部分、`ai` 中的视频能力（如保留）。

不负责：用户账号、直播会话、礼物币账本、最终审核/举报决定。

### 2.3 live-reward

负责直播房间/会话、观众、聊天、SRS 编排、录播任务、礼物币和奖励账本。

现有模块来源：`live`、`gift`；需要新增持久化模型替换当前进程内 `Map`。

不负责：用户资料、公开视频资产主记录、审核决定。

### 2.4 governance-ai

负责视频审核、文本审核、举报、处置审计和 AI 辅助任务。

现有模块来源：`admin`、`report`、`agent`、`comment-ai`。

不负责：直接写 content/identity/live 数据表；通过对方内部 API 应用状态变更。

## 3. 现有 31 个 Prisma Model 归属

| # | Model | Owner 服务 | 迁移说明 / 跨服务引用 |
| --- | --- | --- | --- |
| 1 | `User` | identity-community | 身份主数据；其他服务只保存 `userId`，不建 FK |
| 2 | `DirectMessage` | identity-community | sender/recipient 均为本服务 User |
| 3 | `UserProfileSummary` | identity-community | 用户画像摘要；向 content 提供只读偏好 API |
| 4 | `UserCategoryPreference` | identity-community | categoryId 作为外部内容分类 ID |
| 5 | `UserCreatorPreference` | identity-community | creatorId 为本服务 User，可由内容互动事件更新 |
| 6 | `Video` | content-media | creatorId 变为外部 userId；审核通过由内部 API 更新状态 |
| 7 | `VideoCategory` | content-media | 只关联本服务 Video |
| 8 | `VideoAiSummary` | content-media | 如 AI 视频能力保留；模型调用配置使用 Secret |
| 9 | `VideoAiChatSession` | content-media | userId 为外部 ID，不跨服务 FK |
| 10 | `VideoAiChatMessage` | content-media | 只关联本服务 ChatSession |
| 11 | `UserVideoWatch` | content-media | userId 为外部 ID；观看行为可发事件更新偏好 |
| 12 | `VideoAsset` | content-media | MinIO objectKey/URL 主记录；录播由 live 调内部 API 登记 |
| 13 | `VideoReview` | governance-ai | videoId/reviewerId 为外部 ID；决定后调用 content API |
| 14 | `Comment` | content-media | userId 为外部 ID；治理只通过 API 隐藏/恢复 |
| 15 | `DynamicPost` | identity-community | 动态社区归身份/关系域；authorId 为本服务 User |
| 16 | `DynamicPostLike` | identity-community | 只关联本服务 DynamicPost/User |
| 17 | `DynamicPostComment` | identity-community | 只关联本服务 DynamicPost/User |
| 18 | `CommentAiTask` | governance-ai | commentId/videoId/requesterId 为外部 ID，不建跨服务 FK |
| 19 | `FollowRelation` | identity-community | 只关联本服务 User |
| 20 | `Notification` | identity-community | relatedType/relatedId 保持松耦合外部引用 |
| 21 | `VideoLike` | content-media | userId 为外部 ID；唯一约束仍为 videoId+userId |
| 22 | `CoinTransaction` | live-reward | userId/videoId 为外部 ID；作为余额账本不可由其他服务直写 |
| 23 | `DailyCoinClaim` | live-reward | userId 外部 ID；按日期唯一 |
| 24 | `StreakMilestoneClaim` | live-reward | userId 外部 ID；按里程碑唯一 |
| 25 | `VideoCoinContribution` | live-reward | videoId 外部 ID；成功后通知 content 更新展示计数 |
| 26 | `Favorite` | content-media | userId 外部 ID；唯一约束 videoId+userId |
| 27 | `FavoriteFolder` | content-media | userId 外部 ID；收藏夹属于内容消费能力 |
| 28 | `VideoDanmaku` | content-media | userId 外部 ID；治理通过 API 改状态 |
| 29 | `ReportRecord` | governance-ai | reporter/handler/target 均为外部 ID；保存目标类型快照 |
| 30 | `CreatorPlayDaily` | content-media | creatorId 外部 ID；由播放事实聚合 |
| 31 | `CreatorFollowerDaily` | identity-community | 关注关系派生统计；content 通过 API 查询 |

归属检查结果：31/31 已分配唯一 owner。

## 4. 建议新增的直播/审计模型

这些模型不计入“现有 31 表归属”检查，但 UC05 多副本/重启恢复需要持久化：

| Model | Owner | 关键字段 | 目的 |
| --- | --- | --- | --- |
| `LiveRoom` | live-reward | id、broadcasterId、title、category、status、streamKey | 持久化直播间和状态机 |
| `LiveSession` | live-reward | roomId、startedAt、endedAt、sourceMode、replayStatus | 区分多次开播会话 |
| `LiveMessage` | live-reward | sessionId、senderId、kind、content、createdAt | 聊天/系统消息持久化 |
| `LiveViewerEvent` | live-reward | sessionId、viewerId、eventType、createdAt | 观众进入/离开和实验证据 |
| `ReplayRegistration` | live-reward | sessionId、objectKey、contentVideoId、status、attempts | 录播登记的可重试状态 |
| `ModerationDecision` | governance-ai | targetType、targetId、decision、reason、operatorId、requestId | 统一审核/处置审计与幂等 |

## 5. 最小接口清单

### 5.1 identity-community

公开接口：

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/:id/homepage`
- `POST|DELETE /api/v1/users/:id/follow`
- `GET|POST /api/v1/messages/...`
- `GET /api/v1/notifications`

内部接口：

- `POST /internal/v1/users/batch-summary`：按 userId 批量返回昵称/头像快照。
- `POST /internal/v1/notifications`：幂等创建通知。
- `GET /internal/v1/users/:id/exists`：校验外部 userId。

### 5.2 content-media

公开接口：

- `GET /api/v1/feeds/recommend`
- `GET /api/v1/search/all`
- `GET|POST|PUT /api/v1/videos/...`
- `POST /api/v1/videos/upload`
- `GET|POST /api/v1/videos/:id/comments`
- 点赞、收藏、弹幕、观看进度接口。

内部接口：

- `POST /internal/v1/videos/:id/review-decision`：应用审核决定，带 decisionId 幂等。
- `POST /internal/v1/videos/:id/text-status`：治理服务隐藏/恢复评论或弹幕。
- `POST /internal/v1/replays`：live 登记录播资产并返回 contentVideoId。
- `POST /internal/v1/videos/batch-summary`：向其他服务提供标题/封面快照。

### 5.3 live-reward

公开接口：

- `POST|GET /api/v1/lives/rooms`
- `POST /api/v1/lives/rooms/:id/start|stop`
- 观众信令、消息、事件和回放接口。
- 礼物币余额、领取、礼物/投币接口。

内部接口：

- `POST /internal/v1/live/replays/:id/retry`：重试录播登记。
- `GET /internal/v1/live/sessions/:id/status`：供治理/演示查询会话状态。

### 5.4 governance-ai

公开接口：

- 视频审核队列与决定接口。
- 文本审核队列与决定接口。
- 举报提交、查询和处置接口。
- Agent 预览/建议接口。

内部接口：

- `POST /internal/v1/reviews`：创建待审任务，requestId 幂等。
- `GET /internal/v1/reviews/:targetType/:targetId/latest`：查询最新审核决定。

## 6. 跨服务调用与失败策略

| 场景 | 主服务 → 依赖服务 | timeout / retry | 失败时的业务结果 | 恢复与证据 |
| --- | --- | --- | --- | --- |
| UC03 提交审核 | content → governance | 2s；网络错误最多 2 次；requestId 幂等 | 稿件保持 DRAFT/PENDING_SUBMISSION，提示“已保存，稍后重试”，绝不直接发布 | 保存 outbox/retry 状态；记录 requestId 和日志 |
| UC03 审核决定 | governance → content | 2s；decisionId 幂等重试 | 决定保持 APPLY_PENDING，不丢失审核记录 | 管理员可查看“待应用”；后台重试 |
| UC04 创建通知 | content → identity | 1s；异步有限重试 | 点赞/评论主体成功，通知标记待补偿，不回滚主体 | notification requestId；重试日志 |
| UC04 用户摘要 | content → identity | 1s；只读重试 1 次 | 使用短期昵称/头像快照或显示“用户信息暂不可用” | cache hit/fallback 日志 |
| UC05 录播登记 | live → content | 5s；指数退避，objectKey 幂等 | 直播正常结束，回放显示“处理中” | ReplayRegistration 状态/attempts |
| UC05 SRS 不可用 | live → SRS | 2s；不盲目长重试 | 开播/观看返回设计好的降级提示；其他服务健康 | health/log；故障实验脚本 |
| UC06 举报目标摘要 | governance → content | 1s；只读重试 1 次 | 举报记录可先保存目标 ID/类型，详情显示待同步 | ReportRecord 快照/重试 |
| UC06 应用处置 | governance → content | 2s；decisionId 幂等 | 举报决定保留，目标状态显示 APPLY_PENDING | 审计记录、补偿任务、恢复日志 |

## 7. 数据迁移顺序

1. 冻结 `monolith-start`，保留原 Prisma schema 和 seed。
2. 为四服务分别建立 schema 文件和数据库账号，不删除单体表。
3. 先提取 identity-community 和 content-media 的只读接口，网关可按路径切换。
4. 迁移用户/关系与视频/内容数据，校验行数、唯一约束和抽样结果。
5. 将跨域外键改为普通 ID，并新增批量摘要/内部状态 API。
6. 新增直播持久化表，将内存 Map 改为数据库事实 + 进程内连接缓存。
7. 提取 governance-ai，使用内部 API 应用决定，不直写 content 表。
8. 在相同 seed 上执行 UC01-UC06 回归；通过后才停止单体写入。
9. 保留回滚脚本：网关切回单体、停止微服务写入、恢复单体数据库快照。

## 8. 已完成评审的开放问题

- [x] `DynamicPost*` 保留并归 `identity-community`。
- [x] `VideoAi*` 归 `content-media`，第一批微服务不切换其写流量，保留单体兼容说明。
- [x] 礼物币与视频投币统一归 `live-reward` 账本。
- [x] 内部 API 鉴权采用服务账号 JWT + K8s Secret。
- [x] 数据迁移采用停写窗口 + 可重复执行脚本，不做复杂双写。
- [x] 普通直播消息保留 7 天，每个 Session 最多 10,000 条；业务事实和审计记录不随聊天清理。
- [x] A 负责平台/K8s/Jenkins，组长负责最终授权，E 负责合同测试与证据，各服务 owner 负责本域 migration/rollback；实名与个人备份人待组长补录。

## 9. ARCH-01 完成 Gate

- [x] 4 个业务服务有清晰职责和不负责范围。
- [x] 现有 31/31 Prisma model 有唯一 owner。
- [x] 公开/内部接口清单有首版草案。
- [x] 关键跨服务调用有 timeout、幂等、失败结果和恢复说明。
- [x] 数据迁移与回滚顺序有草案。
- [x] 组长确认全体组员已完成评审并同意默认方案；决策记录见本文第 0 节。
- [x] 教师/助教已确认当前四服务方向（据组长既有书面反馈）；外部回复截图/链接仍需补入证据索引。

因此 `ARCH-01` 状态为 `DONE / FROZEN`。后续若修改服务 owner、表归属、内部接口或迁移顺序，必须新增决策记录并重新经过相关 owner 评审；不得移动 `monolith-start`，也不得静默改写本冻结结论。
