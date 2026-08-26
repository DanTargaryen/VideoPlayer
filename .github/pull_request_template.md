## 变更摘要

<!-- 用 2-5 句话说明为什么改、解决什么问题、最终结果是什么。不要只罗列文件。 -->

## 关联任务与用例

- 任务 ID：`TASK-ID`
- 需求 / 用例：`REQxx / UCxx`，不适用时写 `N/A` 并说明原因
- 看板 / Issue：
- 基线 / 目标版本：
- 源分支：`feature/...` / `bug/...` / `test/...` / 其他规范 category
- 目标分支：
- 同步基线：`origin/<target>@<commit-sha>`
- 同步方式：从最新 `origin/<target>` 创建 / `git rebase origin/<target>`
- 基线检查：`merge-base --is-ancestor` PASS；目标侧计数 `0`

## 变更类型

- [ ] `feat` 新功能
- [ ] `fix` 缺陷修复
- [ ] `test` 测试
- [ ] `build` / `ci` 工程化、容器或流水线
- [ ] `docs` 文档、模型或追溯
- [ ] `refactor` 不改变外部行为的重构
- [ ] `perf` 性能改进
- [ ] `chore` 其他维护

## Commit 清单

<!-- 每个 commit 都要规范命名，并简要写改动和测试。不要只粘贴 hash。 -->

| Commit | 规范标题 | 简要改动 | 实际测试 |
| --- | --- | --- | --- |
| `abcdef0` | `feat(content): ...` |  | PASS / FAIL / NOT RUN（原因） |

## 本 PR 做了什么

1.
2.
3.

## 本 PR 不包含什么

<!-- 明确排除项，防止 reviewer 误以为同一业务范围已全部完成。 -->

-

### 生成产物审计

- [ ] PR 不包含 `artifacts/`、`playwright-report/`、`test-results/`、`coverage/`、`dist/`、`build/`、日志、PID、缓存、本地数据库、上传文件或生成报告
- 已跟踪生成产物数量：`0` / 填写原因
- 测试报告保存位置：本地忽略目录 / CI Artifact / N/A

## 架构、接口与数据影响

- 服务 / 模块：
- API 兼容性：无 / 向后兼容 / 破坏性变更（说明迁移方式）
- 数据库 / Prisma：无 / migration / seed / 数据归属变化
- 跨服务调用：无 / timeout / retry / 幂等 / 降级说明
- 配置与 Secret：无 / 新增变量（只写变量名，不写值）

## 测试与验证

> 只填写实际执行过的命令和结果。未运行必须写清原因，不能用“应该通过”。

| 检查 | 命令 / 环境 | 结果 | 证据 |
| --- | --- | --- | --- |
| Lint |  | PASS / FAIL / NOT RUN |  |
| Build |  | PASS / FAIL / NOT RUN |  |
| Unit |  | `x/x` PASS / FAIL / NOT RUN |  |
| API / Integration |  | `x/x` PASS / FAIL / NOT RUN |  |
| E2E / Smoke |  | `x/x` PASS / FAIL / NOT RUN |  |
| Docker / K8s / CI |  | PASS / FAIL / BLOCKED / N/A |  |

### 失败与修复记录

<!-- 保留有价值的失败过程：失败现象、根因、修复、重跑结果。没有则写“无”。 -->

-

## 截图、日志与原始报告

<!-- 截图不能替代代码、配置、日志或原始测试报告。敏感信息必须打码。 -->

-

## 风险与回滚

- 主要风险：
- 影响范围：
- 回滚步骤：
- 数据恢复方式：不适用 / 说明备份与恢复

## AI 与外部来源

- [ ] 本 PR 使用了生成式 AI 辅助；已人工审阅并实际运行验证
- [ ] 本 PR 未使用生成式 AI
- 开源代码 / 模板 / 教程来源及许可证：无 / 填写链接

## Reviewer 检查清单

- [ ] PR 标题符合 `type(scope): summary`
- [ ] 源分支符合 `feature/`、`bug/`、`hotfix/`、`test/`、`docs/`、`build/`、`ci/`、`refactor/`、`perf/` 或 `chore/` 规范
- [ ] 源分支是独立任务分支，与目标分支不同，且没有直接 commit/push 到 `main`、`master`、`develop`、release 或本 PR 目标分支
- [ ] 已在创建/更新 PR 前 fetch，并从最新 `origin/<target>` 创建源分支或将源分支 rebase 到该基线
- [ ] `git merge-base --is-ancestor origin/<target> HEAD` 通过，且 `git rev-list --left-right --count origin/<target>...HEAD` 的目标侧计数为 `0`
- [ ] 每个 commit 是单一逻辑变更，消息符合仓库规范
- [ ] 每个 commit 正文都包含简要 `Changes` 和实际 `Tests`；未运行项说明原因
- [ ] 关联了任务 ID 和 REQ/UC，或清楚说明 `N/A`
- [ ] `docs/practice-2026/00-progress.md` 已按实际结果更新
- [ ] 没有提交 `.env`、密码、Token、数据库口令、云密钥、日志或本地产物
- [ ] 已审计 PR 文件清单，生成产物的已跟踪数量为 0
- [ ] Lint、build 和适用测试已实际运行；未运行项有原因
- [ ] 新增/修改行为有适用的单元、API 或 E2E 测试
- [ ] 数据库、接口、配置和数据归属文档已同步
- [ ] 镜像使用 commit SHA / 明确版本号，不只使用 `latest`
- [ ] 有明确风险、失败处理和回滚方式
- [ ] 至少一名非作者 reviewer 完成检查

## 合并前确认

- [ ] 所有阻塞评论已解决
- [ ] CI 必需检查通过，或阻塞已获得明确书面豁免
- [ ] 合并前已再次 fetch，并将源分支 rebase 到最新目标分支；祖先检查通过、目标侧计数为 `0`，且无未解决冲突
- [ ] 不会移动或改写 `monolith-start` 等已发布基线标签
