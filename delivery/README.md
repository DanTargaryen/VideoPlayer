# DEL-01 最终交付包

> 状态：`TECHNICAL PACKAGE READY / HUMAN EVIDENCE PENDING`。
>
> 本目录汇总可从仓库验证的技术产物，不把模板、计划或自动生成文件冒充真人签名、成员复现和实际录屏。最终关闭条件见 [`docs/practice-2026/15-final-delivery-checklist.md`](../docs/practice-2026/15-final-delivery-checklist.md)。

## 六目录导航

| 目录 | 内容 | 仓库状态 |
| --- | --- | --- |
| [`01_source`](01_source/README.md) | 仓库、tag、服务版本、PR 与 workflow | 技术索引完成 |
| [`02_docs`](02_docs/README.md) | 需求、用例、三层模型、设计与追溯 | 技术索引完成 |
| [`03_devops`](03_devops/README.md) | Docker、CI/CD、K8s、migration、部署与回滚 | 技术索引完成 |
| [`04_tests`](04_tests/README.md) | Unit/API/E2E/REG、HPA、故障、性能与报告 | 技术索引完成 |
| [`05_management`](05_management/README.md) | 任务板、决策、站会、贡献和权重确认 | 模板完成；真人确认待补 |
| [`06_defense`](06_defense/README.md) | PPT、技术总结、演示脚本与备用录屏 | PPT/脚本完成；实际录屏待补 |

## 一次性技术验收

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
- PR #48–#57 均已在远端 3/3 jobs 成功后合并。

## 尚未证明、不能代填的结论

- 另一名成员是否已在另一台或 clean-machine 环境复现。
- 五名成员的真实 A–E 角色、贡献内容、权重和签字。
- 教师/助教确认与 ARCH-01 会议原始证据。
- 5–8 分钟备用录屏是否已实际录制、上传并可访问。
- 全员是否已完成计时演练。

因此，本目录可以作为技术交付 PR 合并，但在上述真人证据补齐前，DEL-01 必须保持未关闭。

## 敏感信息检查

- 不在交付包中保存 `.env.practice`、数据库口令、JWT/Token、MinIO Secret、教师/成员私人联系方式。
- CI 日志和截图在共享前先检查 Secret、内网地址和账号信息。
- 录屏前使用全新演示账号和隔离数据库；浏览器收藏栏、终端历史与通知应关闭或遮挡。
- `delivery/05_management` 中的签字文件在提交前确认是否允许公开；若不允许，保存到课程指定的受限渠道，并在索引中只写访问位置和权限负责人。
