# REG-01 微服务回归

同一入口读取 `MONOLITH_BASE_URL` 与 `MICROSERVICE_GATEWAY_BASE_URL`，先采集目标 `/version`、Git SHA 和服务版本，再输出固定状态 `PASS/FAIL/BLOCKED/NOT RUN`。

```bash
MONOLITH_BASE_URL=http://127.0.0.1:3000 \
MICROSERVICE_GATEWAY_BASE_URL=http://127.0.0.1:3100 \
GIT_SHA="$(git rev-parse HEAD)" \
REG_REPORT_PATH=artifacts/reg-01.json \
npm run reg:01
```

默认只采集双目标版本并将未授权用例输出为 `NOT RUN`。完整业务回归使用：

```bash
REG_RUN_ALL=true \
REG_REQUIRE_ALL_PASS=true \
REG_MONOLITH_ADMIN_SECRET='<monolith admin secret>' \
REG_MICROSERVICE_ADMIN_SECRET='<identity admin secret>' \
npm run reg:01
```

完整模式会在每个已配置目标内创建独立 creator/actor 测试账号和媒体，按依赖顺序执行 UC01、UC03、UC02、UC04、UC05、UC06，再按 UC01–UC06 固定顺序报告。覆盖注册/登录/资料与越权、投稿/无效媒体/审核发布、推荐/搜索/观看历史、互动/关注/通知、直播/兼容帧/账本/录播，以及举报/重复处置/content 状态/REPORT 通知。每个用例都附实际公开 endpoint 清单；任一 `FAIL` 会让 CLI 非零退出，`REG_REQUIRE_ALL_PASS=true` 还会阻止配置目标出现 `BLOCKED` 或 `NOT RUN`。

如只需执行历史的 governance 聚焦回归，可继续设置 `REG_RUN_UC06=true`，并提供 `REG_REPORTER_ACCOUNT`、`REG_REPORTER_PASSWORD`、`REG_ADMIN_SECRET` 和 `REG_UC06_TARGET_ID`。单体重复处置返回 400、governance 微服务返回 409；两者均代表明确拒绝，完整模式继续验证目标保持发布且举报人收到通知。
