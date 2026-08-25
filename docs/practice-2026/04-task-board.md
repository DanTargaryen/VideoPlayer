# 项目看板启动模板

## 1. 看板列

1. `Backlog`：已识别但未承诺本日完成。
2. `Ready`：需求、依赖、DoD 和 owner 明确，可立即开始。
3. `In Progress`：正在执行；每人同时最多 1-2 张卡。
4. `Review`：等待另一名组员检查代码/文档/设计。
5. `Verify`：实现已完成，等待测试、部署或证据验证。
6. `Done`：满足统一 DoD 且证据链接完整。

## 2. 每张任务卡必填字段

```text
任务 ID：
名称：
对应 REQ / UC：
主负责人：
协作者 / Reviewer：
计划开始 / 完成：
实际开始 / 完成：
依赖与阻塞：
验收条件（DoD）：
证据：commit / PR / test / workflow / document / log
风险和回滚：
```

## 3. 首轮任务包

| ID | 名称 | 候选 owner | 截止 | 验收条件摘要 | 必须附的证据 |
| --- | --- | --- | --- | --- | --- |
| GOV-01 | 项目看板与证据规范 | 组长 + E | 8/25 12:00 | 教师可访问；字段/列/DoD 完整 | 看板链接、首日截图 |
| BASE-01 | 单体基线与标签 | 组长 + 全员 | 8/25 | 全 UC smoke；干净提交；annotated tag | tag、commit、日志、smoke |
| UC-01 | 用例范围冻结 | E + B/C/D | 8/25 | 教师确认 6 个 UC 或修改范围 | 消息和回复截图 |
| DOC-01 | 三层模型与追溯 | E + 各 owner | 8/28 | 每 UC 系统/组件/对象图和追溯 | 模型源文件、追溯表 |
| TEST-01 | 测试基础设施 | E + A | 8/26 | Jest/Supertest/Playwright 可统一运行 | 测试脚本、失败示例 |
| TEST-02 | 单体全用例测试 | 各 owner | 8/28 | 主流、备选、异常有断言 | 测试报告和日志 |
| CTR-01 | 完整容器化 | A + C/D | 8/26 | 前端/后端/DB 独立容器，一条命令启动 | Dockerfile、compose、health |
| CI-01 | 单体流水线 | A + E | 8/27 | build→test→image→K8s→health；失败停止 | 成功/失败 run |
| ARCH-01 | 服务与数据归属冻结 | A + B/C/D/E | 8/28 | 4 服务、接口、31 表归属、失败策略 | 架构图、表归属、评审 |
| MS-01 | identity-community | B | 8/31 | 独立 build/test/deploy/schema | PR、镜像、API report |
| MS-02 | content-media | C | 8/31 | UC02/03/04 核心流程通过 | PR、镜像、API report |
| MS-03 | live-reward | D | 9/1 | 直播持久化、SRS/录播/礼物闭环 | PR、迁移、演示日志 |
| MS-04 | governance-ai | E | 9/1 | 审核/举报独立且不直查 content 表 | PR、contract/API report |
| K8S-01 | 微服务自动部署 | A + 全员 | 9/1 | 相关服务自动部署；探针/版本/回滚 | YAML/Helm、run、rollback |
| REG-01 | 全接口与全 UC 回归 | E + owner | 9/2 | 所有公开 API 和确认 UC 自动通过 | JUnit/HTML report |
| EXP-01 | HPA 实验 | A + C | 9/2 | 压力升高扩容、下降缩容 | k6、Pod/metrics 时间线 |
| EXP-02 | 故障处理实验 | D + A | 9/2 | 依赖故障降级，其他服务健康 | 故障脚本、日志、health |
| PERF-01 | 单体/微服务性能对比 | A + C + E | 9/3 | 同机/同数据/同脚本，至少 3 次 | 原始数据、环境、分析 |
| DEL-01 | 交付与答辩 | E + 全员 | 9/3 | 六目录齐全、README 可复现、全员确认 | 交付包、PPT、录屏、签字 |

## 4. 每日看板规则

- 9:00 站会后更新 owner、状态和阻塞。
- 12:00 前提交约 200 字站会简报。
- 每日保存一次带日期的看板和统计截图。
- 重要代码/架构/测试通过 PR，由非作者审阅。
- commit 数量不能当作贡献大小；证据需同时体现难度、质量、测试、文档和协作。
- 卡片不能从 `In Progress` 直接到 `Done`，必须经过 `Review` 和 `Verify`。
