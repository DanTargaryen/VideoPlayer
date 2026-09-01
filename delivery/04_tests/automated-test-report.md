# 04_tests 自动化测试与原始报告说明

## 交付目标

本目录直接保存自动化测试源码、运行配置、压力/韧性脚本、流水线原始报告和实验数据，解决仅在 README 中引用仓库外路径、导致单独提交 `delivery/` 时材料缺失的问题。

## 自动化源码覆盖

| 层级 | 实体位置 | 内容 |
| --- | --- | --- |
| Node/规则单元测试 | [`automation/test/unit/`](automation/test/unit/) | 25 个测试文件，覆盖数据库安全、迁移、实验脚本、服务规则和交付包 |
| UC 回归 | [`automation/test/regression/`](automation/test/regression/) | runner、公共库、自测试和使用说明 |
| 后端 API/集成 | [`automation/backend/test/`](automation/backend/test/) | health、真实 API/MySQL、Agent/AI 和媒体校验测试 |
| 前端单元测试 | [`automation/frontend/src/`](automation/frontend/src/) | API、媒体校验/恢复、随机推荐和回放测试 |
| 微服务测试 | [`automation/services/`](automation/services/) | shared contracts、identity、content、live、governance 和 Gateway 测试 |
| 浏览器 E2E | [`automation/tests/e2e/`](automation/tests/e2e/) | public、admin services-mode、live services-mode |
| 双目标 Gate | [`automation/scripts/compose-microservices-smoke.sh`](automation/scripts/compose-microservices-smoke.sh) | 单体与 Gateway UC/浏览器/rollback 闭环 |

测试 package/config 文件也保存在 `automation/`，因此评审者不需要从仓库外另找测试入口定义。由于业务实现源码属于 `01_source`，本目录是可独立审阅的测试材料包，而不是可脱离业务源码运行的完整工程。

## 压力、HPA 与故障实验

| 实验 | 实体脚本 | 原始数据 |
| --- | --- | --- |
| 推荐/搜索/详情三业务性能对比 | [`load/performance-compare.mjs`](load/performance-compare.mjs) | 最新：[`experiments/performance-three-endpoint-runs.csv`](experiments/performance-three-endpoint-runs.csv)；历史单接口：[`experiments/performance-runs.csv`](experiments/performance-runs.csv) |
| HPA 扩缩容 | [`load/hpa-experiment.sh`](load/hpa-experiment.sh) | [`experiments/hpa-timeline.csv`](experiments/hpa-timeline.csv) |
| MySQL/SRS/MinIO 故障恢复 | [`load/fault-experiment-probe.mjs`](load/fault-experiment-probe.mjs) | [`experiments/fault-recovery.csv`](experiments/fault-recovery.csv) |

详细数据解释见 [`experiment-summary.md`](experiment-summary.md)。

## 流水线原始报告

固定离线证据包位于 [`raw/github-run-33379394312/`](raw/github-run-33379394312/)，对应：

```text
GitHub Actions run: 33379394312
head SHA: c909875671a0f065df18183305bca6162211a660
status: completed / success
jobs: quality success; public E2E success; Kind deploy success
```

该子包包含完整 job log、run/artifact JSON、Playwright HTML report、前后端 E2E 日志、Kind 节点/workload/镜像/migration/event/status 和实验 CSV。这里明确保留历史 run 的 head SHA；它是原始交付证据，不冒充当前 PR head 的 CI 结果。

## 校验方式

```bash
cd delivery/04_tests
shasum -a 256 -c checksums.sha256

cd raw/github-run-33379394312
shasum -a 256 -c checksums.sha256
```

第一份清单覆盖整个 `04_tests`，第二份清单只覆盖冻结的原始流水线证据包。

普通文本副本和文本类 checksum 统一按 LF 规范化，Windows `core.autocrlf=true` checkout 可稳定复核；`raw/github-run-33379394312/` 被声明为 binary provenance，始终按原始字节验证。

## 本轮实际自检结果

验证日期：2026-09-01；验证对象：PR #70 的 review 修复提交树。

| 检查 | 结果 |
| --- | --- |
| 92 份测试/实验来源副本逐文件 SHA-256 | PASS |
| `04_tests/checksums.sha256` 完整覆盖 | PASS |
| raw 子包 19 份证据及内部 checksum | PASS |
| 独立交付门禁 | PASS；119/92 数量、普通文件、路径边界、本地链接和 checksum 均通过 |
| `npm run test:ci` | PASS；284/284，退出码 0 |
| 普通 clean checkout | PASS；连续生成 2 次、`git diff --exit-code`、package 2/2 |
| `core.autocrlf=true` clean checkout | PASS；连续生成 2 次、diff 0、package 2/2 |

本轮全量统计包括 requirements 132、Backend 16、Frontend 24、shared-contracts 9、identity 5、content 34、live 18、governance 29、Gateway 13、regression 4，合计 284。API 集成、浏览器 E2E、镜像构建和真实 Kind 部署本轮没有重跑，状态为 `NOT RUN`；相应历史原始运行结果只按其 `run 33379394312 / head c909875` 身份陈述。

## PERF-01 三业务最终复测

验证日期：2026-09-01；验证基线：`main@27f9425c1abc421ec1ed994ae5e077e1ab5957b5` + `perf/PERF-01-three-endpoint-matrix`。

| 检查 | 结果 |
| --- | --- |
| 三业务矩阵 | 推荐、搜索、视频详情；单体/Gateway 各 3 轮，每轮 240 请求，并发 16 |
| 业务等价 Gate | 三接口两目标均返回同一 `id:title` 签名；PASS |
| 正式计时请求 | 4320/4320 HTTP 200；0 error；全部单轮 p95 < 1000ms |
| 完整 Compose | services-mode browser 7/7；双目标 REG 12/12；MySQL/SRS/MinIO failure+recovery；rollback；cleanup；PASS |
| 版本化镜像 | 最新完整 SHA 的 backend/frontend、五服务和四 migration 镜像共 11 个，逐个 build/inspect PASS |
| 独立交付 | 119/95 来源副本；两次生成整体 hash 一致；主证据与交付 CSV 一致；03/04 checksum PASS |
| 定点测试 | 交付包 + 性能矩阵 7/7 PASS |
| `npm run test:ci` | 286/286 PASS，退出码 0 |

最终全量统计包括 Node/规则 134、Backend 16、Frontend 24、shared-contracts 9、identity 5、content 34、live 18、governance 29、Gateway 13、regression 4，合计 286。本轮没有新建 Kind 集群；Kind/全路由远端闭环由已合并 PR #73 保持独立证据，本轮不冒充重复执行。
