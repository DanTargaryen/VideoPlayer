# 观澜视频平台技术总结

## 1. 目标与范围

项目以六条可验收业务链路为边界：UC01 账户与资料、UC02 发现与播放、UC03 投稿审核发布、UC04 互动与通知、UC05 直播录播与币账本、UC06 举报处置与审计。交付目标不是简单增加服务目录，而是让单体和微服务两种目标都可运行、可回归、可部署、可观察、可失败并可恢复。

## 2. 架构结果

前端统一访问 API Gateway。Gateway 负责身份验证、服务 JWT、requestId、能力白名单和回滚；identity-community、content-media、live-reward、governance-ai 分别拥有独立 Prisma schema、migration、MySQL runtime 账号、镜像和 Kubernetes 工作负载。MinIO 由 content 使用，SRS 由 live 探测和协同；服务之间通过 HTTP contract 与有界 timeout 通信，不跨库直接查询。

拆分过程中保留单体 `monolith-start` 基线与 owner 表。切流先读后写，按 identity → content → live → governance 推进，每一阶段都验证真实服务路径、未实现路径 fallback、requestId/upstream 和显式 monolith rollback。

## 3. 数据迁移与一致性

identity、content、live、governance 均提供双 Prisma 历史迁移入口。迁移要求一次性确认值，拒绝 source=target，默认只允许测试目标；非测试目标需要精确 host/port/database 授权。写入使用可重复策略，结束后逐表全量比较，任何缺失、多余或字段不一致都会失败停止。

最终实测包含 identity/content 的全表和边界字段，以及 live/governance 含真实 ID 10/12 的非空样本双跑。服务切流前后单体表均未删除，为课程验收和回滚保留安全边界。

## 4. 六 UC 与回归

REG-01 v2 为每个目标创建隔离用户和媒体数据，以固定顺序执行六 UC，并输出公开 endpoint 清单和 `PASS/FAIL/BLOCKED/NOT RUN`。业务 FAIL 会使 CLI 非零退出；严格模式拒绝任何未完成用例。

最终标准 Compose 同时启动四业务数据库、MinIO、SRS、四服务、Gateway，以及独立单体数据库/后端。同一 runner 对单体和微服务 Gateway 各执行六项，得到 12/12 PASS，并在结束后验证 monolith rollback 与资源清理。

## 5. CI/CD 与部署

`npm run test:ci` 覆盖 Prisma generate、前后端与六 workspace 的 lint/build、需求/单元测试和 REG harness。GitHub Actions 先执行 quality 与 public E2E，全部通过后才构建 Git SHA 镜像并在隔离 Kind 中运行 migration、rollout、health/version、0 restart、Artifact 和 cleanup。最终技术 PR #48–#57 的远端 run 均为 3/3 jobs success。

Jenkins 流水线另验证了成功、Unit 后故意失败阻断、SCM 自动触发、正式 migration 和 JUnit 发布。成功与失败输出都进入可访问的 Test Result/Artifact，失败过程没有被覆盖成成功截图。

## 6. 弹性、故障与性能

隔离 Kind 中，metrics-server 观测到 content 服务 CPU 约 104% 后，HPA 从 1 扩到 3 个 Ready Pod；撤压且 CPU 回落到约 2% 后，经 2 个中间副本缩回 1。实际时间线为 1→3→2→1。

故障实验分别停止 live MySQL、SRS 和 MinIO：readiness/开播/上传按 contract 返回 503 或 500；依赖恢复后，相同类别业务重新得到 200 或正常结束。其他服务和 Gateway readiness 在单依赖故障期间保持健康。

性能实验在同机、同数据、同脚本、并发 16 下各跑三轮：单体中位 p95 9.44 ms、中位 2334.84 RPS；Gateway 中位 p95 15.57 ms、中位 1435.25 RPS。两目标共 1440 个请求，0 error。结果显示微服务有可测网络与编排开销，但仍处于低延迟范围。

## 7. 风险与回滚

- 单体表仍保留，避免在课程周期内执行不可逆删除。
- Gateway 以能力级 allowlist 切流，不使用粗粒度“全部服务化”开关。
- content 通知通过事务 Outbox 和有界重试，通知失败不回滚主体互动。
- live replay 使用可重试/最终失败状态；SSE 断连不会让 Gateway 在响应头发出后再次写 502。
- migration、Seed、reset、故障与性能实验只对明确命名的隔离环境执行。
- 外部付费 AI 不是最终自动 Gate；治理服务使用可验证的 contract、补偿和人工处置路径。

## 8. 最终结论

仓库技术 Gate 已从单体基线推进到四服务持久化、切流、双目标全回归、远端 CI/CD、弹性、故障恢复和性能证据。DEL-01 六目录、PPT、总结与脚本已准备完毕。

仍未关闭的是必须由真人提供的课程管理证据：教师确认原件、ARCH 会议原件、非作者 clean-machine 复现、五人贡献权重和签字、5–8 分钟备用录屏及全员计时演练。在这些原件到位前，不把 DEL-01 标记为完成。
