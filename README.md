# 观澜视频平台（VideoPlayer）

观澜视频平台是面向 Web 的视频、直播与内容治理系统。仓库同时保留可回归的 NestJS 单体基线，以及经 API Gateway 访问的四个独立业务微服务；六条业务链路、数据迁移、回滚、CI/CD、Kubernetes 弹性、故障恢复和性能对比均有可重跑证据。

## 项目成员

| 成员 | 学号 | 个人分工确认 |
| --- | --- | --- |
| 林明 | 23375181 | 待成员本人确认 |
| 刘钟屹 | 23375291 | 待成员本人确认 |
| 李晓萌 | 24371422 | 待成员本人确认 |
| 张壮志 | 24371350 | 待成员本人确认 |
| 王一涵 | 24371063 | 待成员本人确认 |

仓库中的 A–E 技术角色、任务和 Reviewer 映射见 [`docs/practice-2026/04-task-board.md`](docs/practice-2026/04-task-board.md)。真实姓名与角色、贡献权重和签字只能由成员确认，不能从提交数量推断。

## 当前状态

| 范围 | 状态 | 证据入口 |
| --- | --- | --- |
| 单体基线 | UC01–UC06 已验证；annotated tag `monolith-start` | [`docs/practice-2026/03-smoke-checklist.md`](docs/practice-2026/03-smoke-checklist.md) |
| 四业务微服务 | identity、content、live、governance 均有独立 schema、migration、镜像、探针和测试 | [`docs/practice-2026/08-service-boundaries-and-data-ownership.md`](docs/practice-2026/08-service-boundaries-and-data-ownership.md) |
| 路由与迁移 | 六条业务链路已分阶段切流；单体 fallback、历史迁移双跑和显式回滚均通过 | [`docs/practice-2026/00-progress.md`](docs/practice-2026/00-progress.md) |
| 全量回归 | 同一 runner 对单体和微服务 Gateway 各跑 UC01–UC06，12/12 PASS | [`test/regression/`](test/regression/) |
| 工程实验 | HPA 1→3→2→1；MySQL/SRS/MinIO 故障恢复；双目标三轮性能对比 | [`docs/practice-2026/13-resilience-performance-experiments.md`](docs/practice-2026/13-resilience-performance-experiments.md) |
| 最终交付 | 六目录技术包和答辩 PPT 已就绪；录屏、成员复现、权重与签字仍需真人补交 | [`delivery/README.md`](delivery/README.md) |

精确提交、PR、远端 workflow、测试计数和仍未关闭的人工 Gate 以 [`docs/practice-2026/00-progress.md`](docs/practice-2026/00-progress.md) 为唯一进度源。

## 架构与目录

```text
VideoPlayer/
  frontend/                    Vue 3 + TypeScript 主站与管理端
  backend/                     NestJS 单体基线与 Prisma schema
  services/
    gateway/                   统一入口、身份转发、能力白名单与回滚
    identity-community/        账号、资料、关系、社区动态、通知
    content-media/             视频、上传、互动、观看记录、MinIO
    live-reward/               直播、Session、消息、录播、币账本
    governance-ai/             提审、举报、处置、审计与补偿
    shared-contracts/          通用响应、requestId、服务 JWT contract
  deploy/                      Compose、Kubernetes、SRS、MySQL 配置
  scripts/                     CI、部署、迁移、回归与实验入口
  test/                        需求、单元、API、E2E、REG-01
  docs/                        需求、设计、运行手册与执行证据
  delivery/                    DEL-01 六目录交付包
```

Gateway 支持 `monolith` 与 `services` 两种路由模式，并用 `GATEWAY_READ_CUTOVER`、`GATEWAY_WRITE_CUTOVER` 只开放已实现的能力。未开放路径继续落到单体；每个切流阶段都保留显式回滚，单体 owner 表没有被删除。

## 环境要求

- Node.js 22 或更高版本、npm。
- Docker Engine 与 Docker Compose。
- 完整 Kubernetes 验收还需要 Kind、kubectl 和 Bash。
- 浏览器 E2E 使用 Playwright；首次安装按 Playwright 提示安装 Chromium。
- 所有数据库、JWT、MinIO 和管理密钥都通过本地环境文件或 Kubernetes Secret 注入，不提交真实值。

Windows 建议使用 Git Bash，并在检出前执行 `git config --global core.autocrlf false`，避免 shell 脚本被 CRLF 破坏。

## 最短验证路径

从全新依赖开始验证代码、构建、六个 workspace 和 REG harness：

```bash
npm ci
npm run test:ci
```

`test:ci` 依次执行 Prisma Client 生成，单体和微服务 lint/build，需求/单元测试，以及 REG-01 runner 自身测试；任一阶段非零退出都会阻断后续步骤。最新精确计数记录在进度文档和远端 workflow 中。

完整 Compose 微服务验收会创建四个隔离业务 schema、MinIO、SRS、四服务、Gateway，以及用于双目标回归的独立单体数据库和后端；它验证迁移、最小权限、15 个 health/version contract、真实浏览器流程、单体 6/6、Gateway 6/6 和 rollback，结束后自动清理：

```bash
MICROSERVICE_COMPOSE_PROJECT_NAME="video-player-final-$(git rev-parse --short=12 HEAD)" \
  bash scripts/compose-microservices-smoke.sh
```

不要对共享或生产数据库直接执行该 Smoke。脚本和 migration guard 默认只允许隔离测试目标；非测试目标必须使用文档规定的精确 host/port/database 白名单与一次性确认值。

## 本地开发

启动单体开发环境：

```bash
npm run dev
```

分别启动前后端：

```bash
npm run dev:backend
npm run dev:frontend
```

局域网演示直播应使用 HTTPS，以便浏览器允许摄像头、麦克风和屏幕共享：

```bash
npm run dev:lan
```

若自动选择的 IP 不正确，可显式设置 `LAN_HOST`；若后端端口被非本项目进程占用，可设置 `PORT`。Docker 不可用时脚本会跳过 Redis、MinIO 和 SRS，页面仍可启动，但 RTC/SRS 链路会退回兼容帧模式。

停止开发依赖：

```bash
npm run dev:down
```

## Clean-machine 单体复现

1. 从示例生成本次专用且被 Git 忽略的环境文件：

   ```bash
   cp deploy/practice.env.example .env.practice
   $EDITOR .env.practice
   ```

2. 使用新 project 与 Git SHA tag 构建并启动：

   ```bash
   export IMAGE_TAG="repro-$(git rev-parse --short=12 HEAD)"
   export COMPOSE_PROJECT_NAME="video-player-$IMAGE_TAG"
   docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml config --quiet
   docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml build --no-cache
   docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml up -d
   docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml ps
   ```

3. 验证首页和健康接口：

   ```bash
   curl -fsS http://127.0.0.1:5173/ | grep -q '<div id="app"></div>'
   curl -fsS http://127.0.0.1:3000/api/v1/health
   ```

4. 如需全新 Kind 单体环境：

   ```bash
   export KIND_CLUSTER_NAME="video-player-$IMAGE_TAG"
   ./scripts/k8s-deploy.sh "$IMAGE_TAG"
   ./scripts/k8s-health-check.sh
   ```

5. 验收后仅清理本次隔离资源：

   ```bash
   docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml down --volumes
   kind delete cluster --name "$KIND_CLUSTER_NAME"
   ```

`down --volumes` 与 `kind delete cluster` 会永久删除对应隔离数据。执行前必须核对 `COMPOSE_PROJECT_NAME` 和 `KIND_CLUSTER_NAME`，禁止把空变量、通配符或共享环境作为清理目标。

数据库 migration、existing-database baseline、完整 Kind 微服务环境变量和回滚步骤见 [`docs/practice-2026/11-jenkins-kind-cicd-runbook.md`](docs/practice-2026/11-jenkins-kind-cicd-runbook.md) 与 [`delivery/03_devops/README.md`](delivery/03_devops/README.md)。

## CI/CD 与工程实验

- GitHub Actions：`quality` → `public-e2e` → Git SHA 镜像 → 隔离 Kind deploy/health/evidence/cleanup。
- Jenkins：Checkout、Install、Lint、Build、Unit、Migration、API、Seed、E2E、Image、Kind、Health；同时发布 JUnit 和 Artifact。
- HPA、依赖故障和性能实验必须按 [`docs/practice-2026/13-resilience-performance-experiments.md`](docs/practice-2026/13-resilience-performance-experiments.md) 的前置条件、隔离命名和清理步骤执行，不能在共享环境直接注入故障。

本地运行 Jenkins 同构流程：

```bash
BUILD_NUMBER=9001 FORCE_TEST_FAILURE_VALUE=false ./scripts/ci-local-run.sh
BUILD_NUMBER=9002 FORCE_TEST_FAILURE_VALUE=true ./scripts/ci-local-run.sh
```

第二条命令用于验证 Unit 后的故意失败会阻断 migration、API、E2E、镜像和部署。

## 演示与交付

- 交付总入口：[`delivery/README.md`](delivery/README.md)
- 最终答辩：[`delivery/06_defense/VideoPlayer-最终答辩.pptx`](delivery/06_defense/VideoPlayer-最终答辩.pptx)
- 演示脚本：[`delivery/06_defense/demo-script.md`](delivery/06_defense/demo-script.md)
- 最终 Gate：[`docs/practice-2026/15-final-delivery-checklist.md`](docs/practice-2026/15-final-delivery-checklist.md)

技术包进入 `main` 不等于课程 DEL-01 已完全关闭。只有真实成员完成另一台机器复现、贡献权重确认和签字，并上传 5–8 分钟备用录屏后，才可把 DEL-01 标记为 `DONE`。

## 安全与协作

- 不提交 `.env.practice`、数据库口令、JWT、MinIO 密钥、Token、录屏中的敏感信息或个人隐私。
- 数据迁移、Seed、reset 和故障实验只对明确命名的隔离环境执行。
- Commit、PR、Review、push 与合并规则见 [`docs/practice-2026/09-commit-pr-convention.md`](docs/practice-2026/09-commit-pr-convention.md)。
- 生成的 test-results、coverage、日志和临时渲染走 CI Artifact 或 ignored 目录；课程明确要求的最终 PPTX 是交付物，可提交到 `delivery/`。
