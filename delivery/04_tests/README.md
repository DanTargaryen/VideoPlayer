# 04_tests：可独立提交的测试与实验实体材料

> 本目录不再只是测试入口索引。自动化测试源码、测试运行配置、压力/韧性脚本、原始流水线报告和实验 CSV 均作为普通文件直接保存在本目录内；单独复制或压缩整个 `delivery/` 后仍可离线审阅。
>
> 自动化源码冻结来源：`main@481d683de584aeb9abaf6bb2df38f025bb514c30`。远端原始报告明确保留其自身 run/head SHA，不把历史 run 冒充当前提交的 CI 结果。

## 目录内容

| 本地目录/文件 | 实体材料 | 数量 |
| --- | --- | ---: |
| [`automation/`](automation/) | Unit、Backend API、Frontend Vitest、微服务 contract/integration、Playwright E2E、REG runner、配置和 Compose Gate | 85 |
| [`load/`](load/) | 性能对比、HPA 扩缩容和依赖故障恢复脚本 | 3 |
| [`experiments/`](experiments/) | HPA、故障恢复和三轮性能逐行 CSV 的便捷副本 | 3 |
| [`raw/github-run-33379394312/`](raw/github-run-33379394312/) | 完整 run/artifact JSON、3 个 job log、Playwright HTML/日志、Kind evidence、实验 CSV 和内部 checksum | 19 个证据文件 |
| [`automated-test-report.md`](automated-test-report.md) | 自动化层级、远端报告身份和结果汇总 | 1 |
| [`experiment-summary.md`](experiment-summary.md) | 三轮性能、HPA 和故障恢复数据说明 | 1 |
| [`tools/collect-delivery-raw-evidence.mjs`](tools/collect-delivery-raw-evidence.mjs) | 原始证据收集工具的实体副本 | 1 |
| [`source-manifest.tsv`](source-manifest.tsv) | 每份复制文件的原仓库路径、交付路径和 SHA-256 | 92 条 |
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

这些脚本是实际执行脚本的字节级副本，不是只写命令名称的说明文档。原始结果见 [`experiments/`](experiments/) 和 [`raw/github-run-33379394312/experiments/`](raw/github-run-33379394312/experiments/)。

## 原始报告身份

离线原始包对应 GitHub Actions run `33379394312`，head SHA 为 `c909875671a0f065df18183305bca6162211a660`，三个 job 均为 `success`。其身份、job 时间、Artifact ID 和复核命令见 [`raw/github-run-33379394312/README.md`](raw/github-run-33379394312/README.md)。

## 离线校验

在 `04_tests` 目录执行：

```bash
shasum -a 256 -c checksums.sha256
```

该清单同时覆盖自动化源码、压力脚本、实验数据和原始报告。`raw/github-run-33379394312/checksums.sha256` 仍保留，用于单独验证原始报告子包。

## 执行边界

本目录满足“提交材料中直接包含测试文件和原始证据”的要求，但不是完整应用源码副本。测试源码会 import 业务实现，因此真正重跑 `npm run test:ci`、API、E2E 或 Compose Gate 时，仍应检出 `01_source` 登记的完整仓库版本；不能把仅能离线审阅的材料包描述成可独立运行的完整项目。
