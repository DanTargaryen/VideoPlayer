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

## 课程实践容器启动

仓库提供课程实践用的完整 Compose 配置，包含前端、后端、MySQL、Redis、MinIO 和 SRS。当前配置已完成静态校验，但尚未在本机实际运行，因为本机没有可用的 Docker；首次验收应在组内指定的 Docker 主机执行并保存原始日志。

```bash
# 1. 创建只在本地保存的环境文件，并替换全部占位符
cp deploy/practice.env.example .env.practice

# 2. 构建并启动全部服务
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml up --build -d

# 3. 查看容器和健康状态
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml ps

# 4. 查看后端健康接口
curl http://127.0.0.1:3000/api/v1/health

# 5. 停止服务（保留数据卷）
docker compose --env-file .env.practice -f deploy/docker-compose.practice.yml down
```

启动后入口：

- 前端：`http://127.0.0.1:5173`
- 后端健康检查：`http://127.0.0.1:3000/api/v1/health`
- MinIO API：`http://127.0.0.1:9000`
- MinIO 控制台：`http://127.0.0.1:9001`
- SRS HTTP：`http://127.0.0.1:8080`

镜像默认使用 `local` 标签。流水线或正式实验必须设置 `IMAGE_TAG` 为 Git commit SHA 或明确版本号，不能只使用 `latest`。真实数据库口令、MinIO 密钥、JWT Secret 和管理员密钥只能放在 `.env.practice`、CI Secret 或 Kubernetes Secret 中，不能提交到仓库。

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
