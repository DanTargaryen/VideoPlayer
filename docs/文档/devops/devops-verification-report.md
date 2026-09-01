# VideoPlayer DevOps 验证报告

## 1. 验证范围

本报告对应课程最终交付目录 `03_devops`，验证范围包括：

- Dockerfile 与镜像构建入口；
- Docker Compose 部署配置；
- Kubernetes/Kind YAML 与 Kustomize 渲染；
- 数据库 migration、seed 与安全守卫；
- GitHub Actions 与 Jenkins 流水线配置；
- 自动部署、健康检查、证据归档和清理流程。

本轮验证时间为 2026-09-01，验证代码基线为：

```text
branch: lzy
HEAD: 198015f
commit: Merge pull request #63 from DanTargaryen/docs/DEL-01-complete-delivery-gaps
```

## 2. 环境检查结果

| 项目 | 结果 |
| --- | --- |
| Node.js | v22.19.0 |
| npm | 10.9.3 |
| Docker CLI | Docker 29.3.1 |
| Docker Compose | v5.1.1 |
| kubectl | Client v1.34.1，Kustomize v5.7.1 |
| kind | v0.32.0 windows/amd64 |

Docker Desktop 初始未运行，启动后 Docker Engine 正常响应，版本为 29.3.1。

## 3. Docker 与 Compose 验证

仓库中共有 7 个 Dockerfile：

| 服务 | Dockerfile |
| --- | --- |
| 后端单体 | `backend/Dockerfile` |
| 前端 | `frontend/Dockerfile` |
| identity-community | `services/identity-community/Dockerfile` |
| content-media | `services/content-media/Dockerfile` |
| live-reward | `services/live-reward/Dockerfile` |
| governance-ai | `services/governance-ai/Dockerfile` |
| gateway | `services/gateway/Dockerfile` |

本轮执行了 Compose 配置渲染检查：

```powershell
docker compose -f deploy/docker-compose.practice.yml config --quiet
docker compose -f deploy/docker-compose.microservices.yml config --quiet
```

由于 Compose 文件显式要求敏感变量，未注入变量时会拒绝渲染，这是预期的安全行为：

```text
practice-compose-exit=1
error while interpolating services.mysql.environment.MYSQL_ROOT_PASSWORD

microservices-compose-exit=1
error while interpolating services.governance-ai.environment.GOVERNANCE_DATABASE_URL
```

使用一次性本地测试变量后，两个 Compose 配置均通过：

```text
practice-compose-with-env-exit=0
microservices-compose-with-env-exit=0
```

结论：Compose 文件语法和变量引用有效，且对数据库密码、JWT、MinIO 访问密钥等敏感配置有显式守卫。

## 4. Kubernetes 与 Kind 配置验证

仓库中 Kubernetes YAML 共 26 个，覆盖：

- 单体 `backend`、`frontend`、`mysql`、migration Job；
- 微服务 `identity-community`、`content-media`、`live-reward`、`governance-ai`、`gateway`；
- MinIO StatefulSet；
- 四个微服务 migration Job；
- Service、ConfigMap、Secret 示例、readiness/liveness probes；
- Gateway HPA。

本轮执行：

```powershell
kubectl kustomize deploy/k8s > .codex-run/k8s-monolith-render.yaml
kubectl kustomize deploy/k8s/microservices > .codex-run/k8s-microservices-render.yaml
```

结果：

```text
k8s-monolith-render-exit=0
k8s-monolith-render.yaml size=15922 bytes

k8s-microservices-render-exit=0
k8s-microservices-render.yaml size=34168 bytes
```

微服务渲染结果中包含以下核心资源：

```text
Service: content-media, content-minio, gateway, governance-ai, identity-community, live-reward
Deployment: content-media, gateway, governance-ai, identity-community, live-reward
StatefulSet: content-minio
HorizontalPodAutoscaler: gateway
```

结论：单体与微服务 Kubernetes 配置均可由 Kustomize 正常渲染，具备提交到 Kind/Kubernetes 的基础条件。

## 5. 数据库迁移与 Seed 验证

仓库中共有 16 个 migration SQL 文件：

- 单体：`backend/prisma/migrations/`；
- identity：`services/identity-community/prisma/migrations/`；
- content：`services/content-media/prisma/migrations/`；
- live：`services/live-reward/prisma/migrations/`；
- governance：`services/governance-ai/prisma/migrations/`。

本轮在全新本地 MySQL 容器中执行了单体正式 migration 与 seed：

```text
container: videoplayer-delivery-test-mysql
database: video_player_delivery_test
host: 127.0.0.1
port: 3317
```

执行命令：

```powershell
$env:DATABASE_URL='mysql://root:delivery_root_pw@127.0.0.1:3317/video_player_delivery_test'
npm run db:migrate
npm run db:seed
```

结果：

```text
[db-target-safety] db:migrate allowed for 127.0.0.1:3317/video_player_delivery_test.
Applying migration `20260826000000_init`
Applying migration `20260827_pending_report_idempotency`
All migrations have been successfully applied.

Seed completed:
users: 6
videos: 14
publishedVideos: 11
admin: demo_admin / Admin123456!
user: demo_user / User123456!
```

结论：数据库迁移入口使用 `prisma migrate deploy`，并通过 `db-target-safety` 限制测试数据库目标；本轮只操作库名包含 `test` 的本机隔离库，没有对共享远端数据库执行 reset、baseline 或 destructive seed。

## 6. CI/CD 流水线验证

项目提供两类流水线入口：

| 类型 | 文件 |
| --- | --- |
| GitHub Actions | `.github/workflows/monolith-ci.yml` |
| Jenkins Pipeline | `Jenkinsfile` |
| 本地等价入口 | `scripts/ci-local-run.sh` |
| 阶段脚本 | `scripts/ci-install.sh`、`ci-lint.sh`、`ci-build.sh`、`ci-unit.sh`、`ci-db-migrate.sh`、`ci-api-integration.sh`、`ci-playwright-e2e.sh`、`ci-build-images.sh`、`ci-k8s-deploy.sh`、`ci-k8s-health-check.sh` |

Jenkinsfile 阶段包括：

```text
Checkout -> Install -> Lint -> Build -> Unit Test -> Isolated Database Migration
-> API Integration -> Seed E2E Data -> Playwright E2E -> Build Git SHA Images
-> Deploy to Kind -> Health Check -> post junit/archive/cleanup
```

实践文档已记录的流水线结果：

| 流水线 | 结果 |
| --- | --- |
| GitHub Actions run `33324914355` | quality、public E2E、Git SHA 镜像、Kind deploy、health、artifact、cleanup 全部 PASS |
| Jenkins Build #2 | SUCCESS，归档 29 个 Artifact |
| Jenkins Build #4 | 故意失败，Unit 后阻断后续 migration/image/deploy/health |
| Jenkins Build #5 | SCM 自动触发 SUCCESS |
| Jenkins Build #7 | 正式 migration SUCCESS |
| Jenkins Build #9 | 186 passed、11 XML、39 Artifacts、单体与五微服务 health PASS |
| Jenkins Build #10 | 故意失败后仍发布 9 份 XML，后续 7 阶段 skipped |

结论：流水线已覆盖 CI 和 CD 两部分。CI 负责安装、构建、静态检查和测试；CD 从 Git SHA 镜像构建开始，继续执行 Kind 部署、migration、健康检查、证据上传和清理。

## 7. 本轮限制说明

本轮在 Windows PowerShell 中发现 `.sh` 脚本直接由 WSL/bash 执行时会受 CRLF 行尾影响，报错：

```text
scripts/ci-bootstrap.sh: line 2: set: pipefail
: invalid option name
```

因此，本轮没有直接执行完整 `scripts/ci-local-run.sh`。该问题属于 Windows/WSL 行尾执行环境限制；远端 Linux CI/Jenkins 证据已经证明完整流水线可运行。本轮改用 PowerShell 直接执行隔离数据库、migration、API 和 Playwright E2E 流程，并对 Compose/Kubernetes 做静态渲染复核。

## 8. DevOps 验证结论

DevOps 交付内容完整，能够支撑课程要求中的 Docker、流水线、Kubernetes/Kind 和数据库脚本交付：

- Dockerfile 覆盖单体、前端、四个业务微服务和 Gateway；
- Compose 支持单体与微服务部署，并对敏感配置有显式必填校验；
- Kubernetes 配置可成功渲染，包含 Deployment、Service、StatefulSet、Job、HPA 和探针；
- migration/seed 在本地隔离测试库中实测通过；
- GitHub Actions 与 Jenkins 流水线已具备自动构建、自动测试、镜像构建、Kind 部署、健康检查、证据归档和清理能力；
- 未对共享远端数据库执行破坏性操作。
