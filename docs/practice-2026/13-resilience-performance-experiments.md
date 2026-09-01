# EXP-01 / EXP-02 / PERF-01 实验记录

> 执行时间：2026-08-31；三接口性能矩阵复测 2026-09-01（Asia/Shanghai）
>
> 三接口最终复测代码基线：`main@27f9425c1abc421ec1ed994ae5e077e1ab5957b5` + `perf/PERF-01-three-endpoint-matrix` 本地工作分支
>
> 三接口复测环境：同一台 arm64 Mac（macOS 26.6.2）；Docker 29.5.2；MySQL 8.0.46；MinIO 固定 digest；Node v25.8.2 host / Node 22 service image
>
> 原始日志：本地忽略 `.log`，不进入 Git；本文件保存可复核参数、关键时间点和聚合值。

## 1. 验收结论

| 任务 | 结果 | 验收条件 | 实际结果 |
| --- | --- | --- | --- |
| EXP-01 HPA | PASS | 压力升高扩容、撤压后缩容，保存 Pod/CPU 时间线 | Gateway 1→3→2→1；扩容和两段缩容均由 autoscaling/v2 HPA 完成 |
| EXP-02 故障恢复 | PASS | 依赖故障时受影响域明确失败、其他服务健康；依赖恢复后业务恢复 | live MySQL、SRS、MinIO 三类故障均通过 failure + recovery probe |
| PERF-01 性能对比 | PASS | 推荐/搜索/详情 3 接口，同机、同脚本、同一逻辑数据，单体/微服务各至少 3 轮 | 3 接口 × 2 目标 × 3 轮 × 240 = 4320 次正式请求，0 error；搜索提升，推荐/详情下降；全部 p95 < 1000ms |

最终代码门禁：`npm run test:ci` 286/286 PASS，其中 experiment scripts 定点测试 5/5；交付包与性能定点组合测试 7/7。

## 2. EXP-01 HPA

### 2.1 配置与依赖

- HPA：`deploy/k8s/microservices/hpa.yaml`，目标 `Deployment/gateway`，`minReplicas=1`、`maxReplicas=3`、CPU `averageUtilization=25`。
- 扩容：15 秒最多增加 2 Pod；缩容：30 秒稳定窗，15 秒最多减少 1 Pod。
- Gateway CPU request/limit：50m / 500m。
- 负载：集群内使用已导入的 Gateway Node 镜像运行 64 workers，持续上限 120 秒，请求 `http://gateway:3000/health/ready`。
- Metrics Server：官方 v0.9.0；`components.yaml` SHA-256 `1cec29a5267809306a2c6ec74a3e449abbb705b4a8beed0c8a1963910f72c79b`；arm64 binary SHA-256 `fdc7e8a27b3f509609def95e341ab03fcd2205dc70d12141326459b90b759010`。官方 release 与兼容说明：<https://github.com/kubernetes-sigs/metrics-server/releases/tag/v0.9.0>、<https://github.com/kubernetes-sigs/metrics-server>。
- Kind 使用自签 kubelet serving certificate，仅在测试集群追加官方标记为 testing-only 的 `--kubelet-insecure-tls`；不加入生产 manifest。
- registry proxy 不可用时，`scripts/download-release-asset.mjs` 以 16 个 byte range 下载官方 binary，逐段长度、总长度和 SHA-256 全部验证，再以 scratch image 导入 Kind。

### 2.2 关键时间线

| UTC 时间 | 阶段 | Ready / Desired | CPU | 结论 |
| --- | --- | --- | --- | --- |
| 06:54:15 | baseline | 1 / 1 | 2% | 基线稳定 |
| 06:54:31 | load | 1 / 3 | 104% | HPA 已请求最大 3 副本 |
| 06:54:36 | load | 3 / 3 | 104% | 约 21 秒完成 1→3 |
| 06:55:45 | recovery | 3 / 3 | 125% | kubelet 指标仍包含负载窗口 |
| 06:55:46 | recovery | 3 / 3 | 2% | CPU 已回落 |
| 06:56:01 | recovery | 2 / 2 | 2% | 第一段缩容 |
| 06:56:16 | recovery | 1 / 1 | 2% | 约 30 秒完成 3→1 |

最终脚本断言：至少扩到 2（实际 3），并最终同时满足 ready=1 / desired=1。退出时删除 load Pod、HPA、临时 metrics-server 资源，Gateway 保持 1 副本。

### 2.3 HPA 失败与修复

1. Kind 无 Metrics API，不能仅凭 HPA YAML 判定通过；补官方 metrics-server。
2. Kind/host registry proxy 不可用；改用官方 release binary + checksum + scratch local image。
3. 单连接 release asset 下载停滞；增加可续传的并行 byte-range 下载器。
4. 额外 `--metric-resolution=10s` 与默认 kubelet timeout 同为 10 秒，v0.9.0 拒绝启动；保留官方 15 秒，只追加 insecure TLS 测试 flag。

## 3. EXP-02 依赖故障与恢复

实验在标准 Compose 四库、MinIO、五服务、Gateway、独立单体目标完成 REG-01 12/12 后执行；故障注入后均检查 Gateway 与未受影响服务 readiness。

| 依赖 | 故障动作 | 受影响结果 | 未受影响结果 | 恢复动作与结果 |
| --- | --- | --- | --- | --- |
| live MySQL | `compose stop live-mysql` | live `/health/ready` → 503 | identity/content/governance/Gateway → 200 | `compose start` 后 live ready → 200 |
| SRS | 以 `SRS_API_BASE=http://127.0.0.1:1` 重建 live | room start → 503，标准消息包含 SRS unavailable | identity/governance/Gateway → 200 | 清空 SRS override 重建；同一 room start 200、stop `ENDED` |
| MinIO | `compose stop content-minio` | 合法 MP4 upload → 500，标准 envelope：`getaddrinfo EAI_AGAIN content-minio` | identity/live/governance/Gateway → 200 | `compose start` 后合法 MP4 upload → 200，assetId/uploadToken 有效 |

探针源码：`scripts/fault-experiment-probe.mjs`。标准 Compose 最后仍执行 `GATEWAY_ROUTE_MODE=monolith` rollback，所有容器、volumes、临时单体数据库/进程和端口清理 PASS。

## 4. PERF-01 单体 / 微服务三接口性能对比

### 4.1 方法

- 脚本：`scripts/performance-compare.mjs`，schema `perf-01/v2`。
- 两目标在同一 Compose 运行期、同一 host：monolith `3200`；microservice Gateway `3100`。
- 三接口：
  - `GET /api/v1/feeds/recommend?page=1&pageSize=1`
  - `GET /api/v1/search/all?keyword=PERF01%20shared%20published%20fixture&tab=video&page=1&pageSize=1`
  - `GET /api/v1/videos/1`
- 等价数据：REG/故障探针完成后，两个隔离数据库都只保留 `id=1` 为 `PUBLISHED`，统一标题 `PERF01 shared published fixture`；其余视频改为 `DRAFT`。计时前三接口必须在两目标返回相同 `id:title` 签名。
- 预热：每接口、每目标各 20 请求。
- 3 轮，轮次旋转接口顺序并交叉目标先后，避免固定热机/先后偏差。
- 每接口、每目标、每轮 240 请求，并发 16；读取完整响应体；5 秒 timeout。正式计时请求总数 `3 × 2 × 3 × 240 = 4320`。
- Gate：每接口/目标恰好 3 轮，错误数 0，单轮 p95 ≤ 1000ms。比值只用于分析，不将“微服务必须快于单体”设为虚假验收条件。

### 4.2 原始聚合数据

| 接口 | 目标 | 轮次 | RPS | mean ms | p50 ms | p95 ms | p99 ms | max ms | 错误 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| recommend | monolith | 1 | 2377.54 | 6.53 | 5.56 | 10.26 | 47.88 | 52.69 | 0 |
| recommend | microservice-gateway | 1 | 1153.05 | 13.65 | 13.12 | 21.36 | 29.77 | 29.83 | 0 |
| search | microservice-gateway | 1 | 1136.69 | 13.89 | 13.28 | 19.20 | 20.92 | 39.78 | 0 |
| search | monolith | 1 | 935.16 | 16.84 | 16.45 | 21.87 | 31.72 | 35.42 | 0 |
| video-detail | monolith | 1 | 2129.27 | 7.24 | 6.88 | 10.59 | 12.54 | 13.09 | 0 |
| video-detail | microservice-gateway | 1 | 518.83 | 30.44 | 22.53 | 58.68 | 67.47 | 86.88 | 0 |
| search | monolith | 2 | 916.40 | 17.25 | 16.59 | 25.95 | 27.43 | 28.05 | 0 |
| search | microservice-gateway | 2 | 1373.33 | 11.39 | 10.67 | 17.23 | 17.97 | 18.98 | 0 |
| video-detail | microservice-gateway | 2 | 961.41 | 16.32 | 16.60 | 21.43 | 23.82 | 26.04 | 0 |
| video-detail | monolith | 2 | 2510.44 | 6.27 | 6.01 | 8.69 | 10.42 | 10.64 | 0 |
| recommend | microservice-gateway | 2 | 1505.41 | 10.38 | 9.88 | 15.66 | 18.30 | 18.93 | 0 |
| recommend | monolith | 2 | 3009.32 | 5.18 | 5.17 | 6.75 | 7.74 | 7.83 | 0 |
| video-detail | monolith | 3 | 2320.96 | 6.82 | 6.67 | 9.55 | 10.70 | 13.06 | 0 |
| video-detail | microservice-gateway | 3 | 1013.16 | 15.42 | 14.83 | 23.52 | 25.64 | 26.51 | 0 |
| recommend | monolith | 3 | 3040.78 | 5.14 | 5.14 | 6.38 | 7.23 | 8.66 | 0 |
| recommend | microservice-gateway | 3 | 1715.61 | 9.21 | 8.98 | 11.99 | 12.94 | 15.02 | 0 |
| search | microservice-gateway | 3 | 1301.26 | 12.08 | 11.42 | 21.09 | 24.63 | 26.22 | 0 |
| search | monolith | 3 | 939.67 | 16.83 | 16.35 | 24.29 | 25.10 | 29.73 | 0 |

主证据 CSV：[`evidence/performance-three-endpoint-runs.csv`](evidence/performance-three-endpoint-runs.csv)。独立交付副本：[`delivery/04_tests/experiments/performance-three-endpoint-runs.csv`](../../delivery/04_tests/experiments/performance-three-endpoint-runs.csv)。

### 4.3 逐接口对比结论

| 接口 | 单体中位 p95 | 微服务中位 p95 | p95 变化 | 单体中位 RPS | 微服务中位 RPS | RPS 变化 | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 推荐流 | 6.75ms | 15.66ms | +132.0% | 3009.32 | 1505.41 | -50.0% | **下降** |
| 搜索 | 24.29ms | 19.20ms | -21.0% | 935.16 | 1301.26 | +39.1% | **提升** |
| 视频详情 | 9.55ms | 23.52ms | +146.3% | 2320.96 | 961.41 | -58.6% | **下降** |

微服务拆分的影响不是统一的“更快”或“更慢”：搜索下沉到 content-media 后在本数据集上 p95 下降 21.0%、吞吐提升 39.1%；推荐流和详情页的端到端结果则下降，与 Gateway/跨服务额外链路开销的影响一致。三接口中 2 个下降、1 个提升，所以整体结论是 **mixed，但偏下降**，而不是“微服务必然提升性能”。本实验测量的是拆分后的净效果，没有用 tracing 单独分解各层耗时；该结果是同机小并发验收数据，不是生产容量承诺。

### 4.4 三接口复测失败与修正

1. 旧 `perf-01/v1` 只有一个 `PERF_PATH`，并把响应强制写死为“数组长度 1”；改为三个 endpoint profile 和各自响应契约。
2. 首次真实环境冷构建约 20 分钟，之后因临时 monolith mock 固定端口 3000 与已有 startcheck 服务冲突，在进入性能阶段前失败；补 MinIO/monolith mock 可配置主机端口，本轮使用 19000/19001/13000，未停止已有容器。
3. 第二次运行发现 REG 后两目标推荐首条不是同一逻辑记录；旧脚本未检查这一点。新脚本拒绝开始计时，随后增加两库共享 fixture 和签名一致性 Gate。
4. 第三次运行将非目标视频设为 `HIDDEN`，但单体 `VideoStatus` 无该枚举，MySQL 拒绝；改用两侧都支持的 `DRAFT`后复跑。
5. 第四次完整复跑首次得到三接口数据；自审发现视频详情三轮固定为单体先跑，虽然数据有效，但存在可消除的先后偏差。
6. 调整为每个接口逐轮交替目标顺序并增加自动断言后，第五次完整复跑通过：双目标 REG 12/12、三类故障恢复、4320 请求/0 error、rollback 与容器/volume/端口清理全部 PASS；最终报告只采用第五次数据。
7. 合并 QA-CLOSE-01 后把测试迁移到最新 `main@27f9425`；本机 Compose 5.5 缺 buildx，改用仓库 `ci-build-images.sh` 逐个构建 11 个完整 SHA 镜像，Dockerfile 内 npm 下载继续受 300 秒与五次重试约束。
8. 最新主干首次环境启动时 Docker VM 内部空间耗尽，四个 MySQL 在业务测试前以 `ENOSPC` 退出；只清理 0 容器引用的 dangling 中间镜像，回收 4.306GB，未删除 volume、具名镜像或运行容器。
9. 清理后的最终复跑采用最新完整 SHA 镜像：services-mode 浏览器 7/7、双目标 REG 12/12、三类故障恢复、4320/4320 200、0 error、rollback 与容器/volume/端口清理全部 PASS；本文件与交付包只采用这轮数据。

## 5. K8s 部署可重复性修复

实验前从头复跑 `scripts/k8s-deploy-microservices.sh`，先后暴露并关闭三项部署缺陷：

1. `kind load --all-platforms` 对 MinIO/跨 builder metadata 缺 digest：统一改为 host `docker save` + node containerd import。
2. digest 形式 MinIO 未形成 Pod 可用 tag，且 rollout 在 set-image 前等待：固定 digest映射为本地 SHA tag，五服务/MinIO 先 set-image 再 rollout。
3. 重复部署只更新 Secret、镜像 tag 不变时旧 Pod 保留旧密码：MinIO Ready 后统一 restart 五 Deployment。

最终复跑：四个 migration Job Complete，MinIO 1/1，identity/content/live/governance/gateway 5/5 Ready。实验结束后精确删除微服务 Deployment/Service/Job/HPA/Secret/Config、MinIO StatefulSet/PVC 和四个实验 schema/user；保留单体 MySQL PVC、backend/frontend 与 Kind 集群。
