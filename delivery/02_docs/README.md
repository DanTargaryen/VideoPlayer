# 02_docs：需求、设计、模型与追溯

本目录只做稳定索引，避免复制后出现多份不一致文档。所有链接相对仓库根目录可直接访问。

## 课程与产品文档

- [软件需求规格说明书](../../docs/软件需求规格说明书-V1.md)
- [软件概要设计说明书](../../docs/软件概要设计说明书-V1.md)
- [软件详细设计说明书](../../docs/软件详细设计说明书-V1.md)
- [数据库设计](../../docs/数据库设计-V1.md)
- [API 文档](../../docs/API文档-V1.md)
- [部署文档](../../docs/部署文档.md)
- [用户手册](../../docs/用户手册.md)

## 课程实践最终模型

- [UC01–UC06 冻结范围、成功/异常/恢复路径](../../docs/practice-2026/01-use-case-scope.md)
- [UC01–UC05 系统级、组件级、对象级 Mermaid 模型源](../../docs/practice-2026/14-uc01-05-three-layer-models.md)
- [UC06 系统级、组件级、对象级状态模型](../../docs/practice-2026/10-uc06-state-diagrams.md)
- [四服务边界、31 表唯一 owner、跨服务 contract、失败与迁移](../../docs/practice-2026/08-service-boundaries-and-data-ownership.md)
- [E2E 测试规格](../../docs/practice-2026/10-e2e-test-spec.md)
- [单体 Smoke 清单](../../docs/practice-2026/03-smoke-checklist.md)
- [证据索引、统一 DoD 与 UC 追溯](../../docs/practice-2026/06-evidence-and-dod.md)

## PDF 交付件

- [PDF 总索引与页数/源文件映射](pdf/README.md)
- 需求、概要设计、详细设计、数据库、API、测试/追溯和三层模型共 7 份 PDF、99 页。
- PDF 由 `scripts/generate-delivery-pdfs.py` 从可编辑 Markdown/Mermaid 源生成；每页已用 Poppler 渲染并完成无空白页、无越界文字和视觉 montage 检查。

## 文档一致性原则

1. 最终微服务事实边界以 `08-service-boundaries-and-data-ownership.md` 和实际 Prisma schema 为准；早期单体设计中的模块划分不覆盖该冻结决策。
2. 运行结果以 `00-progress.md`、PR 和远端 workflow 为准；计划、模板和“待执行”文字不能作为 PASS 证据。
3. UC01–UC06 的最新测试结论来自 REG-01 双目标 runner；旧的局部 smoke 不替代最终 12/12。
4. 模型源必须与实现的 Gateway、服务 JWT、数据库 owner、MinIO/SRS 依赖和 rollback 保持一致。

## 复核命令

```bash
node test/run-unit-tests.js
npm run test:regression
rg -n 'NOT RUN|BLOCKED|待补|待确认' docs/practice-2026 delivery
```

最后一条命令用于查找诚实保留的待补项，不意味着每个匹配都应删除；教师回复、会议原件、成员复现、权重、签字和录屏应保持待补，直到真实证据到位。
