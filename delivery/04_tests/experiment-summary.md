# 压力、HPA 与故障恢复实验数据摘要

## 三业务性能三轮对比

最新主干原始逐轮数据：[`experiments/performance-three-endpoint-runs.csv`](experiments/performance-three-endpoint-runs.csv)。历史单接口数据保留在 [`experiments/performance-runs.csv`](experiments/performance-runs.csv)。

| 业务 | 单体中位 p95 | Gateway 中位 p95 | 单体中位吞吐 | Gateway 中位吞吐 | 结论 |
| --- | ---: | ---: | ---: | ---: | --- |
| 推荐流 | 6.75 ms | 15.66 ms | 3009.32 RPS | 1505.41 RPS | 下降 |
| 搜索 | 24.29 ms | 19.20 ms | 935.16 RPS | 1301.26 RPS | 提升 |
| 视频详情 | 9.55 ms | 23.52 ms | 2320.96 RPS | 961.41 RPS | 下降 |

三个业务在单体和 Gateway 各 3 轮，每轮 240 请求，共 4320 请求；两端业务签名一致，原始 CSV 中 `errors` 均为 0。

## HPA 扩缩容

原始时间线：[`experiments/hpa-timeline.csv`](experiments/hpa-timeline.csv)。执行脚本：[`load/hpa-experiment.sh`](load/hpa-experiment.sh)。

已记录 Ready Pod 变化为 `1 → 3 → 2 → 1`，并保留采样时间、CPU 与目标副本数。该数据证明隔离实验中的扩缩容过程，不代表持久生产集群容量。

## 故障恢复

原始记录：[`experiments/fault-recovery.csv`](experiments/fault-recovery.csv)。探针脚本：[`load/fault-experiment-probe.mjs`](load/fault-experiment-probe.mjs)。

数据包含 MySQL、SRS、MinIO 三类依赖的 failure 与 recovery 响应。故障注入只适用于隔离环境，不应直接在共享集群执行。

## 数据身份

旧三份 CSV 同时保留在原始流水线证据包的 [`raw/github-run-33379394312/experiments/`](raw/github-run-33379394312/experiments/) 中；最新三业务 CSV 来自 `docs/practice-2026/evidence/performance-three-endpoint-runs.csv`。本目录顶层 `experiments/` 是确定性便捷副本；`source-manifest.tsv` 和 `checksums.sha256` 可证明来源与副本一致。
