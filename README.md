# 24级软工项目

本仓库用于 24 级软件工程项目的协作与开发，当前项目主题为“观澜视频平台”，定位为 Web 端在线视频与直播网站。

## 项目成员

| 成员 | 学号 | 分工 |
| --- | --- | --- |
| 林明 | 23375181 |  |
| 刘钟屹 | 23375291 |  |
| 李晓萌 | 24371422 |  |
| 张壮志 | 24371350 |  |
| 王一涵 | 24371063 |  |

## 当前结构

```text
VideoPlayer/
  docs/         课程过程文档与设计文档
  frontend/     Vue 3 + TypeScript 前端骨架
  backend/      NestJS 风格后端骨架
  deploy/       演示环境部署示例
```

## 工程说明

- `frontend/` 已包含主站、直播间、用户中心、审核后台等页面占位。
- `backend/` 已包含健康检查、认证、视频、搜索、直播、用户中心、审核、礼物币、Agent 等模块骨架。
- `docs/` 已补齐计划书、需求、概要设计、详细设计、数据库设计、API 文档和分工文档。

## 常用命令

在仓库根目录执行：

```bash
npm run dev
```

这条命令会统一启动本机 MySQL 检查、Redis、MinIO、SRS，以及前后端开发服务。

如果要让同一局域网内的其他设备通过机器 IP 访问并演示直播，不要使用普通的
`http://<IP>:5173`。浏览器会在非安全来源下禁用摄像头、麦克风和屏幕共享，导致
开播失败。请使用：

```bash
npm run dev:lan
```

脚本会自动检测本机局域网 IP，生成本地开发 HTTPS 证书，启动前端 HTTPS 服务，并把
SRS 的公开播放地址配置为局域网 IP。启动后访问脚本输出的地址，例如：

```text
https://174.16.0.182:5173
```

首次访问时浏览器可能会提示证书不受信任，接受本地开发证书后即可授权摄像头、麦克风
或屏幕共享。如果自动检测的 IP 不正确，可以显式指定：

```bash
LAN_HOST=174.16.0.182 npm run dev:lan
```

如果后端端口已被占用，启动脚本会检查 `3000` 端口是否已经是健康的本项目后端：

- 如果是，会复用现有后端；
- 如果不是，会输出占用端口的进程信息并退出；
- 也可以临时换端口启动，例如：

```bash
PORT=3001 LAN_HOST=174.16.0.182 npm run dev:lan
```

如果当前机器没有可用的 Docker，`dev:lan` 会跳过 Redis、MinIO 和 SRS 容器，系统仍会启动。
此时 SRS RTC 链路不可用，直播观看会退回兼容帧模式；需要完整 RTC/SRS 直播时，再安装或启动 Docker。

如果需要分别启动，也可以使用：

```bash
npm run dev:frontend
npm run dev:backend
```

## Clean-machine 课程实践复现

以下顺序用于空机器验收，覆盖依赖安装、CI 等价测试、Compose、MySQL、Seed、HTTP 入口和 Kind。禁止复制其他工作区的 `node_modules`、`.env.practice`、Docker Volume、`dist/` 或镜像；每次复现使用新的 Compose project、镜像 tag 和 Kind cluster。需要 Node.js 22+、npm、Docker Engine + Compose、Kind、kubectl、curl，以及 Bash。Windows 请使用 Git Bash，并在检出仓库前设置 `git config --global core.autocrlf false`，否则 CRLF 会使 `scripts/*.sh` 报 `pipefail\r` 错误。

### 1. 安装与 CI 等价测试

```bash
rm -rf node_modules frontend/node_modules backend/node_modules \
  backend/dist frontend/dist coverage test-results playwright-report
npm ci

# npm ci 不生成 Prisma Client；需求测试又会直接加载 backend/dist。
npm --workspace backend run prisma:generate
npm run build:backend
npm run test:ci
```

`npm run test:ci` 必须以退出码 `0` 结束才算通过。若 `ffmpeg-static` 或 Prisma 下载报告自签名证书错误，应把组织 CA 安装到 Node/npm 信任链；不要把长期关闭 TLS 校验写入项目配置。只修改 npm registry 并不能改变 `ffmpeg-static` 的二进制下载地址；可为本次命令设置可信的 `FFMPEG_BINARIES_URL` 镜像，或使用经官方 SHA-256 校验后由本机临时 HTTP 服务提供的官方文件。不要使用 `NODE_TLS_REJECT_UNAUTHORIZED=0`、`strict-ssl=false` 或 `curl -k` 作为复现步骤。

### 2. 创建全新 Compose 环境

从示例创建本次专用的 `.env.practice`，逐项替换占位符；不得复用其他机器或上一次运行的文件。该文件已被 Git 忽略，不能提交。

```bash
cp deploy/practice.env.example .env.practice
$EDITOR .env.practice

export IMAGE_TAG="repro-$(git rev-parse --short=12 HEAD)"
export COMPOSE_PROJECT_NAME="video-player-$IMAGE_TAG"

docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml config --quiet
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml build --no-cache
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml up -d
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml ps
```

新的 `COMPOSE_PROJECT_NAME` 会创建隔离的 MySQL、Redis、MinIO Volume，而不会读取或删除旧项目数据。`ps` 中 MySQL、Redis、MinIO、Backend、Frontend 应为 healthy，SRS 应为 running。

### 3. MySQL 建表与 Seed

后端启动命令会先执行 Prisma `db:push`。应检查表数非零，再为本次隔离数据库设置一次性 Seed Guard 确认值。`db:seed` 会清空目标库数据，禁止对共享或生产数据库执行。

```bash
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml exec -T mysql sh -lc \
  'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"video_player\";"'

read -r -s -p "Set one-time db:seed confirmation: " SEED_CONFIRM; echo
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml exec -T \
  -e SEED_GUARD_PASSWORD="$SEED_CONFIRM" -e SEED_GUARD_CONFIRM="$SEED_CONFIRM" \
  backend npm --workspace backend run db:seed
unset SEED_CONFIRM

docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml exec -T mysql sh -lc \
  'mysql -N -uroot -p"$MYSQL_ROOT_PASSWORD" video_player -e "SELECT CONCAT((SELECT COUNT(*) FROM User),\" users / \",(SELECT COUNT(*) FROM Video),\" videos\");"'
```

当前 schema 应创建 31 张表；Seed 应报告 6 users、14 videos、11 published videos。

### 4. Compose HTTP 验收

```bash
curl -fsS http://127.0.0.1:5173/ | grep -q '<div id="app"></div>'
curl -fsS http://127.0.0.1:3000/api/v1/health
```

首页命令退出码应为 `0`；后端应返回 `code: 0` 且 `data.status: ok`。其他入口包括 MinIO API `http://127.0.0.1:9000`、MinIO Console `http://127.0.0.1:9001` 和 SRS HTTP `http://127.0.0.1:8080`。

### 5. 全新 Kind 部署与 Health

复用本次刚刚从源码无缓存构建的带版本 tag 镜像，不使用其他构建产物。设置新的集群名，避免复用已有集群和 PVC。

```bash
export KIND_CLUSTER_NAME="video-player-$IMAGE_TAG"
./scripts/k8s-deploy.sh "$IMAGE_TAG"
./scripts/k8s-health-check.sh
```

部署应得到 Ready 的 MySQL StatefulSet/PVC、Completed 的 `db-migrate` Job、Ready 的 Backend/Frontend Deployment；Health 脚本会检查 MySQL、后端、前端首页和前端代理 Health。需要宿主机访问时另开终端执行：

```bash
kubectl -n video-player port-forward service/frontend 15173:80
```

端口转发后访问 `http://127.0.0.1:15173`。验收结束后只清理本次隔离资源：

```bash
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml down --volumes
kind delete cluster --name "$KIND_CLUSTER_NAME"
```

`down --volumes` 和 `kind delete cluster` 会永久删除本次隔离的 MySQL 数据，执行前必须再次核对 `COMPOSE_PROJECT_NAME` 和 `KIND_CLUSTER_NAME`。

停止由开发环境启动的 Redis、MinIO、SRS：

```bash
npm run dev:down
```

首次安装与数据库初始化：

```bash
npm run db:init
```


## 数据库初始化

当前后端目标数据库为 MySQL。初始化步骤如下：

```bash
# 1. 启动本机 MySQL（脚本也会自动尝试拉起 mysql 服务）
sudo systemctl start mysql

# 2. 创建数据库
MYSQL_PWD=proot mysql -h 127.0.0.1 -P 3306 -u root < deploy/mysql/init.sql

# 3. 生成 Prisma Client
npm --workspace backend run prisma:generate

# 4. 推送表结构
npm --workspace backend run db:push

# 5. 写入演示数据
npm --workspace backend run db:seed
```

默认本地开发数据库连接为 `mysql://root:proot@127.0.0.1:3306/video_player`。

如果本机没有 MySQL 服务，后端将无法连接数据库，需先补齐运行环境。`npm run dev` 和 `npm run db:init` 会先检查连接，连接失败时会自动尝试启动 Linux 下的 `mysql` 服务。`npm run dev` 还会自动拉起 Docker 中的 Redis、MinIO 和 SRS。


## 登录说明

- 普通用户直接在登录页使用用户账号登录。
- 管理员不在常规入口直接暴露。需要先点击登录页中的“管理入口”，输入密钥 `123456`，再使用管理员账号登录。
- 非管理员角色和游客在主站头部不会看到“审核后台”入口。

演示账号：

- 用户：`demo_user / User123456!`
- 管理员：`demo_admin / Admin123456!`

## MinIO 上传说明

当前项目默认使用 MinIO 作为对象存储，并接入真实文件上传链路。

- 视频原文件会上传到 MinIO 的 `video-player` bucket
- 封面图片支持本地上传
- 视频创建后会执行基础媒体处理：
  - 时长解析
  - 自动转码到 MP4
  - 若未手动上传封面，则自动抽帧生成封面
- 后端会自动创建 bucket，并配置匿名只读策略，返回的资源 URL 可直接在前端访问

对象路径示例：

```text
videos/original/YYYY/MM/DD/<timestamp>-sample.mp4
videos/covers/YYYY/MM/DD/<timestamp>-cover.jpg
videos/transcoded/YYYY/MM/DD/<timestamp>-sample.mp4
```

MinIO 默认访问地址：`http://127.0.0.1:9000`
MinIO 控制台默认访问地址：`http://127.0.0.1:9001`

如需本地启动 MinIO，可在 `deploy/` 目录使用 Docker Compose 启动 `minio` 服务；若确实需要退回本地磁盘存储，可显式设置 `STORAGE_BACKEND=local`。

## 协作注意事项

- 提交代码前先同步远端，减少冲突。
- 提交信息尽量简洁明确，例如：`docs: 更新需求文档`、`feat: 新增首页推荐页`。
- 不要提交依赖目录、构建产物、日志和本地密钥文件。
- 文档、接口、数据库和代码命名必须保持一致。

## 本地启动步骤（已验证）

在项目根目录 `D:\Java_Code\Projects\VideoPlayer` 执行：

```bash
# 1. 启动 Docker 依赖
docker compose -f deploy/docker-compose.example.yml up -d mysql redis minio srs

# 2. 生成 Prisma Client
npm --workspace backend run prisma:generate

# 3. 同步数据库结构
npm --workspace backend run db:push

# 4. 写入演示数据
npm --workspace backend run db:seed

# 5. 构建后端
npm --workspace backend run build

# 6. 启动后端
node backend/dist/main.js

# 7. 启动前端
npm --workspace frontend run dev -- --host 127.0.0.1 --port 5173
```

启动成功后可访问：

- 前端：`http://127.0.0.1:5173`
- 后端 API：`http://127.0.0.1:3000/api/v1`
- MinIO：`http://127.0.0.1:9000`
- MinIO 控制台：`http://127.0.0.1:9001`
- SRS HTTP：`http://127.0.0.1:8080`
- SRS API：`http://127.0.0.1:1985/api/v1/versions`

本次本地启动使用的 MySQL 配置为：

- Host：`127.0.0.1`
- Port：`3306`
- Database：`video_player`
- User：`root`
- Password：`你在本地单独配置的管理员密钥`
