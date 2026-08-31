# 01_source：源代码、版本与远端变更

## 仓库与基线

- 仓库：<https://github.com/DanTargaryen/VideoPlayer>
- 受保护基线：`main`；验收时用 `git rev-parse origin/main` 记录准确 SHA。
- 单体 annotated tag：`monolith-start`。
- tag 指向 commit：`70d197dc1a1f6febfdc7dcb12d8661384ad5d31e`（`test(practice): close monolith baseline smoke (#39)`）。
- 四业务服务、Gateway 与 shared-contracts 的 package version：`0.1.0`；发布镜像使用 Git SHA tag，不用 `latest` 作为证据。

复核命令：

```bash
git fetch origin --tags --prune
git status --short --branch
git rev-parse origin/main
git rev-parse monolith-start^{}
git show -s --format='%H %ad %s' --date=iso-strict monolith-start^{}
for file in services/*/package.json; do
  node -e 'const p=require("./"+process.argv[1]); console.log(p.name, p.version)' "$file"
done
```

## 最终技术 PR 与远端 CI

| PR | 任务 | 合并证据 | GitHub-hosted run |
| --- | --- | --- | --- |
| [#48](https://github.com/DanTargaryen/VideoPlayer/pull/48) | CI-01 远端稳定性与 Kind CD | merged | [33324914355](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33324914355) |
| [#49](https://github.com/DanTargaryen/VideoPlayer/pull/49) | 四服务统一 Foundation DoD | merged | [33328399081](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33328399081) |
| [#50](https://github.com/DanTargaryen/VideoPlayer/pull/50) | identity/content 只读切流 | merged | [33329693032](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33329693032) |
| [#51](https://github.com/DanTargaryen/VideoPlayer/pull/51) | identity 历史迁移与写切流 | merged | [33330723156](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33330723156) |
| [#52](https://github.com/DanTargaryen/VideoPlayer/pull/52) | content 历史数据迁移 | merged | [33333121815](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33333121815) |
| [#53](https://github.com/DanTargaryen/VideoPlayer/pull/53) | content 互动读写切流 | merged | [33337900513](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33337900513) |
| [#54](https://github.com/DanTargaryen/VideoPlayer/pull/54) | content 上传、投稿与发布 | merged | [33344821161](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33344821161) |
| [#55](https://github.com/DanTargaryen/VideoPlayer/pull/55) | live/governance 迁移、切流、UC05/06 | merged | [33352991611](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33352991611) |
| [#56](https://github.com/DanTargaryen/VideoPlayer/pull/56) | REG-01 双目标六 UC | merged | [33359785882](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33359785882) |
| [#57](https://github.com/DanTargaryen/VideoPlayer/pull/57) | HPA、故障恢复与性能实验 | merged | [33367170484](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33367170484) |

每个最终 run 均为 `quality`、`public-e2e`、`versioned-images` 3/3 jobs success，并在 PR 合并前完成 Owner 书面自审。DEL-01 PR 的编号、run 与 merge SHA 应在合并后追加到本表或 [`docs/practice-2026/00-progress.md`](../../docs/practice-2026/00-progress.md)。

## 服务边界

| Workspace | 事实所有权 | 独立运行端口 |
| --- | --- | --- |
| `@videoplayer/identity-community` | 用户、资料、关系、社区动态、通知 | 3101 |
| `@videoplayer/content-media` | 视频、资产、分类、互动、观看与 MinIO | 3102 |
| `@videoplayer/live-reward` | 房间、Session、观众、消息、录播登记与币账本 | 3103 |
| `@videoplayer/governance-ai` | 提审、举报、处置、审计与补偿 | 3104 |
| `@videoplayer/gateway` | 统一入口、身份转发、能力白名单与单体回滚 | 3100 |

31 张单体 Model 的唯一 owner 和不跨库直查规则见 [`docs/practice-2026/08-service-boundaries-and-data-ownership.md`](../../docs/practice-2026/08-service-boundaries-and-data-ownership.md)。
