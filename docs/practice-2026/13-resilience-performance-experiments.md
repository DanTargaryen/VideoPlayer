# EXP-01 / EXP-02 / PERF-01 实验记录

> 执行时间：2026-08-31（Asia/Shanghai）
>
> 代码基线：`main@33573594695f5150b8ade8db45b599b775e3dff9` + `test/EXP-01-resilience-performance` 工作分支
>
> 环境：同一台 arm64 Mac；Docker 29.7.2；Kind `video-player` / Kubernetes v1.36.1；MySQL 8；MinIO 固定 digest；Node v25.8.2 host / Node 22 service image
>
> 原始日志：本地忽略 `.log`，不进入 Git；本文件保存可复核参数、关键时间点和聚合值。

## 1. 验收结论

| 任务 | 结果 | 验收条件 | 实际结果 |
| --- | --- | --- | --- |
| EXP-01 HPA | PASS | 压力升高扩容、撤压后缩容，保存 Pod/CPU 时间线 | Gateway 1→3→2→1；扩容和两段缩容均由 autoscaling/v2 HPA 完成 |
| EXP-02 故障恢复 | PASS | 依赖故障时受影响域明确失败、其他服务健康；依赖恢复后业务恢复 | live MySQL、SRS、MinIO 三类故障均通过 failure + recovery probe |
| PERF-01 性能对比 | PASS | 同机、同脚本、等价单条数据响应，各目标至少 3 次 | 两目标各 3 轮、每轮 240 请求/并发 16；1440 请求总计 0 错误；全部 p95 < 1000ms |

最终代码门禁：`npm run test:ci` 282/282 PASS，其中 experiment scripts 定点测试 4/4。

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

## 4. PERF-01 单体 / 微服务性能对比

### 4.1 方法

- 脚本：`scripts/performance-compare.mjs`。
- 两目标在同一 Compose 运行期、同一 host：monolith `3200`；microservice Gateway `3100`。
- 同一请求：`GET /api/v1/feeds/recommend?page=1&pageSize=1`；两目标均预检恰好返回 1 条已发布记录。
- 预热：两目标各 20 请求。
- 3 轮，轮次交叉目标顺序，避免固定先后偏差。
- 每目标每轮 240 请求，并发 16；读取完整响应体；5 秒请求 timeout。
- Gate：错误数 0，单轮 p95 ≤ 1000ms。比值只用于分析，不将“微服务必须快于单体”设为虚假验收条件。

### 4.2 原始聚合数据

| 目标 | 轮次 | RPS | mean ms | p50 ms | p95 ms | p99 ms | max ms | 错误 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| monolith | 1 | 1805.41 | 8.71 | 7.37 | 14.85 | 56.00 | 56.14 | 0 |
| microservice-gateway | 1 | 1108.22 | 14.21 | 13.23 | 22.32 | 31.40 | 43.50 | 0 |
| microservice-gateway | 2 | 1435.25 | 11.01 | 10.84 | 15.57 | 17.39 | 17.94 | 0 |
| monolith | 2 | 2334.84 | 6.75 | 6.57 | 9.44 | 9.83 | 10.02 | 0 |
| monolith | 3 | 2455.14 | 6.37 | 6.55 | 7.44 | 7.91 | 8.41 | 0 |
| microservice-gateway | 3 | 1496.81 | 10.48 | 9.77 | 15.24 | 18.31 | 19.24 | 0 |

| 目标 | 中位 p95 | 最大 p95 | 中位 RPS | 总错误 |
| --- | ---: | ---: | ---: | ---: |
| monolith | 9.44ms | 14.85ms | 2334.84 | 0 |
| microservice-gateway | 15.57ms | 22.32ms | 1435.25 | 0 |

微服务 Gateway / 单体的中位 p95 比值为 1.649，吞吐比值为 0.615。该结果符合预期：Gateway 路径包含身份/上游转发和跨服务序列化开销；在本演示机的小并发范围内仍远低于 1000ms 门槛且无错误。它不是生产容量承诺，也不用于推断不同硬件或广域网结果。

## 5. K8s 部署可重复性修复

实验前从头复跑 `scripts/k8s-deploy-microservices.sh`，先后暴露并关闭三项部署缺陷：

1. `kind load --all-platforms` 对 MinIO/跨 builder metadata 缺 digest：统一改为 host `docker save` + node containerd import。
2. digest 形式 MinIO 未形成 Pod 可用 tag，且 rollout 在 set-image 前等待：固定 digest映射为本地 SHA tag，五服务/MinIO 先 set-image 再 rollout。
3. 重复部署只更新 Secret、镜像 tag 不变时旧 Pod 保留旧密码：MinIO Ready 后统一 restart 五 Deployment。

最终复跑：四个 migration Job Complete，MinIO 1/1，identity/content/live/governance/gateway 5/5 Ready。实验结束后精确删除微服务 Deployment/Service/Job/HPA/Secret/Config、MinIO StatefulSet/PVC 和四个实验 schema/user；保留单体 MySQL PVC、backend/frontend 与 Kind 集群。
