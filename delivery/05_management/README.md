# 05_management：任务、决策、贡献与确认

## 已版本化的管理材料

- [任务板、角色、Reviewer 与合并顺序](../../docs/practice-2026/04-task-board.md)
- [启动会、实名分工和每日站会模板](../../docs/practice-2026/05-kickoff-and-standup.md)
- [服务边界冻结与决策日志](../../docs/practice-2026/08-service-boundaries-and-data-ownership.md)
- [第二阶段 A–E TODO、禁止事项和 Gate](../../docs/practice-2026/12-second-stage-todo.md)
- [Commit、PR、Review、push 和 merge 规范](../../docs/practice-2026/09-commit-pr-convention.md)
- [唯一执行进度源](../../docs/practice-2026/00-progress.md)
- [贡献与权重确认表](contribution-weight-confirmation.md)
- [A–E 组员默认映射与证据边界](member-role-mapping.md)

## 当前缺失的真人原始证据

| 证据 | 当前状态 | 必须由谁完成 |
| --- | --- | --- |
| 教师/助教范围确认回复 | `NOT PROVIDED` | 组长提供可访问截图或链接 |
| ARCH-01 参会/聊天/录屏 | `NOT PROVIDED` | 会议组织者导出原件 |
| 五人 A–E 角色实名映射 | `DEFAULT MAPPING RECORDED` | 用户提供成员表并授权按行顺序映射；见 `member-role-mapping.md` |
| 个人可用时间与备份人 | `NOT CONFIRMED` | 每名成员填写 |
| 另一成员 README 复现 | `NOT RUN / NOT SIGNED` | 非作者成员实际执行 |
| 贡献权重合计 100% | `NOT CONFIRMED` | 全员协商并填写 |
| 五人签字与日期 | `NOT PROVIDED` | 五名成员本人签署 |

A–E 默认姓名映射来自用户明确授权，不是从 Git commit 数量推断；但实际贡献、权重、个人签字、参会和可用时间仍不能从 PR 作者或聊天摘要自动生成。若课程平台不允许把签字公开提交，应把原件上传到受限课程空间，并在本目录记录文件名、访问负责人、权限和 SHA-256；不要把不可访问的个人本机路径当作证据。

## 非作者 clean-machine 复现记录模板

```text
复现人姓名：
是否为本次 DEL-01 PR 作者：否
机器/OS/架构：
Node / npm：
Docker / Compose：
Kind / kubectl：
检出 commit：
执行日期与时区：
npm ci：PASS / FAIL
npm run test:ci：PASS / FAIL
Compose Smoke：PASS / FAIL / NOT RUN
Kind Health：PASS / FAIL / NOT RUN
异常、修复和未执行原因：
证据文件/URL：
本人签名：
```

只有实际运行结果可填写 `PASS`。因机器资源、权限或网络未执行的项目应保留 `NOT RUN` 并说明原因。

## 权重讨论原则

1. 先列出每人实际完成的需求、实现、测试、文档、运维、Review 与问题处理证据。
2. 按难度、质量、责任与协作综合讨论，不用 commit 数量直接换算。
3. 五人权重必须合计 100%，每名成员确认自己的条目和总表。
4. 修改后重新让全员签字并更新日期；不覆盖旧版原件，保留版本号和变更原因。
