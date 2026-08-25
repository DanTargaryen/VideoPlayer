# Docker / Kubernetes 环境决策表

> 当前事实：本次检查机器上没有可用的 Docker CLI/daemon。远端 MySQL 与 MinIO 可用于开发，但不能替代课程要求的前端、后端和数据库容器化证据。

## 1. 推荐顺序

### 方案 A：Docker Desktop + kind 或 k3d（推荐）

适合：组内有一台性能足够、可安装 Docker Desktop 的电脑，并希望本地演示可控。

优点：

- 与任务书允许工具一致。
- 可在本地反复演示 push/部署/HPA/故障。
- 网络故障时仍可本地验收。

风险：镜像和多服务占用较高；HPA 需要 metrics-server；SRS/MinIO/PVC 需提前测试。

### 方案 B：远端 k3s + 自托管 Runner

适合：已有稳定云主机且可以长期运行集群。

优点：组员共享；CI/CD 与演示环境一致。

风险：公网安全、费用、权限、网络依赖；Kubeconfig 和云密钥必须用 Secret 管理。

### 方案 C：GitHub Actions 临时 kind + 本地演示集群

适合：需要证明 CI 部署，同时保留本地现场演示。

优点：流水线环境可重复；不会暴露长期集群凭据。

风险：需要维护 CI 和演示两套环境；流水线临时集群结束后不可供教师持续查看。

## 2. 组会必须填写

| 决策项 | 结论 | 负责人 | 截止 | 验证证据 |
| --- | --- | --- | --- | --- |
| Docker 主机 | 待补 | A | 8/25 | `docker info`、版本截图/日志 |
| K8s 发行版 | kind / k3d / k3s / 其他 | A | 8/25 | `kubectl get nodes` |
| 镜像仓库 | GHCR / Docker Hub / 私有仓库 | A | 8/25 | 登录与 push/pull 测试；不记录密钥 |
| CI 平台 | 建议 GitHub Actions | A + E | 8/25 | hello workflow |
| 数据库容器 | MySQL 8 + migration + seed | C | 8/26 | 一条命令初始化 |
| MinIO/Redis/SRS | compose/K8s 方式 | C/D/A | 8/26 | health、持久卷、重启验证 |
| Secrets | GitHub Secrets + K8s Secret | A | 8/26 | 配置引用，无明文凭据 |
| 演示备份 | 本地集群 + 5-8 分钟录屏 | 组长 + E | 9/3 | 演练记录 |

## 3. D1 环境 Gate

- [ ] 至少一台验收主机可运行 `docker info`。
- [ ] 可运行 `kubectl get nodes`，节点状态 Ready。
- [ ] 所有成员知道谁管理主机、如何申请访问、如何避免互相覆盖。
- [ ] 镜像仓库可 push/pull 一个带版本号的测试镜像。
- [ ] 真实凭据只存于 Secret/本地 `.env`，不进入仓库。
- [ ] 远端开发数据库与课程隔离测试数据库分开，测试数据有重置策略。
- [ ] 明确网络故障时的本地演示和录屏方案。

## 4. 组长止损规则

如果 8 月 25 日中午前仍没有可用 Docker/K8s 主机：

1. 立即选择远端 k3s 或借用/指定其他组员机器，不继续等待。
2. 将环境阻塞升级为 P0 看板任务，写唯一 owner 和小时级截止。
3. 文档、用例、测试骨架继续并行，不让全组停工。
4. 暂不开始微服务提取，避免无法构建和部署的代码堆积。
