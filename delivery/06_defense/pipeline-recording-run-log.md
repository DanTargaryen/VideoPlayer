# 流水线录屏运行记录

本文件用于记录答辩备用视频中实际展示的 GitHub Actions 流水线，确保录屏画面、Git 提交与运行结果能够相互对应。

## 本次录制

| 项目 | 记录 |
| --- | --- |
| 分支 | `demo/ci-pipeline-recording` |
| PR | `#79` |
| 工作流 | `monolith-ci` |
| 触发方式 | PR 分支 push |
| 录制提交 SHA | 流水线完成后填写 |
| GitHub Actions Run | 流水线完成后填写 |
| 最终状态 | 流水线完成后填写 |
| 录制人 | 录制完成后填写 |
| 录制时间 | 录制完成后填写 |

## 录屏必须展示

- [ ] 终端显示当前分支和 commit SHA。
- [ ] 执行 `git push`。
- [ ] GitHub Actions 自动出现新的 `monolith-ci`。
- [ ] 运行记录中的 commit SHA 与终端一致。
- [ ] Lint、构建、单元测试、API 测试和浏览器测试结果。
- [ ] Git SHA Docker 镜像构建过程。
- [ ] 镜像部署到隔离 Kind 集群的过程。
- [ ] Kubernetes Deployment、Job、Pod 和健康检查结果。
- [ ] 部署证据 Artifact。
- [ ] 临时 Kind 集群清理结果。

## 完成后登记

```text
commit SHA：
Actions Run URL：
流水线结果：SUCCESS / FAILURE / CANCELLED
视频文件名：
视频时长：
视频 SHA-256：
复核人：
复核时间：
```
