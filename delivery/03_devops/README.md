# 03_devops：可独立提交的 DevOps 实体材料

> 本目录不再只是仓库索引。Docker、流水线、Kubernetes/Kustomize、数据库和部署/回滚相关文件均以普通文件复制在本目录内；单独复制或压缩整个 `delivery/` 后仍可离线审阅。
>
> 实体文件冻结来源：`main@481d683de584aeb9abaf6bb2df38f025bb514c30`。本目录不使用软链接，也不包含真实 Secret。

## 目录内容

| 本地目录/文件 | 实体材料 | 数量 |
| --- | --- | ---: |
| [`containers/`](containers/) | 7 个业务 Dockerfile、`.dockerignore`、4 套 Compose、Nginx、MySQL init 和环境变量示例 | 15 |
| [`pipelines/`](pipelines/) | GitHub Actions workflow、Jenkinsfile、完整 CI 阶段脚本和 JUnit reporter | 22 |
| [`kubernetes/`](kubernetes/) | 单体与微服务 Kubernetes/Kustomize YAML、migration Job、HPA、探针及部署/健康检查脚本 | 35 |
| [`database/`](database/) | 5 套 Prisma schema、16 个 migration SQL、seed、目标安全守卫和 4 套 cutover migration | 40 |
| [`deployment/`](deployment/) | Compose 双目标 Gate、读写切流、发布与回滚 smoke 脚本 | 7 |
| [`devops-verification-report.md`](devops-verification-report.md) | 本交付目录的范围、替代关系和验证结果 | 1 |
| [`source-manifest.tsv`](source-manifest.tsv) | 每份实体文件的原仓库路径、交付路径和 SHA-256 | 119 条 |
| [`checksums.sha256`](checksums.sha256) | 本目录除清单自身外所有交付文件的 SHA-256 | 自动生成 |

## 关键入口

- Docker/Compose：[`containers/compose/docker-compose.practice.yml`](containers/compose/docker-compose.practice.yml)、[`containers/compose/docker-compose.microservices.yml`](containers/compose/docker-compose.microservices.yml)
- GitHub Actions：[`pipelines/github-actions/monolith-ci.yml`](pipelines/github-actions/monolith-ci.yml)
- Jenkins：[`pipelines/Jenkinsfile`](pipelines/Jenkinsfile)、[`pipelines/scripts/ci-local-run.sh`](pipelines/scripts/ci-local-run.sh)
- Kubernetes：[`kubernetes/kustomization.yaml`](kubernetes/kustomization.yaml)、[`kubernetes/microservices/kustomization.yaml`](kubernetes/microservices/kustomization.yaml)
- Kind 部署与健康检查：[`kubernetes/scripts/k8s-deploy.sh`](kubernetes/scripts/k8s-deploy.sh)、[`kubernetes/scripts/k8s-deploy-microservices.sh`](kubernetes/scripts/k8s-deploy-microservices.sh)、[`kubernetes/scripts/k8s-health-check-microservices.sh`](kubernetes/scripts/k8s-health-check-microservices.sh)
- 数据库 migration/seed：[`database/backend/prisma/`](database/backend/prisma/)、[`database/services/`](database/services/)
- 迁移安全守卫：[`database/backend/scripts/db-target-safety.js`](database/backend/scripts/db-target-safety.js)、[`database/backend/scripts/db-baseline-existing.js`](database/backend/scripts/db-baseline-existing.js)
- 历史数据切流：[`database/scripts/identity-cutover-migrate.mjs`](database/scripts/identity-cutover-migrate.mjs)、[`database/scripts/content-cutover-migrate.mjs`](database/scripts/content-cutover-migrate.mjs)、[`database/scripts/live-cutover-migrate.mjs`](database/scripts/live-cutover-migrate.mjs)、[`database/scripts/governance-cutover-migrate.mjs`](database/scripts/governance-cutover-migrate.mjs)

## Kubernetes/Helm 说明

本项目交付的是原生 Kubernetes YAML + Kustomize，不包含 Helm Chart。任务书中的 “Kubernetes/Helm” 在本项目按 Kubernetes/Kustomize 路线完成；本目录没有伪造空的 `Chart.yaml` 或 `values.yaml`。如果课程明确要求 Helm 而不是二选一，需要另行实现真实 Helm Chart 后再补入本目录。

## 离线校验

在 `03_devops` 目录执行：

```bash
shasum -a 256 -c checksums.sha256
```

校验通过表示实体文件与本次交付冻结版本一致。`source-manifest.tsv` 用于在完整仓库中核对“原路径 → 交付路径”；不需要访问仓库即可阅读本目录中的实体副本。

## 执行边界

本目录是可独立审阅的提交材料，不是完整应用源码副本。Docker build context、Node workspace 和数据库执行仍依赖 `01_source` 中登记的完整仓库版本。不得把示例环境变量替换成真实口令后提交，也不得在共享数据库或共享集群直接执行 reset、seed、cutover 或故障注入。
