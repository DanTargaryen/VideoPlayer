# 03_devops：容器、CI/CD、Kubernetes、迁移与回滚

## 入口清单

| 范围 | 入口 |
| --- | --- |
| 单体 Compose | [`deploy/docker-compose.practice.yml`](../../deploy/docker-compose.practice.yml) |
| 微服务 Compose | [`deploy/docker-compose.microservices.yml`](../../deploy/docker-compose.microservices.yml) |
| GitHub Actions | [`.github/workflows/monolith-ci.yml`](../../.github/workflows/monolith-ci.yml) |
| Jenkins | [`Jenkinsfile`](../../Jenkinsfile)、[`scripts/ci-local-run.sh`](../../scripts/ci-local-run.sh) |
| 单体 Kind | [`scripts/k8s-deploy.sh`](../../scripts/k8s-deploy.sh)、[`scripts/k8s-health-check.sh`](../../scripts/k8s-health-check.sh) |
| 微服务 Kind | [`scripts/k8s-deploy-microservices.sh`](../../scripts/k8s-deploy-microservices.sh)、[`scripts/k8s-health-check-microservices.sh`](../../scripts/k8s-health-check-microservices.sh) |
| 完整 Compose Gate | [`scripts/compose-microservices-smoke.sh`](../../scripts/compose-microservices-smoke.sh) |
| 运行手册 | [`docs/practice-2026/11-jenkins-kind-cicd-runbook.md`](../../docs/practice-2026/11-jenkins-kind-cicd-runbook.md) |

## 数据库与迁移安全

- 单体、identity、content、live、governance 分别有独立 Prisma schema 和 migration。
- 容器/Kind 使用一次性 migration Job 或 migration image，runtime 账号保持最小权限。
- 历史 cutover 工具需要任务专用确认值；source 与 target 相同会拒绝。
- 非测试目标必须通过精确 host、port、database 白名单；不接受模糊 host 或通配符。
- migration 可重复执行，但最终必须逐表比较；目标多余、缺失或字段不一致会失败停止。
- 单体 owner 表未删除；所有切流均保留 `GATEWAY_ROUTE_MODE=monolith` 回滚路径。

迁移与切流实现位于：

- [`scripts/identity-cutover-migrate.mjs`](../../scripts/identity-cutover-migrate.mjs)
- [`scripts/content-cutover-migrate.mjs`](../../scripts/content-cutover-migrate.mjs)
- [`scripts/live-cutover-migrate.mjs`](../../scripts/live-cutover-migrate.mjs)
- [`scripts/governance-cutover-migrate.mjs`](../../scripts/governance-cutover-migrate.mjs)

执行前先读脚本的 `--help`、对应环境变量守卫测试和进度文档；禁止把示例确认值照搬到共享环境。

## GitHub-hosted CI/CD Gate

最终 workflow 顺序：

```text
quality ─┐
         ├─> versioned-images -> Kind migration/deploy/health/evidence/cleanup
public-e2e┘
```

- `quality`：Prisma generate、lint、build、requirements/unit/service/REG harness。
- `public-e2e`：全新隔离数据库 migration、Seed 和 Playwright。
- `versioned-images`：仅在前两项成功后构建 Git SHA 镜像，创建 Kind，验证 migration、rollout、health/version、0 restart，上传 Artifact 并清理。
- 故意失败和 checkout/network 失败记录保留；不把环境失败写成测试通过。

最终远端 run 索引见 [`../01_source/README.md`](../01_source/README.md)。

## Kubernetes 与 HPA

基础微服务部署位于 [`deploy/k8s/microservices`](../../deploy/k8s/microservices)，包括五个 Deployment、四个 migration、四个独立 schema/account、MinIO、探针和资源请求/限制。HPA 实验在隔离 Kind 中使用官方 metrics-server 组件与本地校验过的镜像，结束后清理 HPA、metrics-server、负载 Pod、业务资源和测试 schema/account。

不要直接在共享集群执行故障注入。实验环境、时间线、校验和与清理结果见 [`docs/practice-2026/13-resilience-performance-experiments.md`](../../docs/practice-2026/13-resilience-performance-experiments.md)。

## 回滚核对

1. 停止新写流量并记录 requestId 范围。
2. 将 Gateway 切回 `GATEWAY_ROUTE_MODE=monolith`，或从读写 allowlist 移除目标服务。
3. 验证 `/health/live`、`/health/ready`、`/version` 和代表性 UC。
4. 不删除单体表，不对目标库做 reset；先保存日志、迁移比较和失败请求。
5. 修复后重新执行 migration 全量比较、服务 contract、Compose Gate 和 REG-01，再分阶段恢复切流。

## 清理边界

每次执行使用唯一 `COMPOSE_PROJECT_NAME`、Kind cluster、namespace、schema 和账号。清理命令只能引用已经打印并人工核对的明确名称；不得使用空变量、`~`、工作区根目录或广泛通配符作为删除目标。
