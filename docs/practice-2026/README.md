# 2026 夏季《软件工程基础实践》执行资料

> 状态：`TECHNICAL GATES VERIFIED / DEL-01 HUMAN EVIDENCE PENDING`。
>
> 基准日期：2026-08-31；最终答辩：2026-09-04 14:00–17:00。
>
> 唯一进度源：[`00-progress.md`](00-progress.md)。没有真实执行、远端检查或真人原始证据的事项不能标记为完成。

## 已验证范围

- UC01–UC06 单体基线和 `monolith-start` annotated tag。
- identity-community、content-media、live-reward、governance-ai 四个业务微服务的独立 schema、migration、镜像、探针、最小权限和 contract。
- Gateway 读写能力白名单、分阶段历史迁移与切流、requestId 追踪、单体 fallback 和 rollback。
- REG-01 同一 runner 对单体与微服务 Gateway 各跑六个 UC，12/12 PASS。
- GitHub-hosted CI/CD 的 quality、public E2E、Git SHA 镜像、Kind deploy/health/evidence/cleanup 3/3 jobs。
- HPA 1→3→2→1、MySQL/SRS/MinIO 故障与恢复、双目标三轮性能对比。
- DEL-01 六目录技术包、答辩 PPT、技术总结、演示脚本和备用录屏拍摄清单。
- 完整 PR #40–#62 / 72 commit Manifest、README 端口/测试账号/Seed、7 份 PDF/99 页、最终流水线/Playwright/Kind/实验离线原始包。
- 飞书“软工小学期进度文档”管理平台地址、8.25–8.31 日期索引和 8.31 可见技术进度。

用户已提供成员/学号表并授权默认映射 A/林明、B/刘钟屹、C/李晓萌、D/张壮志、E/王一涵。以下仍需要真人原始证据，仓库不会代填：教师确认截图/链接、ARCH 实际参会/聊天/录屏与个人备份人、每日站会/看板截图原件、另一成员 clean-machine 复现确认、贡献核对/权重与五人签字、5–8 分钟备用录屏和实际计时演练。

## 文件索引

| 文件 | 用途 | 当前状态 |
| --- | --- | --- |
| [`00-progress.md`](00-progress.md) | 唯一进度源、测试结果、PR/workflow 与阻塞 | 持续维护 |
| [`01-use-case-scope.md`](01-use-case-scope.md) | UC01–UC06 范围、成功/异常/恢复路径 | 已冻结；教师原始回复待补 |
| [`02-teacher-confirmation-message.md`](02-teacher-confirmation-message.md) | 教师/助教确认消息模板 | 模板完成；回复待补 |
| [`03-smoke-checklist.md`](03-smoke-checklist.md) | 单体基线全用例 Smoke | 技术验证完成 |
| [`04-task-board.md`](04-task-board.md) | 任务卡、角色、Reviewer、状态 | 技术状态已同步 |
| [`05-kickoff-and-standup.md`](05-kickoff-and-standup.md) | 启动会、实名分工和站会模板 | 会议原件待组长补 |
| [`06-evidence-and-dod.md`](06-evidence-and-dod.md) | 最终证据索引、追溯与统一 DoD | 技术证据已索引 |
| [`07-environment-decision.md`](07-environment-decision.md) | Docker/Kubernetes 环境选择与验收 | 已执行 |
| [`08-service-boundaries-and-data-ownership.md`](08-service-boundaries-and-data-ownership.md) | 四服务边界、31 表 owner、失败和迁移 | `DONE / FROZEN` |
| [`09-commit-pr-convention.md`](09-commit-pr-convention.md) | Commit、push、PR、review、tag 和授权 | 所有最终 PR 遵循 |
| [`10-e2e-test-spec.md`](10-e2e-test-spec.md) | 公开 E2E 范围 | 已执行 |
| [`10-uc06-state-diagrams.md`](10-uc06-state-diagrams.md) | UC06 三层模型与状态机 | 已验证 |
| [`11-jenkins-kind-cicd-runbook.md`](11-jenkins-kind-cicd-runbook.md) | Jenkins、Kind、migration 与回滚 | 已执行 |
| [`12-second-stage-todo.md`](12-second-stage-todo.md) | A–E 第二阶段任务、禁止事项与 Gate | 技术项完成；管理项待补 |
| [`13-resilience-performance-experiments.md`](13-resilience-performance-experiments.md) | HPA、故障恢复与性能原始值 | 已验证 |
| [`14-uc01-05-three-layer-models.md`](14-uc01-05-three-layer-models.md) | UC01–UC05 系统/组件/对象模型源 | 已完成 |
| [`15-final-delivery-checklist.md`](15-final-delivery-checklist.md) | DEL-01 技术与真人证据清单 | 技术包就绪；真人项待补 |

最终课程交付从仓库根目录 [`delivery/README.md`](../../delivery/README.md) 进入。

## 执行原则

1. 课程任务书和教师/助教的真实确认优先于仓库计划。
2. 所有数据库、migration、Seed、故障与性能实验只对明确命名的隔离环境执行。
3. 业务 `FAIL` 必须让 runner 和 CI 非零退出；截图不能代替原始日志、代码和可重跑命令。
4. 单体表和 fallback 在课程验收前保留；任何服务切流失败均可回滚。
5. Commit 数量不能作为贡献权重；默认姓名映射已记录，但实际贡献核对、复现、权重、签字和录屏必须由成员本人完成。
