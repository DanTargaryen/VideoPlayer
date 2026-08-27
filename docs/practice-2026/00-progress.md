# 软件工程基础实践执行进度

> 维护规则：这是本轮实践的唯一进度源。每完成一项，必须同时更新复选框、改动说明、测试命令/环境、测试结果和对应 commit；没有实际验证的事项不能标记为 `[x]`。
>
> 受保护基线为 `main`，任务改动使用独立规范分支；最新远端基线 SHA 以 `git rev-parse origin/main` 为准。
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
  - 结果：https://github.com/DanTargaryen/VideoPlayer/pull/24；PR 已于 2026-08-25 合并到 `main`，产生 merge commit `b459880`。
- [x] `GIT-CLEAN-01` 清理已完成工作的远端分支。
  - 完成内容：删除 `codex/practice-bootstrap`、`feature/PRACTICE-2026-engineering-baseline`、`feature/main-experience`、`lixm`、`lzy`、`lzy_1`、`wyh-1`、`wyh-3`、`zzz` 共 9 个远端分支；未删除本地分支。
  - 测试/验证：刷新远端引用；检查相对 `origin/main` 的提交归属；确认 PR #24 及历史相关 PR 已合并、无 OPEN PR；使用 atomic remote delete；`git ls-remote --heads origin` 复核。
  - 结果：通过；远端只剩 `main`，SHA 为 `b459880ffe1ab1e476df4404acdba39990f6ad26`。
- [x] `GIT-CLEAN-02` 清理已完成工作的本地分支。
  - 完成内容：暂存保护当前未提交文档，切换并 fast-forward 本地 `main` 到 `origin/main`，原样恢复工作区后删除 `feature/PRACTICE-2026-engineering-baseline`、`feature/main-experience`、`codex/practice-bootstrap` 三个本地分支。
  - 测试/验证：恢复前后 5 个工作区文件 SHA-256 完全一致；无冲突；本地分支引用检查；本地 `main` 与 `origin/main` ahead/behind `0/0`。
  - 结果：通过；本地仅保留 `main@b459880`，既有 `autostash` 保留未动，未提交文档改动未丢失。
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
- [x] `GOV-GIT-04` 只提交核心源文件并排除生成产物。
  - 完成内容：skill 和 PR 模板明确允许源码、测试源码、依赖/锁文件、迁移/seed、Docker/CI/K8s 配置及明确要求的仓库规范；禁止提交 artifacts、测试报告、coverage、dist/build、日志、PID、缓存、本地数据库、上传和生成报告。
  - 测试/验证：PR #24 文件审计中生成产物已跟踪数量 `0`；`.gitignore` 对 artifacts/playwright/test-results/coverage/dist/log/pid 覆盖 PASS；个人/仓库 skill 双 validator 与字节同步 PASS；策略字段/diff check PASS。
  - 结果：当前 PR 没有生成产物；11 个 `docs/practice-2026` 文件和仓库 skill/PR 模板属于前序明确要求的人工维护源文件，不按生成产物删除。
- [x] `GOV-ARTIFACT-01` 清除历史遗留的已跟踪生成产物。
  - 完成内容：删除 60 个有对应 TypeScript 源文件的后端编译 `.js`、1 个 Prisma 本地数据库、2 个 Vite 缓存、2 个 SQL 备份和 4 个 PDF/ZIP 导出文件；补全 `.gitignore` 的精确规则。
  - 测试/验证：60/60 JavaScript 均存在同路径 TypeScript；`npm run test:ci` PASS（Jest 2/2、Vitest 3/3）；目标产物已跟踪数量 0；本地/远端 SHA 一致；远端 run `32921374610` 启动前被 GitHub Billing 锁阻断、0 steps。
  - 结果：该提交历史重写前为 `7945d5d`、重写后为 `8a7368d`；业务源码、必要配置、Docker/CI/部署配置和测试源码均保留；远端失败不是代码或测试失败。
- [x] `GOV-HISTORY-01` 从 `main` 历史中清除生成与本地文件。
  - 完成内容：使用临时 `git-filter-repo 2.47.0` 对 `main` 的 120 个提交执行路径反选重写，清除后端编译 JavaScript、本地数据库、Vite 缓存、SQL 备份和 PDF/ZIP 导出；使用绑定旧 SHA 的 `--force-with-lease` 更新远端，并同步本地 `main`。
  - 测试/验证：重写后 `main` 可达历史的目标路径数量 0；最新树哈希保持 `a83d55a74af99e3fb12b03f8aaa459794391adb5` 不变；fresh single-branch clone、`git fsck --full`、`npm run test:ci` PASS（Jest 2/2、Vitest 3/3）；本地/远端 SHA `8a7368dd0c1f718906bbec2e8f8a25542dd9abc2` 一致；WIP 五文件恢复前后 SHA-256 一致。
  - 结果：通过；恢复 bundle 和 old→new commit/ref 映射仅保存在 ignored `artifacts/history-rewrite-backup/`。远端 run `32921905873` 仍因 GitHub Billing 锁在启动前失败、0 steps；GitHub 平台管理的只读 `refs/pull/*` 无法由普通 force-push 改写，不计入正常 `main` 历史清理结论。
- [x] `BASE-RUNTIME-CLEAN-01` 验证历史与产物清理后项目仍可运行。
  - 完成内容：在 `main@8a7368d` 启动前后端，连接现有远端 MySQL，验证首页、健康接口、推荐接口、直播广场和真实浏览器页面，验收后正常停止服务。
  - 测试/验证：Nest watch 编译 0 errors、应用启动成功；Vite 130 ms ready；前后端端口监听；首页、直连/代理 health、推荐、直播广场均 HTTP 200；浏览器登录页与直播页渲染成功，直播页 8 个标题、21 个按钮、console errors 0；日志错误扫描 PASS；停止后 3000/5173 端口释放。
  - 结果：通过；项目可正常启动和访问。Docker 不可用，因此 Redis、MinIO、SRS 容器链路未覆盖；写入型 UC smoke 未执行。Playwright CLI 临时下载因 `ECONNRESET` 失败，改用桌面浏览器完成可视验收。
- [x] `CI-MANUAL-01` 将 monolith-ci 改为仅手动触发。
  - 完成内容：本地删除 `push` 和 `pull_request` 触发器，保留 `workflow_dispatch`；质量、E2E 和镜像 Job 内容不变。
  - 测试/验证：Workflow YAML 解析、触发器字段检查和 `git diff --check`。
  - 结果：commit `44d44f1` 已推送到 `main`；远端触发器仅剩 `workflow_dispatch`，本次 push 没有生成 Actions run。
- [x] `CI-RUN-CLEAN-01` 删除历史失败的 Actions 运行记录。
  - 完成内容：删除 9 条因 GitHub Billing 锁在 Runner 启动前失败的 `monolith-ci` runs，覆盖 3 条 main push、3 条 PR 和 3 条旧分支 push 记录。
  - 测试/验证：删除后失败 run 数量 0、全部 run 列表为空；`main@44d44f1` 与前一提交 `8a7368d` 的 Check Runs 均为 0；远端代码 SHA 未变化。
  - 结果：通过；Workflow 仍为 active/manual-only，代码与 Git 历史未修改；被删除的 Actions 日志和 Billing 注解不可恢复。
- [x] `CI-RUNBOOK-01` 编写 Jenkins + Kind 换机执行手册和资源估算。
  - 完成内容：新增环境安装、Compose、数据库迁移、Kind/Kubernetes、Jenkins Pipeline、push 触发、成功/失败证据、交付文件和磁盘维护清单；区分当前可执行步骤和待实现文件。
  - 测试/验证：当前机器 CPU/RAM/磁盘与项目目录实测；命令、路径、端口冲突、文件清单和 Markdown 结构检查。
  - 结果：通过；推荐 16GB RAM、6–8 核、40GB 可用磁盘，完整视频/录播环境建议 50–80GB。
- [x] `UC-CONF-01` 教师确认当前业务场景与架构方向。
  - 完成内容：按组长反馈，将 UC01-UC06 标记为已计入，并以四个业务服务作为后续实现方向。
  - 测试/验证：文档一致性检查；外部确认属于管理证据，不是代码测试。
  - 结果：范围已冻结；待组长补教师回复截图/链接。
- [x] `DOC-UC06-STATE-01` 绘制 UC06 三层状态图。
  - 完成内容：新增并按组长反馈简化 `SYS-STATE06`、`COMP-STATE06`、`OBJ-STATE06` Mermaid 源图，只保留主状态与关键异常；同步用例、证据追溯和文件索引。
  - 测试/验证：Mermaid 三图渲染；状态枚举/API/Prisma 字段与源码对照；追溯编号一致性检查；`git diff --check`。
  - 结果：模型完成；应用测试未运行，`UNIT-TC06`、`INT-TC06`、`E2E-TC06` 仍为 `NOT RUN`；commit/push 待本轮后续授权。
- [x] `DOC-SRS-01` 按小学期清单整理软件需求说明书。
  - 完成内容：在桌面版《需求说明书》中补充 `US01-US06`、`REQ01-REQ06`、六个完整用例说明、总体用例图与概念图占位、六个系统级状态图占位和统一追溯表；移除原附录中的活动图，统一为“只绘制系统级状态图”的口径。
  - 测试/验证：六组用户故事/需求/用例编号完整；六个用例说明和六个状态图占位完整；不存在 Mermaid 实图、顺序图或活动图；Markdown 文件统一为 UTF-8/LF。
  - 结果：通过；源文件位于 `/Users/mumuxunzi/Desktop/需求说明书.md`，当前不在 Git 仓库内，因此 commit/push 不适用。
- [x] `DOC-SRS-02` 替换总体用例图和概念类图占位。
  - 完成内容：将组长提供的总体用例图和概念类图复制到桌面固定资源目录，并以相对路径插入需求说明书；追溯表和附录状态同步更新，六个系统级状态图继续保留占位。
  - 测试/验证：两张图片格式、尺寸、SHA-256 和复制后一致性检查；Markdown 图片相对路径存在；`<用例图>`、`<概念图>` 占位已清零；六个状态图占位仍完整。
  - 结果：通过；图片目录为 `/Users/mumuxunzi/Desktop/需求说明书.assets/`，当前不在 Git 仓库内，因此 commit/push 不适用。
- [x] `DOC-SRS-03` 插入 UC01-UC06 六张系统级状态图。
  - 完成内容：按组长提供顺序将六张图对应到 `UC01` 至 `UC06`，复制到桌面固定资源目录并替换全部系统状态图占位；附录中的六项状态同步改为“已插入”。
  - 测试/验证：六张图片格式、尺寸、SHA-256 和复制后一致性检查；六条 Markdown 相对路径全部存在；`<UC0x-系统状态图>` 占位已清零；`SYS-STATE01-SYS-STATE06` 追溯编号保留。
  - 结果：通过；图片目录为 `/Users/mumuxunzi/Desktop/需求说明书.assets/`，需求说明书更新为 v2.3；当前不在 Git 仓库内，因此 commit/push 不适用。
- [x] `DOC-SRS-04` 精简需求说明书中的重复说明。
  - 完成内容：删除图表章节中重复说明文档要求、解释图意和声明图表类型的文字；附录图表清单删除内容相同的状态列。
  - 测试/验证：需求、用例、图片和追溯编号完整性检查；Markdown 结构检查。
  - 结果：通过；需求说明书更新为 v2.4，未删除业务规则、异常流程或风险说明。
- [x] `DOC-DESIGN-01` 插入 UC01-UC06 六张对象级状态图。
  - 完成内容：在桌面版《详细设计说明书》新增 `2.11 UC01-UC06 对象级状态图`，按组长提供顺序插入六张图片，并标注 `OBJ-STATE01-OBJ-STATE06`。
  - 测试/验证：六张图片格式、尺寸、SHA-256 和复制后一致性检查；六条 Markdown 相对路径及六个对象级追溯编号完整。
  - 结果：通过；图片目录为 `/Users/mumuxunzi/Desktop/详细设计说明书.assets/`，当前不在 Git 仓库内，因此 commit/push 不适用。
- [ ] `BASE-01` 完成 UC01-UC06 单体全场景 smoke 并创建 `monolith-start`。
  - 完成内容：已在独立 MySQL、MinIO、Redis 和 SRS 环境执行 UC01-UC06；UC01、UC04 为 `PASS`，UC02、UC03、UC05、UC06 为 `FAIL`；仅记录 5 个缺陷，未在 Smoke 分支混入修复。
  - 测试/验证：浏览器主成功/异常流程；隔离数据库和 MinIO 对象核对；SRS 中断与恢复；后端重启行为；根级单元测试及前后端生产构建。
  - 结果：未通过 `monolith-start` Gate，不创建标签；可编辑结果见 `docs/practice-2026/03-smoke-checklist.md`，未提交截图、日志、报告或本地数据库。
- [x] `LINT-01` 清零前端现有 12 个 lint 错误，建立可用于 CI 的 lint 基线。
  - 完成内容：删除模板已不再调用的旧投稿创建逻辑、旧关注分组逻辑、未使用的格式化函数和图标/生命周期导入；为空的媒体 seek catch 增加原因说明。
  - 测试/验证：`npm run lint:frontend`、`npm run build:frontend`、CRLF 感知的 `git diff --check`。
  - 结果：前端 lint 从 12 errors 降为 0；生产构建通过；仍有大 chunk 警告但不阻断构建。
- [x] `TEST-01` 建立 Jest/Supertest/Vitest/Playwright 测试基础设施并运行首批测试。
  - 完成内容：新增后端 Jest 配置、health controller 单元测试、health API Supertest 测试、前端 Vitest 纯函数测试、Playwright Chrome 公开 smoke，以及根级 `test`、`test:e2e`、`test:ci` 命令。
  - 测试/验证：后端 Jest 2/2；前端 Vitest 3/3；Playwright 2/2；`npm run test:ci` 整体通过。
  - 结果：首批共 7 个测试全部通过；Playwright 只读访问首页和 health，未写共享数据库。
  - 已知限制：由于 npm 网络两次 `ECONNRESET`，首批前端测试暂用 Vitest `node` 环境；Vue 组件级 `@vue/test-utils/jsdom` 后续再补。
- [x] `CTR-01` 完成前端、后端、MySQL 容器化和一键初始化。
  - 完成内容：前端 Nginx 与后端 Node 多阶段镜像、完整 Compose、MySQL/Redis/MinIO/SRS、环境模板、数据库建表与受保护 Seed；修复镜像内 npm 网络重试和 Seed 守卫脚本缺失。
  - 测试/验证：Compose config/build/up；6 个服务运行、5 个健康；31 张表；Seed 6 用户/14 视频；最新基线 `test:ci` 共 107 个规则/单元测试、Playwright Compose smoke 2/2；HTTP health 200。
  - 结果：PASS；本机 Colima 实跑完成，Compose 数据卷保留。另一台机器从零复现仍需由组员执行。
- [x] `K8S-01` 完成 Kind 最低验收部署和健康检查。
  - 完成内容：MySQL StatefulSet + 2Gi PVC、数据库同步 Job、前后端 Deployment/Service、readiness/liveness、Secret 动态创建、SHA 镜像加载、部署与健康脚本。
  - 测试/验证：Kind v0.32.0 / Kubernetes v1.36.1；Node Ready；迁移 Job Completed；MySQL/Backend/Frontend Ready；隔离 `video_player_test` API 16/16；集群内 health；端口转发后 Playwright 3/3。
  - 结果：PASS；K8s 数据库 Seed 6 用户/14 视频；Pod 0 次重启。正式 Prisma 基线 migration 和 Jenkins 自动触发仍是后续任务。
- [ ] `CI-01` 建立单体 GitHub Actions 流水线并保留成功/失败记录。
  - 已完成配置：新增质量门禁、MySQL 隔离 public E2E、测试证据上传、前后端 SHA 镜像构建三个 job。
  - 本地验证：工作流 YAML 可解析；`test:ci` 和本地 Playwright 已通过。
  - 安全配置：public E2E 使用仅存在于 GitHub Runner 生命周期内的空密码 MySQL；JWT/Admin Secret 在启动步骤动态生成。未来部署 job 仍必须使用 GitHub/K8s Secrets。
  - 远端结果：PR #24 触发 run `32799446109`；quality 和 public-e2e 均为 failure、0 steps、无 runner，images skipped。GitHub UI 权威注解为：`The job was not started because your account is locked due to a billing issue.`
  - 未打勾原因：workflow 尚未实际执行 quality/E2E/images jobs；课程要求的 Kubernetes 自动部署 job 仍未实现。
- [x] `CI-02` 建立 Jenkins + Kind 自动流水线并保留成功/失败证据。
  - 已完成配置：新增可移植 Declarative `Jenkinsfile`，按 Checkout、Install、Lint、Build、Unit、隔离数据库、API、Seed、E2E、SHA 镜像、Kind 部署、Health 顺序执行；新增本地等价入口、阶段标记、Artifact 收集和安全清理脚本。
  - 本地等价验证：第一次因 Seed 先于 API 导致推荐分页断言失败，调整为 API 后 Seed；第二次因 Vite 参数透传错误未监听指定端口，改用 `VITE_DEV_HOST/VITE_DEV_PORT`；第三次完整成功，107 项规则/单元测试、API 16/16、Playwright 3/3、SHA 镜像、Kind 和 Health 全部 PASS。
  - 失败门禁验证：`FORCE_TEST_FAILURE=true` 在 Unit 后以退出码 42 失败，数据库、API、Seed、E2E、镜像、Kind 和 Health 共 7 个后续阶段均无 marker、无容器或集群残留。
  - 真实 Jenkins：Build #2 完整 SUCCESS，归档 29 个 Artifact；Build #4 使用 `FORCE_TEST_FAILURE=true` 在 Unit 后按预期 FAILURE，后续 7 阶段全部 SKIPPED 并只归档 01–05 markers。Build #1/#3 的 GitHub checkout `curl 18` 失败记录也已保留，并通过三次重试、浅克隆和节点 reference cache 解除。
  - 自动触发验证：普通 push `800859e` 后，Poll SCM 在 10:01 检测 `99fd2b8 → 800859e`，Build #5 Cause 为 `Started by an SCM change`；默认成功参数下 12/12 阶段 PASS、29 个 Artifact，并自动清理临时 MySQL/Kind。
  - DB-01 合并验证：本地同构 Build 9202 对动态创建的 `video_player_ci_test` 执行 `20260826000000_init`，安全守卫与 `prisma migrate deploy` PASS；106/106 需求规则、后端 7/7、前端 3/3、API 16/16、Playwright 3/3、SHA 镜像、Kind/Health 全部通过，12/12 markers 完整，临时 MySQL/Kind 已清理。
  - 正式 migration Jenkins 验证：rebase 后 push 由 Poll SCM 自动触发 Build #7，检出 `237f780`；隔离库 migration、API 16/16、Playwright 3/3、SHA 镜像、Kind/Health、12/12 markers 和 27 个 Artifact 全部 PASS，临时 MySQL/Kind 清理 PASS。
  - 结果：PASS；本机 Jenkins 成功、故意失败阻断、SCM push 自动触发和正式 migration 四类证据齐全。数据库阶段只对流水线隔离测试库执行 `prisma migrate deploy`。
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
| CTR-01 容器配置 | DONE | 前/后 Dockerfile、全栈 Compose、Nginx、环境模板、Seed、README | Compose build/up/health；31 表；`test:ci` 107 项；Compose E2E 2/2 | PASS；6 服务在线；Seed 6 用户/14 视频 | 本提交 |
| K8S-01 Kind 部署 | DONE | MySQL StatefulSet/PVC、同步 Job、前后端 Deployment/Service、探针与脚本 | Node/Pod/Job/PVC；隔离 API 16/16；集群 health；E2E 3/3 | PASS；3 工作负载 Ready；Pod 0 restart | 本提交 |
| REPRO-01 Clean-machine README 复现 | DONE | 按 README 从空依赖、全新 Compose project/volume/image tag 和全新 Kind cluster 完整重跑；补充 TLS/ffmpeg-static 安全复现说明；修正 AdminController 单测 mock 与异常预期 | `npm ci`；`npm run test:ci`；Compose config/build/up；MySQL 建表；Seed；首页；Backend Health；Kind 部署；Kubernetes Health | PASS；运行环境保留；结论见 `docs/REPRO-01-clean-machine-checklist.md` | 本提交 |
| DB-01 Prisma migration 基线 | DONE | 单一初始 migration、migration lock、migrate/seed/test-reset 入口、安全守卫、K8s/Compose/CI 切换到 `migrate deploy`，以及 clean-machine/生产部署口径同步 | 全新本机 MySQL 8.0 容器；`video_player_migration_test` 首次/重复迁移；seed；`db:test-reset`；失败阻断；schema diff；受保护 existing-database baseline 流程；Compose/K8s 启动复核；迁移入口远端精确白名单守卫 | PASS；默认支持全新验收数据库；6 用户/14 视频；失败库 `P3005` 阻断；等价库 baseline PASS；不等价库拒绝；非 test reset 拒绝；README 明确 31 个业务表 + 1 个迁移表；无共享远端 reset/baseline | 本提交 |
| CI-01 流水线配置 | PARTIAL | quality、public-e2e、versioned images jobs；K8s 部署基线已补 | YAML 解析；本地 `test:ci`、API、Playwright、Kind 实跑；GitHub 注解 | LOCAL PASS；REMOTE BLOCKED BY BILLING；Jenkins PENDING | `f151429` + 本提交 |
| CI-02 Jenkins Pipeline | DONE | 可移植 Jenkinsfile、隔离 DB 正式 migration、API/E2E、SHA 镜像、Kind、Health、Artifact、清理和本地等价入口 | Build #2 SUCCESS；#4 故意 FAILURE；#5 SCM 自动触发 SUCCESS；#7 migration SUCCESS | PASS；失败阻断、Artifact、cleanup、Poll SCM 与 `prisma migrate deploy` 均验证 | 本提交 |
| ARCH-01 服务/数据草案 | PARTIAL | 4 服务、31 表归属、接口、失败策略、迁移/回滚 | Prisma Model 自动比对；唯一 owner 检查 | DRAFT PASS；TEAM REVIEW PENDING | `bcbc873` |
| GOV-GIT-01 Commit/PR 规范 | DONE | GitHub PR 模板、仓库规范、个人 Codex skill | quick_validate；模板章节/敏感信息/diff 检查 | PASS | 最终治理提交 |
| GOV-GIT-02 分支/Commit 命名 | DONE | category 分支名、Conventional Commit 标题、Changes/Tests 正文、PR Commit 清单 | quick_validate；必填字段；diff check | PASS；应用测试 N/A（纯规范） | 最终治理提交 |
| GOV-GIT-03 仓库内 skill | DONE | `.codex/skills/videoplayer-commit-pr` 与个人版同步 | 双 quick_validate；字节比对；TODO/diff check | PASS；应用测试 N/A（skill/docs） | 最终治理提交 |
| PR-01 工程基线 PR | DONE | Draft PR #24，base main，完整模板与 10 个规范 Commit 清单 | URL/base/head/title/body/draft/mergeable 检查 | PASS；CI REMOTE BLOCKED BY BILLING | 本提交 |
| GOV-GIT-04 核心文件策略 | DONE | skill/PR 模板禁止生成产物，保留明确要求的源码和规范源文件 | tracked artifact audit；ignore checks；双 skill validator | 0 tracked artifacts；PASS | 本提交 |

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
| 2026-08-25 | GOV-GIT-04 | 审计 PR #24 并固化“只提交核心源文件、生成结果走 ignored/CI Artifact”策略 | 已跟踪生成产物 0；ignore coverage PASS；双 skill validator/sync、策略字段和 diff check PASS | 未删除此前明确要求的 skill 和课程源文档；本提交 push 后更新 PR |
| 2026-08-26 | GIT-CLEAN-01 | 合并/提交归属和 OPEN PR 审计后，以 atomic push 删除 9 个远端历史分支 | `git fetch --prune`；merge-base/cherry/tree audit；PR 查询；`git ls-remote --heads origin` | PASS；远端只保留 `main@b459880`，本地分支未删除 |
| 2026-08-26 | GIT-CLEAN-02 | 保护工作区、更新本地 main、恢复改动并删除 3 个本地历史分支 | 文件 SHA-256 前后比对；冲突检查；本地分支/ahead-behind 检查 | PASS；本地和远端都只保留 `main@b459880`，工作区改动完整保留 |
| 2026-08-26 | GOV-ARTIFACT-01 | 清除 69 个历史生成/本地文件并补全忽略规则 | `npm run test:ci` PASS；TS 对应关系；目标产物跟踪审计；本地/远端 SHA；Actions run `32921374610` | LOCAL PASS；`main@7945d5d`，目标产物跟踪数 0；REMOTE 0 steps BLOCKED BY BILLING；原工作区文档已恢复 |
| 2026-08-26 | GOV-HISTORY-01 | 生成恢复 bundle，重写 120 个 main 提交并 force-with-lease 更新远端/本地 | 全历史审计；tree hash；fresh clone/fsck；`test:ci` PASS；remote/WIP SHA；run `32921905873` | LOCAL/REWRITE PASS；`main@8a7368d`，正常 main 历史目标路径 0；REMOTE 0 steps BLOCKED BY BILLING；GitHub PR refs 除外 |
| 2026-08-26 | BASE-RUNTIME-CLEAN-01 | 清理后启动前后端，检查 API、浏览器页面和停止清理 | TS 0 errors；HTTP 200×4；浏览器页面/console；日志错误扫描；端口释放 | PASS；项目可运行；Docker/MinIO/SRS 与写入场景 NOT RUN |
| 2026-08-26 | CI-MANUAL-01 | 删除 push/PR 自动触发器，只保留 workflow_dispatch | YAML 解析；字段检查；diff check；远端文件与 run 查询 | PASS；`main@44d44f1`，本次 push 无 Actions run，后续仅手动触发 |
| 2026-08-26 | CI-RUN-CLEAN-01 | 删除 9 条 Billing 锁导致的历史失败 workflow runs | run 列表/失败计数；两次提交 Check Runs；远端 SHA | PASS；Actions runs 0、失败 0、提交 checks 0；日志不可恢复 |
| 2026-08-26 | CI-RUNBOOK-01 | 编写换机 CI/CD Runbook 与空间估算 | 主机/项目实测；命令与路径检查；Markdown 结构 | PASS；建议 16GB/6–8 核/40GB，完整环境 50–80GB |
| 2026-08-26 | REG-UC01-04 | 修复注册后首页推荐流、找回密码验证码倒计时、投稿时长、审核记录重复展示和投币累计提示；补充端到端测试说明与回归记录 | `npm run lint:backend`；`npm run lint:frontend`；`npm run build:backend`；`npm run build:frontend`；`npm run test:backend`；`npm run test:frontend`；`npx playwright test tests/e2e/public-smoke.spec.ts` | PASS；lint 0 errors；后端 Jest 3 suites/4 tests；前端 Vitest 1 file/3 tests；Playwright 3/3；前端 build 仅保留既有 chunk 警告 |
| 2026-08-26 | REG-UC06 | 修复举报处理完成后无通知、可重复处理、隐藏/删除动作重复和缺少“已处理”标记的问题；管理后台保留“保留/删除”处置，已处理记录只能删除记录本身 | `npm run lint:backend`；`npm run lint:frontend`；`npm run build:backend`；`npm run build:frontend`；`npm run test:backend`；`npm run test:frontend` | PASS；后端 Jest 3 suites/7 tests；前端 Vitest 1 file/3 tests；前后端 build PASS；前端 build 仅保留既有 chunk 警告 |
| 2026-08-26 | CTR-01 Compose 实跑 | 安装 Colima/Docker/Compose，构建带版本标签镜像，启动 MySQL/Redis/MinIO/SRS/Backend/Frontend，初始化数据库与测试数据 | 6 容器运行；5 health；31 表；Seed 6/14；最新基线 `test:ci` 107 项 PASS；Compose Playwright 2/2 | PASS；Dockerfile 增加 npm 重试并补入 Seed 守卫脚本；验收后 Compose 容器已停止但数据卷保留 |
| 2026-08-26 | K8S-01 Kind 实跑 | 创建 Kubernetes v1.36.1 单节点集群，离线加载前后端/MySQL 镜像，部署 MySQL/PVC、同步 Job、前后端和探针 | Node Ready；Job Completed；3 工作负载 Ready；Pod 0 restart；隔离 API 16/16；集群 health；Playwright 3/3 | PASS；本地入口 `http://127.0.0.1:15173`（需保持 port-forward）；真实 Agent/AI 套件因需外部密钥和付费调用授权未运行 |
| 2026-08-26 | REPRO-01 Clean-machine README 复现 | 从空依赖和全新隔离运行环境按 README 顺序重跑；修正文档中 TLS/ffmpeg-static 复现说明；修正 AdminController 单测 mock 与异常预期 | `npm ci`；`npm run test:ci`；Compose config/build/up；MySQL 建表；Seed；首页；Backend Health；Kind 部署；Kubernetes Health | PASS；`README CLEAN-MACHINE REPRODUCTION: PASS`；Compose 与 Kind 按要求保留运行 |
| 2026-08-26 | DB-01 Prisma migration 基线 | 删除分段迁移历史，生成单一初始 migration，新增 migrate/seed/test-reset 入口，并切换 Compose/K8s/CI/init-db | 本机全新 MySQL 8.0 容器 `vp-db01-mysql2`；`video_player_migration_test` 首次迁移、重复迁移、seed、test-reset、失败阻断、schema diff；受保护 existing-database baseline；Compose/K8s 启动复核 | PASS；首次迁移建 32 表；Seed 6 用户/14 视频；故意冲突库 `video_player_fail_test` 触发 `P3005`；等价库 baseline PASS；不等价库拒绝；非 test reset 拒绝；未碰共享远端库 |
| 2026-08-27 | DB-01 远端迁移入口收口 | 将 `db:migrate`、`scripts/db-migrate.sh`、`scripts/init-db.sh`、Compose 后端启动命令和 K8s migration Job 接入迁移目标守卫；`db:baseline-existing` 改为精确白名单加 `BASELINE` 确认 | `node --test test/unit/db-target-safety.test.js test/unit/db-baseline-existing.test.js`；`node backend/scripts/db-target-safety.js db:migrate migrate-deploy` 的本地验收库/远端拒绝/远端白名单路径 | PASS；默认只支持本地/Compose/Kind 全新验收库；远端或非默认库必须设置精确 `MIGRATION_DEPLOY_ALLOWED_TARGET` + `MIGRATION_DEPLOY_CONFIRM=DEPLOY_MIGRATIONS`；existing baseline 必须设置精确 `BASELINE_EXISTING_ALLOWED_TARGET` + `BASELINE_EXISTING_CONFIRM=BASELINE` |
| 2026-08-27 | DB-01 合并前文档收口 | 修正 clean-machine README 的 `migrate deploy` 与 32 表口径；补全生产远端迁移精确授权、已有等价库 baseline、漂移停止和一次性确认变量说明 | 干净 `npm ci`；`prisma:generate`；`build:backend`；`npm run test:ci`；迁移变量/表数/旧 `db:push` 文案检查；CRLF 感知 diff check | PASS；requirements 106/106、backend Jest 7/7、frontend Vitest 3/3；前后端 lint/build PASS；文档变量与安全守卫源码一致 |
| 2026-08-27 | CI-02 本地等价成功 | 修正 API/Seed 顺序和 Vite 端口变量后，执行与 Jenkins 相同的 12 阶段脚本 | 97 requirements + 7 backend + 3 frontend；API 16/16；E2E 3/3；Git SHA 镜像；Kind/Health | PASS；12/12 markers；Artifact 证据生成；临时 MySQL/Kind 自动清理 |
| 2026-08-27 | CI-02 本地故意失败 | `FORCE_TEST_FAILURE=true` 在 Unit 后主动返回 42 | Checkout/Install/Lint/Build/Unit PASS；后续 7 阶段无 marker | PASS；证明失败阻断后续迁移、测试、镜像和部署；无运行资源残留 |
| 2026-08-27 | CI-02 正式 migration 本地同构验证 | rebase 最新 `main` 后移除失效 `db:push` 模式，固定对动态隔离库执行 DB-01 `prisma migrate deploy`；执行 Build 9202 全流程 | 106 requirements + backend 7 + frontend 3；migration `20260826000000_init`；API 16/16；E2E 3/3；SHA 镜像；Kind/Health | PASS；12/12 markers；安全守卫确认 `127.0.0.1/video_player_ci_test`；临时 MySQL/Kind 清理 PASS；共享远端数据库/MinIO 未使用 |
| 2026-08-27 | CI-02 Jenkins Build #1 | Jenkins 通过 GitHub SCM 读取 Jenkinsfile 后执行完整 checkout | Git fetch 在 25% 时 `curl 18 / early EOF`；Install 及后续阶段全部 SKIPPED | FAIL（环境网络）；增加 checkout 三次重试、depth=1/no-tags 浅克隆和 checkout 失败时安全 Post 处理后重跑 |
| 2026-08-27 | CI-02 Jenkins Build #2 | GitHub SCM 第二次浅克隆成功后执行完整 Declarative Pipeline | requirements 97/97；backend 7/7；frontend 3/3；API 16/16；E2E 3/3；SHA 镜像；Kind/Health | SUCCESS；12/12 markers；29 个 Artifact；Pod 0 restart；临时 MySQL/Kind 清理 PASS |
| 2026-08-27 | CI-02 Jenkins Build #3 | 使用 `FORCE_TEST_FAILURE=true` 启动故意失败验证 | GitHub checkout 连续三次 `curl 18 / early EOF`，未进入 Unit | FAILURE（环境网络，不作为门禁证据）；Job 增加本地 Git reference cache，SCM URL 仍为 GitHub |
| 2026-08-27 | CI-02 Jenkins Build #4 | reference cache 下检出 GitHub 分支，Unit 完成后主动返回 42 | Checkout/Install/Lint/Build/Unit PASS；Migration/API/Seed/E2E/Image/Kind/Health 全部 SKIPPED | EXPECTED FAILURE；只归档 01–05 markers 和 intentional-failure；无容器/集群残留 |
| 2026-08-27 | CI-02 Jenkins Build #5 | Poll SCM 检测普通 push `99fd2b8 → 800859e` 后自动排队，Cause=`Started by an SCM change` | 12/12 stages；107 项规则/单元、API 16/16、E2E 3/3；SHA 镜像；Kind/Health | SUCCESS；29 个 Artifact；Git revision=`800859e`；非人工触发；临时资源清理 PASS |
| 2026-08-27 | CI-02 Jenkins Build #7 | Poll SCM 检测 rebase 后 push 并自动执行正式 migration 流水线，检出 `237f780` | 106 requirements + backend 7 + frontend 3；安全守卫允许隔离 `video_player_ci_test`；migration `20260826000000_init`；API 16/16；E2E 3/3；SHA 镜像；Kind/Health | SUCCESS；12/12 markers；27 个 Artifact；Pod 0 restart；临时 MySQL/Kind 清理 PASS；共享远端数据库/MinIO 未使用 |
| 2026-08-27 | BUG-BASE01-UC02-01 搜索无结果 | 移除长关键词的二元片段召回，并拒绝没有文本相关性的个性化候选；保留现有前端无结果提示 | 干净 `npm ci`；`npm --workspace backend run prisma:generate`；`npm run build:backend`；`npm run test:ci`；定点搜索/视频测试；CRLF 感知 diff check | PASS；requirements 107/107、backend Jest 7/7、frontend Vitest 3/3；前后端 lint/build PASS；定点测试 13/13 |

## 4. 阻塞与需组长决定

- [ ] 提供或指定教师确认回复的截图/链接，补入证据索引。
- [ ] 决定是否允许在当前共享远端 MySQL/MinIO 上执行会写数据的 UC smoke；默认不写。
- [x] 当前 Mac 已配置 Colima、Docker CLI、Kind 和 kubectl，并完成 Compose/Kubernetes 本地验收。
- [x] PR #24 已合并到 `main`；远端功能分支已清理。
- [ ] 仓库 owner 处理 GitHub Billing & plans 的付款失败或 Actions spending limit，之后重新运行 workflow。
