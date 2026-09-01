# DEL-01 最终交付检查表

> 状态：`TECHNICAL PACKAGE READY / HUMAN EVIDENCE PENDING`。
>
> 规则：只有真实文件、可重跑命令、远端 run 或成员本人确认才能勾选。仓库自动化不能代替教师回复、成员签名或实际录屏。

## 1. 仓库可自主完成项

- [x] 建立 `delivery/01_source`–`delivery/06_defense` 六目录和总 README。
- [x] `01_source` 索引公开仓库、单体 tag、四微服务版本、已合并 PR #40–#65/#67 和远端 workflow；未合并 #66 显式排除。
- [x] `01_source` 另有机器可读仓库清单和完整 Manifest：27 个 merged PR 的 head/merge SHA、最终主干 run，以及 `monolith-start` 到 `main@6d1ad50` 的 80 个 commit TSV 和 SHA-256。
- [x] `02_docs` 索引需求、UC01–UC06、三层模型、服务边界、测试计划和追溯。
- [x] `02_docs` 提供 7 份 PDF / 99 页，并同时保留可编辑 Markdown/Mermaid 源；Poppler 全页渲染、边界和视觉 QA PASS。
- [x] `03_devops` 直接保存 Docker/Compose、Kubernetes/Kustomize、migration、CI/CD、部署/回滚实体文件，并提供来源 Manifest 和 SHA-256；不再依赖仓库外索引。
- [x] `04_tests` 直接保存单元/API/E2E/REG 测试源码、运行配置、HPA/故障/性能脚本和实验 CSV；不再依赖仓库外索引。
- [x] `04_tests` 固定最终成功 run 的三个完整 job log、Playwright HTML、Kind 原始文件、实验 CSV、run/artifact JSON 和 SHA-256。
- [x] `05_management` 索引任务板、站会、决策和贡献权重模板，并显式标记未确认项。
- [x] `06_defense` 包含最终 PPTX、技术总结、演示脚本和备用录屏拍摄清单。
- [x] UC01–UC05 三层 Mermaid 模型和 UC06 状态模型均有版本化源文件。
- [x] 最终答辩 PPTX 已渲染 10 页，逐页视觉检查且 `slides_test.py` 无越界。
- [x] README 与六目录链接由自动测试检查；PPTX 具有有效 ZIP/PPT 结构。
- [x] 技术变更完成本地 `npm run test:ci`：283/283 PASS。
- [x] 根 README 写明环境版本、全部端口/健康地址、课程测试账号和 Seed 6 users / 14 videos / 11 published。
- [x] DEL-01 PR #58 首轮远端 run `33371629258` 3/3 jobs，并实检 public E2E/Kind 两个 Artifact。
- [x] PR #58 最终 head 通过 run `33372482927` 的远端 3/3 jobs、Owner 书面自审，并合并为 `main@993d699`。

PR #58 的仓库技术 Gate 已关闭；以下真人或外部系统证据仍是 DEL-01 总 Gate 的必要条件。

## 2. 必须由真人或外部系统补交

- [x] 用户提供五名成员/学号表，并授权默认映射 A/林明、B/刘钟屹、C/李晓萌、D/张壮志、E/王一涵；映射来源与边界已版本化。
- [x] 项目管理平台核心地址已提供并验证可访问；飞书页面含 8.25–8.31 日期导航、8.31 技术进度和课程交付子页面入口。
- [ ] 导出并保存每日实名站会简报、看板/统计截图原件；当前公开视图只能证明日期索引和 8.31 可见条目。
- [ ] 教师/助教对 UC01–UC06 与四服务范围的回复截图或可访问链接。
- [ ] ARCH-01 会议的真实参会者名册、个人备份人，以及签到/聊天/录屏原件。
- [ ] 一名非作者成员在另一台或清洁环境按 README 完成复现，并填写姓名、环境、commit、日期和结果。
- [ ] 五名成员确认贡献内容与权重；权重合计 100%。
- [ ] 五名成员在贡献确认表签字并填写日期。
- [ ] 录制并上传 5–8 分钟备用演示视频，检查音画、敏感信息遮挡和可访问权限。
- [ ] 全员按最终演示脚本完成至少一次计时演练并记录异常/备用方案。

模板和拍摄清单分别位于 [`delivery/05_management/contribution-weight-confirmation.md`](../../delivery/05_management/contribution-weight-confirmation.md) 与 [`delivery/06_defense/backup-recording-shot-list.md`](../../delivery/06_defense/backup-recording-shot-list.md)。

## 3. DEL-01 关闭判定

当且仅当第 1 节全部有当前 `main` 和远端 CI 证据，第 2 节全部由真实人员填写并附原始文件后，才可同时执行：

1. 把 [`00-progress.md`](00-progress.md) 中 `DEL-01` 改为 `[x]`。
2. 把 [`04-task-board.md`](04-task-board.md) 中 DEL-01 状态改为 `DONE`。
3. 在 [`06-evidence-and-dod.md`](06-evidence-and-dod.md) 记录复现人、签名材料、录屏路径和最终 Reviewer。
4. 对最终交付目录做一次权限、链接、敏感信息和可播放性检查。

在这些条件满足前，技术包可以合并，但 DEL-01 Gate 必须保持 `HUMAN EVIDENCE PENDING`。
