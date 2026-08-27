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
- [x] `BASE-01` 完成 UC01-UC06 单体全场景 smoke 并创建 `monolith-start`。
  - 完成内容：首次 Smoke 保留 5 个缺陷的失败证据；#37、#36、#33、#35、#38 依次合并修复后，在 `main@9a6f4d8` 和同一全新 MySQL、MinIO、Redis、SRS 隔离环境统一重跑 UC01–UC06，所有主成功与关键异常流程均为 `PASS`。
  - 测试/验证：干净 `npm ci`、Prisma generate、正式 migration；requirements 113/113、backend 16/16、frontend 22/22、API 16/16、public E2E 3/3；真实 MySQL 并发举报、MinIO 上传、SRS、headed Chrome HLS 503、Canvas+WebAudio MediaRecorder、WebM/MP4 回放；数据库/对象/Header/浏览器状态核对。
  - 结果：PASS；32 表，最终隔离数据 10 users / 16 videos / 6 assets / 2 reports / 6 objects；WebM 2.97MB、MP4 1.22MB，Chrome 两资源 readyState=4；浏览器、进程、容器、网络、volumes 和端口全部清理。`monolith-start` 在本证据提交合并后创建并固定指向最终 `main` 提交。
- [x] `BUG-BASE01-UC06-01` 保证同一用户对同一目标只有一条待处理举报。
  - 完成内容：相同 reporter/target 的重复请求返回已有 PENDING；nullable unique `pendingKey` 和 P2002 回读处理并发竞态；管理员处理时释放键，允许处理完成后再次举报；迁移保留最早待处理记录并审计性驳回历史重复项。
  - 测试/验证：干净 `npm ci`；requirements 109/109、后端 Jest 7/7、前端 Vitest 3/3、前后端 lint/build；空库执行初始 + pendingKey 两个 migration；含两条重复 PENDING 的旧库升级；真实后端 12 路并发举报、管理员处理释放键、处理后再次举报。
  - 结果：PASS；空库列/唯一索引和 2 个 migration 正确；旧库升级为 1 PENDING + 1 REJECTED；12 个并发响应仅 1 个 report ID，处理后新举报获得不同 ID；最终 BASE-01 统一复测 8 路并发再次通过，缺陷已关闭。
- [x] `BUG-BASE01-UC03-01` 拒绝伪装或不受支持的视频文件。
  - 完成内容：前端在选取及提交前校验扩展名/MIME；后端在写入 MinIO 和数据库前校验扩展名/MIME，并用 FFprobe 确认存在视频流；若 MinIO 上传后数据库写入失败，则精确删除本次对象。
  - 测试/验证：干净 `npm ci`；requirements 111/111、后端 Jest 16/16、前端 Vitest 11/11、前后端 lint/build；真实 MinIO/MySQL/API 伪装 MP4 与合法 MP4；Playwright Chrome 投稿页文件选择。
  - 结果：PASS；伪装 MP4 返回 400 且 VideoAsset/Video/MinIO 对象计数均不变；合法 1 秒 MP4 返回 201 并新增 1 Asset + 1 对象；浏览器选择 README 后 files=0，选择真实 MP4 后 files=1；最终 BASE-01 统一复测再次通过，缺陷已关闭。
- [x] `BUG-BASE01-UC05-01` 修复直播回放对象的媒体类型传递。
  - 完成内容：确认带 codecs 参数的 MediaRecorder WebM 经 multipart/Multer 会退化为 `text/plain`；前端改为使用容器级 `video/webm`/`.webm` 上传，后端只允许 `video/webm` 或 `video/mp4` 资产登记为回放。
  - 测试/验证：干净 `npm ci`；requirements 113/113、后端 Jest 16/16、前端 Vitest 18/18、前后端 lint/build；真实 Chrome Canvas+WebAudio MediaRecorder；SRS 健康与开始/结束直播；MinIO WebM/MP4 Header；Draft 稿件；浏览器 WebM/MP4 metadata。
  - 结果：PASS；真实 MediaRecorder 生成 1.96MB WebM，原始 Recording 与 MinIO Header 均为 `video/webm`；后台转码生成 862KB `video/mp4`；Session=ENDED、replayVideoId=15；Chrome 对两种资源 readyState=4、320×240；最终 BASE-01 统一复测以另一段 2.97MB WebM / 1.22MB MP4 再次通过，缺陷已关闭。
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
- [x] `CI-02-JUNIT` 生成并由 Jenkins 发布标准 JUnit XML。
  - 已完成配置：requirements 使用 Node 原生 JUnit reporter；前端、六个微服务和 Playwright 使用原生 JUnit reporter；后端 Jest 使用仓库内 reporter；Jenkins `post` 使用 `junit` 发布并继续通过 Artifact 保存 XML。
  - 本地验证：Build 9402 生成完整 11 份 XML，合计 186 tests、0 failures、0 errors；requirements 115、后端 16、前端 22、六微服务 14、API 16、Playwright 3，全部通过 `xmllint` 且没有 testcase 游离在 testsuite 外。Build 9305 在 Unit 后按预期退出 42，并保留 9 份 Unit XML、合计 167 tests。Jenkins 2.568.2 在线语法校验 PASS，JUnit 插件 `1424.vc64a_edde7777` 已启用。
  - 真实 Jenkins：Build #9 完整 SUCCESS，Test Result 为 186 passed/0 failed/0 skipped、11 XML、12/12 markers、39 Artifacts，镜像、Kind、单体与五微服务健康检查 PASS；Build #10 在 Unit 后按预期退出 42，Test Result 为 167 passed、9 XML、5 markers，后续 7 阶段全部 SKIPPED，无 MySQL/Kind 资源。
  - 结果：PASS；成功与失败 Build 均显示 Jenkins Test Result，XML 同时进入 Artifact。Build #9 的 Docker npm 安装经历多次 `ECONNRESET` 后由既有重试恢复，未掩盖网络失败过程。
- [x] `ARCH-01` 冻结四服务接口和 31 张表的数据归属。
  - 完成内容：组长确认 2026-08-27 评审会已完成且全员同意默认方案；冻结四服务职责/非职责、31/31 Model 唯一 owner、公开/内部接口、跨服务 timeout/幂等/降级、迁移/回滚顺序、七项开放决策、A-E 分工与交叉 Review。
  - 测试/验证：Model 名单与 `backend/prisma/schema.prisma` 自动比对；31 个现有 Model 无遗漏、无重复 owner；七项决策、五条执行线、分支命名、Reviewer 和 Gate 文档一致性检查；应用测试 `NOT RUN`（纯文档/架构冻结，无运行时代码变更）。
  - 结果：PASS；状态更新为 `DONE / FROZEN`。默认方案为 DynamicPost 归 identity、VideoAi 归 content 但首批不切写、币账本归 live、服务账号 JWT + K8s Secret、停写窗口 + 可重复迁移、直播消息 7 天/每 Session 10,000 条。真实姓名、个人备份人和会议原始截图仍由组长补入管理证据。
- [x] `MS-00` 建立统一微服务公共脚手架。
  - 完成内容：新增 shared-contracts、identity/content/live/governance 四个独立空服务和 monolith-first Gateway；统一 health/live、health/ready、version、API response、requestId、结构化日志、服务账号 HS256 JWT/Guard；接入 npm workspaces、Docker/Compose、K8s、Jenkins 和 Kind。
  - 测试/验证：完整 `npm run test:ci`；MS-00 lint/build；7 个 Vitest 文件 14/14；五个约 80MB 镜像；Compose 五容器 healthy 与 15 个 HTTP contract；四个业务路由 404；隔离 Kind 两次连续部署；五 Deployment 1/1 Ready、0 restart、15 个容器内 HTTP contract；环境清理。
  - 结果：PASS；PR #41 完成 Owner 自审记录并 squash 合并到 `main@9181e2c9655b3f0b751a0544e95b8ec77dfd5737`。首次并行 Docker build 遇到 `ECONNRESET`，复用单体 npm retry 并限制 workspace 安装后重跑 PASS；首次重复 K8s apply 因 `kubectl set env` 与 manifest `valueFrom` 冲突，改用 ConfigMap patch 后连续两次部署 PASS。
- [x] `MS-01` 完成 identity-community 第一批 foundation。
  - 完成内容：以 Prisma runtime 持久化账号、资料、关系、通知、私信和动态社区；独立 `IDENTITY_DATABASE_URL`/账号/Secret；保留 `phone`、移除 identity 对 `coinBalance` 的事实所有权；持久化 session nonce；notification requestId 数据库唯一约束与跨实例冲突检测；安全 migration/seed/reset、Docker migration/runtime 镜像、Compose/K8s 配置和单体 fallback/rollback 文档。
  - 测试/验证：clean `npm ci`；完整 `npm run test:ci`；identity 5/5 contract；隔离 MySQL migration 首次/重复、seed、test-reset、非 test reset 拒绝；真实重启与双实例 notification 1/1；Compose 全镜像 build、migration、五服务 health/version、identity 重启后登录和数据库最小权限；Shell/Compose/Kustomize 静态检查。
  - 结果：PASS；本地 CI 171 项（requirements 115、backend 16、frontend 22、services 18）；identity 数据库 11 业务表 + 1 migration 表；同 requestId 双实例并发只生成 1 条记录，冲突载荷 409；Compose identity 重启后账号仍可登录；账号不可访问单体 `video_player` schema。第一次 Docker generate 因缺 OpenSSL + `ECONNRESET` 失败，补 OpenSSL/有限重试后恢复；第二次 Compose 被 migration 目标守卫拒绝，增加精确目标授权后完整复跑 PASS。Kind 实际 rollout `NOT RUN`，本 PR 仅对新增 K8s Secret/Job/部署脚本完成渲染与语法检查。
- [ ] `MS-02..04` 提取其余三个业务微服务并独立构建、测试和部署。
  - 已确认分工：组长本人承担 A，负责 MS-00/K8S-01；B 已完成 MS-01 identity-community；C 负责 MS-02 content-media，D 负责 MS-03 live-reward，E 负责 MS-04 governance-ai 并协调 REG-01。
  - 执行顺序：ARCH-01 文档 → MS-00 公共骨架 → 四服务 foundation 并行 → 只读路由 → 写流量切换 → REG-01；首批不得删除单体表或提前切换写流量。
  - 执行清单：`docs/practice-2026/12-second-stage-todo.md`；MS-00/MS-01/MS-02 foundation 已完成，D/E 继续各自 foundation 和集成验收；未验证项保持未勾选。
- [ ] `MS-03` live-reward foundation 与 UC05 直播/礼物边界实现。
  - 当前分支：`feature/MS-03-live-reward`；基于 `origin/main@b166de4` 创建。
  - 已完成源码：独立 Prisma schema/migration/fixture、数据库/内存存储适配器、房间/Session 持久化生命周期、观众事件、消息留存上限、SRS timeout/probe/RTC adapter、回放登记状态机、币账本幂等入口和 live-reward HTTP contract；补充了 MIME/扩展名一致性、回放最终失败边界、SRS 恢复和内部 JWT contract。
  - 尚未完成：真实 content-media 回放联调、MinIO Header 交叉验证、Gateway 切流、K8s 独立部署、单体数据迁移和完整 UC05 浏览器回归；这些保持 `NOT RUN`，不提前勾选第二阶段总 Gate。
  - 测试/验证：`npm ci --ignore-scripts`；`npm run test:ci`（requirements 113/113、backend 16/16、frontend 22/22、services 全部 PASS）；`npm --workspace @videoplayer/live-reward run prisma:generate`；`npm --workspace @videoplayer/live-reward run build`；`npm --workspace @videoplayer/live-reward run lint`；`npm --workspace @videoplayer/live-reward run test`（2 files / 13 tests PASS，覆盖 HTTP 生命周期、SRS/content adapter、JWT、回放重试、消息上限）；Prisma schema validation 使用 dummy `LIVE_REWARD_DATABASE_URL`；隔离 MySQL 首次/重复 migration、seed、应用关闭/重建恢复 PASS；仓库 SRS 5.0.213 API probe/开播 PASS；Docker build 与临时容器 `/health/live`、`/health/ready`、`/version` 均 PASS。
  - 兼容性：live-reward 可从 Gateway 透传的单体 `mock-token` 提取外部 userId，仍不访问 identity 数据库；生产写流量切换未执行。
  - 重启恢复边界：persistent store 查询 Session、活动观众事件和消息时以数据库为事实来源；内存仅缓存连接集合，未配置数据库时明确为本地测试模式。
  - 集成修正：Gateway 在 services 模式下将 `/api/v1/videos/:id/coin` 路由到 live-reward；同时提供受服务 JWT scope 保护的内部投币入口，避免 content-media 直接写账本。
  - 提交：`e49e945` foundation、`c533093` ledger Gateway boundary、`1c677a2` auth compatibility、`本提交` viewer restart boundary。
  - 结果：PARTIAL；可继续在该分支开发，待 A review SRS/K8s/持久化/回放/账本故障证据后再更新复选框。
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
| CI-02-JUNIT 标准测试报告 | DONE | requirements/Jest/Vitest/API/Playwright 生成 11 份 JUnit XML；Jenkins `junit` 发布；reporter 单测 | Build #9 SUCCESS：186 passed/11 XML；#10 EXPECTED FAILURE：167 passed/9 XML、后续 7 阶段 skipped | PASS；Test Result、Artifact、完整流水线和失败阻断均验证 | 本轮提交 |
| ARCH-01 服务/数据冻结 | DONE | 4 服务、31 表唯一 owner、接口、失败策略、七项默认决策、迁移/回滚、A-E 分工与 Review | Prisma Model 自动比对；唯一 owner；决策/分工/分支/Reviewer 文档一致性 | PASS；TEAM APPROVED；真实姓名/外部会议截图待补证据索引 | 本提交 |
| MS-00 微服务公共脚手架 | DONE | shared contracts/JWT、四服务 health/version、Gateway fallback、workspace、Docker/Compose、K8s/Jenkins/Kind | `npm run test:ci`；MS-00 14/14；Compose 5 healthy；Kind 重复部署 5/5 Ready、0 restart；Owner 自审记录 | PASS；PR #41 squash merged，`main@9181e2c` | PR #41 + 本提交 |
| MS-01 identity-community foundation | DONE | Prisma runtime、11 个 owner model、独立 DB/账号/Secret、内部 API、requestId 幂等、Docker migration/runtime、Compose/K8s 配置 | clean `npm ci`；`npm run test:ci` 171；identity 5+1；MySQL 首次/重复 migration、seed/reset/拒绝；Compose build/up/restart/health/权限 | PASS；11 业务表 + 1 migration 表；跨实例通知幂等；Compose 五服务 healthy；Kind rollout NOT RUN（静态 PASS） | PR #45 + 本提交 |
| MS-02 content-media foundation | VERIFY | package-local Prisma Client、content schema/migration/fixture、兼容只读 API、JWT 内部 contract、review/replay 幂等、真实 MySQL/MinIO 媒体补偿、独立 DB 账号、Compose/K8s migration | clean `npm ci`；`npm run test:ci`；content 17/17；`verify:container`；`verify:minio`；Compose 5 healthy/15 HTTP；隔离 Kind 5/5 Ready、0 restart/15 HTTP | PASS；首次单体 FFprobe 冷启动超时后定点 9/9 与全量复跑通过；Prisma 下载两次 `ECONNRESET` 由有限重试恢复；PR #43 FINAL REVIEW PENDING | 本轮提交 |
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
| 2026-08-27 | BUG-BASE01-UC06-01 举报幂等 | rebase 最新 main，新增 nullable unique `pendingKey`、重复 PENDING 清理 migration、P2002 竞态回读和处理后释放键 | 干净 `npm ci`；`npm run test:ci`；空库 migration；含重复记录的旧库升级；真实后端 12 路并发 API；管理员 KEEP 后再次举报；diff/Secret/Artifact 审计 | PASS；requirements 109/109、backend 7/7、frontend 3/3；2 migrations；旧库 1 PENDING + 1 REJECTED；并发 12→1 ID；处理后新 ID；首次管理员登录误用临时 Secret 导致 401，改用项目演示密钥 `123456` 后复跑 PASS |
| 2026-08-27 | BUG-BASE01-UC03-01 无效媒体拒绝 | rebase 最新 main，合并搜索测试 mock；前后端扩展名/MIME 校验，后端 FFprobe 视频流校验，写入失败精确删除对象 | 干净 `npm ci`；`npm run test:ci`；真实 MinIO/MySQL/API 伪装与合法 MP4；Playwright CLI headed 浏览器投稿页；输入 files 长度；console 审计；环境清理 | PASS；requirements 111/111、backend 16/16、frontend 11/11；伪装 MP4 400 且 0 残留；合法 MP4 201 且 Asset/Object +1；浏览器无效 files=0、合法 files=1；仅 favicon.ico 404；冷镜像 runtime npm 下载长时间无输出后主动中止，改用同代码本地 build + 真实依赖容器完成验证 |
| 2026-08-27 | BUG-BASE01-UC05-01 录播媒体类型 | rebase 最新 main；用容器级 MIME 创建回放文件；后端只登记 WebM/MP4；真实 Chrome 开播、MediaRecorder、结束、保存稿件、MinIO Header、异步转码和浏览器播放 | 干净 `npm ci`；`npm run test:ci`；SRS API；Playwright CLI headed Canvas+WebAudio 媒体源；真实 MinIO/MySQL；Session/Draft/Asset 查询；WebM/MP4 loadedmetadata；环境清理 | PASS；requirements 113/113、backend 16/16、frontend 18/18；WebM 1.96MB、Header video/webm；MP4 862KB、Header video/mp4；Session ENDED/replayVideoId=15；两资源 readyState=4、320×240；验证脚本先误用不存在的 `originalAssetId` 和错误字段 `contentType`/playUrl 相等假设，改按 uploadToken、mimeType 与异步转码设计复跑 PASS |
| 2026-08-27 | BUG-BASE01-UC02-02 媒体失败可解释状态 | 为详情页媒体元素接入失败、恢复与重试状态；显示可访问的播放失败覆盖层并保留其余详情内容；补状态转换单测 | 干净 `npm ci`；Prisma Client generate；`npm run test:ci`；独立 MySQL/Redis/MinIO/SRS；Playwright CLI headed Chrome；媒体请求 503 路由；重试请求计数；截图视觉检查；环境清理 | PASS；requirements 113/113、backend 16/16、frontend 22/22；lint/build PASS；首次媒体请求 503 后 `role=alert` 可见；点击重试后媒体请求数 1→2 且 503 状态再次可解释；标题、简介、评论和相关推荐可用；首次 Vitest 命令误带 Jest 的 `--runInBand`，首次全量门禁又缺 Prisma Client，纠正前置步骤后标准命令复跑 PASS |
| 2026-08-27 | BASE-01 最终统一复测 | fast-forward 到 `main@9a6f4d8`；在同一全新 Compose 隔离环境连续重跑 UC01–UC06；核对 migration、API、浏览器、数据库、MinIO、SRS、转码与回放；完成后销毁环境 | 干净 `npm ci`；Prisma generate；`npm run test:ci`；`npm run test:api`；`npm run test:e2e`；真实 API 并发/上传；Playwright CLI headed HLS 503 与 Canvas+WebAudio MediaRecorder；MinIO HEAD；Chrome metadata | PASS；requirements 113/113、backend 16/16、frontend 22/22、API 16/16、E2E 3/3；UC01–UC06 全绿；WebM 2.97MB、MP4 1.22MB、两资源 readyState=4；首次全量门禁的 FFprobe 用例冷启动超时，定点 9/9 与完整门禁复跑 PASS；API 验证先误用重新登录前 token 导致预期 401，又遗漏脚本 DATABASE_URL，修正后全量复跑 PASS；浏览器/进程/容器/volumes/端口清理 PASS |
| 2026-08-27 | ARCH-01 评审冻结与第二阶段分工 | 依据组长确认记录全员评审通过；将边界草案更新为冻结版；固化七项默认决策、A-E 主责、分支、Reviewer、依赖和合并顺序 | 31 Model 唯一 owner；七项决策完整性；五条执行线和 Review 映射；Markdown/diff/Secret/Artifact 检查；应用测试 NOT RUN（纯文档） | PASS；ARCH-01 `DONE / FROZEN`；A→MS-00、B→MS-01、C→MS-02、D→MS-03、E→MS-04/REG-01；实名、个人备份人和会议原始截图待组长补录 |
| 2026-08-27 | 第二阶段 TODO 与 A 角色确认 | 新增 A-E 分支领取、foundation、禁止事项、Review、统一 DoD、只读/写流量切换和管理证据清单；同步记录组长本人承担 A | TODO 章节/角色/分支/owner/Reviewer/依赖/未完成状态一致性；Markdown/diff/Secret/Artifact 检查；应用测试 NOT RUN（纯文档） | READY；组长/A 先完成 MS-00，B/C/D/E 在 MS-00 合并后创建各自 foundation；所有实现复选框保持未完成，实名和个人备份人仍待补录 |
| 2026-08-27 | MS-00 公共微服务脚手架 | 新增 shared runtime/contracts/JWT Guard、四业务空服务、monolith-first Gateway、workspace gate、五镜像 Compose、K8s 资源、Jenkins 构建/部署/health 接入和执行文档 | `npm run test:services:ci`；完整 `npm run test:ci`；Compose build/up/HTTP；隔离 Kind create/deploy/redeploy/health；shell/compose/kustomize；cleanup；Owner 自审 | PASS；requirements 113/113、backend 16/16、frontend 22/22、MS-00 14/14；Compose 5 healthy；Kind 5 Deployment 1/1、0 restart；首次 Docker `ECONNRESET` 和 K8s env apply 冲突均修复并复跑；PR #41 squash merged，`main@9181e2c` |
| 2026-08-27 | MS-02 content-media foundation | 在 `feature/MS-02-content-media` 建立独立 schema/fixture、Prisma repository、兼容只读 API、JWT 内部 contract、identity mock/fallback、review/replay 幂等和媒体边界；不切写流量、不迁移 VideoAi、不删除单体表 | content lint/build/test 17/17；独立 MySQL migration/fixture/restart；Docker image/health/version/ffprobe；临时 MinIO 对象补偿 | PASS；API/幂等/分类 FK/持久化/容器与 MinIO 验证通过；Owner 复审后仍需补默认 Client、Compose/K8s DB 接线和最终证据 |
| 2026-08-28 | CI-02-JUNIT 标准报告闭环 | 为 requirements、Jest、Vitest、六微服务、API 和 Playwright 生成标准 JUnit XML；Jenkins `post` 发布；补 reporter 单测；执行成功/失败 Build | 本地 Build 9402/9305；Jenkins #9/#10；11/9 XML；Test Result API；`xmllint`；Stage/Artifact/cleanup | PASS；#9 186 passed、12/12、39 Artifacts、完整 Kind/health；#10 exit 42、167 passed、5 markers、后续 7 阶段 skipped；npm `ECONNRESET` 经重试恢复；无资源残留 |

| 2026-08-28 | MS-01 identity-community foundation 收口 | rebase 最新 main 并重建合规历史；将运行时从内存 Map 接入 Prisma；独立 DB/账号/Secret；修正 coin/phone/session owner；补真实 MySQL 重启/双实例测试、Docker migration/runtime、Compose/K8s 和完整文档 | clean `npm ci`；`npm run test:ci` 171；identity contract 5/5 + integration 1/1；migration 首次/重复；seed/reset/拒绝；Compose 全镜像、迁移、五服务 health/version、identity restart、schema isolation；Shell/Compose/Kustomize | PASS；三轮失败过程保留并修复：npm lock `ECONNRESET`、Docker OpenSSL/engine、Compose migration guard；最终本地 CI、MySQL 与 Compose 全绿；Kind rollout NOT RUN，新增 YAML/脚本静态 PASS |
| 2026-08-28 | MS-02 PR #43 Owner 修复与复测 | 在新普通 commit 中修复独立 Prisma Client、默认 Compose/K8s content DB/migration、容器 OpenSSL/重试、真实 MySQL+MinIO 补偿链、文档与 UC 追溯；不切 Gateway 业务流量 | clean install/full CI；真实 MySQL 首次/重复 migration+fixture；review/replay 冲突；服务重启；容器 ffprobe；真实 MinIO+DB；Compose；隔离 Kind；Secret/Artifact/diff | PASS；requirements 115/115、backend 16/16、frontend 22/22、content 17/17；MySQL+MinIO fake=400/valid=201/db-failure=500；Compose/Kind 5/5 healthy/Ready、0 restart；隔离资源全部清理；等待 PR #43 复审 |
| 2026-08-27 | MS-03 live-reward foundation | 在 `feature/MS-03-live-reward` 增加独立 live/reward Prisma 边界、可重启持久化接口、SRS timeout、回放 retry 状态和幂等账本 HTTP contract；保留单体 fallback 与跨服务外部 ID 边界 | `npm ci --ignore-scripts`；`npm run test:ci`；`npm --workspace @videoplayer/live-reward run prisma:generate/build/lint/test`；Prisma validate（dummy URL）；Docker build | PARTIAL；完整仓库 113/113、16/16、22/22 与 services 全部 PASS；live-reward 2 files / 5 tests PASS；Docker build BLOCKED（daemon 未运行）；真实 migration/SRS/content/Gateway/K8s/UC05 浏览器回归待后续证据 |
| 2026-08-27 | MS-03 ledger Gateway boundary | 修正 services 模式下视频投币路由，使 `/api/v1/videos/:id/coin` 与 live-reward 账本一致；补内部 JWT scope 入口与路由单测 | `npm --workspace @videoplayer/gateway run test`（3/3）；`npm --workspace @videoplayer/gateway run build`；`npm --workspace @videoplayer/gateway run lint`；live-reward 4/4 | PASS；未切 Gateway 生产写流量，真实跨服务 JWT/数据库联调 NOT RUN |
| 2026-08-27 | MS-03 Gateway auth compatibility | live-reward 接受现有 `Bearer mock-token-<id>-...` 外部 userId 格式；补 HTTP 创建房间 contract test，保持 identity 数据库隔离 | `npm --workspace @videoplayer/live-reward run test`（2 files / 5 tests）；`npm --workspace @videoplayer/live-reward run build`；`npm --workspace @videoplayer/live-reward run lint` | PASS；生产 Gateway 写流量、nonce 跨服务校验和真实 identity 联调 NOT RUN |
| 2026-08-27 | MS-03 viewer restart boundary | persistent store 新增活动观众重放查询；服务重启后 viewer count 不依赖旧进程内 Map，消息清理保持 7 天/10,000 条规则 | `npm --workspace @videoplayer/live-reward run test`（2 files / 5 tests）；`npm --workspace @videoplayer/live-reward run build`；`npm --workspace @videoplayer/live-reward run lint` | PASS；真实 MySQL 重启恢复与多副本并发 NOT RUN；本提交 |
| 2026-08-27 | MS-03 failure/replay contract hardening | 补充 WebM/MP4 文件名与 MIME 匹配、回放 `FAILED_RETRYABLE/FAILED_FINAL` 重试边界、SRS 恢复/超时、content replay JWT、内部投币 scope、完整房间/Session HTTP 生命周期和 10,000 条普通消息上限验证；修复 MemoryStore 消息修剪性能与持久化唯一键竞态回读 | `npm --workspace @videoplayer/live-reward run test`（2 files / 13 tests）；`npm --workspace @videoplayer/live-reward run build`；`npm --workspace @videoplayer/live-reward run lint`；`npm run test:ci`；`npx prisma validate --schema services/live-reward/prisma/schema.prisma`；`docker build -f services/live-reward/Dockerfile -t videoplayer-live-reward:test .`；临时容器 health/live/ready/version | PASS；真实 MySQL/MinIO/SRS/content-media/K8s、Gateway 生产切流和 UC05 浏览器回归仍 `NOT RUN` |
| 2026-08-27 | MS-03 isolated runtime verification | 使用隔离 MySQL 运行 live-reward 初始/重复 migration、seed，并关闭后重建应用验证房间、Session、观众、消息和余额；启动仓库 SRS 5.0.213 验证 API probe 与开播；构建服务镜像并验证容器 health/version | `npm --workspace @videoplayer/live-reward run db:migrate`（首次/重复）；`npm --workspace @videoplayer/live-reward run db:seed`；Node PrismaStore restart script；SRS `/api/v1/versions`；live-reward `/health/live`、`/health/ready`、`/version` | PASS；临时 MySQL/SRS 容器已清理；content-media 回放、MinIO Header、Gateway 生产切流、K8s 和 UC05 浏览器完整回归仍 `NOT RUN` |
| 2026-08-27 | MS-03 Gateway rollback 与独立 K8s 验证 | 补 services/monolith 两种模式下 live/赠币/视频投币写路由切换、显式回滚和失败写不重放测试；增加 live-reward 独立 Namespace、MySQL PVC、migration Job、Secret/ConfigMap 注入、探针/资源限制和 Kind smoke 脚本 | Gateway test 5/5、lint/build；`bash -n scripts/k8s-live-reward-smoke.sh`；K8s client dry-run；真实 Kind 部署、migration、写入、应用 Pod 删除重建、health/live/ready/version、PVC 持久化 | PASS；Pod 重建后房间/观众数/钱包余额保持，测试 Namespace 已清理；本地配置级切换/回滚不等于生产切流；content-media 真实回放、MinIO Header 交叉验证和完整 UC05 浏览器回归仍 `BLOCKED/NOT RUN` |

## 4. 阻塞与需组长决定

- [ ] 提供或指定教师确认回复的截图/链接，补入证据索引。
- [ ] 补录 ARCH-01 参会者真实姓名、个人备份人和会议签到/聊天/录屏等原始证据；当前技术冻结依据为组长书面确认全员同意默认方案。
- [x] 最终 UC smoke 使用全新隔离 MySQL/MinIO volumes 完成，不需要也未获得共享远端写入权限。
- [x] 当前 Mac 已配置 Colima、Docker CLI、Kind 和 kubectl，并完成 Compose/Kubernetes 本地验收。
- [x] PR #24 已合并到 `main`；远端功能分支已清理。
- [ ] 仓库 owner 处理 GitHub Billing & plans 的付款失败或 Actions spending limit，之后重新运行 workflow。
