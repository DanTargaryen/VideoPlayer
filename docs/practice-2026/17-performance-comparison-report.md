# VideoPlayer 单体与微服务改造前后性能对比报告

> 测试时间：2026-09-01
>
> 代码基线：`main@27f9425c1abc421ec1ed994ae5e077e1ab5957b5`
>
> 性能测试提交：`a8c1786d78e1e34d7294c2c7b584337e28883730`
>
> 性能改造状态：[PR #74](https://github.com/DanTargaryen/VideoPlayer/pull/74) 已合并，merge commit `6cf940bf86bf10a1da1049d17944b77da70f2f66`
>
> DOC-02 集成基线：`main@acd99f569508f9d1eb6d49d4974cb5a109b3237e`
>
> 测试结果：`PASS`
>
> 交付边界：本文是技术性能证据，不代表教师/ARCH 原件、成员签字、非作者复现、真实录屏或演练已经提供；`DEL-01` 仍为 `HUMAN EVIDENCE PENDING`。

## 1. 测试目的

本次测试对比 VideoPlayer 改造前后 3 个业务接口的性能：

- 改造前：NestJS 单体应用，端口 `3200`；
- 改造后：API Gateway + content-media 微服务，端口 `3100`。

对比指标为响应时间、P95、吞吐量和错误率。

## 2. 测试接口

| 编号 | 接口 | 路径 |
| --- | --- | --- |
| 1 | 推荐流 | `GET /api/v1/feeds/recommend?page=1&pageSize=1` |
| 2 | 视频搜索 | `GET /api/v1/search/all?keyword=PERF01%20shared%20published%20fixture&tab=video&page=1&pageSize=1` |
| 3 | 视频详情 | `GET /api/v1/videos/1` |

## 3. 测试方法

| 项目 | 设置 |
| --- | --- |
| 运行环境 | 单体与微服务运行在同一台主机 |
| 测试数据 | 两个环境使用相同的已发布视频，ID 为 `1` |
| 预热 | 每个接口、每个目标各 20 次 |
| 轮次 | 每个接口在单体和微服务上各执行 3 轮 |
| 每轮请求数 | 240 |
| 并发数 | 16 |
| 正式请求总数 | `3 接口 × 2 架构 × 3 轮 × 240 = 4320` |
| 通过条件 | 错误数为 0，每轮 P95 不超过 1000 ms |

测试脚本每轮调整接口顺序，并交替单体与微服务的测试先后顺序。

## 4. 核心结果

| 接口 | 单体中位 P95 | 微服务中位 P95 | P95 变化 | 单体中位 RPS | 微服务中位 RPS | RPS 变化 | 结果 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 推荐流 | 6.75 ms | 15.66 ms | +132.0% | 3009.32 | 1505.41 | -50.0% | 下降 |
| 视频搜索 | 24.29 ms | 19.20 ms | -21.0% | 935.16 | 1301.26 | +39.1% | 提升 |
| 视频详情 | 9.55 ms | 23.52 ms | +146.3% | 2320.96 | 961.41 | -58.6% | 下降 |

测试共完成 4320 次正式请求，全部返回 HTTP 200，错误数为 0。最大单轮 P95 为 58.68 ms，低于 1000 ms 门槛。

## 5. 详细数据

| 接口 | 架构 | 轮次 | RPS | 平均响应 ms | P50 ms | P95 ms | P99 ms | 最大 ms | 错误 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 推荐流 | 单体 | 1 | 2377.54 | 6.53 | 5.56 | 10.26 | 47.88 | 52.69 | 0 |
| 推荐流 | 微服务 | 1 | 1153.05 | 13.65 | 13.12 | 21.36 | 29.77 | 29.83 | 0 |
| 视频搜索 | 微服务 | 1 | 1136.69 | 13.89 | 13.28 | 19.20 | 20.92 | 39.78 | 0 |
| 视频搜索 | 单体 | 1 | 935.16 | 16.84 | 16.45 | 21.87 | 31.72 | 35.42 | 0 |
| 视频详情 | 单体 | 1 | 2129.27 | 7.24 | 6.88 | 10.59 | 12.54 | 13.09 | 0 |
| 视频详情 | 微服务 | 1 | 518.83 | 30.44 | 22.53 | 58.68 | 67.47 | 86.88 | 0 |
| 视频搜索 | 单体 | 2 | 916.40 | 17.25 | 16.59 | 25.95 | 27.43 | 28.05 | 0 |
| 视频搜索 | 微服务 | 2 | 1373.33 | 11.39 | 10.67 | 17.23 | 17.97 | 18.98 | 0 |
| 视频详情 | 微服务 | 2 | 961.41 | 16.32 | 16.60 | 21.43 | 23.82 | 26.04 | 0 |
| 视频详情 | 单体 | 2 | 2510.44 | 6.27 | 6.01 | 8.69 | 10.42 | 10.64 | 0 |
| 推荐流 | 微服务 | 2 | 1505.41 | 10.38 | 9.88 | 15.66 | 18.30 | 18.93 | 0 |
| 推荐流 | 单体 | 2 | 3009.32 | 5.18 | 5.17 | 6.75 | 7.74 | 7.83 | 0 |
| 视频详情 | 单体 | 3 | 2320.96 | 6.82 | 6.67 | 9.55 | 10.70 | 13.06 | 0 |
| 视频详情 | 微服务 | 3 | 1013.16 | 15.42 | 14.83 | 23.52 | 25.64 | 26.51 | 0 |
| 推荐流 | 单体 | 3 | 3040.78 | 5.14 | 5.14 | 6.38 | 7.23 | 8.66 | 0 |
| 推荐流 | 微服务 | 3 | 1715.61 | 9.21 | 8.98 | 11.99 | 12.94 | 15.02 | 0 |
| 视频搜索 | 微服务 | 3 | 1301.26 | 12.08 | 11.42 | 21.09 | 24.63 | 26.22 | 0 |
| 视频搜索 | 单体 | 3 | 939.67 | 16.83 | 16.35 | 24.29 | 25.10 | 29.73 | 0 |

## 6. 结果分析

### 6.1 推荐流

微服务的中位 P95 增加 132.0%，吞吐量下降 50.0%。该接口在微服务改造后性能下降。

### 6.2 视频搜索

微服务的中位 P95 下降 21.0%，吞吐量提升 39.1%。该接口在微服务改造后性能提升。

### 6.3 视频详情

微服务的中位 P95 增加 146.3%，吞吐量下降 58.6%。该接口在微服务改造后性能下降。

## 7. 结论

三个接口中，视频搜索性能提升，推荐流和视频详情性能下降。微服务改造后的整体性能呈混合结果，三个接口的综合表现偏下降。

本次 4320 次请求全部成功，错误率为 0%，三个接口均通过性能验收门槛。微服务改造在承担 Gateway 转发开销的同时，获得了独立部署、弹性扩缩容和故障隔离能力。

## 8. 复现命令

```bash
PERF_MONOLITH_BASE_URL=http://127.0.0.1:3200 \
PERF_MICROSERVICE_BASE_URL=http://127.0.0.1:3100 \
PERF_SEARCH_KEYWORD='PERF01 shared published fixture' \
PERF_VIDEO_ID=1 \
PERF_ENDPOINTS='recommend,search,video-detail' \
PERF_ROUNDS=3 \
PERF_REQUESTS=240 \
PERF_CONCURRENCY=16 \
PERF_MAX_P95_MS=1000 \
PERF_CSV_PATH=performance-three-endpoint-runs.csv \
node scripts/performance-compare.mjs
```

## 9. 证据索引

| 证据 | 链接 |
| --- | --- |
| PR #74 | [perf(practice): compare three discovery endpoints](https://github.com/DanTargaryen/VideoPlayer/pull/74) |
| PR #74 merge commit | [`6cf940bf`](https://github.com/DanTargaryen/VideoPlayer/commit/6cf940bf86bf10a1da1049d17944b77da70f2f66) |
| 性能测试 Commit | [`a8c1786`](https://github.com/DanTargaryen/VideoPlayer/commit/a8c1786d78e1e34d7294c2c7b584337e28883730) |
| 18 行原始 CSV | [`performance-three-endpoint-runs.csv`](https://github.com/DanTargaryen/VideoPlayer/blob/a8c1786d78e1e34d7294c2c7b584337e28883730/docs/practice-2026/evidence/performance-three-endpoint-runs.csv) |
| 性能测试脚本 | [`performance-compare.mjs`](https://github.com/DanTargaryen/VideoPlayer/blob/a8c1786d78e1e34d7294c2c7b584337e28883730/scripts/performance-compare.mjs) |
| 实验记录 | [`13-resilience-performance-experiments.md`](https://github.com/DanTargaryen/VideoPlayer/blob/a8c1786d78e1e34d7294c2c7b584337e28883730/docs/practice-2026/13-resilience-performance-experiments.md) |
| PR 远程检查 | [GitHub Actions run 33498631270](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33498631270) |
