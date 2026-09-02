# 04_tests：可独立提交的测试与实验实体材料

> 本目录不再只是测试入口索引。自动化测试源码、测试运行配置、压力/韧性脚本、原始流水线报告和实验 CSV 均作为普通文件直接保存在本目录内；单独复制或压缩整个 `delivery/` 后仍可离线审阅。
>
> 自动化源码由当前 PR checkout 中的真实仓库源路径确定性生成；生成器不会把已生成的 `delivery` 副本重新当成输入。远端原始报告明确保留其自身 run/head SHA，不把历史 run 冒充当前提交的 CI 结果。

## 验证矩阵

| 层级 | 命令/路径 | 最终覆盖 |
| --- | --- | --- |
| 全量静态/单元 Gate | `npm run test:ci` | 单体、前端、六 workspace、REG harness |
| 单体 API | `npm run test:api` | 隔离数据库集成接口 |
| 浏览器 E2E | `npm run test:e2e` | 公开页面与关键交互 |
| 六 UC runner | `npm run reg:01` | UC01–UC06；业务 FAIL 非零退出 |
| 双目标 Compose | `bash scripts/compose-microservices-smoke.sh` | 单体 6/6 + Gateway 6/6、浏览器、rollback |
| HPA | `scripts/hpa-experiment.sh` | CPU 指标、扩容与缩容时间线 |
| 故障探针 | `scripts/fault-experiment-probe.mjs` | MySQL/SRS/MinIO failure + recovery |
| 性能对比 | `scripts/performance-compare.mjs` | 推荐/搜索/详情 3 接口 × 单体/Gateway × 3 轮；同机、同数据、同脚本 |

## 目录内容

| 本地目录/文件 | 实体材料 | 数量 |
| --- | --- | ---: |
| [`automation/`](automation/) | Unit、Backend API、Frontend Vitest、微服务 contract/integration、Playwright E2E、REG runner、配置和 Compose Gate | 103 |
| [`load/`](load/) | 性能对比、HPA 扩缩容和依赖故障恢复脚本 | 3 |
| [`experiments/`](experiments/) | HPA、故障恢复、旧单接口性能和三业务性能逐行 CSV 的便捷副本 | 4 |
| [`raw/github-run-33379394312/`](raw/github-run-33379394312/) | 完整 run/artifact JSON、3 个 job log、Playwright HTML/日志、Kind evidence、实验 CSV 和内部 checksum | 19 个证据文件 |
| [`automated-test-report.md`](automated-test-report.md) | 自动化层级、远端报告身份和结果汇总 | 1 |
| [`experiment-summary.md`](experiment-summary.md) | 三轮性能、HPA 和故障恢复数据说明 | 1 |
| [`tools/collect-delivery-raw-evidence.mjs`](tools/collect-delivery-raw-evidence.mjs) | 原始证据收集工具的实体副本 | 1 |
| [`source-manifest.tsv`](source-manifest.tsv) | 每份复制文件的原仓库路径、交付路径和 SHA-256 | 103 条 |
| [`checksums.sha256`](checksums.sha256) | 本目录除清单自身外所有交付文件的 SHA-256 | 自动生成 |

## 自动化测试实体入口

- Node/规则单元测试：[`automation/test/unit/`](automation/test/unit/)
- UC01–UC06 回归 runner：[`automation/test/regression/`](automation/test/regression/)
- 后端 API/集成测试：[`automation/backend/test/`](automation/backend/test/)
- 前端单元测试：[`automation/frontend/src/`](automation/frontend/src/)
- 微服务测试：[`automation/services/`](automation/services/)
- 浏览器 E2E：[`automation/tests/e2e/`](automation/tests/e2e/)
- Playwright 配置：[`automation/playwright.config.ts`](automation/playwright.config.ts)
- 双目标 Compose Gate：[`automation/scripts/compose-microservices-smoke.sh`](automation/scripts/compose-microservices-smoke.sh)

## 压力与韧性脚本

- 性能三轮对比：[`load/performance-compare.mjs`](load/performance-compare.mjs)
- HPA 扩缩容：[`load/hpa-experiment.sh`](load/hpa-experiment.sh)
- MySQL/SRS/MinIO 故障恢复：[`load/fault-experiment-probe.mjs`](load/fault-experiment-probe.mjs)

### 实验结果

| 实验 | 结果 |
| --- | --- |
| HPA | Ready Pods `1→3→2→1`；CPU `104%→2%`；发现高负载到 3 Pods 约 21 秒，撤压到 1 Pod 约 30 秒 |
| live MySQL | 依赖停止时 readiness 503；恢复后 200 |
| SRS | 依赖停止时开播 503；恢复后同一房间可成功并结束 |
| MinIO | 依赖停止时 upload 500；恢复后同类上传 200 |
| 推荐流 | 单体/Gateway 中位 p95 `6.75/15.66 ms`，中位吞吐 `3009.32/1505.41 RPS`；p95 `+132.0%`、RPS `-50.0%`，**下降** |
| 搜索 | 单体/Gateway 中位 p95 `24.29/19.20 ms`，中位吞吐 `935.16/1301.26 RPS`；p95 `-21.0%`、RPS `+39.1%`，**提升** |
| 视频详情 | 单体/Gateway 中位 p95 `9.55/23.52 ms`，中位吞吐 `2320.96/961.41 RPS`；p95 `+146.3%`、RPS `-58.6%`，**下降** |
| 请求完整性 | 3 接口 × 2 目标 × 3 轮 × 240 请求 = 4320 请求，0 error；整体 `mixed`，但 2/3 接口下降 |

这些脚本是实际执行脚本的完整内容副本，不是只写命令名称的说明文档。文本副本统一规范化为 LF；冻结的 raw evidence 保持逐字节不变。原始结果见 [`experiments/`](experiments/) 和 [`raw/github-run-33379394312/experiments/`](raw/github-run-33379394312/experiments/)。

三接口性能复测原始 18 行 CSV：[`experiments/performance-three-endpoint-runs.csv`](experiments/performance-three-endpoint-runs.csv)。

## 原始报告身份

离线原始包对应 GitHub Actions run `33379394312`，head SHA 为 `c909875671a0f065df18183305bca6162211a660`，三个 job 均为 `success`。其身份、job 时间、Artifact ID 和复核命令见 [`raw/github-run-33379394312/README.md`](raw/github-run-33379394312/README.md)。

## 离线校验

在 `04_tests` 目录执行：

```bash
shasum -a 256 -c checksums.sha256
```

该清单同时覆盖自动化源码、压力脚本、实验数据和原始报告。普通文本使用规范化 LF 哈希，`.gitattributes` 同时固定交付文本为 LF；`raw/github-run-33379394312/checksums.sha256` 仍按原始字节验证冻结证据子包。

## 执行边界

本目录满足“提交材料中直接包含测试文件和原始证据”的要求，但不是完整应用源码副本。测试源码会 import 业务实现，因此真正重跑 `npm run test:ci`、API、E2E 或 Compose Gate 时，仍应检出 `01_source` 登记的完整仓库版本；不能把仅能离线审阅的材料包描述成可独立运行的完整项目。
