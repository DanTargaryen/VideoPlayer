# 改造版本与完整提交 Manifest

> 生成命令：`node scripts/generate-delivery-source-manifest.mjs`
>
> 范围：改造前单体标签 `monolith-start` 到生成时受保护主干 `main@6d1ad504db90abf93a408a660e4ffabcc6ddd088`。
>
> 该 Manifest 故意固定结束 SHA；后续交付修订若需要纳入，重新运行生成器并复核差异。

## 1. 改造前原系统版本

| 字段 | 值 |
| --- | --- |
| Git 标签 | `monolith-start`（annotated tag） |
| Tag object SHA | `d9776f33555d95666e79bf03468ff1b39ea6314b` |
| Tag 指向 commit | `70d197dc1a1f6febfdc7dcb12d8661384ad5d31e` |
| 基线提交说明 | `test(practice): close monolith baseline smoke (#39)` |

复核：

```bash
git rev-parse monolith-start
git rev-parse monolith-start^{}
git show -s --format='%H %ad %s' --date=iso-strict monolith-start^{}
```

## 2. 改造后版本

| 字段 | 值 |
| --- | --- |
| 受保护主干 | `main` |
| 最终 commit | `6d1ad504db90abf93a408a660e4ffabcc6ddd088` |
| 最终 tree | `8e8f34728d73fcb3820d1bf01d9d71c0083adb31` |
| 提交总数 | `80`（不含起点 commit，含 merge commit） |
| 已合并 PR 范围 | `#40–#65、#67` |
| 候选 PR 审计范围 | `#40–#67`；未合并 PR 单列，不冒充 final main 变更 |
| 镜像版本规则 | Git SHA；验收不得只使用 `latest` |
| 最终主干 CI | [33467743557](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33467743557)（3/3 jobs success，head `6d1ad504db90abf93a408a660e4ffabcc6ddd088`） |

### 微服务与公共 workspace 版本

| Workspace | package version | 来源 |
| --- | --- | --- |
| `@videoplayer/shared-contracts` | `0.1.0` | `services/shared-contracts/package.json` |
| `@videoplayer/gateway` | `0.1.0` | `services/gateway/package.json` |
| `@videoplayer/identity-community` | `0.1.0` | `services/identity-community/package.json` |
| `@videoplayer/content-media` | `0.1.0` | `services/content-media/package.json` |
| `@videoplayer/live-reward` | `0.1.0` | `services/live-reward/package.json` |
| `@videoplayer/governance-ai` | `0.1.0` | `services/governance-ai/package.json` |

## 3. 仓库清单

机器可读仓库定位信息位于 [repository-list.tsv](repository-list.tsv)，包含公开仓库 URL、默认分支、改造前 tag/commit 与最终 ref/commit。

## 4. 完整 merged PR / merge / workflow 清单

| PR | 标题 | 最终 head SHA | merge SHA | mergedAt (UTC) | 最终远端 run |
| --- | --- | --- | --- | --- | --- |
| [#40](https://github.com/DanTargaryen/VideoPlayer/pull/40) | docs(practice): freeze service boundaries and assignments | `870491047fb6d73bc9fabd7b8ec24be4925425ae` | `c0259d9d4b52f82e12fa99d29d76226c2e1d39ee` | 2026-08-27T09:56:47Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#41](https://github.com/DanTargaryen/VideoPlayer/pull/41) | build(devops): add MS-00 microservice scaffold | `867161279ef68e0d054d3b2b9fbf31f1a98fec5f` | `9181e2c9655b3f0b751a0544e95b8ec77dfd5737` | 2026-08-27T11:22:10Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#42](https://github.com/DanTargaryen/VideoPlayer/pull/42) | docs(progress): record MS-00 merge | `5a3dd3d2e3609ca204caf0de068db64aaf4dd02f` | `b166de4b6a2c58263be628788eb9801dfacf3c4f` | 2026-08-27T11:26:18Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#43](https://github.com/DanTargaryen/VideoPlayer/pull/43) | feat(content): complete MS-02 content-media foundation | `932d1694ed8a5724a7a4c647565ace98108965ed` | `be7a4199bf8d051ffbf7db772330b5c97d1fc6de` | 2026-08-28T10:51:41Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#44](https://github.com/DanTargaryen/VideoPlayer/pull/44) | ci(devops): publish standard JUnit reports | `04785d4b55582f7e420007b250f1cfb2dab9a45c` | `2fa106f28d2a0e1fcc42af338a05f0bddf5514fe` | 2026-08-28T02:21:12Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#45](https://github.com/DanTargaryen/VideoPlayer/pull/45) | feat(ms-01): bootstrap identity-community foundation | `92b8817082e8b21c8116e414efb32b83fa0c5e2a` | `80868e917200396340e54424573498a2a4ff9d7f` | 2026-08-28T09:20:39Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#46](https://github.com/DanTargaryen/VideoPlayer/pull/46) | feat(live): align replay registration contract | `118ee512a11dc235b3d86a7fb3ef7fcec9ccf650` | `933ccacdb6e4814e451119824576946bcfbb70cf` | 2026-08-28T16:46:09Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#47](https://github.com/DanTargaryen/VideoPlayer/pull/47) | feat(governance): complete MS-04 moderation workflow | `17cf379b65143be6afeb916895b3ca495cb4941b` | `864460660ae4f8296f0d816da1a259f5e9b2b496` | 2026-08-29T15:05:34Z | N/A（早期 PR 使用本地/Jenkins 证据） |
| [#48](https://github.com/DanTargaryen/VideoPlayer/pull/48) | ci(devops): add hosted Kind deployment gate | `7707916832a49ab836ec407117fbe6b12c568310` | `0a1418c336ccc1fdf4cad7374a93cd7c61d71f7b` | 2026-08-30T17:33:16Z | [33324914355](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33324914355) |
| [#49](https://github.com/DanTargaryen/VideoPlayer/pull/49) | test(devops): close microservice foundation gate | `a34b0cfe7f307df1333f9eb11537a8641a2e4eb0` | `f15a9519e3dc1615049a9a3ce89c342f374bb191` | 2026-08-30T18:42:12Z | [33328399081](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33328399081) |
| [#50](https://github.com/DanTargaryen/VideoPlayer/pull/50) | feat(gateway): stage identity content read cutover | `8283a796e0d840861afc217101a79424a82d79eb` | `006f50a05b429e77afcc82a07242f7992153451c` | 2026-08-30T19:10:02Z | [33329693032](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33329693032) |
| [#51](https://github.com/DanTargaryen/VideoPlayer/pull/51) | feat(identity): migrate and cut over identity writes | `7f962cde31fdacbf1603940ec5c25fe48b3ae84d` | `237486759e111456b10662af9e31514ab327926e` | 2026-08-30T19:32:35Z | [33330723156](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33330723156) |
| [#52](https://github.com/DanTargaryen/VideoPlayer/pull/52) | feat(content): migrate monolith content history | `ff9436fecc7f9ad7ec3591d61047bb482e48a195` | `ab04ca505053dd2691f90a63f7cac5eb1a305472` | 2026-08-30T20:24:00Z | [33333121815](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33333121815) |
| [#53](https://github.com/DanTargaryen/VideoPlayer/pull/53) | feat(content): cut over content interactions | `65d479ba58d31d3b2efdf819c28188fd24a44d5b` | `2a50b23fa2118b58aa8013bb608cba89c56304eb` | 2026-08-30T22:08:40Z | [33337900513](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33337900513) |
| [#54](https://github.com/DanTargaryen/VideoPlayer/pull/54) | feat(content): cut over publishing workflow | `61066ba60e4cd99272f9e64839326d38ca02a3b1` | `41fc8a11d2bb8b69cb9aa2a2bbb1f47d4b165c36` | 2026-08-31T00:43:07Z | [33344821161](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33344821161) |
| [#55](https://github.com/DanTargaryen/VideoPlayer/pull/55) | feat(live): complete live and governance cutover | `e10db434f63ab4aafefda560d045e8e94202faaa` | `d3ecda44f1214026bfd3915ff26d0f3956d90486` | 2026-08-31T03:24:04Z | [33352991611](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33352991611) |
| [#56](https://github.com/DanTargaryen/VideoPlayer/pull/56) | test(regression): run full dual-target use cases | `810ad5145a2bcca81895017c424b74916b144065` | `33573594695f5150b8ade8db45b599b775e3dff9` | 2026-08-31T05:24:56Z | [33359785882](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33359785882) |
| [#57](https://github.com/DanTargaryen/VideoPlayer/pull/57) | test(experiments): verify scaling resilience and performance | `3f5dea1197451bbc6d0d5bcb3f2cad14f6d6d9cc` | `bee00550a48e3e5e41641833a7d15dab592aefc1` | 2026-08-31T07:18:55Z | [33367170484](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33367170484) |
| [#58](https://github.com/DanTargaryen/VideoPlayer/pull/58) | docs(practice): assemble final delivery package | `9d19aca32ac44c85e08e321576df9c61f635f674` | `993d699e047f2e12963af60646de47f4da862e2f` | 2026-08-31T08:29:04Z | [33372482927](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33372482927) |
| [#59](https://github.com/DanTargaryen/VideoPlayer/pull/59) | docs(practice): close DEL-01 technical gate | `bf4367097940e9a8c62ec17a3183fb5b51f8938e` | `b9fee2fdfdaf5bda72a19b890beeb93d5e70e3bf` | 2026-08-31T08:42:01Z | [33373473438](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33373473438) |
| [#60](https://github.com/DanTargaryen/VideoPlayer/pull/60) | docs(practice): reconcile final TODO audit | `49f9cf52531cdba8e761dcad7a59303b46fa95f6` | `a5b15627615e943fc2521df8b15a79d0c9f07c12` | 2026-08-31T09:04:18Z | [33375231784](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33375231784) |
| [#61](https://github.com/DanTargaryen/VideoPlayer/pull/61) | docs(practice): map members to A-E roles | `67a7aa7572366ff9da863bc314c8d601cb346ace` | `1050f9234d109e5ee4e1bab4bb7ca6482a905522` | 2026-08-31T09:33:46Z | [33377576089](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33377576089) |
| [#62](https://github.com/DanTargaryen/VideoPlayer/pull/62) | docs(defense): align demo owners with A-E | `c909875671a0f065df18183305bca6162211a660` | `bbe10fb935bfa3ce96051e2262168143dcbf5187` | 2026-08-31T09:54:49Z | [33379394312](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33379394312) |
| [#63](https://github.com/DanTargaryen/VideoPlayer/pull/63) | docs(delivery): complete course evidence package | `6de4fdf3b902aab95661621c0236d2d8eba64fcd` | `198015f56f2f5d45b46a904110807658b174b7a7` | 2026-08-31T13:22:01Z | [33395434940](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33395434940) |
| [#64](https://github.com/DanTargaryen/VideoPlayer/pull/64) | ci(actions): restore automatic main validation | `b7115b60bda02d82e28f194f34cf533ebc9b9bfa` | `7fa3ed713a7422089b33564f645a631f92a4411c` | 2026-09-01T02:38:51Z | [33463103266](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33463103266) |
| [#65](https://github.com/DanTargaryen/VideoPlayer/pull/65) | docs(practice): close automatic CI trigger evidence | `11d9c87177cfed92f5414248d6ef6f6a4e91edc1` | `4069c8c03c4514c0de0c62e25bab6712e482b538` | 2026-09-01T02:50:14Z | [33463843587](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33463843587) |
| [#67](https://github.com/DanTargaryen/VideoPlayer/pull/67) | test(frontend): cover search and video detail smoke | `abe3cf1f87c0012ebec886e6e23e6067c5cf1d56` | `6d1ad504db90abf93a408a660e4ffabcc6ddd088` | 2026-09-01T03:51:48Z | [33466825816](https://github.com/DanTargaryen/VideoPlayer/actions/runs/33466825816) |

### 未纳入 final main 的候选 PR

| PR | 标题 | 状态 | head SHA | 排除原因 |
| --- | --- | --- | --- | --- |
| [#66](https://github.com/DanTargaryen/VideoPlayer/pull/66) | 技术总结报告 | OPEN | `01eff94d86aa6961a1a94fd2cefb2df532d5b5b7` | 未合并，不属于 `main@6d1ad504db90abf93a408a660e4ffabcc6ddd088` |

## 5. 全部 80 个 Git commit

逐 commit 的完整、机器可读记录位于 [all-commits.tsv](all-commits.tsv)，字段为：

```text
commit  author_date  author  subject
```

复核：

```bash
git log --reverse --format='%H%x09%ad%x09%an%x09%s' --date=iso-strict monolith-start^{}..main
wc -l delivery/01_source/all-commits.tsv
```

## 6. 完整性判定

- [x] 改造前 annotated tag、tag object 和 peeled commit 均记录。
- [x] 六个改造后 workspace 版本均来自实际 package 文件。
- [x] 仓库 URL、可见性、默认分支、改造前与改造后 ref/commit 已写入 TSV。
- [x] 候选 PR #40–#67 已全量查询；已合并 #40–#65、#67 的 head/merge SHA、合并时间和远端 run（适用时）均记录。
- [x] 未合并候选 #66 已显式单列，没有冒充 final main 交付。
- [x] 从 `monolith-start` 到 `main@6d1ad504db90abf93a408a660e4ffabcc6ddd088` 的全部 80 个 commit 均进入 TSV。
- [x] 最终主干 SHA 已由 GitHub Actions run 33467743557 完成 3/3 jobs 验证，且 run head 与 final commit 一致。
- [x] Manifest 可由仓库脚本重新生成，不依赖手工复制 GitHub 页面。
