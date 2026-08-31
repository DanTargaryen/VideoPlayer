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
| MS-01 | identity-community | B | 8/31 / DONE | 独立 build/test/deploy/schema；迁移/切流/回滚完成 | PR #45、#49、#51；镜像、API report |
| MS-02 | content-media | C | 8/31 / DONE | UC02/03/04；历史迁移、上传、互动、发布与回滚完成 | PR #43、#49、#52–#54 |
| MS-03 | live-reward | D | 9/1 / DONE | 直播持久化、SRS/录播/礼物、UC05、迁移/切流/回滚完成 | PR #46、#49、#55 |
| MS-04 | governance-ai | E | 9/1 / DONE | 审核/举报独立、不直查 content、UC06、迁移/切流/补偿完成 | PR #47、#49、#55 |
| K8S-01 | 微服务自动部署 | A + 全员 | 9/1 / DONE | 五服务自动部署；四 migration；探针/版本/回滚/HPA | YAML、run #33324914355、#33367170484 |
| REG-01 | 全接口与全 UC 回归 | E + owner | 9/2 / DONE | 同一 runner 对单体和 Gateway 各跑 UC01–UC06 | PR #56；12/12 PASS |
| EXP-01 | HPA 实验 | A + C | 9/2 / DONE | 压力升高扩容、下降缩容 | `13-resilience-performance-experiments.md`；1→3→2→1 Pod/CPU 时间线 |
| EXP-02 | 故障处理实验 | D + A | 9/2 / DONE | 依赖故障降级，其他服务健康 | `fault-experiment-probe.mjs`；MySQL/SRS/MinIO failure+recovery |
| PERF-01 | 单体/微服务性能对比 | A + C + E | 9/3 / DONE | 同机/同数据/同脚本，至少 3 次 | `performance-compare.mjs`；3 轮原始值与聚合分析 |
| DEL-01 | 交付与答辩 | E + 全员 | 9/3 / VERIFY | 六目录/PPT/脚本已完成；非作者复现、全员确认、录屏和签字待真人补 | `delivery/`、PR 待填、录屏/签字待补 |

## 4. 第二阶段已确认分工

> ARCH-01 评审于 2026-08-27 完成，组长确认全员同意默认方案并确认本人承担 A。下表按角色 A-E 固化任务与 Review；真实姓名、可用时间和个人备份人仍由组长在管理表补录；逐项执行清单见 `12-second-stage-todo.md`。

| 角色 | 主任务 | 第一批分支 | 第一批可验证产出 | 主 Reviewer | 截止 / 状态 |
| --- | --- | --- | --- | --- | --- |
| 组长 / A 平台与集成 | ARCH-01、MS-00、K8S-01 | `docs/ARCH-01-service-boundary-freeze`、`build/MS-00-microservice-scaffold` | 决策/owner/contract 已冻结；四服务公共目录、health/ready/version、服务 JWT、Docker/K8s/Jenkins 矩阵已验证 | 全员核对 ARCH-01；MS-00 由 Owner 自审留痕 | ARCH 已合并；MS-00 Done（PR #41） |
| B 身份与社区 | MS-01 | `feature/MS-01-identity-community` + cutover PR | identity schema、用户摘要/通知、UC01/04、历史迁移、写切流和回滚 | C / Owner 留痕 | DONE；技术证据 PR #45/#49/#51 |
| C 内容与媒体 | MS-02 | `feature/MS-02-content-media` + cutover PR | content schema、发现/上传/互动/发布、MinIO、历史迁移、写切流和回滚 | B / Owner 留痕 | DONE；技术证据 PR #43/#49/#52–#54 |
| D 直播与礼物 | MS-03 | `feature/MS-03-live-reward` + cutover PR | 房间/Session/消息/观众/录播/账本、SRS、历史迁移、UC05 和回滚 | A / Owner 留痕 | DONE；技术证据 PR #46/#49/#55 |
| E 治理、质量与文档 | MS-04、REG-01、DEL-01 | governance/REG/DEL 任务分支 | governance 审核/举报/补偿、UC06、REG 12/12；DEL 技术包 | D / Owner 留痕 | 技术 DONE；DEL 真人证据 PENDING |

### 4.1 依赖与合并顺序

1. ARCH-01 冻结文档先进入 `main`。
2. A 的 MS-00 公共骨架保持小 PR，先于四服务 foundation 合并。
3. B/C/D/E 的 foundation 可并行开发，但第一批只建立独立启动、schema、migration、health/version、测试和镜像。
4. 只读路由按 identity 用户摘要 → content 推荐/搜索/详情 → Gateway 的顺序切换。
5. 写流量按 identity → content → live → governance 顺序切换，每一步都保留单体 fallback。
6. 全部写流量切换后由 E + 各 owner 执行 REG-01；通过前不停止单体写入、不删除单体表。

### 4.2 交叉 Review

| 作者 | Reviewer | 必查边界 |
| --- | --- | --- |
| A | E | contract、CI、Secret、证据与回滚 |
| B | C | 用户摘要、身份数据归属、content 依赖 |
| C | B | 用户边界、通知调用、禁止直查 User |
| D | A | SRS、K8s、持久化、录播与账本风险 |
| E | D | 审核/举报补偿、目标状态应用、审计 |
| 跨服务 Gateway | 组长 + 两侧 owner | 路由、兼容、timeout、fallback 和回滚 |

## 5. 每日看板规则

- 9:00 站会后更新 owner、状态和阻塞。
- 12:00 前提交约 200 字站会简报。
- 每日保存一次带日期的看板和统计截图。
- 重要代码/架构/测试通过 PR，默认由非作者审阅；经组长确认采用 Owner 自审时，Owner 必须在 PR 留下范围、测试、风险、基线与结论的书面记录后才能合并。
- commit 数量不能当作贡献大小；证据需同时体现难度、质量、测试、文档和协作。
- 卡片不能从 `In Progress` 直接到 `Done`，必须经过 `Review` 和 `Verify`。
