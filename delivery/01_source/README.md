# 01_source：代码仓库与版本提交清单

## 交付结论

本目录按任务书“**代码或仓库清单**”中的“仓库清单”形式交付。VideoPlayer 是单一公开 monorepo；这里不在仓库内部再次复制整套源码，避免目录递归、重复依赖和版本不一致。验收人可通过下表中的公开仓库、固定 tag 和完整 commit SHA 获取改造前后源码。

| 项目 | 交付值 |
| --- | --- |
| GitHub 仓库 | <https://github.com/DanTargaryen/VideoPlayer> |
| 可见性 | `PUBLIC`（2026-09-01 已通过 GitHub API 复核） |
| 默认/受保护分支 | `main` |
| 改造前版本 | annotated tag `monolith-start` |
| 改造前 commit | `70d197dc1a1f6febfdc7dcb12d8661384ad5d31e` |
| 改造后最终版本 | `main@6d1ad504db90abf93a408a660e4ffabcc6ddd088` |
| 完整变更范围 | 已合并 PR #40–#65、#67；PR #66 仍 OPEN，不属于 final main；`monolith-start` 之后共 80 个 commit |
| 最终主干 CI | [GitHub Actions run 33467743557](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33467743557)，merge SHA 上 3/3 jobs success |

## 本目录文件

| 文件 | 用途 |
| --- | --- |
| [`README.md`](README.md) | 给验收人的入口说明、检出方法和服务版本 |
| [`repository-list.tsv`](repository-list.tsv) | 单仓库机器可读清单：URL、可见性、分支、改造前后 ref/commit |
| [`complete-change-manifest.md`](complete-change-manifest.md) | 原系统 tag、微服务版本、已合并 PR #40–#65/#67、未合并 PR #66 排除说明、merge SHA 和远端 run |
| [`all-commits.tsv`](all-commits.tsv) | 从 `monolith-start` 到最终 `main` 的 80 个完整提交记录 |
| [`checksums.sha256`](checksums.sha256) | 上述三个生成文件的 SHA-256 完整性校验 |

以上机器可读文件由仓库脚本 [`scripts/generate-delivery-source-manifest.mjs`](../../scripts/generate-delivery-source-manifest.mjs) 生成。

## 获取改造前和改造后源码

```bash
git clone https://github.com/DanTargaryen/VideoPlayer.git
cd VideoPlayer
git fetch origin --tags --prune

# 改造前原系统源码
git switch --detach monolith-start^{}

# 改造后最终源码
git switch --detach 6d1ad504db90abf93a408a660e4ffabcc6ddd088
```

版本身份复核：

```bash
git rev-parse monolith-start
git rev-parse monolith-start^{}
git rev-parse origin/main
git show -s --format='%H %ad %s' --date=iso-strict monolith-start^{}
git show -s --format='%H %ad %s' --date=iso-strict 6d1ad504db90abf93a408a660e4ffabcc6ddd088
git log --reverse --format='%H%x09%ad%x09%an%x09%s' \
  --date=iso-strict monolith-start^{}..6d1ad504db90abf93a408a660e4ffabcc6ddd088
```

目录文件校验：

```bash
cd delivery/01_source
shasum -a 256 -c checksums.sha256
```

如果课程平台必须上传离线源码压缩包，可在仓库外生成两个固定版本快照；不要把 `.git`、`node_modules`、`.env`、日志或密钥放入压缩包：

```bash
git archive --format=zip --prefix=VideoPlayer-monolith-start/ \
  --output=../VideoPlayer-monolith-start.zip monolith-start^{}
git archive --format=zip --prefix=VideoPlayer-main-6d1ad50/ \
  --output=../VideoPlayer-main-6d1ad50.zip 6d1ad504db90abf93a408a660e4ffabcc6ddd088
```

## 改造后服务版本

微服务和公共 workspace 使用各自 `package.json` 中的版本；容器镜像与部署证据使用 Git SHA，不把 `latest` 当作验收版本。

| Workspace | 职责 | package version | 独立端口 |
| --- | --- | --- | ---: |
| `@videoplayer/shared-contracts` | 公共 health/version、错误与 API contract | `0.1.0` | — |
| `@videoplayer/gateway` | 统一入口、身份转发、能力白名单与单体回滚 | `0.1.0` | 3100 |
| `@videoplayer/identity-community` | 用户、资料、关系、动态与通知 | `0.1.0` | 3101 |
| `@videoplayer/content-media` | 视频、资产、分类、互动、观看与 MinIO | `0.1.0` | 3102 |
| `@videoplayer/live-reward` | 直播间、Session、消息、录播与币账本 | `0.1.0` | 3103 |
| `@videoplayer/governance-ai` | 提审、举报、处置、审计与补偿 | `0.1.0` | 3104 |

31 张单体 Model 的唯一 owner、服务边界和禁止跨库直查规则见 [`docs/practice-2026/08-service-boundaries-and-data-ownership.md`](../../docs/practice-2026/08-service-boundaries-and-data-ownership.md)。

## 维护与边界

主干前进后，在仓库根目录重新执行：

```bash
node scripts/generate-delivery-source-manifest.mjs
```

生成前必须先确认 `origin/main`、PR 范围和最终 Actions run，避免把尚未合并的分支误写成最终版本。`01_source` 不保存 `.env`、数据库口令、JWT/Token、MinIO Secret、私钥、`node_modules`、构建缓存或运行日志。
