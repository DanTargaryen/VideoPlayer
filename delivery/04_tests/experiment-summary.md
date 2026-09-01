# 压力、HPA 与故障恢复实验数据摘要

## 性能三轮对比

原始逐轮数据：[`experiments/performance-runs.csv`](experiments/performance-runs.csv)。

| 目标 | 轮数 | 中位 p95 | 最大 p95 | 中位吞吐 | 总错误 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 单体 | 3 | 9.44 ms | 14.85 ms | 2334.84 RPS | 0 |
| 微服务 Gateway | 3 | 15.57 ms | 22.32 ms | 1435.25 RPS | 0 |

两类目标各 3 轮，每轮 240 请求，共 1440 请求，原始 CSV 中 `errors` 均为 0。

## HPA 扩缩容

原始时间线：[`experiments/hpa-timeline.csv`](experiments/hpa-timeline.csv)。执行脚本：[`load/hpa-experiment.sh`](load/hpa-experiment.sh)。

已记录 Ready Pod 变化为 `1 → 3 → 2 → 1`，并保留采样时间、CPU 与目标副本数。该数据证明隔离实验中的扩缩容过程，不代表持久生产集群容量。

## 故障恢复

原始记录：[`experiments/fault-recovery.csv`](experiments/fault-recovery.csv)。探针脚本：[`load/fault-experiment-probe.mjs`](load/fault-experiment-probe.mjs)。

数据包含 MySQL、SRS、MinIO 三类依赖的 failure 与 recovery 响应。故障注入只适用于隔离环境，不应直接在共享集群执行。

## 数据身份

三个 CSV 同时保留在原始流水线证据包的 [`raw/github-run-33379394312/experiments/`](raw/github-run-33379394312/experiments/) 中。本目录顶层 `experiments/` 是字节级便捷副本；`source-manifest.tsv` 和 `checksums.sha256` 可证明两处内容一致。
