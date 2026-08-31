# DEL-01 最终交付检查表

> 状态：`TECHNICAL PACKAGE READY / HUMAN EVIDENCE PENDING`。
>
> 规则：只有真实文件、可重跑命令、远端 run 或成员本人确认才能勾选。仓库自动化不能代替教师回复、成员签名或实际录屏。

## 1. 仓库可自主完成项

- [x] 建立 `delivery/01_source`–`delivery/06_defense` 六目录和总 README。
- [x] `01_source` 索引单体 tag、四微服务版本、PR #48–#57 和远端 workflow。
- [x] `02_docs` 索引需求、UC01–UC06、三层模型、服务边界、测试计划和追溯。
- [x] `03_devops` 索引 Compose、Kubernetes、migration、CI/CD、回滚和 Secret 约束。
- [x] `04_tests` 索引单元/API/E2E、REG-01、HPA、故障与性能证据。
- [x] `05_management` 索引任务板、站会、决策和贡献权重模板，并显式标记未确认项。
- [x] `06_defense` 包含最终 PPTX、技术总结、演示脚本和备用录屏拍摄清单。
- [x] UC01–UC05 三层 Mermaid 模型和 UC06 状态模型均有版本化源文件。
- [x] 最终答辩 PPTX 已渲染 10 页，逐页视觉检查且 `slides_test.py` 无越界。
- [x] README 与六目录链接由自动测试检查；PPTX 具有有效 ZIP/PPT 结构。
- [x] 技术变更完成本地 `npm run test:ci`：283/283 PASS。
- [x] DEL-01 PR #58 首轮远端 run `33371629258` 3/3 jobs，并实检 public E2E/Kind 两个 Artifact。
- [ ] PR #58 最终证据提交通过当前 head 的远端 3/3 jobs、Owner 书面自审和合并复核。

最后一项只能在 PR #58 最终 head 的远端 run 成功并合并后改为 `[x]`；合并前若引用本文件，应以 PR 最新状态为准。

## 2. 必须由真人或外部系统补交

- [ ] 教师/助教对 UC01–UC06 与四服务范围的回复截图或可访问链接。
- [ ] ARCH-01 会议的真实参会者、成员与 A–E 角色映射、个人备份人，以及签到/聊天/录屏原件。
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
