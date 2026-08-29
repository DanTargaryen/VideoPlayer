# REG-01 微服务回归

同一入口读取 `MONOLITH_BASE_URL` 与 `MICROSERVICE_GATEWAY_BASE_URL`，先采集目标 `/version`、Git SHA 和服务版本，再输出固定状态 `PASS/FAIL/BLOCKED/NOT RUN`。

```bash
MONOLITH_BASE_URL=http://127.0.0.1:3000 \
MICROSERVICE_GATEWAY_BASE_URL=http://127.0.0.1:3100 \
GIT_SHA="$(git rev-parse HEAD)" \
REG_REPORT_PATH=artifacts/reg-01.json \
npm run reg:01
```

默认只采集双目标版本并将未授权用例输出为 `NOT RUN`。如需执行微服务 Gateway 的真实 UC06，设置 `REG_RUN_UC06=true`，并提供 `REG_REPORTER_USERNAME`、`REG_REPORTER_PASSWORD`、`REG_ADMIN_USERNAME`、`REG_ADMIN_PASSWORD`、`REG_UC06_TARGET_TYPE` 和 `REG_UC06_TARGET_ID`；流程会验证举报创建、管理员处置、重复举报冲突、content 目标状态和 identity `REPORT` 通知。
