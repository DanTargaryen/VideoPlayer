# 03_devops 实体材料验证报告

## 交付目标

本报告验证课程交付目录中的 Docker、流水线、Kubernetes/Helm 和数据库脚本是否以实体文件进入 `03_devops`，而不是只通过 `../../` 链接指向仓库其他目录。

## 冻结基线

```text
repository: DanTargaryen/VideoPlayer
source commit: 481d683de584aeb9abaf6bb2df38f025bb514c30
package mode: regular-file copies; no symlinks
```

每个实体副本与原路径的对应关系记录在 [`source-manifest.tsv`](source-manifest.tsv)，整个目录的离线校验记录在 [`checksums.sha256`](checksums.sha256)。

## 材料覆盖

| 要求 | 实体位置 | 覆盖情况 |
| --- | --- | --- |
| Docker | [`containers/`](containers/) | 7 个业务 Dockerfile、`.dockerignore`、4 套 Compose、Nginx/MySQL 配置和环境示例 |
| 流水线 | [`pipelines/`](pipelines/) | GitHub Actions、Jenkinsfile、19 个 CI shell 阶段脚本和 1 个 JUnit reporter |
| Kubernetes | [`kubernetes/`](kubernetes/) | 26 个 YAML/Kustomize 文件，以及部署、健康检查和证据收集脚本 |
| Helm | 无 | 项目采用 Kubernetes + Kustomize；未伪造 Helm Chart |
| 数据库脚本 | [`database/`](database/) | 5 套 Prisma schema、16 个 migration SQL、seed、安全守卫和 cutover migration |
| 部署/回滚 | [`deployment/`](deployment/) | Compose 双目标、切流、发布、交互和回滚 smoke 脚本 |

## 安全边界

- 只复制 Git 已跟踪文件，不复制 `.env`、本地数据库、Token、PID、缓存或未跟踪文件。
- Kubernetes Secret 只保留 `secret.example.yaml` 示例；真实 Secret 不进入交付包。
- migration/reset/seed/cutover 脚本保留原有目标白名单和确认值守卫。
- 本目录用于离线审阅；执行 Docker/Kubernetes/数据库命令前仍需完整仓库、隔离环境和人工核对目标。

## 验证判定

完成以下门禁后，本目录才可标记为通过：

1. `source-manifest.tsv` 中所有原文件与交付副本 SHA-256 相同；
2. `checksums.sha256` 对全部交付文件验证通过；
3. Compose 配置和两套 Kustomize 配置可解析；
4. 交付包单元测试确认数量、非软链接和本地路径边界；
5. 项目全量 `npm run test:ci` 通过。

最终命令与结果应以本次变更的实际自检输出为准，不能用旧流水线状态代替当前工作树验证。

## 本轮实际自检结果

验证日期：2026-09-01；工作树基线：`main@481d683` + 本轮交付目录变更。

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| 来源 Manifest | PASS | 119/119 份原文件与实体副本 SHA-256 一致；无软链接 |
| `03_devops/checksums.sha256` | PASS | 本目录除清单自身外全部文件校验通过 |
| Compose render | PASS | `docker-compose` 5.5.0；practice/microservices 2/2 使用一次性测试变量 `config --quiet` 通过 |
| Kustomize render | PASS | 单体与微服务 2/2 `kubectl kustomize` 通过 |
| 交付包单测 | PASS | `node --test test/unit/delivery-package.test.js`：2/2 |
| 全量质量门禁 | PASS | `npm run test:ci`：284/284，退出码 0 |

本轮没有构建 Docker 镜像、创建 Kind 集群、执行数据库 migration 或连接共享环境；这些运行级行为对“复制交付材料”变更不必要，状态为 `NOT RUN`。历史远端运行证据保存在 `04_tests/raw/`，不能替代当前工作树的本轮静态/测试门禁。
