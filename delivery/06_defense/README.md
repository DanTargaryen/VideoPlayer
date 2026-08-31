# 06_defense：最终答辩与备用演示

## 交付物

| 文件 | 状态 | 用途 |
| --- | --- | --- |
| [`VideoPlayer-最终答辩.pptx`](VideoPlayer-最终答辩.pptx) | READY | 10 页最终答辩；每页含来源 Speaker Notes |
| [`technical-summary.md`](technical-summary.md) | READY | 范围、架构、证据、风险与结论 |
| [`demo-script.md`](demo-script.md) | READY | 约 7 分钟现场演示路线与 fallback |
| [`backup-recording-shot-list.md`](backup-recording-shot-list.md) | PLAN READY | 5–8 分钟录屏拍摄、检查与上传清单 |
| 备用录屏文件/链接 | `NOT RECORDED / NOT PROVIDED` | 必须由团队真人录制与上传 |

## PPT 自检证据

- 源内容由仓库数据生成，使用原生文本、形状和图表；没有把网页截图当作整页幻灯片。
- 10 页 PPTX 已重新渲染为 PNG 并检查 montage。
- 封面、架构、HPA、故障与性能关键页已按原始尺寸检查。
- `slides_test.py` 返回 `Test passed. No overflow detected.`。
- Speaker Notes 每页包含 `[Sources]`，指向仓库文档、脚本或官方 metrics-server 来源。
- 临时 PNG、layout JSON、montage 和构建日志位于 ignored `tmp/`，不进入交付包。

## 答辩前 30 分钟检查

1. 拉取并记录最终 `origin/main` SHA；不要在演示机临时改代码。
2. 打开 PPTX，确认中文字体、图表和 Speaker Notes 显示正常。
3. 使用隔离演示账号，预先准备已发布视频、待审稿件、直播房间和可举报内容。
4. 确认前端、Gateway、四服务、四数据库、MinIO 和 SRS health；保留 `monolith` 回滚配置。
5. 浏览器关闭私人标签、通知和密码自动填充；终端清空包含 Secret 的历史输出。
6. 现场网络不可用时，使用本地 Compose/Kind 和备用录屏，不现场重建大型镜像。
7. 计时演练一次；由一人讲解、一人操作、一人观察日志与计时，其余成员准备问答。

## 默认答辩分工

- A / 林明：开场、架构、平台、CI/K8s、HPA/性能和 rollback。
- B / 刘钟屹：UC01 身份与社区，以及 UC04 通知侧。
- C / 李晓萌：UC02/03/04 内容与媒体、MinIO、投稿发布和互动。
- D / 张壮志：UC05 直播、SRS、录播和币账本。
- E / 王一涵：UC06 治理、REG-01、证据追溯和 DEL-01 说明。

这是按用户授权 A–E 映射生成的默认排练方案；实际讲解人、操作者、录制人和计时人仍需在演练/录制时填写并由本人确认。

## DEL-01 状态

PPT、总结、脚本和录屏计划已完成，但没有实际 5–8 分钟录屏文件/链接，也没有全员计时演练记录。因此 `06_defense` 技术材料可合并，DEL-01 仍保持 `HUMAN EVIDENCE PENDING`。
