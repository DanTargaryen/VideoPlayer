# 流水线重录记录

本文件用于触发并登记新一轮答辩流水线录制，不替代正式测试报告和 GitHub Actions 原始日志。

## 重录信息

| 项目 | 内容 |
| --- | --- |
| 分支 | `demo/ci-pipeline-recording` |
| PR | `#79` |
| 工作流 | `monolith-ci` |
| 触发方式 | PR 分支 push |
| commit SHA | 完成后填写 |
| Actions Run URL | 完成后填写 |
| 运行结果 | 完成后填写 |
| 重录原因 | 完成后填写 |

## 画面检查

- [ ] push 命令与 commit SHA 清晰可见。
- [ ] GitHub Actions 自动开始运行。
- [ ] 测试、镜像构建和 Kind 部署过程清晰可见。
- [ ] Kubernetes 健康检查和 Pod 状态清晰可见。
- [ ] 画面中没有密码、Token、Secret 或私人通知。
- [ ] 流水线完成后展示 Artifact 和最终状态。

## 第 2 次重录

本轮用于重新拍摄从终端提交、push 到 GitHub Actions 自动启动的连续画面。

- [ ] 录制开始后再创建本轮 commit。
- [ ] commit 完成后立即执行 push。
- [ ] 保留终端与 Actions 中相同的 commit SHA。
- [ ] 等待 Kubernetes 验证完成后登记 Run URL 和最终结果。

## 第 3 次重录

本轮重新录制完整的 push 自动触发流水线过程，并以本次新 commit 作为画面中的唯一版本标识。

- [ ] 开始录屏后展示当前分支。
- [ ] 展示本次新 commit 的完整 SHA。
- [ ] 在同一段画面中执行 `git push`。
- [ ] GitHub Actions 出现与本次 SHA 对应的新运行。
- [ ] 流水线完成后展示 Kubernetes 验证和 Artifact。
