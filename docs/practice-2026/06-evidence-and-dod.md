# 证据索引、追溯与统一 Definition of Done

> 最后技术复核：2026-08-31。
>
> 原则：只有可访问的 commit/PR/workflow、版本化源文件、可重跑命令、原始报告或真人原件才是证据。计划、模板、口头说明和截图不能单独证明 Gate 完成。

## 1. 最终交付映射

| 课程目录 | 本组内容 | 主负责人 | 当前状态 |
| --- | --- | --- | --- |
| [`01_source`](../../delivery/01_source/README.md) | 仓库、单体 tag、微服务版本、PR 与 workflow | A + 全员 | 技术索引完成 |
| [`02_docs`](../../delivery/02_docs/README.md) | 需求、用例、三层模型、设计、测试计划/报告与追溯 | E + owner | 技术索引完成 |
| [`03_devops`](../../delivery/03_devops/README.md) | Docker、CI/CD、K8s、migration、部署与回滚 | A + C/D | 技术索引完成 |
| [`04_tests`](../../delivery/04_tests/README.md) | Unit/API/E2E/REG、HPA、故障、性能与 Artifact | E + owner | 技术索引完成 |
| [`05_management`](../../delivery/05_management/README.md) | 任务板、简报、决策、贡献和权重确认 | 组长 + E | 模板完成；真人原件待补 |
| [`06_defense`](../../delivery/06_defense/README.md) | PPT、技术总结、5–8 分钟备用录屏、演示脚本 | E + 全员 | PPT/脚本完成；实际录屏待补 |

## 2. 证据命名与保存

建议外部原始证据使用：

```text
YYYYMMDD-任务ID-证据类型-简短说明.ext
```

例如：

```text
20260831-REG-01-dual-target-report.json
20260831-EXP-01-hpa-pod-timeline.csv
20260903-DEL-01-clean-machine-reproduction.pdf
20260903-DEL-01-contribution-signatures.pdf
```

生成的 JUnit、Playwright、Kind evidence、日志和性能 JSON 进入 CI Artifact 或课程受限空间；不把临时 `test-results/`、`coverage/`、日志和渲染 PNG 提交到 Git。若签字、会议或录屏不能公开，索引需记录受限位置、权限负责人和 SHA-256，不保存不可访问的个人本机路径。

## 3. 统一 DoD 最终审计

| DoD 条件 | 技术任务状态 | 证据 | DEL-01 备注 |
| --- | --- | --- | --- |
| 需求/UC 编号和验收条件明确 | PASS | [`01-use-case-scope.md`](01-use-case-scope.md) | 教师原始回复仍待补 |
| 代码、配置和文档在规范分支/PR | PASS | PR #48–#57；DEL-01 PR 合并后追加 | 当前分支不得直接写 main |
| Review 有书面记录 | PASS（技术 PR） | PR Owner 自审按治理例外留痕 | DEL-01 仍需非作者复现/全员确认 |
| 单元测试覆盖关键和异常分支 | PASS | `npm run test:ci`；各 workspace tests | DEL 包结构测试已纳入 requirements |
| 集成/API 覆盖数据库与外部依赖 | PASS | Compose、MySQL、MinIO、SRS、migration smoke | 外部付费 AI 不作为自动 Gate |
| 对应 E2E/Smoke 通过 | PASS | public E2E、Compose browser、REG-01 12/12 | 真人现场演练待补 |
| 失败阻断镜像或部署 | PASS | GitHub/Jenkins 成功与故意失败证据 | 远端 run 见下表 |
| 接口、数据归属和三层模型同步 | PASS | `08-service-boundaries...`、`10-uc06...`、`14-uc01-05...` | 模型源已版本化 |
| 镜像使用 Git SHA/版本 | PASS | GitHub `versioned-images`、Kind evidence | 不以 `latest` 为验收证据 |
| Kubernetes health/ready/version | PASS | 5/5 Ready、15 HTTP、0 restart | HPA 后实验资源已清理 |
| 日志/报告可访问且无 Secret | PASS（技术 PR） | workflow Artifact 与 Secret 扫描 | 录屏仍需真人敏感信息复查 |
| 看板附 PR/测试/文档证据 | PASS（技术任务） | [`04-task-board.md`](04-task-board.md)、本文件 | 外部看板截图待组长补 |
| README 由另一成员复现 | **PENDING** | [`delivery/05_management/README.md`](../../delivery/05_management/README.md) 模板 | 不能由本次作者自证 |
| 回滚/恢复有实现与实测 | PASS | 读写 cutover、monolith rollback、故障恢复 | 单体表保留 |
| 贡献权重与签字 | **PENDING** | [`contribution-weight-confirmation.md`](../../delivery/05_management/contribution-weight-confirmation.md) | 五名成员必须本人填写 |
| 5–8 分钟备用录屏 | **PENDING** | [`backup-recording-shot-list.md`](../../delivery/06_defense/backup-recording-shot-list.md) | 计划不等于录屏 |

因此，技术任务可分别为 `DONE`，但 DEL-01 总 Gate 在最后三项和教师/会议原件补齐前必须保持 `HUMAN EVIDENCE PENDING`。

## 4. 最终技术 PR 与远端 workflow 索引

| 日期 | 任务 | PR | GitHub-hosted run | 关键结果 |
| --- | --- | --- | --- | --- |
| 2026-08-31 | CI-01 | [#48](https://github.com/DanTargaryen/VideoPlayer/pull/48) | [33324914355](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33324914355) | 3/3 jobs；Git SHA 镜像、Kind、Artifacts、cleanup |
| 2026-08-31 | MS-DOD | [#49](https://github.com/DanTargaryen/VideoPlayer/pull/49) | [33328399081](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33328399081) | 四库、四 migration、五服务、Compose/Kind Gate |
| 2026-08-31 | MS-CUTOVER-READ | [#50](https://github.com/DanTargaryen/VideoPlayer/pull/50) | [33329693032](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33329693032) | identity/content 读、fallback、rollback |
| 2026-08-31 | MS-CUTOVER-IDENTITY | [#51](https://github.com/DanTargaryen/VideoPlayer/pull/51) | [33330723156](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33330723156) | 11 owner 表迁移、identity writes、rollback |
| 2026-08-31 | MS-CUTOVER-CONTENT-DATA | [#52](https://github.com/DanTargaryen/VideoPlayer/pull/52) | [33333121815](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33333121815) | 13 表双跑、全量比较与权限隔离 |
| 2026-08-31 | MS-CUTOVER-CONTENT-INTERACTIONS | [#53](https://github.com/DanTargaryen/VideoPlayer/pull/53) | [33337900513](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33337900513) | 互动、Receipt、Outbox、通知、rollback |
| 2026-08-31 | MS-CUTOVER-CONTENT-PUBLISHING | [#54](https://github.com/DanTargaryen/VideoPlayer/pull/54) | [33344821161](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33344821161) | MinIO 上传、投稿、审核历史、全写切流 |
| 2026-08-31 | MS-CUTOVER-LIVE-GOVERNANCE | [#55](https://github.com/DanTargaryen/VideoPlayer/pull/55) | [33352991611](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33352991611) | 双迁移、UC05/06、SSE 安全、rollback |
| 2026-08-31 | REG-01 | [#56](https://github.com/DanTargaryen/VideoPlayer/pull/56) | [33359785882](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33359785882) | 单体 6/6 + Gateway 6/6 |
| 2026-08-31 | EXP-01/02 + PERF-01 | [#57](https://github.com/DanTargaryen/VideoPlayer/pull/57) | [33367170484](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33367170484) | HPA、三故障恢复、1440 请求 0 error |
| 2026-08-31 | DEL-01 技术交付 | [#58](https://github.com/DanTargaryen/VideoPlayer/pull/58) | [33371629258](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33371629258) | 首轮 3/3 jobs；283/283、E2E 3/3 + 2 显式 skip、SHA 镜像、Kind、2 Artifacts、cleanup |

详细本地失败、修复、测试计数、环境和 cleanup 见 [`00-progress.md`](00-progress.md)。

## 5. UC01–UC06 最终追溯

| REQ / UC | 系统级模型 | 组件级模型 | 对象级模型 | 主要实现边界 | UNIT/Contract | INT/API/E2E | 双目标最新结果 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ01 / UC01 | `SYS-SEQ01` | `COMP-SEQ01` | `OBJ-SEQ01` | Gateway、identity auth/profile/follow | identity 5/5、Gateway 13/13 | Compose identity writes、REG UC01 | 单体 PASS / Gateway PASS |
| REQ02 / UC02 | `SYS-SEQ02` | `COMP-SEQ02` | `OBJ-SEQ02` | content recommend/search/detail/media/progress | content 34/34、Gateway 13/13 | MinIO/Range/播放、REG UC02 | 单体 PASS / Gateway PASS |
| REQ03 / UC03 | `SYS-SEQ03` | `COMP-SEQ03` | `OBJ-SEQ03` | content upload/submission + governance review | content 34/34、governance 29/29 | FFmpeg/MinIO/审核、REG UC03 | 单体 PASS / Gateway PASS |
| REQ04 / UC04 | `SYS-SEQ04` | `COMP-SEQ04` | `OBJ-SEQ04` | content interactions/Receipt/Outbox + identity notification | content 34/34、identity 5/5 | Compose browser/通知、REG UC04 | 单体 PASS / Gateway PASS |
| REQ05 / UC05 | `SYS-SEQ05` | `COMP-SEQ05` | `OBJ-SEQ05` | live room/session/message/ledger + content replay + SRS | live 18/18、Gateway 13/13 | Compose browser/API/restart、REG UC05 | 单体 PASS / Gateway PASS |
| REQ06 / UC06 | `SYS-STATE06` | `COMP-STATE06` | `OBJ-STATE06` | governance report/decision/compensation + content/identity | governance 29/29、content 34/34 | Compose admin/notice、REG UC06 | 单体 PASS / Gateway PASS |

UC01–UC05 模型源见 [`14-uc01-05-three-layer-models.md`](14-uc01-05-three-layer-models.md)，UC06 见 [`10-uc06-state-diagrams.md`](10-uc06-state-diagrams.md)。REG runner 和公开 endpoint 清单位于 [`test/regression`](../../test/regression)。

## 6. 工程实验追溯

| Task | 输入/环境 | 可重跑入口 | 关键原始值 | 结果 |
| --- | --- | --- | --- | --- |
| EXP-01 | Kind v1.36.1、官方 metrics-server、content HPA | `scripts/hpa-experiment.sh` | Ready `1→3→2→1`、CPU `104%→2%` | PASS |
| EXP-02 / MySQL | live DB 依赖停止/恢复 | `scripts/fault-experiment-probe.mjs` | readiness `503→200` | PASS |
| EXP-02 / SRS | 开播依赖停止/恢复 | 同上 | start `503→200`，Session ENDED | PASS |
| EXP-02 / MinIO | 上传依赖停止/恢复 | 同上 | upload `500→200` | PASS |
| PERF-01 | 同机/同数据/并发 16/各三轮 | `scripts/performance-compare.mjs` | p95 中位 `9.44/15.57 ms`；1440/1440 200 | PASS |

完整时间、官方校验和、每轮结果、失败过程和清理记录见 [`13-resilience-performance-experiments.md`](13-resilience-performance-experiments.md)。

## 7. 每日/最终证据检查

- [x] 技术 PR、workflow、测试、迁移、回滚和实验有版本化索引。
- [x] 生成产物进入 ignored 目录或 CI Artifact，不污染源码历史。
- [x] 当前交付文档没有写入真实 Secret、Token 或数据库口令。
- [x] DEL-01 PR #58 首轮远端 3/3 jobs 和两个 Artifact 已实检；最终证据提交仍需再次远端复跑后合并。
- [ ] 教师确认回复截图/链接已加入受限或公开索引。
- [ ] ARCH-01 参会/聊天/录屏原件和实名角色映射已加入索引。
- [ ] 非作者 clean-machine 复现已签名。
- [ ] 五人贡献权重合计 100%，签字和日期齐全。
- [ ] 5–8 分钟备用录屏已上传、无痕窗口可访问且 SHA-256 已登记。
- [ ] 全员计时演练记录已完成。

最终关闭步骤见 [`15-final-delivery-checklist.md`](15-final-delivery-checklist.md)。
