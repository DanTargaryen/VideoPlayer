# REPRO-01 Clean-machine reproduction checklist

> 可编辑复现清单。只记录命令、可观察结果与判定；不提交日志、截图、测试报告、本地密钥或数据。

## 复现身份

- [x] 分支：`docs/REPRO-01-clean-machine-startup`
- [x] 基线：`2e9cb60`
- [x] 日期：2026-08-26
- [x] 环境：Windows 11、Node.js `v24.14.1`、npm `11.11.0`、Docker Desktop `4.66.1` / Engine `29.3.1`、Compose `v5.1.0`、Kind `v0.32.0`、kubectl `v1.34.1`
- [x] 隔离：删除工作区依赖和构建结果；新建 `.env.practice`；使用 `video-player-repro-2e9cb60-r2` Compose project、全新 Volume、`repro-2e9cb60-r2` 镜像 tag、`video-player-repro-2e9cb60-r2` Kind cluster
- [x] 未读取、复制或删除旧 Docker Volume；未复用旧 Kind cluster/PVC

## 顺序验证

| 序号 | 检查 | 实际命令/条件 | 结果 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `npm ci` | 删除全部 `node_modules` 后执行；`ffmpeg-static` 使用从官方 Release 下载并校验、由本机临时 HTTP 服务提供的二进制 | 从锁文件安装 838 packages；未关闭 TLS 校验 | PASS |
| 2 | Prisma 前置 | `npm --workspace backend run prisma:generate` | Prisma Client 6.9.0 生成成功 | PASS |
| 3 | 后端预构建 | `npm run build:backend` | 生成 `backend/dist` | PASS |
| 4 | `test:ci` | 修正 AdminController 单元测试中已过期的 Prisma transaction/mock 与异常预期后，从完整命令重跑 | requirements 97/97；backend 3 suites / 7 tests；frontend 1 file / 3 tests；lint 与 builds 全部通过 | PASS |
| 5 | Compose config | 隔离 project；`config --quiet` | 退出码 0 | PASS |
| 6 | Compose build | 唯一 tag；`build --no-cache` | Backend/Frontend 镜像构建完成 | PASS |
| 7 | Compose up | 全新 project 与三个全新 named volumes | 6 services running；5 healthy | PASS |
| 8 | MySQL 建表 | 查询 `information_schema.tables` | 31 tables | PASS |
| 9 | Seed | 通过一次性 `SEED_GUARD_PASSWORD` / `SEED_GUARD_CONFIRM` 对隔离库执行 | 6 users / 14 videos / 11 published | PASS |
| 10 | 首页 | `GET http://127.0.0.1:5173/` | HTTP 200，包含 Vue `#app` 根节点 | PASS |
| 11 | Backend Health | `GET http://127.0.0.1:3000/api/v1/health` | `code=0`，`data.status=ok` | PASS |
| 12 | Kind 部署 | 全新 cluster；加载本次 tagged images；运行 `k8s-deploy.sh` | MySQL/Backend/Frontend Ready，migration Job Completed，PVC Bound，0 restart | PASS |
| 13 | Kubernetes Health | `scripts/k8s-health-check.sh` | MySQL alive；Backend 200；Frontend 与代理 Health 成功 | PASS |

## README 缺口与修正

- [x] 增加从空 `node_modules` 执行 `npm ci` 的步骤。
- [x] 增加 Prisma Client 生成和后端预构建；否则当前 `test:requirements` 会直接加载不存在的 `backend/dist`。
- [x] 将 Compose `config`、无缓存 `build`、`up` 拆分为可独立判定的命令。
- [x] 使用唯一 Compose project 和 Kind cluster，避免复用或误删旧 Volume/PVC。
- [x] 增加 31 张表检查、Seed Guard 二次确认及 6/14/11 数据检查。
- [x] 增加首页和后端 Health 的失败即退出检查。
- [x] 增加 Windows Git Bash 与 LF 行尾要求；默认 WSL bash 无法直接调用本机 Windows Kind/Docker 时不应混用。
- [x] 增加 Kind 工作负载、迁移 Job、PVC 和集群内 Health 验收标准。
- [x] 说明 npm registry 镜像不覆盖 `ffmpeg-static` 二进制地址；记录可信镜像/已校验官方文件方案，并明确禁止关闭 TLS 校验。

## 已修复项

- `test/unit/admin.controller.test.js` 的 Prisma mock 落后于当前控制器实现；补齐 transaction、`updateMany`、通知与 `NotFoundException` 预期后，完整 `npm run test:ci` 通过。
- 校园网将 `github.com` 解析到不受 Node/curl 信任的代理。本轮对官方资源使用正常 TLS 与官方校验值；`npm ci` 的 `ffmpeg-static` 文件由本机临时 HTTP 服务提供，未关闭 TLS 校验。
- Windows 检出的 shell 脚本为 CRLF；按 README 使用 Git Bash 并规范为 LF 后，Kind 部署和 Health 通过。

## 保留的运行环境

- Compose project `video-player-repro-2e9cb60-r2` 正在运行，首页为 `http://127.0.0.1:5173/`，后端 Health 为 `http://127.0.0.1:3000/api/v1/health`。
- Kind cluster `video-player-repro-2e9cb60-r2` 保留运行；MySQL、Backend、Frontend Ready，migration Job Completed，PVC Bound，所有运行容器 0 restart。

## 最终判定

**README CLEAN-MACHINE REPRODUCTION: PASS**

原因：从空依赖与全新隔离运行环境开始，`npm ci`、完整 `npm run test:ci`、Compose config/build/up、MySQL 建表、Seed、首页、Backend Health、Kind 部署和 Kubernetes Health 均按顺序通过。
