# Agent/AI 外部 API 测试设计

## 目标

新增一套独立、可重复执行的 Agent/AI 集成测试，真实调用项目已配置的 DashScope/Qwen 服务，并验证已实现 API 的请求、响应和持久化结果。

## 范围

- 验证 `POST /api/v1/assistant/chat` 的本地知识回答和真实模型回答。
- 验证 `POST /api/v1/ai/video-summary` 的本地视频读取、FFmpeg 抽帧、真实多模态模型调用和摘要持久化。
- 验证 `POST /api/v1/ai/video-chat` 与 `GET /api/v1/ai/video-chat/:videoId` 的真实模型回答和历史持久化。
- 验证评论 API 接收 `@grok` 后创建 `CommentAiTask`，但不启动共享后台 worker，不领取其他用户任务。
- 将 `/api/v1/agent/review-preview` 与 `/api/v1/agent/results` 标记为 Mock/待实现，不作为通过用例，也不修改其生产代码。
- 不连接、不验证 MinIO；测试强制使用本地临时存储。

## 隔离与安全

- 使用项目实际云端 MySQL，通过 `ALLOW_REMOTE_INTEGRATION_DATABASE=true` 显式确认。
- 真实模型调用另需 `ALLOW_REAL_AI_CALLS=true`，防止普通测试或 CI 意外产生费用。
- 用户、视频、评论和任务均带唯一运行前缀；清理仅按记录 ID 和唯一前缀执行。
- 评论 AI worker 和 Grok 账号初始化器在测试模块中替换；只验证当前测试评论的任务入队，不执行共享任务。
- 本地生成短视频文件，写入本地存储并在结束后删除；MinIO 配置不参与测试。

## 结果与失败策略

- 独立命令输出 `test-results/agent-ai-latest.json`。
- 任一 API、模型调用、数据库断言或清理前关键断言失败时，Jest 返回非零退出码。
- 报告分别列出总数、通过数、失败数、失败原因、运行环境和未覆盖项。
