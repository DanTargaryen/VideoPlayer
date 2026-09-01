# DevOps 交付目录说明

本目录对应课程最终交付目录 `03_devops`，收纳 VideoPlayer 项目的 Docker、CI/CD 流水线、Kubernetes/Kind 部署、数据库迁移和回滚相关材料。

## 文件清单

| 文件 | 内容 |
| --- | --- |
| [devops-verification-report.md](devops-verification-report.md) | 本轮 DevOps 配置与部署能力验证报告 |

## 源码入口

| 类别 | 仓库路径 |
| --- | --- |
| Dockerfile | `backend/Dockerfile`、`frontend/Dockerfile`、`services/*/Dockerfile` |
| Compose | `deploy/docker-compose.practice.yml`、`deploy/docker-compose.microservices.yml` |
| Kubernetes | `deploy/k8s/`、`deploy/k8s/microservices/` |
| CI/CD | `.github/workflows/monolith-ci.yml`、`Jenkinsfile`、`scripts/ci-*.sh` |
| 数据库脚本 | `backend/prisma/migrations/`、`services/*/prisma/migrations/`、`backend/prisma/seed.js`、`services/*/prisma/seed.*` |
| 部署脚本 | `scripts/k8s-deploy.sh`、`scripts/k8s-deploy-microservices.sh`、`scripts/k8s-health-check*.sh` |

## 结论

本轮检查确认 DevOps 交付材料完整，Compose 与 Kubernetes 配置可渲染，自动化流水线覆盖构建、测试、镜像、迁移、Kind 部署、健康检查、证据上传和清理。完整远端流水线和 Jenkins 执行证据已在实践文档中留存，本目录报告引用其结果并补充本机复核。
