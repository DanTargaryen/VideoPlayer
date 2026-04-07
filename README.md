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
npm install
npm run dev:frontend
npm run dev:backend
```


## 数据库初始化

当前后端目标数据库为 MySQL。初始化步骤如下：

```bash
# 1. 先确保本机 MySQL 已启动，并创建数据库
mysql -u root < deploy/mysql/init.sql

# 2. 生成 Prisma Client
npm --workspace backend run prisma:generate

# 3. 推送表结构
npm --workspace backend run db:push

# 4. 写入演示数据
npm --workspace backend run db:seed
```

如果本机没有 MySQL 服务，后端将无法连接数据库，需先补齐运行环境。


## 登录说明

- 普通用户直接在登录页使用用户账号登录。
- 管理员不在常规入口直接暴露。需要先点击登录页中的“管理入口”，输入密钥 `Administer`，再使用管理员账号登录。
- 非管理员角色和游客在主站头部不会看到“审核后台”入口。

演示账号：

- 用户：`demo_user / user123`
- 管理员：`demo_admin / admin123`

## MinIO 上传说明

当前项目已经接入本地 MinIO 与真实文件上传链路。

- 视频原文件会上传到 MinIO 的 `video-player` bucket
- 封面图片支持本地上传
- 视频创建后会执行基础媒体处理：
  - 时长解析
  - 自动转码到 MP4
  - 若未手动上传封面，则自动抽帧生成封面

对象路径示例：

```text
videos/original/YYYY/MM/DD/<timestamp>-sample.mp4
videos/covers/YYYY/MM/DD/<timestamp>-cover.jpg
videos/transcoded/YYYY/MM/DD/<timestamp>-sample.mp4
```

MinIO 默认访问地址：`http://127.0.0.1:9000`

## 协作注意事项

- 提交代码前先同步远端，减少冲突。
- 提交信息尽量简洁明确，例如：`docs: 更新需求文档`、`feat: 新增首页推荐页`。
- 不要提交依赖目录、构建产物、日志和本地密钥文件。
- 文档、接口、数据库和代码命名必须保持一致。
