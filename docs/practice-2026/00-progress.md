# 软件工程基础实践执行进度

> 维护规则：这是本轮实践的唯一进度源。每完成一项，必须同时更新复选框、改动说明、测试命令/环境、测试结果和对应 commit；没有实际验证的事项不能标记为 `[x]`。
>
> 当前 PR 分支：`feature/PRACTICE-2026-engineering-baseline`，目标分支：`main`。旧 `codex/practice-bootstrap` 保留为重写前备份。
>
> 教师确认：组长于 2026-08-24 报告 UC01-UC06 与当前四服务方向已获确认；外部回复截图/链接仍需组长补入证据索引。

## 1. 总体里程碑

- [x] `PLAN-01` 解析课程任务书并形成十天倒排、评分差距和五人分工方案。
  - 完成内容：逐页提取并视觉核验 8 页任务书；盘点当前代码、文档、测试、容器、CI、K8s、数据模型和运行状态。
  - 测试/验证：PDF 8 页渲染检查；前端/后端 build；单体 health、代理和推荐接口实测。
  - 结果：通过；计划报告位于本地 `artifacts/software-engineering-practice-iteration-plan.html`。
- [x] `GIT-01` 建立独立实践启动分支。
  - 完成内容：创建探索分支 `codex/practice-bootstrap`，避免直接在 `main` 上继续堆改动。
  - 测试/验证：`git status --porcelain=v2 --branch`、`git log`。
  - 结果：通过；分支基于 `main` 提交 `492da81`。
- [x] `GIT-02` 从最新 `origin/main` 重建规范 PR 分支。
  - 完成内容：创建 `feature/PRACTICE-2026-engineering-baseline`，把探索分支内容按 lint、test、build、ci、执行资料、架构和 Git/skill 规范拆为单一逻辑 Commit；旧分支不 force-push、不删除。
  - 测试/验证：每个 Commit 均含 `Task/UC/Changes/Tests/Evidence`；最终 `test:ci` PASS、Playwright 2/2 PASS、skill 双验证 PASS、分支全树一致性和 diff check PASS。
  - 结果：规范历史已重建、通过最终验证并 push；由组长向 `main` 创建 PR。
- [x] `PUSH-01` 发布实践启动分支。
  - 完成内容：首次推送 `codex/practice-bootstrap` 并设置 upstream；后续修复使用普通 push，不改写远端历史。
  - 测试/验证：`git fetch origin --prune`、本地/远端 SHA、ahead/behind、`git ls-remote`。
  - 结果：push 通过，本地与 `origin/codex/practice-bootstrap` 同步；按用户要求未创建 PR。
- [x] `PUSH-02` 发布重写后的规范 PR 分支。
  - 完成内容：首次推送 `feature/PRACTICE-2026-engineering-baseline` 并设置 upstream；目标 PR 分支明确为 `main`；旧 `codex/practice-bootstrap` 保留备份。
  - 测试/验证：push PASS；远端 SHA `028278b`；本地/远端 ahead/behind `0/0`；`git ls-remote` PASS；PR 查询确认未创建。
  - 结果：新分支已可由组长创建目标为 `main` 的 PR；Codex 按授权停止在 push。
- [x] `PR-01` 创建单体工程基线 Draft PR。
  - 完成内容：创建 Draft PR #24，标题 `feat(practice): establish monolith engineering baseline`，base=`main`，head=`feature/PRACTICE-2026-engineering-baseline`；完整填写 Commit 清单、改动、测试、阻塞、风险、回滚和 AI/来源说明。
  - 测试/验证：PR URL/base/head/title/draft/body/mergeable 检查 PASS；状态 `OPEN / DRAFT / MERGEABLE`；非作者 review 尚未完成。
  - 结果：https://github.com/DanTargaryen/VideoPlayer/pull/24；PR 保持 Draft，等待 review、完整 smoke、Docker/K8s 和 CI 条件。
- [x] `CHORE-01` 收口本地维护改动。
  - 完成内容：忽略 `artifacts/`；ESLint 忽略 `.vite`；规范提交 `53921bf`。
  - 测试/验证：`npm run build:frontend`、`npm run build:backend`、CRLF 感知的 `git diff --check`。
  - 结果：前后端 build 通过；diff 检查通过。
- [x] `GOV-DOC-01` 建立实践启动资料包。
  - 完成内容：新增用例范围、教师消息、smoke、看板、组会/站会、证据/DoD、环境决策共 7 个执行文件；规范提交 `006bab8`。
  - 测试/验证：任务 ID 完整性检查、UC01-UC06 覆盖检查、敏感信息扫描、`git diff --check`。
  - 结果：通过；未检测到口令、Token 或真实连接串。
- [x] `GOV-GIT-01` 建立统一 Commit / Push / PR 工作流。
  - 完成内容：新增 GitHub PR 模板、仓库 commit/PR 规范，并创建个人 Codex skill `videoplayer-commit-pr`；以后在 VideoPlayer 执行 commit、push、PR 或交接时自动读取仓库规范。
  - 测试/验证：skill-creator 官方 `quick_validate.py`（临时 PyYAML 依赖）通过；PR 模板必填章节检查、diff check、敏感信息检查通过。
  - 结果：模板与仓库规范进入最终治理提交；个人 skill 位于 `~/.codex/skills/videoplayer-commit-pr`。
- [x] `GOV-GIT-02` 补充分支 category 和 Commit 正文规范。
  - 完成内容：新分支统一使用 `feature/`、`bug/`、`hotfix/`、`test/`、`docs/`、`build/`、`ci/`、`refactor/`、`perf/`、`chore/`；commit 标题继续使用 `feat/fix/test...` Conventional Commits，正文强制列出 `Changes` 和 `Tests`，课程任务再写 `Task/UC/Evidence`。
  - 测试/验证：个人 skill 官方 `quick_validate.py` PASS；PR 模板 category/Commit 清单字段检查 PASS；Markdown diff check PASS。
  - 结果：规范和个人 skill 已更新；PR 使用新 `feature/...` 分支，旧 `codex/...` 分支保留作备份。
- [x] `GOV-GIT-03` 将 Commit / PR skill 纳入仓库。
  - 完成内容：新增 `.codex/skills/videoplayer-commit-pr/SKILL.md` 与 `agents/openai.yaml`，使 skill 随仓库分发；个人版继续保留用于自动发现。
  - 测试/验证：个人版和仓库版分别通过官方 `quick_validate.py`；两份 `SKILL.md` 和 `openai.yaml` 字节一致；TODO 扫描、diff check PASS。
  - 结果：仓库版 skill 可提交和推送；后续更新需同时同步个人版和仓库版并验证一致性。
- [x] `UC-CONF-01` 教师确认当前业务场景与架构方向。
  - 完成内容：按组长反馈，将 UC01-UC06 标记为已计入，并以四个业务服务作为后续实现方向。
  - 测试/验证：文档一致性检查；外部确认属于管理证据，不是代码测试。
  - 结果：范围已冻结；待组长补教师回复截图/链接。
- [ ] `BASE-01` 完成 UC01-UC06 单体全场景 smoke 并创建 `monolith-start`。
  - 当前状态：未执行。写入型场景会影响数据库/MinIO，需隔离测试环境或组长明确授权使用共享远端环境。
- [x] `LINT-01` 清零前端现有 12 个 lint 错误，建立可用于 CI 的 lint 基线。
  - 完成内容：删除模板已不再调用的旧投稿创建逻辑、旧关注分组逻辑、未使用的格式化函数和图标/生命周期导入；为空的媒体 seek catch 增加原因说明。
  - 测试/验证：`npm run lint:frontend`、`npm run build:frontend`、CRLF 感知的 `git diff --check`。
  - 结果：前端 lint 从 12 errors 降为 0；生产构建通过；仍有大 chunk 警告但不阻断构建。
- [x] `TEST-01` 建立 Jest/Supertest/Vitest/Playwright 测试基础设施并运行首批测试。
  - 完成内容：新增后端 Jest 配置、health controller 单元测试、health API Supertest 测试、前端 Vitest 纯函数测试、Playwright Chrome 公开 smoke，以及根级 `test`、`test:e2e`、`test:ci` 命令。
  - 测试/验证：后端 Jest 2/2；前端 Vitest 3/3；Playwright 2/2；`npm run test:ci` 整体通过。
  - 结果：首批共 7 个测试全部通过；Playwright 只读访问首页和 health，未写共享数据库。
  - 已知限制：由于 npm 网络两次 `ECONNRESET`，首批前端测试暂用 Vitest `node` 环境；Vue 组件级 `@vue/test-utils/jsdom` 后续再补。
- [ ] `CTR-01` 完成前端、后端、MySQL 容器化和一键初始化。
  - 已完成配置：前端 Nginx 多阶段 Dockerfile、后端 Node 多阶段 Dockerfile、完整 Compose、MySQL/Redis/MinIO 健康依赖、SRS、环境占位模板、SPA/API 代理、README 启停说明。
  - 静态验证：Compose YAML 可解析；Dockerfile 关键阶段/健康检查/版本镜像字段存在；`npm run test:ci` 仍通过。
  - 未打勾原因：本机无 Docker，尚未执行 `docker compose config/build/up`、容器 health、数据库自动初始化和换机复现。
- [ ] `CI-01` 建立单体 GitHub Actions 流水线并保留成功/失败记录。
  - 已完成配置：新增质量门禁、MySQL 隔离 public E2E、测试证据上传、前后端 SHA 镜像构建三个 job。
  - 本地验证：工作流 YAML 可解析；`test:ci` 和本地 Playwright 已通过。
  - 安全配置：public E2E 使用仅存在于 GitHub Runner 生命周期内的空密码 MySQL；JWT/Admin Secret 在启动步骤动态生成。未来部署 job 仍必须使用 GitHub/K8s Secrets。
  - 远端结果：PR #24 触发 run `32799446109`；quality 和 public-e2e 均为 failure、0 steps、无 runner，images skipped。GitHub UI 权威注解为：`The job was not started because your account is locked due to a billing issue.`
  - 未打勾原因：workflow 尚未实际执行 quality/E2E/images jobs；课程要求的 Kubernetes 自动部署 job 仍未实现。
- [ ] `ARCH-01` 冻结四服务接口和 31 张表的数据归属。
  - 已完成草案：四服务职责/非职责、现有 31/31 Model 唯一归属、建议新增直播/审计表、公开/内部接口、跨服务 timeout/幂等/降级、迁移/回滚顺序。
  - 验证：Model 名单与 `backend/prisma/schema.prisma` 自动比对；文档表中 31 个现有 Model 无遗漏、无重复 owner。
  - 未打勾原因：尚未完成全体组员评审和决策签字。
- [ ] `MS-01..04` 提取四个业务微服务并独立构建、测试和部署。
- [ ] `REG-01` 完成全部公开 API 和 UC01-UC06 自动回归。
- [ ] `EXP-01` 完成 HPA 扩缩容实验。
- [ ] `EXP-02` 完成依赖故障降级实验。
- [ ] `PERF-01` 完成单体/微服务同条件性能对比，每组至少 3 次。
- [ ] `DEL-01` 完成交付包、答辩材料、权重确认和演练。

## 2. 当前批次：工程化基础

| 项目 | 状态 | 完成内容 | 测试命令/环境 | 结果 | Commit |
| --- | --- | --- | --- | --- | --- |
| LINT-01 前端 lint 基线 | DONE | 清理 6 个文件中的 12 个错误；移除不可达旧代码，不改变当前模板入口 | `npm run lint:frontend`; `npm run build:frontend`; `git diff --check` | PASS；0 errors；build PASS | `53921bf` |
| TEST-01 测试基础设施 | DONE | Jest/Supertest/Vitest/Playwright；后端 unit+API、前端 unit、公开 E2E | `npm run test:backend`; `npm run test:frontend`; `npm run test:e2e`; `npm run test:ci` | PASS；7/7 | `7b310d0` |
| BASE-READONLY 只读启动检查 | DONE | 启动单体并验证 TypeScript watch、health、首页和前端代理；测试后关闭服务 | `npm run dev`; Playwright Chrome | PASS；2/2 E2E；未写数据库 | `7b310d0` |
| CTR-01 容器配置 | PARTIAL | 前/后 Dockerfile、全栈 Compose、Nginx、环境模板、README | YAML 解析；字段静态检查；`test:ci` | STATIC PASS；Docker runtime BLOCKED | `0cfca75` |
| CI-01 流水线配置 | PARTIAL | quality、public-e2e、versioned images jobs | YAML 解析；本地 `test:ci`、Playwright；GitHub 注解 | LOCAL PASS；REMOTE BLOCKED BY BILLING；K8s PENDING | `f151429` |
| ARCH-01 服务/数据草案 | PARTIAL | 4 服务、31 表归属、接口、失败策略、迁移/回滚 | Prisma Model 自动比对；唯一 owner 检查 | DRAFT PASS；TEAM REVIEW PENDING | `bcbc873` |
| GOV-GIT-01 Commit/PR 规范 | DONE | GitHub PR 模板、仓库规范、个人 Codex skill | quick_validate；模板章节/敏感信息/diff 检查 | PASS | 最终治理提交 |
| GOV-GIT-02 分支/Commit 命名 | DONE | category 分支名、Conventional Commit 标题、Changes/Tests 正文、PR Commit 清单 | quick_validate；必填字段；diff check | PASS；应用测试 N/A（纯规范） | 最终治理提交 |
| GOV-GIT-03 仓库内 skill | DONE | `.codex/skills/videoplayer-commit-pr` 与个人版同步 | 双 quick_validate；字节比对；TODO/diff check | PASS；应用测试 N/A（skill/docs） | 最终治理提交 |
| PR-01 工程基线 PR | DONE | Draft PR #24，base main，完整模板与 8 个规范 Commit 清单 | URL/base/head/title/body/draft/mergeable 检查 | PASS；CI REMOTE BLOCKED BY BILLING | 本提交 |

## 3. 最近执行记录

| 日期时间 | 事项 | 做了什么 | 测试情况 | 结论/下一步 |
| --- | --- | --- | --- | --- |
| 2026-08-24 | PLAN-01 | 分析任务书与现有仓库，生成计划报告 | PDF 视觉核验；build/health/API 实测 | 完成 |
| 2026-08-24 | CHORE-01 | 忽略本地产物和 `.vite` 缓存 | 前后端 build 通过 | 重写后 commit `53921bf` |
| 2026-08-24 | GOV-DOC-01 | 建立实践启动模板 | 完整性、敏感信息和 diff 检查通过 | 重写后 commit `006bab8` |
| 2026-08-24 | UC-CONF-01 | 根据组长反馈登记教师确认 | 文档一致性待本批次结束统一检查 | 已冻结范围；待补外部证据 |
| 2026-08-24 | LINT-01 | 删除不可达旧投稿/旧分组代码、无用导入和无用函数；补媒体 seek catch 说明 | 前端 lint 0 errors；前端 build PASS；diff check PASS | 完成；进入 TEST-01 |
| 2026-08-24 | TEST-01 第一次后端测试 | Jest 误加载同目录编译遗留 `.js`，随后 Supertest 默认导入不兼容 | 第一次 0 tests；第二次 1/2；修正扩展名优先级和 CommonJS 导入后 2/2 | 失败原因与修复已保留，不隐藏失败过程 |
| 2026-08-24 | TEST-01 前端依赖 | `vitest/@vue-test-utils/jsdom` 网络安装两次 `ECONNRESET`；改为缓存离线安装 Vitest node 环境 | Vitest 3/3 | 首批基础设施完成；组件 DOM 测试后续补 |
| 2026-08-24 | BASE-READONLY / E2E | 后台启动单体，Chrome 访问首页并经 Vite 代理请求 health；测试后关闭临时服务 | Playwright 2/2；启动日志 0 TS errors；health 200 | 完成只读基线，不等于 UC01-UC06 全场景 smoke |
| 2026-08-24 | TEST-CI | 串行运行后端 lint、前端 lint、后端 build、前端 build、后端 Jest、前端 Vitest | lint PASS；build PASS；Jest 2/2；Vitest 3/3 | CI 本地入口通过；仍需 GitHub Actions 实际 run |
| 2026-08-24 | CTR-01 配置阶段 | 新增前后端镜像、多服务 Compose、Nginx、环境模板和 README | Compose/CI YAML 解析；Dockerfile 字段静态检查；本机无 Docker | 配置完成但运行验收未完成，不打勾 |
| 2026-08-24 | CI-01 配置阶段 | 新增 GitHub Actions 质量、公开 E2E 和 SHA 镜像 job | YAML 解析；本地 test:ci PASS；Playwright 2/2 | 尚无远端 run/K8s deploy，不打勾 |
| 2026-08-24 | ARCH-01 草案 | 完成 4 服务职责、31 表唯一归属、接口、失败策略和迁移/回滚顺序 | 与 Prisma schema 自动比对；唯一 owner 检查 | 草案完成；等待全员评审，不打勾 |
| 2026-08-25 | GOV-GIT-01 | 新增 PR 模板、commit/PR 团队规范和 `videoplayer-commit-pr` 个人 skill | 官方 quick_validate PASS；模板和 diff 检查 PASS | 完成；本轮按该规范 commit 并 push |
| 2026-08-25 | PUSH-01 首次推送 | 推送 `codex/practice-bootstrap`，远端 SHA 与本地一致 | push PASS；自动触发 run `32796444619` | workflow 启动阶段失败、0 jobs；当时 API 未给出注解，后续 UI 证实根因是账号 billing/spending limit |
| 2026-08-25 | CI-01 workflow 硬化 1 | 移除 service health options 中的 Secret 表达式，改为 Prisma `db:push` 就绪重试 | workflow YAML PASS；diff check PASS；`npm run test:ci` PASS | 改动提升兼容性，但不是远端启动失败根因 |
| 2026-08-25 | CI-01 第二次启动失败 | push `b33a964` 后 run `32796669304` 为 `startup_failure`、0 jobs | 远端 SHA 同步；GitHub run 元数据检查 | 后续 UI 证实根因同样是账号 billing/spending limit |
| 2026-08-25 | CI-01 workflow 硬化 2 | public E2E 改用 runner 内临时空密码 MySQL，JWT/Admin Secret 在步骤内动态生成 | workflow YAML PASS；无 Secret context；diff check PASS；`npm run test:ci` PASS | 减少 CI Secret 前置条件，但不能绕过账号 billing 阻塞 |
| 2026-08-25 | CI-01 远端阻塞确认 | 用已登录 GitHub UI 查看 run `32796780920` 注解 | 页面明确显示：recent account payments failed 或 spending limit needs increase | 权威根因是 GitHub 计费/额度，需仓库 owner 在 Billing & plans 处理；workflow 未获执行机会 |
| 2026-08-25 | GOV-GIT-02 | 区分 `feature/bug/...` 分支名与 `feat/fix...` commit 标题；强制 commit 正文列出 Changes/Tests，PR 增加 Commit 清单 | skill quick_validate PASS；模板字段 PASS；diff check PASS；应用测试 N/A | 与 GOV-GIT-03 同批提交并上传 |
| 2026-08-25 | GOV-GIT-03 | 将个人 `videoplayer-commit-pr` skill 同步到仓库 `.codex/skills/` | 个人/仓库双 quick_validate PASS；SKILL/openai.yaml 字节一致；TODO/diff check PASS | 完成；按新 Commit 正文规范提交并 push |
| 2026-08-25 | GIT-02 历史重写 | 从最新 `origin/main` 创建 `feature/PRACTICE-2026-engineering-baseline`，按 7 个逻辑组重建提交历史 | 每个 Commit 正文 PASS；`test:ci` PASS；Playwright 2/2 PASS；skill 双验证 PASS；树一致性/diff check PASS | 旧 `codex/practice-bootstrap` 保留备份；新分支用于目标为 `main` 的 PR |
| 2026-08-25 | GIT-02 最终 E2E | 临时启动单体，Chrome 验证首页和前端代理 health，测试后关闭服务 | TypeScript 0 errors；health 200；Playwright 2/2 PASS；端口已释放 | 最终治理提交可创建；Docker/K8s 实跑仍独立 BLOCKED |
| 2026-08-25 | PUSH-02 | 推送 `feature/PRACTICE-2026-engineering-baseline`，目标 PR 分支为 `main`，旧分支保留备份 | push PASS；远端 SHA `028278b`；ahead/behind `0/0`；PR 未创建 | 新分支可供组长创建 PR；本轮再提交本条证据并普通 push |
| 2026-08-25 | PR-01 | 使用仓库 skill 和完整模板创建 Draft PR #24，base main，head feature/PRACTICE-2026-engineering-baseline | PR 字段检查 PASS；OPEN/DRAFT/MERGEABLE；正文完整 | PR URL：https://github.com/DanTargaryen/VideoPlayer/pull/24；等待非作者 review 和阻塞解除 |
| 2026-08-25 | CI-01 PR run | PR #24 触发 run `32799446109`，quality/public-e2e 失败，images skipped | Jobs 0 steps、无 runner；GitHub UI Annotations 检查 | 账号仍被 Billing issue 锁定，workflow 未执行代码；不是测试失败 |

## 4. 阻塞与需组长决定

- [ ] 提供或指定教师确认回复的截图/链接，补入证据索引。
- [ ] 决定是否允许在当前共享远端 MySQL/MinIO 上执行会写数据的 UC smoke；默认不写。
- [ ] 指定可运行 Docker/Kubernetes 的主机；当前机器无 Docker。
- [ ] PR #24 由至少一名非作者 reviewer 完成检查；当前为 Draft，尚未请求合并。
- [ ] 仓库 owner 处理 GitHub Billing & plans 的付款失败或 Actions spending limit，之后重新运行 workflow。
