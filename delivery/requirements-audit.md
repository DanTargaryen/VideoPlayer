# 课程任务书九项最终交付审计

> 审计基线：`main@481d683de584aeb9abaf6bb2df38f025bb514c30` + `03_devops`/`04_tests` 实体材料冻结包。
>
> 判定规则：只有仓库文件、可重跑命令、原始报告、外部可访问页面或真人原件才能标记完成。

## 1–9 项

| # | 任务书要求 | 当前状态 | 仓库/外部证据 | 剩余动作 |
| ---: | --- | --- | --- | --- |
| 1 | 原系统版本/tag；微服务版本；完整提交记录 | **完整** | `01_source/repository-list.tsv`、`complete-change-manifest.md`、`all-commits.tsv`、`checksums.sha256`、生成器 | 无仓库内缺口 |
| 2 | README 环境、端口、启动、健康、测试账号、初始数据 | **完整** | 根 `README.md` 的版本/端口/health/账号/Seed 章节 | 无仓库内缺口 |
| 3 | Dockerfile、流水线、K8s/Helm、数据库、部署/回滚 | **完整** | `03_devops/containers/`、`pipelines/`、`kubernetes/`、`database/`、`deployment/`；119 份实体副本和 SHA-256 | 项目采用 Kubernetes/Kustomize，不含 Helm Chart；若课程强制 Helm 需另补 |
| 4 | Unit、API、E2E、测试报告和流水线原始报告 | **完整** | `04_tests/automation/`、`automated-test-report.md`、`raw/github-run-33379394312/`；测试源码、完整 logs、Playwright、Kind、JSON、CSV、SHA-256 | 无仓库内缺口 |
| 5 | 压力脚本、原始结果、至少 3 次重复实验和分析 | **完整** | `04_tests/load/`、`experiments/`、`experiment-summary.md`；脚本和三轮 CSV 均在交付目录内 | 无仓库内缺口 |
| 6 | 场景、需求、设计、测试、追溯；可编辑/PDF/模型源 | **完整** | `02_docs/`、7 PDF/99 页、Markdown/Mermaid 源、`qa.json`、checksums | 无仓库内缺口 |
| 7 | 服务划分图、接口、表归属、跨服务调用 | **完整** | `08-service-boundaries-and-data-ownership.md`、三层模型、31/31 owner | 无仓库内缺口 |
| 8 | 管理平台地址、每日站会、每日看板/统计截图 | **部分** | 飞书核心地址、日期索引、8.31 条目已验证；平台与 8.25 两张截图已固定并校验 SHA | 需真人导出 8.26–8.31 每日实名简报与看板/统计截图原件 |
| 9 | PPT、技术报告、个人权重表和全员确认 | **部分** | 10 页 PPTX、技术报告 Markdown + 3 页 PDF、权重表可编辑源 + 3 页待签 PDF、默认答辩/录屏分段完成 | 需五人权重/签字/全员确认和真实备用录屏/演练 |

严格统计：**7 项完整、2 项部分完成、0 项完全缺失**。

## 六目录

| 目录 | 状态 | 结论 |
| --- | --- | --- |
| `01_source` | **完整** | 公开仓库、tag、版本、已合并 PR #40–#65/#67、未合并 #66 排除说明、80 commit TSV、SHA-256 和生成器齐全 |
| `02_docs` | **完整** | 可编辑源、模型源、7 PDF/99 页和 QA 齐全 |
| `03_devops` | **完整** | Docker、CI、K8s、数据库、部署/回滚实体文件、来源 Manifest 和 SHA-256 齐全 |
| `04_tests` | **完整** | 自动化源码、压力脚本、实验 CSV、完整原始报告离线包和 SHA-256 齐全 |
| `05_management` | **部分** | 飞书平台、8.25 截图和模板齐；其余每日截图、复现、权重/签字、会议原件缺 |
| `06_defense` | **部分** | PPT、报告、脚本齐；实际录屏、演练和全员确认缺 |

## 不得自动代填的内容

- 教师/助教确认回复。
- ARCH-01 实际参会名册、签到、聊天或会议录屏。
- 非作者 clean-machine 复现签名。
- 每日实名站会简报和每日看板/统计截图原件。
- 五名成员实际贡献核对、权重、签字和日期。
- 真实 5–8 分钟备用录屏、访问权限验证、SHA-256 和计时演练记录。

这些原件补齐后，才能把 DEL-01 总 Gate 从 `HUMAN EVIDENCE PENDING` 改为 `DONE`。
