# GitHub Actions 原始证据包：run 33379394312

> 来源：https://github.com/DanTargaryen/VideoPlayer/actions/runs/33379394312
>
> Head SHA：`c909875671a0f065df18183305bca6162211a660`
>
> 状态：`completed / success`
>
> 收集命令：`DELIVERY_EVIDENCE_RUN_ID=33379394312 node scripts/collect-delivery-raw-evidence.mjs`

本目录是课程“测试报告和流水线原始报告”的显式交付例外。通常生成报告保存在 CI Artifact、不进入 Git；本次按任务书要求固定一份可离线复核的最终成功 run，并保存完整 job log、原 Artifact 内容、实验 CSV 和 SHA-256。

## Jobs

| Job ID | 名称 | 结果 | startedAt | completedAt |
| --- | --- | --- | --- | --- |
| 99448041272 | Lint, build, and unit/API tests | success | 2026-08-31T09:47:22Z | 2026-08-31T09:49:26Z |
| 99448041560 | Public browser smoke | success | 2026-08-31T09:47:22Z | 2026-08-31T09:48:43Z |
| 99448567204 | Build images and deploy to isolated Kind | success | 2026-08-31T09:49:30Z | 2026-08-31T09:52:51Z |

## GitHub Artifacts

| 名称 | Artifact ID | 压缩大小（byte） | 已过期 |
| --- | ---: | ---: | --- |
| kind-deployment-evidence | 9753284871 | 3342 | no |
| public-e2e-evidence | 9753161825 | 200408 | no |

## 目录

- `run.json`：GitHub run 与每个 step 的原始结构化元数据。
- `artifacts.json`：GitHub Artifact API 原始元数据。
- `job-logs/`：三个 job 的完整 GitHub Actions 文本日志。
- `artifacts/public-e2e-evidence/`：Playwright HTML report 及前后端日志。
- `artifacts/kind-deployment-evidence/`：节点、workload、镜像、migration、事件与状态原始文件。
- `experiments/`：HPA 时间线、故障恢复和三轮性能逐行 CSV。
- `checksums.sha256`：除自身外全部文件的 SHA-256。

## 复核

```bash
cd delivery/04_tests/raw/github-run-33379394312
shasum -a 256 -c checksums.sha256
rg 'All migrations have been successfully applied' artifacts/kind-deployment-evidence/migration.log
rg '1/1 +Running +0' artifacts/kind-deployment-evidence/workloads.txt
```
