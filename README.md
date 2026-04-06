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

## 协作注意事项

- 提交代码前先同步远端，减少冲突。
- 提交信息尽量简洁明确，例如：`docs: 更新需求文档`、`feat: 新增首页推荐页`。
- 不要提交依赖目录、构建产物、日志和本地密钥文件。
- 文档、接口、数据库和代码命名必须保持一致。
