# GitHub Actions 流水线录制与测试 PR 操作指南

## 1. 目标

本指南用于录制“push 一次代码后自动触发流水线”的答辩视频片段。推荐使用指向 `main` 的 Draft PR，不直接向 `main` 推送测试提交；录制结束后关闭 PR，不合并测试内容。

触发关系如下：

```text
创建测试分支
  -> 首次 push 到远程
  -> 创建目标为 main 的 Draft PR
  -> 自动触发第一次 monolith-ci
  -> PR 存续期间再次 push 新 commit
  -> 自动触发新的 monolith-ci
```

当前工作流配置的触发条件为：

```yaml
on:
  workflow_dispatch:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
```

因此：

- 直接 push 到 `main` 会触发流水线。
- 创建目标为 `main` 的 PR 会触发流水线。
- 已有 PR 的分支再次 push 新 commit 会再次触发流水线。
- 只 push 普通分支、但没有创建 PR，不会触发流水线。

## 2. 录制前准备

1. 登录 GitHub，并提前打开以下页面：
   - 仓库：<https://github.com/DanTargaryen/VideoPlayer>
   - Actions：<https://github.com/DanTargaryen/VideoPlayer/actions>
2. 打开 WSL 终端并进入项目：

   ```bash
   cd ~/projects/VideoPlayer
   ```

3. 打开 OBS，确认麦克风、画面、终端字体和浏览器文字清晰。
4. 关闭微信、QQ、邮件和系统通知。
5. 不要在画面中展示 `.env`、Token、Secret、密码或私人信息。
6. 在 OBS 中设置“暂停/继续录制”热键。流水线运行可能需要十几分钟，录制时应剪掉纯等待过程。

## 3. 创建测试分支

先让本地 `main` 与远程一致：

```bash
git switch main
git pull --ff-only origin main
git status
```

创建测试分支：

```bash
git switch -c demo/ci-pipeline-recording
```

创建一个不会影响项目功能的临时说明文件：

```bash
printf '# CI 流水线触发演示\n\n用于答辩录屏，不合并到 main。\n' > pipeline-demo.md
```

提交变更：

```bash
git add pipeline-demo.md
git commit -m "test(ci): prepare pipeline recording demo"
```

首次推送测试分支：

```bash
git push -u origin demo/ci-pipeline-recording
```

此时如果尚未创建 PR，这次普通分支 push 不会触发当前流水线。

## 4. 创建 Draft PR

打开：

<https://github.com/DanTargaryen/VideoPlayer/compare/main...demo/ci-pipeline-recording?expand=1>

确认页面中的分支方向：

```text
base: main
compare: demo/ci-pipeline-recording
```

PR 标题建议填写：

```text
test(ci): pipeline recording demo
```

选择 `Create draft pull request`。Draft PR 创建后，GitHub 会以 `pull_request: opened` 事件自动触发一次 `monolith-ci`。

可以在以下位置查看：

- PR 页面底部的 `Checks`。
- 仓库的 `Actions` 页面。

## 5. 录制“push 触发流水线”

为了准确展示“push 一次代码触发流水线”，应在 Draft PR 已经创建后再产生并推送一个新 commit。

在测试说明文件中增加一行：

```bash
printf '\n第二次 push，用于展示 PR 自动触发流水线。\n' >> pipeline-demo.md
```

提交：

```bash
git add pipeline-demo.md
git commit -m "test(ci): trigger pipeline from PR push"
```

### 5.1 开始录制

开始 OBS 录制后，先展示当前分支和 commit：

```bash
git branch --show-current
git log -1 --oneline
git rev-parse --short HEAD
git status --short
```

建议讲解：

> 当前测试分支已经创建了指向 main 的 Draft PR。现在向该分支 push 一个新提交，GitHub Actions 将自动触发 monolith-ci 流水线。

执行 push：

```bash
git push
```

### 5.2 查看自动触发

1. 立即切换到 <https://github.com/DanTargaryen/VideoPlayer/actions>。
2. 刷新页面。
3. 打开刚出现的黄色 `monolith-ci` 运行记录。
4. 展示运行记录中的分支、commit SHA 和触发方式。
5. 确认网页中的 commit SHA 与终端刚才显示的一致。

建议讲解：

> GitHub 已经收到刚才的 push，并通过现有 PR 的 synchronize 事件自动创建本次流水线。网页显示的 commit SHA 与终端提交一致。

看到流水线开始运行后，暂停 OBS，等待流水线完成；不要把十几分钟等待过程全部录入最终视频。

## 6. 流水线完成后的录制内容

流水线完成后继续 OBS 录制，依次展示以下内容：

1. 运行编号、分支和 commit SHA。
2. 流水线状态为 `Success`。
3. 四个 Job：
   - `Lint, build, and unit/API tests`
   - `All public Controller API routes`
   - `Public browser smoke`
   - `Build all Git SHA images and deploy monolith plus microservices to isolated Kind`
4. 展开最后一个 Job，重点展示：
   - `Build monolith, service, Gateway, and migration Git SHA images`
   - `Deploy all Git SHA images to isolated Kind`
   - `Verify monolith and microservice Kubernetes deployments`
   - `Collect deployment evidence`
   - `Clean up isolated deployment`
5. 页面底部生成的 Artifacts。

建议讲解：

> 本次流水线完成代码检查、构建、单元和 API 测试、真实浏览器测试，然后以 Git SHA 构建镜像，部署到隔离的 Kind Kubernetes 集群，执行健康检查、收集证据并清理临时环境。

展开日志后，让 Pod Ready、migration Job Complete、健康检查成功或 HTTP 200 等关键结果在画面中停留数秒，不要快速滚动。

## 7. 最终视频检查

流水线片段至少应证明：

- 终端执行了真实 `git push`。
- push 前展示了当前 commit SHA。
- GitHub 自动出现新的 `monolith-ci`。
- GitHub 运行记录与终端是同一个 commit SHA。
- 流水线最终成功或明确显示失败位置。
- Kubernetes 部署和健康检查日志可读。
- Artifacts 可以在运行记录中找到。

流水线只是备用演示视频的一部分。完整备用视频还应包含网站重点业务用例、扩缩容、依赖故障与恢复，以及代码、配置和日志位置。

## 8. 录制结束后的清理

1. 在 GitHub 上关闭 Draft PR，不要点击 Merge。
2. 切回并同步 `main`：

   ```bash
   git switch main
   git pull --ff-only origin main
   ```

3. 确认测试 PR 和分支不再需要后，删除远程测试分支：

   ```bash
   git push origin --delete demo/ci-pipeline-recording
   ```

4. 删除本地测试分支：

   ```bash
   git branch -D demo/ci-pipeline-recording
   ```

执行删除前，应确认录制已经完成、PR 不需要保留，并且测试分支中没有需要合并的正式修改。

## 9. 异常排查

### push 后没有出现流水线

检查：

```bash
git branch --show-current
git log -1 --oneline
git status
git remote -v
```

然后确认：

- PR 仍处于 Open 或 Draft 状态。
- PR 的 base 是 `main`。
- 本次确实产生了新 commit，而不是 `Everything up-to-date`。
- 新 commit 已经 push 到 PR 对应的远程分支。
- GitHub Actions 没有被仓库管理员禁用。

### 流水线失败

不要隐藏失败。打开红色 Job，展开第一个失败步骤，保留错误日志；修复后重新提交并 push，新 commit 会再次自动触发流水线。
