# 证据索引与统一 Definition of Done

## 1. 最终交付映射

| 课程目录 | 本组内容 | 主负责人 |
| --- | --- | --- |
| `01_source` | 仓库地址、单体 tag、微服务版本、提交/PR 清单 | A + 全员 |
| `02_docs` | 需求、用例、三层模型、设计、测试计划/报告、追溯、模型源文件 | E + owner |
| `03_devops` | Docker、CI、K8s/Helm、数据库 migration/seed、部署/回滚 | A + C/D |
| `04_tests` | 单元/API/E2E、压力脚本、原始报告、实验数据 | E + owner |
| `05_management` | 每日简报、看板截图、决策、贡献和权重确认 | 组长 + E |
| `06_defense` | PPT、技术总结、5-8 分钟备用录屏、演示脚本 | E + 全员 |

## 2. 证据命名

```text
YYYYMMDD-任务ID-证据类型-简短说明.ext
```

示例：

```text
20260827-CI-01-workflow-success-url.txt
20260827-CI-01-workflow-intentional-failure.png
20260902-EXP-01-hpa-pod-timeline.csv
20260903-PERF-01-monolith-run-01.json
```

证据必须能追溯到任务 ID、用例/需求、commit/PR 和执行环境。截图不能替代代码、配置、日志或原始报告。

## 3. 统一 Definition of Done

一张任务卡只有同时满足以下适用项，才能进入 `Done`：

- [ ] 需求/用例编号和验收条件明确。
- [ ] 代码、配置或文档已提交到正确分支。
- [ ] 由非作者完成 PR/文档/架构审阅。
- [ ] 单元测试覆盖关键规则和异常分支，并有有效断言。
- [ ] 集成/API 测试覆盖模块/数据库/外部调用。
- [ ] 对应 E2E 或 smoke 流程通过。
- [ ] 测试失败会阻断后续镜像或部署。
- [ ] 接口清单、数据归属和三层模型已同步。
- [ ] 镜像使用 Git SHA/版本号，不只使用 `latest`。
- [ ] Kubernetes 健康、就绪和版本检查通过。
- [ ] 日志和原始报告已保存，且不含密码、Token 和密钥。
- [ ] 看板附 commit、PR、测试/流水线或文档证据链接。
- [ ] README/运行说明有另一名成员复现记录。
- [ ] 若变更失败，可说明并执行回滚或恢复步骤。

## 4. 证据总索引

| 日期 | 任务 ID | REQ/UC | 证据类型 | 路径/URL | 执行人 | Reviewer | 结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 待补 | 待补 | 待补 | commit/PR/test/workflow/log/document/experiment | 待补 | 待补 | 待补 | PASS/FAIL |

## 5. 追溯表字段

| REQ | UC | 系统级图 | 组件级图 | 对象级图 | 代码模块/commit | UNIT | INT/API | E2E | 最新结果 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ01 | UC01 | SYS-SEQ01 | COMP-SEQ01 | OBJ-SEQ01 | 待补 | UNIT-TC01 | INT-TC01 | E2E-TC01 | NOT RUN | 待补 |
| REQ06 | UC06 | SYS-STATE06 | COMP-STATE06 | OBJ-STATE06 | `report`、`admin`、`agent`、`comment-ai`；commit 待补 | UNIT-TC06 | INT-TC06 | E2E-TC06 | MODEL PASS / TEST NOT RUN | `10-uc06-state-diagrams.md` |

后续为 UC02-UC05 各增加一行或按测试路径拆分多行；UC06 的测试执行结果需在实现和运行后更新，不能用模型验证代替测试通过。

## 6. 每日证据检查

- [ ] 看板和统计截图带日期。
- [ ] 站会简报在 12:00 前提交。
- [ ] 当日合并 PR 有 reviewer。
- [ ] 当日测试/流水线原始输出可访问。
- [ ] 决策变化已写入决策日志。
- [ ] 没有凭据或敏感信息进入提交/日志/截图。
