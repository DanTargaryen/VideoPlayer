# DEL-01 最终交付包

> 状态：`TECHNICAL PACKAGE READY / HUMAN EVIDENCE PENDING`。
>
> 本目录汇总可从仓库验证的技术产物，不把模板、计划或自动生成文件冒充真人签名、成员复现和实际录屏。严格状态和剩余真人证据见本目录内的 [`requirements-audit.md`](requirements-audit.md)。

任务书九项逐条判定见 [`requirements-audit.md`](requirements-audit.md)：当前严格状态为 **7 项完整、2 项部分完成、0 项完全缺失**。

## 六目录导航

| 目录 | 内容 | 仓库状态 |
| --- | --- | --- |
| [`01_source`](01_source/README.md) | 公开仓库清单、改造前后 ref、服务版本、PR/commit 与校验和 | 技术索引完成 |
| [`02_docs`](02_docs/README.md) | 需求、用例、三层模型、设计、追溯与 PDF | 课程指定 5 份 / 212 页 + 仓库生成 7 份 / 99 页 + 可编辑源 |
| [`03_devops`](03_devops/README.md) | Docker、CI/CD、K8s、migration、部署与回滚 | 119 份实体副本 + 来源 Manifest + SHA-256 |
| [`04_tests`](04_tests/README.md) | Unit/API/E2E/REG、HPA、故障、性能与原始报告 | 95 份测试/实验副本 + 19 份 raw evidence + SHA-256 |
| [`05_management`](05_management/README.md) | 飞书管理平台、任务板、站会、贡献和权重确认 | 平台地址已验证；每日截图/签字待补 |
| [`06_defense`](06_defense/README.md) | PPT、技术总结、演示脚本与备用录屏 | PPT/脚本完成；实际录屏待补 |

## 一次性技术验收

只拿到 `delivery/` 时，可先离线验证两个实体材料目录：

```bash
(cd 03_devops && shasum -a 256 -c checksums.sha256)
(cd 04_tests && shasum -a 256 -c checksums.sha256)
```

以下运行级验收需要 `01_source` 登记的完整仓库，而不是只需要本提交材料目录。

在仓库根目录执行：

```bash
npm ci
npm run test:ci
```

需要完整容器、浏览器和双目标 UC 回归时执行：

```bash
MICROSERVICE_COMPOSE_PROJECT_NAME="video-player-delivery-$(git rev-parse --short=12 HEAD)" \
  bash scripts/compose-microservices-smoke.sh
```

该脚本只应在隔离环境运行，会创建并最终清理四业务数据库、MinIO、SRS、四服务、Gateway 和独立单体回归数据库。Kubernetes、migration 和实验前置条件见 [`03_devops/README.md`](03_devops/README.md)。

验收人应记录：

```text
姓名：
机器/OS/架构：
Node / Docker / Kind / kubectl 版本：
检出 commit：
执行日期：
npm run test:ci：PASS / FAIL
Compose Smoke：PASS / FAIL / NOT RUN
异常与处理：
签名：
```

以上记录只有验收人实际执行并签名后才是有效证据。

## 当前已证明的技术结论

- 单体 `monolith-start` 基线可运行，UC01–UC06 已通过。
- 四个业务服务均有独立持久化、migration、最小权限账号、Docker/K8s 资源和 health/version contract。
- identity、content、live、governance 历史迁移支持确认值、同源拒绝、精确目标授权、重复执行和逐表全量比较。
- Gateway 的读写切流以能力白名单控制；全部服务写路径验证后仍可显式回滚单体。
- REG-01 同一 runner 对单体和 Gateway 各跑 UC01–UC06，12/12 PASS。
- HPA、三类依赖故障恢复和性能三轮对比已有实测值和清理记录。
- PR #48–#63 的最终技术验证均为远端 3/3 jobs success；PR #64–#65 恢复并证明自动 PR/main 触发；PR #67 在 final merge SHA 上补齐推荐、搜索和视频详情 public smoke。PR #66 仍 OPEN，不纳入 final main。当前交付基线为 `main@6d1ad504db90abf93a408a660e4ffabcc6ddd088`，最终主干 run `33467743557` 为 3/3 jobs success。

## 尚未证明、不能代填的结论

- 另一名成员是否已在另一台或 clean-machine 环境复现。
- 五名成员对默认 A–E 角色和实际贡献的核对、权重与签字；默认姓名映射已按用户授权记录。
- 教师/助教确认与 ARCH-01 会议原始证据。
- 5–8 分钟备用录屏是否已实际录制、上传并可访问。
- 全员是否已完成计时演练。

因此，本目录可以作为技术交付 PR 合并，但在上述真人证据补齐前，DEL-01 必须保持未关闭。

## 敏感信息检查

- 不在交付包中保存 `.env.practice`、数据库口令、JWT/Token、MinIO Secret、教师/成员私人联系方式。
- CI 日志和截图在共享前先检查 Secret、内网地址和账号信息。
- 录屏前使用全新演示账号和隔离数据库；浏览器收藏栏、终端历史与通知应关闭或遮挡。
- `delivery/05_management` 中的签字文件在提交前确认是否允许公开；若不允许，保存到课程指定的受限渠道，并在索引中只写访问位置和权限负责人。
