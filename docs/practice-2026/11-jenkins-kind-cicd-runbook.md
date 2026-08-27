# VideoPlayer Jenkins + Kind CI/CD 换机执行手册

> 适用任务：前端、后端、数据库容器化；push 后自动完成安装、编译、测试、镜像构建、Kubernetes 部署和健康检查。
>
> 方案：GitHub 仅作为 Git 远端；Jenkins 在验收机器运行；Docker Desktop 或 Colima 提供容器环境；Kind 提供本地 Kubernetes。

## 1. 当前结论

推荐使用一台满足以下条件的机器：

| 资源 | 最低 | 推荐 | 完整演示（含视频/录播） |
| --- | ---: | ---: | ---: |
| CPU | 4 核 | 6–8 核 | 8 核以上 |
| 内存 | 12GB | 16GB | 24GB 以上 |
| 可用磁盘 | 20GB | 40GB | 50–80GB |
| 系统 | 64 位 macOS/Linux/Windows | macOS 或 Linux | macOS 或 Linux |

当前检查机器：

| 项目 | 实测 |
| --- | ---: |
| CPU | 10 核 Apple Silicon |
| 内存 | 24GB |
| 可用磁盘 | 287GB |
| 当前项目工作区 | 970MB |
| `.git` | 47MB |
| npm 依赖 | 约 880MB |
| 前后端构建产物 | 约 8MB |

结论：当前机器硬件足够。2026-08-26 已安装 Colima、Docker CLI/Compose、Kind、kubectl 和 OpenJDK 21，并完成 Compose 与 Kind 实跑；系统默认 Java 11 保留，Jenkins 启动时需要显式使用 OpenJDK 21。

本次完成多轮带版本镜像构建和 Kind 滚动部署后的磁盘占用：Colima 目录约 31GB；Docker 镜像约 16.61GB（其中约 13.36GB 为旧版本等可回收内容）；本地卷约 5.57GB；项目工作区约 973MB。因此只做本项目的 Compose + Kind 冷启动应预留至少 35GB，继续加入 Jenkins 和构建历史时仍建议预留 40GB 以上。

## 2. 空间估算

### 2.1 当前项目实测

| 内容 | 大小 |
| --- | ---: |
| 干净 clone（估算） | 60–100MB |
| `npm ci` 后依赖 | 约 880MB |
| `frontend/dist` | 约 5.9MB |
| `backend/dist` | 约 2.1MB |
| Playwright 报告 | 约 0.5MB/次 |

依赖中占用较大的部分：

- `ffprobe-static`：约 335MB
- `ffmpeg-static`：约 44MB
- Element Plus：约 55MB
- TypeScript/NestJS/Playwright 等：约 100MB 以上

### 2.2 Docker、Kind、Jenkins 估算

| 内容 | 预计占用 |
| --- | ---: |
| Docker Desktop 应用与 Linux VM 基础 | 2–4GB |
| Kind Kubernetes Node 镜像 | 1–2GB |
| MySQL、Redis、MinIO、SRS 官方镜像 | 1.5–3GB |
| 前端、后端镜像 | 0.5–1.5GB |
| Jenkins、插件与工作目录 | 1–3GB |
| Docker build cache | 5–15GB |
| MySQL 测试数据卷 | 0.5–3GB |
| MinIO 测试视频/录播 | 5–20GB，可继续增长 |
| CI 日志与历史证据 | 0.5–2GB |

建议：

- 只完成前端、后端、MySQL 和基础 Jenkins/Kind：预留 20GB。
- 加入 Redis、MinIO、SRS 和多次镜像构建：预留 40GB。
- 保存视频、录播、压测和多个 Jenkins 工作区：预留 50–80GB。

Docker Desktop 会把镜像、容器和卷存放在一个 Linux 虚拟磁盘中，可以在 **Settings → Resources** 设置 CPU、内存和磁盘上限。Docker 官方说明其内存默认上限通常为宿主机的 50%，磁盘用量上限可单独调整：[Docker Desktop Resources](https://docs.docker.com/desktop/settings-and-maintenance/settings/)。

建议 Docker Desktop 设置：

```text
CPU：6 核
Memory：8–10GB
Swap：1–2GB
Disk usage limit：40–60GB
```

## 3. 当前仓库状态

### 3.1 已有

- `frontend/Dockerfile`
- `backend/Dockerfile`
- `deploy/docker-compose.practice.yml`
- `deploy/mysql/init.sql`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- Jest、Vitest、Playwright 测试
- `npm run test:ci`
- 前后端健康检查
- README 容器启动说明

### 3.2 待实现

- [ ] 完整 Prisma 基线迁移
- [x] `Jenkinsfile`
- [x] `deploy/k8s/` Kubernetes 文件
- [ ] 数据库迁移、Seed、测试重置脚本
- [x] Jenkins 集成测试脚本
- [x] Kubernetes 部署脚本
- [x] Kubernetes 健康检查脚本
- [x] Kubernetes 证据收集脚本
- [x] Compose/Kind/Jenkins 实跑记录
- [ ] 另一台机器 README 复现记录

## 4. 阶段 A：验收机器安装环境

### 4.1 macOS 安装

```bash
brew install --cask docker
brew install kubectl kind openjdk@21 jenkins-lts
```

打开 Docker Desktop，等待状态显示 Running。

设置 Java 21：

```bash
export PATH="$(brew --prefix openjdk@21)/bin:$PATH"
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

验证：

```bash
docker info
docker compose version
kubectl version --client
kind version
java -version
node --version
npm --version
git --version
```

预期：

```text
Docker daemon 可访问
Java 21
Node.js 22 或以上
kubectl、kind 可执行
```

Docker Desktop 官方最低要求为 4GB RAM；本项目同时运行 Jenkins、Kind、MySQL 和 Node 构建，实际建议至少 16GB：[Docker Desktop macOS 要求](https://docs.docker.com/desktop/setup/install/mac-install/)。当前 Jenkins LTS 需要 Java 21 或 25：[Jenkins Java Support](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)。

### 4.2 克隆项目

```bash
git clone https://github.com/DanTargaryen/VideoPlayer.git
cd VideoPlayer
git status
git log -1 --oneline
npm ci
npm run test:ci
```

预期：lint、build、Jest、Vitest 全部通过。

## 5. 阶段 B：先跑通 Docker Compose

创建本地环境文件：

```bash
cp deploy/practice.env.example .env.practice
```

修改占位值，不得把 `.env.practice` 提交到 Git。

验证配置：

```bash
IMAGE_TAG=$(git rev-parse --short=12 HEAD)

docker compose \
  --env-file .env.practice \
  -f deploy/docker-compose.practice.yml \
  config
```

构建并启动：

```bash
IMAGE_TAG=$(git rev-parse --short=12 HEAD) \
docker compose \
  --env-file .env.practice \
  -f deploy/docker-compose.practice.yml \
  up --build -d
```

检查：

```bash
docker compose \
  --env-file .env.practice \
  -f deploy/docker-compose.practice.yml \
  ps

curl -fsS http://127.0.0.1:3000/api/v1/health
curl -fsS http://127.0.0.1:5173/
```

停止但保留数据：

```bash
docker compose \
  --env-file .env.practice \
  -f deploy/docker-compose.practice.yml \
  down
```

需要完全重置本地测试数据时才执行：

```bash
docker compose \
  --env-file .env.practice \
  -f deploy/docker-compose.practice.yml \
  down -v
```

警告：`down -v` 会删除 Compose 数据卷，只能对本地隔离测试环境使用。

## 6. 阶段 C：整理数据库迁移

当前迁移目录包含后期增量 SQL，最早的迁移会直接 `ALTER TABLE User`，不能证明从全空数据库完整恢复。

需要在隔离测试数据库中完成一次基线整理：

- [x] 备份当前迁移目录
- [x] 从当前 `schema.prisma` 生成完整基线 SQL
- [x] 在全空 MySQL 容器执行迁移
- [x] 执行 Seed
- [x] 验证测试账号和基础数据
- [ ] 重启后端并执行集成测试

最终标准命令：

```bash
npm --workspace backend run prisma:generate
npm --workspace backend run db:migrate
npm --workspace backend run db:seed
```

默认迁移范围仅覆盖全新本地验收库、Compose/Kind 内部 MySQL 以及数据库名包含 `test` 的本地隔离库。对非本地或非默认验收数据库执行迁移时，必须同时设置精确目标和显式确认：

```bash
MIGRATION_DEPLOY_ALLOWED_TARGET=host:3306/database \
MIGRATION_DEPLOY_CONFIRM=DEPLOY_MIGRATIONS \
npm --workspace backend run db:migrate
```

已有数据库 baseline 不作为日常入口使用。确需对已有等价数据库登记 `20260826000000_init` 时，必须先完成人工 schema diff 复核，并同时设置：

```bash
BASELINE_EXISTING_ALLOWED_TARGET=host:3306/database \
BASELINE_EXISTING_CONFIRM=BASELINE \
npm --workspace backend run db:baseline-existing
```

Prisma 官方将 `migrate deploy` 用于生产和 CI 中应用已提交的迁移：[Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy)。

已新增：

```text
scripts/db-migrate.sh
scripts/db-seed.sh
scripts/db-reset-test.sh
```

## 7. 阶段 D：创建 Kind Kubernetes 集群

```bash
kind create cluster --name video-player
kubectl cluster-info --context kind-video-player
kubectl get nodes
```

预期节点状态为 `Ready`。

Kind 可以把本地带版本号的 Docker 镜像加载进集群：[Kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/)。

待新增目录：

```text
deploy/k8s/
├── namespace.yaml
├── configmap.yaml
├── secret.example.yaml
├── mysql-pvc.yaml
├── mysql-statefulset.yaml
├── mysql-service.yaml
├── db-migrate-job.yaml
├── backend-deployment.yaml
├── backend-service.yaml
├── frontend-deployment.yaml
├── frontend-service.yaml
└── kustomization.yaml
```

最低验收范围：

- MySQL：StatefulSet + PVC + Service
- Backend：Deployment + Service + readiness/liveness probe
- Frontend：Deployment + Service + readiness/liveness probe
- Migration：一次性 Job

完整 UC03/UC05 范围再加入 MinIO、Redis、SRS。

Kubernetes 推荐用 Deployment 管理无状态前后端，用 StatefulSet 和 PersistentVolume 管理 MySQL：[Kubernetes Workloads](https://kubernetes.io/docs/concepts/workloads/)。前后端需要配置 readiness 和 liveness probe：[Kubernetes Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)。

## 8. 阶段 E：镜像构建与 Kind 部署

```bash
IMAGE_TAG=$(git rev-parse --short=12 HEAD)

docker build \
  -f backend/Dockerfile \
  -t video-player/backend:$IMAGE_TAG \
  .

docker build \
  -f frontend/Dockerfile \
  -t video-player/frontend:$IMAGE_TAG \
  .

kind load docker-image \
  video-player/backend:$IMAGE_TAG \
  video-player/frontend:$IMAGE_TAG \
  --name video-player
```

Kubernetes 文件中使用相同标签：

```text
video-player/backend:<Git-SHA>
video-player/frontend:<Git-SHA>
```

不要只使用 `latest`；建议设置：

```yaml
imagePullPolicy: IfNotPresent
```

部署：

```bash
./scripts/k8s-deploy.sh "$IMAGE_TAG"
./scripts/k8s-health-check.sh
```

待新增：

```text
scripts/k8s-deploy.sh
scripts/k8s-health-check.sh
scripts/k8s-collect-evidence.sh
```

## 9. 阶段 F：安装和启动 Jenkins

Jenkins 默认端口 8080 与当前 SRS 的宿主机端口 8080 冲突，因此建议 Jenkins 使用 8081。

> 2026-08-27 实测：Jenkins `2.568.2` 使用 OpenJDK 21 在 `127.0.0.1:8081` 运行；`workflow-aggregator`、Git、Credentials Binding、JUnit 和 Workspace Cleanup 插件已加载。Job `VideoPlayer-CI-02` 从 GitHub HTTPS SCM 读取 `ci/CI-02-jenkins-kind-pipeline-v2` 和根目录 Jenkinsfile，不依赖个人磁盘路径。

首次启动：

```bash
export PATH="$(brew --prefix openjdk@21)/bin:$PATH"
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"

java -jar "$(brew --prefix jenkins-lts)/libexec/jenkins.war" \
  --httpPort=8081
```

访问：

```text
http://127.0.0.1:8081
```

首次管理员密码通常位于：

```bash
cat ~/.jenkins/secrets/initialAdminPassword
```

安装插件：

- Pipeline
- Git
- GitHub
- Credentials Binding
- Pipeline Stage View
- JUnit
- Workspace Cleanup

Jenkins 官方建议把流水线保存在仓库根目录的 `Jenkinsfile` 中：[Jenkins Pipeline as Code](https://www.jenkins.io/doc/book/pipeline/pipeline-as-code/)。

本项目 Jenkins Job 使用 Pipeline from SCM：

```text
Repository URL：https://github.com/DanTargaryen/VideoPlayer.git
Branch：*/ci/CI-02-jenkins-kind-pipeline-v2
Script Path：Jenkinsfile
Poll SCM：H/2 * * * *
```

本机网络偶发 `curl 18 / early EOF`。仓库中的 Jenkinsfile 对完整 checkout 最多重试三次；Jenkins 节点可额外配置只读 Git reference cache，SCM URL 仍保持 GitHub。reference cache 属于节点环境配置，不能写入仓库 Jenkinsfile。

## 10. 阶段 G：Jenkins Pipeline

已实现根文件：

```text
Jenkinsfile
```

必须包含以下顺序阶段：

```text
Checkout
→ Install
→ Lint
→ Build
→ Unit Test
→ Isolated Database Migration
→ API Integration
→ Seed E2E Data
→ Playwright E2E
→ Build Git SHA Images
→ Deploy to Kind
→ Health Check
→ Archive Evidence
```

本地在不启动 Jenkins 时可执行同构验证：

```bash
BUILD_NUMBER=9001 FORCE_TEST_FAILURE_VALUE=false \
  ./scripts/ci-local-run.sh

BUILD_NUMBER=9002 FORCE_TEST_FAILURE_VALUE=true \
  ./scripts/ci-local-run.sh
```

DB-01 合并后的本地同构 Build `9202` 已使用默认 migration 路径完成验证：安全守卫只允许动态创建的 `127.0.0.1/video_player_ci_test`，`20260826000000_init` 由 `prisma migrate deploy` 成功应用；106/106 需求规则、后端 7/7、前端 3/3、API 16/16、E2E 3/3、SHA 镜像、Kind/Health 和 12/12 markers 全部通过，结束后临时 MySQL 与 Kind 集群均已清理。

真实 Jenkins 记录：

| Build | 参数 | 结果 | 关键证据 |
| --- | --- | --- | --- |
| `#2` | 默认成功路径 | `SUCCESS` | 12/12 markers；107 项规则/单元、API 16/16、E2E 3/3；SHA 镜像；Kind/Health；29 个 Artifact |
| `#4` | `FORCE_TEST_FAILURE=true` | `EXPECTED FAILURE` | Unit 后退出 42；后续 Migration/API/Seed/E2E/Image/Kind/Health 全部 SKIPPED；只含 01–05 markers |
| `#5` | Poll SCM 检测普通 push | `SUCCESS` | Cause=`Started by an SCM change`；Git revision `800859e`；12/12 markers；29 个 Artifact；临时资源清理 PASS |

Build `#1` 和 `#3` 的 GitHub checkout `curl 18 / early EOF` 作为环境失败记录保留，不冒充代码测试失败。

建议骨架：

```groovy
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '30'))
        skipStagesAfterUnstable()
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Quality') {
            steps {
                sh 'npm run test:ci'
            }
        }

        stage('Integration Test') {
            steps {
                sh './scripts/ci-integration-test.sh'
            }
        }

        stage('Build Images') {
            steps {
                sh '''
                  docker build -f backend/Dockerfile \
                    -t video-player/backend:${IMAGE_TAG} .
                  docker build -f frontend/Dockerfile \
                    -t video-player/frontend:${IMAGE_TAG} .
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                  kind load docker-image \
                    video-player/backend:${IMAGE_TAG} \
                    video-player/frontend:${IMAGE_TAG} \
                    --name video-player
                  ./scripts/k8s-deploy.sh ${IMAGE_TAG}
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh './scripts/k8s-health-check.sh'
            }
        }
    }

    post {
        always {
            sh './scripts/k8s-collect-evidence.sh || true'
            archiveArtifacts(
                artifacts: 'ci-evidence/**',
                allowEmptyArchive: true,
                fingerprint: true
            )
        }
    }
}
```

Declarative Pipeline 中某个 `sh` 返回非零时，流水线会失败，后续部署阶段不会继续；Jenkins 官方建议按 Build、Test、Deploy 等离散阶段组织 Pipeline：[Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)。

## 11. 阶段 H：配置 push 自动触发

Jenkins 在本地且没有公网地址时，使用 Poll SCM：

```groovy
triggers {
    pollSCM('H/2 * * * *')
}
```

Jenkins 每约 2 分钟检查 GitHub `main`，发现新提交后自动执行，不使用 GitHub Actions，也不需要支付方式。

Jenkins 创建任务：

```text
New Item
→ Pipeline
→ Pipeline script from SCM
→ Git
```

填写：

```text
Repository URL：https://github.com/DanTargaryen/VideoPlayer.git
Branch：*/main
Script Path：Jenkinsfile
```

如果 Jenkins 有安全的公网地址，可以改用 GitHub Webhook；课程验收优先使用 Poll SCM，配置更简单。

## 12. 阶段 I：成功与失败证据

Jenkins 需要保留：

- Console Output
- Stage View
- 测试结果
- Docker build 输出
- `kubectl get all -n video-player`
- Pod describe/log
- Migration Job 状态
- 首页与 health 响应

至少形成：

```text
Build #1 FAILED
Build #2 SUCCESS
```

失败必须发生在真实阶段，例如数据库迁移、测试或部署配置错误。不要向 `main` 长期保留故意错误代码；可在临时分支形成失败记录，修复后再成功运行。

证据保存在 Jenkins Artifact，不提交到 Git。

## 13. 最终交付文件

```text
frontend/Dockerfile
backend/Dockerfile
deploy/docker-compose.practice.yml

backend/prisma/migrations/*
backend/prisma/seed.js

deploy/k8s/*
Jenkinsfile

scripts/db-migrate.sh
scripts/db-seed.sh
scripts/db-reset-test.sh
scripts/ci-integration-test.sh
scripts/k8s-deploy.sh
scripts/k8s-health-check.sh
scripts/k8s-collect-evidence.sh

README.md
```

## 14. 换机执行清单

- [ ] 剩余磁盘至少 40GB
- [ ] 内存至少 16GB
- [x] Docker Desktop 或 Colima 正常运行
- [x] Java 21
- [x] kubectl、Kind、Jenkins 可执行
- [x] clone 后 `npm ci` 成功
- [x] `npm run test:ci` 成功
- [x] Compose config/build/up 成功
- [x] 前端、后端、MySQL 分别为容器
- [ ] 全空数据库可 migrate + seed
- [x] Kind 节点 Ready
- [x] Kubernetes MySQL/Backend/Frontend Ready
- [x] 镜像使用 Git SHA 标签
- [x] Jenkins 能读取根目录 Jenkinsfile
- [x] push 后 Jenkins 自动检测提交
- [x] 任一步失败时后续部署不执行
- [x] 保存 1 次真实失败记录
- [x] 保存 1 次完整成功记录
- [x] README 由另一名组员从零复现

## 15. 日常空间维护

查看 Docker 占用：

```bash
docker system df
```

只清理未使用的 build cache：

```bash
docker builder prune
```

删除 Kind 集群：

```bash
kind delete cluster --name video-player
```

删除 Jenkins 旧工作区前，先在 Jenkins UI 确认对应 Build 不再需要。不要对不明确的 Docker volume 执行批量删除；MySQL 和 MinIO 数据卷必须先确认可丢弃或已备份。
