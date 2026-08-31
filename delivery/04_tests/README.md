# 04_tests：自动化、回归与实验结果

## 自动化入口

| 层级 | 命令/路径 | 最终覆盖 |
| --- | --- | --- |
| 全量静态/单元 Gate | `npm run test:ci` | 单体、前端、六 workspace、REG harness |
| 单体 API | `npm run test:api` | 隔离数据库集成接口 |
| 浏览器 E2E | `npm run test:e2e` | 公开页面与关键交互 |
| 六 UC runner | `npm run reg:01` | UC01–UC06；业务 FAIL 非零退出 |
| 双目标 Compose | `bash scripts/compose-microservices-smoke.sh` | 单体 6/6 + Gateway 6/6、浏览器、rollback |
| HPA | `scripts/hpa-experiment.sh` | CPU 指标、扩容与缩容时间线 |
| 故障探针 | `scripts/fault-experiment-probe.mjs` | MySQL/SRS/MinIO failure + recovery |
| 性能对比 | `scripts/performance-compare.mjs` | 同机、同数据、同脚本、三轮 |

## REG-01 最终结论

- runner schema：`reg-01/v2`。
- 每个目标创建隔离 creator、actor 和 media 数据。
- 固定顺序：UC01 账户 → UC02 发现/播放 → UC03 投稿/审核 → UC04 互动/通知 → UC05 直播/录播 → UC06 举报/处置。
- 每个 UC 报告公开 endpoint 列表和 `PASS/FAIL/BLOCKED/NOT RUN`。
- `REG_REQUIRE_ALL_PASS=true` 时，任何已配置目标的非 PASS 都使 CLI 非零退出。
- 最终真实 Compose：单体 6/6、微服务 Gateway 6/6，12/12 PASS；随后 monolith rollback 和资源清理 PASS。

实现与测试源：[`test/regression`](../../test/regression)。

## HPA、故障与性能实测

| 实验 | 结果 |
| --- | --- |
| HPA | Ready Pods `1→3→2→1`；CPU `104%→2%`；发现高负载到 3 Pods 约 21 秒，撤压到 1 Pod 约 30 秒 |
| live MySQL | 依赖停止时 readiness 503；恢复后 200 |
| SRS | 依赖停止时开播 503；恢复后同一房间可成功并结束 |
| MinIO | 依赖停止时 upload 500；恢复后同类上传 200 |
| 单体性能 | 三轮中位 p95 `9.44 ms`，中位吞吐 `2334.84 RPS`，最大 p95 `14.85 ms` |
| Gateway 性能 | 三轮中位 p95 `15.57 ms`，中位吞吐 `1435.25 RPS`，最大 p95 `22.32 ms` |
| 请求完整性 | 3 轮 × 240 请求 × 2 目标 = 1440 请求，0 error |

原始时间、请求配置、失败过程、恢复响应、官方 metrics-server 校验和和清理范围见 [`docs/practice-2026/13-resilience-performance-experiments.md`](../../docs/practice-2026/13-resilience-performance-experiments.md)。

## 报告与 Artifact

- Jenkins 成功流水线发布 11 份 JUnit XML；Unit 后故意失败仍发布已经生成的 9 份 XML，并阻断后续 7 阶段。
- GitHub Actions 保存 Playwright 与 Kind evidence Artifact；最终 run URL 见 [`../01_source/README.md`](../01_source/README.md)。
- `test-results/`、`coverage/`、`playwright-report/`、本地日志和渲染图片不进入 Git；需要共享时使用 CI Artifact。
- 任何截图只能辅助说明，不能替代 runner JSON、JUnit、workflow、代码和可重跑命令。

## 持久化原始报告包

- [GitHub Actions run 33379394312 原始证据包](raw/github-run-33379394312/README.md)
- 包含三个完整 job log、run/artifact JSON、Playwright HTML report、前后端 E2E 日志、Kind 节点/workload/镜像/migration/event/status 原始文件、HPA/故障/三轮性能 CSV 和全文件 SHA-256。
- 收集命令：`DELIVERY_EVIDENCE_RUN_ID=33379394312 node scripts/collect-delivery-raw-evidence.mjs`。
- 该目录是任务书明确要求“测试报告和流水线原始报告”的交付例外；其他临时报告仍保持 ignored。

## 交付包自检

DEL-01 增加一个 Node 单元测试，检查六目录、README 链接、PPTX 结构和人工证据的显式待补状态。答辩 PPT 另用 presentation render 工具生成 10 页 PNG 和 montage，并用 `slides_test.py` 检查画布越界；这些临时渲染文件保持 ignored，不作为源码提交。
