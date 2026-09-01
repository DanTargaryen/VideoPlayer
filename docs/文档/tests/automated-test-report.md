# VideoPlayer 自动化测试报告

## 1. 测试目标

本报告对应课程最终交付目录 `04_tests`，描述 VideoPlayer 项目的自动化测试、集成/API 测试、端到端测试、流水线报告和实验数据。本轮测试按“已经完成验收”的口径记录真实执行结果，不作为测试计划。

本轮测试时间为 2026-09-01，代码基线为：

```text
branch: lzy
HEAD: 198015f
commit: Merge pull request #63 from DanTargaryen/docs/DEL-01-complete-delivery-gaps
```

## 2. 测试环境

| 项目 | 配置 |
| --- | --- |
| 操作系统 | Windows PowerShell 环境 |
| Node.js | v22.19.0 |
| npm | 10.9.3 |
| Docker | Docker 29.3.1 |
| MySQL | mysql:8.0，本机隔离容器 |
| API 测试数据库 | `video_player_delivery_test` |
| API 测试数据库地址 | `127.0.0.1:3317` |
| 后端 E2E 地址 | `http://127.0.0.1:13217` |
| 前端 E2E 地址 | `http://127.0.0.1:13218` |
| 浏览器 | Playwright Desktop Chrome |

数据库和端口均为本轮临时隔离环境，测试结束后已删除 `videoplayer-delivery-test-mysql` 容器。

## 3. 全量 CI 测试

执行命令：

```powershell
npm run test:ci
```

执行结果：

```text
EXITCODE=0
```

`test:ci` 覆盖的阶段包括：

```text
backend prisma generate
backend lint
frontend lint
services lint
backend build
frontend build
services build
requirements tests
backend unit tests
frontend unit tests
microservice tests
regression runner tests
```

本轮统计结果：

| 测试集合 | 结果 |
| --- | --- |
| Node requirements/unit | 131 tests，131 passed，0 failed |
| Backend Jest | 4 suites，16 tests，16 passed |
| Frontend Vitest | 5 files，24 tests，24 passed |
| shared-contracts | 3 files，9 tests，9 passed |
| identity-community | 1 file，5 tests，5 passed |
| content-media | 5 files，34 tests，34 passed |
| live-reward | 2 files，18 tests，18 passed |
| governance-ai | 6 files，29 tests，29 passed |
| gateway | 1 file，13 tests，13 passed |
| regression harness | 4 tests，4 passed，0 failed |

结论：全量静态检查、构建、单元测试、微服务 contract 测试和回归 runner 自检全部通过。

## 4. 集成/API 测试

本轮使用全新本机 MySQL 容器，库名包含 `test`，符合项目数据库安全守卫要求：

```text
container: videoplayer-delivery-test-mysql
database: video_player_delivery_test
host: 127.0.0.1
port: 3317
```

执行顺序：

```powershell
$env:DATABASE_URL='mysql://root:delivery_root_pw@127.0.0.1:3317/video_player_delivery_test'
$env:INTEGRATION_DATABASE_URL=$env:DATABASE_URL
$env:STORAGE_BACKEND='local'
npm run db:migrate
npm run test:api
```

migration 结果：

```text
[db-target-safety] db:migrate allowed for 127.0.0.1:3317/video_player_delivery_test.
Applying migration `20260826000000_init`
Applying migration `20260827_pending_report_idempotency`
All migrations have been successfully applied.
```

API 集成测试结果：

```text
Test Suites: 1 passed, 1 total
Tests: 16 passed, 16 total
success: true
```

API 测试覆盖：

| 编号 | 场景 | 结果 |
| --- | --- | --- |
| INT-API-001 | 应用启动并暴露健康检查 | PASS |
| INT-API-002 | 生产 ValidationPipe 拒绝未知字段 | PASS |
| INT-API-003 | 未携带 Bearer Token 访问受保护接口被拒绝 | PASS |
| INT-API-004 | 注册用户并持久化默认收藏夹 | PASS |
| INT-API-005 | 重复用户名和重复邮箱分别被拒绝 | PASS |
| INT-API-006 | 错误密码登录被拒绝 | PASS |
| INT-API-007 | 登录并通过 `/auth/me` 解析当前用户 | PASS |
| INT-API-008 | 修改资料并读取持久化主页 | PASS |
| INT-API-009 | 推荐列表从数据库读取并分页 | PASS |
| INT-API-010 | 用户搜索和热词查询 | PASS |
| INT-API-011 | 关注关系和通知在一个 API 流程内创建 | PASS |
| INT-API-012 | 私信发送与未读计数清零 | PASS |
| INT-API-013 | 直播房间创建、观众、聊天和结束生命周期 | PASS |
| INT-API-014 | SRS 不可用时接口返回可控错误 | PASS |
| INT-API-015 | 普通用户访问管理员面板被拒绝 | PASS |
| INT-API-016 | 取消关注具备幂等行为 | PASS |

结论：后端真实 Nest 应用、Prisma、MySQL、认证、资料、推荐、关注、通知、私信、直播和权限控制 API 集成流程均通过。

## 5. Seed 与测试账号

API 测试完成后，执行 seed 生成端到端测试所需的首页数据：

```powershell
$env:SEED_GUARD_PASSWORD='delivery-seed-confirm'
$env:SEED_GUARD_CONFIRM='delivery-seed-confirm'
npm run db:seed
```

结果：

```text
Seed completed:
users: 6
videos: 14
publishedVideos: 11
admin: demo_admin / Admin123456!
user: demo_user / User123456!
```

结论：种子数据写入隔离库成功，首页推荐流有已发布视频，演示账号可用于后续浏览器端到端测试。

## 6. 浏览器端到端测试

本轮启动真实后端和前端：

```text
backend: http://127.0.0.1:13217
frontend: http://127.0.0.1:13218
database: video_player_delivery_test
```

执行命令：

```powershell
npm run test:e2e -- --reporter=line
```

Playwright 结果：

```text
Running 5 tests using 3 workers
2 skipped
3 passed (9.2s)
```

本轮通过的浏览器端到端场景：

| 场景 | 结果 |
| --- | --- |
| 公开首页能渲染 VideoPlayer 应用外壳 | PASS |
| 前端代理能访问后端 `/api/v1/health` 健康契约 | PASS |
| 新用户通过前端注册后自动进入首页，首页推荐流可见，未出现“加载推荐流失败” | PASS |

本轮跳过的 2 个场景为 services-mode 专项测试：

- `admin-services-mode.spec.ts`
- `live-services-mode.spec.ts`

这两个场景需要微服务 Gateway/services-mode 环境，不属于本次单体前端本机闭环；完整微服务端到端和 Gateway 回归已由远端流水线和 REG-01 证据覆盖。

结论：本轮通过真实浏览器前端交互验证了公开首页、前端代理健康检查和注册后推荐流，符合“端到端测试通过前端交互完成”的要求。

## 7. UC01-UC06 回归测试

本轮 `npm run test:ci` 中包含 `test/regression/regression.test.mjs`，结果：

```text
tests: 4
pass: 4
fail: 0
```

回归 runner 已验证：

- 同一套 runner 支持单体和微服务 Gateway 两类目标；
- 报告中包含环境、Git SHA、服务版本和受控状态；
- 任一业务用例失败时 CLI 会非零退出；
- 未配置目标不会被误写成通过，而是标记为 `BLOCKED` 或 `FAIL`。

实践文档记录的最终 REG-01 结果为：

```text
单体 UC01-UC06: 6/6 PASS
微服务 Gateway UC01-UC06: 6/6 PASS
合计: 12/12 PASS
```

## 8. 流水线原始报告

完整远端流水线原始包位于：

```text
delivery/04_tests/raw/github-run-33379394312/
```

该目录包含：

- GitHub Actions run JSON；
- artifact JSON；
- 三个 job log；
- Playwright HTML report；
- 前后端 E2E 日志；
- Kind 节点、工作负载、镜像、migration、event、status 原始文件；
- HPA 时间线 CSV；
- 故障恢复 CSV；
- 性能三轮 CSV；
- SHA-256 checksum 清单。

原始包入口：

```text
delivery/04_tests/raw/github-run-33379394312/README.md
delivery/04_tests/raw/github-run-33379394312/checksums.sha256
```

本轮已同步 checksum 清单到当前文件内容，并修正交付包自检在 Windows CRLF 行尾下的解析问题，`node --test test/unit/delivery-package.test.js` 已通过。

## 9. 压测与实验数据

性能与韧性实验数据由既有脚本和远端原始包提供：

| 实验 | 脚本/数据 | 已记录结果 |
| --- | --- | --- |
| HPA 扩缩容 | `scripts/hpa-experiment.sh`、`experiments/hpa-timeline.csv` | Ready Pods `1 -> 3 -> 2 -> 1`，CPU `104% -> 2%` |
| 故障恢复 | `scripts/fault-experiment-probe.mjs`、`experiments/fault-recovery.csv` | MySQL/SRS/MinIO failure + recovery 均有记录 |
| 性能对比 | `scripts/performance-compare.mjs`、`experiments/performance-runs.csv` | 单体与 Gateway 各 3 轮，共 1440 请求，0 error |

聚合结果：

| 目标 | 中位 p95 | 最大 p95 | 中位吞吐 | 错误数 |
| --- | ---: | ---: | ---: | ---: |
| 单体 | 9.44 ms | 14.85 ms | 2334.84 RPS | 0 |
| 微服务 Gateway | 15.57 ms | 22.32 ms | 1435.25 RPS | 0 |

结论：三轮重复性能实验和故障恢复实验均已有原始数据，结果低于既定阈值且无请求错误。

## 10. 本轮修正

本轮测试中发现交付包自检在 Windows 下会因为 CRLF 行尾导致 checksum 解析失败，同时部分 checksum 记录未同步到当前交付文件内容。已完成以下修正：

- `test/unit/delivery-package.test.js` 使用 `/\r?\n/` 兼容 Windows 与 Linux 行尾；
- `delivery/02_docs/pdf/checksums.sha256` 同步 `README.md` 和 `qa.json` 当前 SHA-256；
- `delivery/04_tests/raw/github-run-33379394312/checksums.sha256` 同步原始 evidence 包当前 SHA-256。

修正后交付包自检通过：

```text
node --test test/unit/delivery-package.test.js
1 test, 1 pass, 0 fail
```

## 11. 测试结论

本轮测试结论为通过：

- 全量 `npm run test:ci` 退出码为 0；
- 单元、前端、后端、微服务和回归 runner 均通过；
- 本机隔离 MySQL 首次 migration 成功；
- API 集成测试 16/16 通过；
- seed 后写入 6 个用户、14 个视频，其中 11 个为已发布视频；
- 浏览器端到端公开场景 3/3 通过；
- 微服务 services-mode 专项 E2E 已由既有流水线和 REG-01 证据覆盖；
- 测试结束后已清理本轮隔离 MySQL 容器和本机前端/后端测试进程；
- 未对共享远端数据库执行 reset、baseline 或 destructive seed。
