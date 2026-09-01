# Tests 交付目录说明

本目录对应课程最终交付目录 `04_tests`，收纳 VideoPlayer 项目的自动化测试入口、测试报告、流水线原始报告索引和实验数据说明。

## 文件清单

| 文件 | 内容 |
| --- | --- |
| [automated-test-report.md](automated-test-report.md) | 本轮自动化测试报告，覆盖单元、集成/API、端到端和回归测试 |

## 测试源码入口

| 测试类型 | 仓库路径 |
| --- | --- |
| 单元测试 | `test/unit/`、`backend/test/*.spec.ts` |
| 后端 API 集成测试 | `backend/test/integration-api.e2e-spec.ts` |
| AI/审核集成测试 | `backend/test/agent-ai.e2e-spec.ts` |
| 前端单元测试 | `frontend/src/**/*.spec.ts` |
| 微服务 contract/integration 测试 | `services/*/test/` |
| 浏览器端到端测试 | `tests/e2e/` |
| UC01-UC06 回归 runner | `test/regression/` |
| 压测与实验脚本 | `scripts/performance-compare.mjs`、`scripts/hpa-experiment.sh`、`scripts/fault-experiment-probe.mjs` |

## 结论

本轮在本机完成全量 `npm run test:ci`、隔离 MySQL API 集成测试和 Playwright 浏览器端到端测试，结果均通过。完整远端流水线原始包已保存在 `delivery/04_tests/raw/github-run-33379394312/`，本目录报告对其进行索引说明。
