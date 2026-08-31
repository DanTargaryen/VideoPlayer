# 02_docs PDF 交付件

> 生成命令：`python3 scripts/generate-delivery-pdfs.py`。PDF 与可编辑 Markdown/Mermaid 源同时提交。

| PDF | 页数 | 字节 | 可编辑/模型源 |
| --- | ---: | ---: | --- |
| [`01-软件需求规格说明书.pdf`](01-软件需求规格说明书.pdf) | 14 | 277284 | [`docs/软件需求规格说明书-V1.md`](../../../docs/软件需求规格说明书-V1.md) |
| [`02-软件概要设计说明书.pdf`](02-软件概要设计说明书.pdf) | 15 | 282356 | [`docs/软件概要设计说明书-V1.md`](../../../docs/软件概要设计说明书-V1.md) |
| [`03-软件详细设计说明书.pdf`](03-软件详细设计说明书.pdf) | 14 | 277899 | [`docs/软件详细设计说明书-V1.md`](../../../docs/软件详细设计说明书-V1.md) |
| [`04-数据库设计.pdf`](04-数据库设计.pdf) | 12 | 188312 | [`docs/数据库设计-V1.md`](../../../docs/数据库设计-V1.md) |
| [`05-API文档.pdf`](05-API文档.pdf) | 14 | 193462 | [`docs/API文档-V1.md`](../../../docs/API文档-V1.md) |
| [`06-测试计划报告与追溯.pdf`](06-测试计划报告与追溯.pdf) | 20 | 374025 | [`docs/practice-2026/01-use-case-scope.md`](../../../docs/practice-2026/01-use-case-scope.md)、[`docs/practice-2026/10-e2e-test-spec.md`](../../../docs/practice-2026/10-e2e-test-spec.md)、[`docs/practice-2026/06-evidence-and-dod.md`](../../../docs/practice-2026/06-evidence-and-dod.md)、[`docs/practice-2026/13-resilience-performance-experiments.md`](../../../docs/practice-2026/13-resilience-performance-experiments.md) |
| [`07-三层模型源.pdf`](07-三层模型源.pdf) | 10 | 197222 | [`docs/practice-2026/14-uc01-05-three-layer-models.md`](../../../docs/practice-2026/14-uc01-05-three-layer-models.md)、[`docs/practice-2026/10-uc06-state-diagrams.md`](../../../docs/practice-2026/10-uc06-state-diagrams.md) |

## 验收

- 所有页面必须使用 `pdftoppm` 渲染后视觉检查。
- 使用 `pdfplumber` 检查每页可提取文字、页面边界和页码。
- Mermaid 模型在 PDF 中保留为可阅读的版本化源文本；原始可编辑模型仍在 Markdown 文件中。

生成清单：`[{"file": "01-软件需求规格说明书.pdf", "title": "软件需求规格说明书", "pages": 14, "sources": ["docs/软件需求规格说明书-V1.md"], "bytes": 277284}, {"file": "02-软件概要设计说明书.pdf", "title": "软件概要设计说明书", "pages": 15, "sources": ["docs/软件概要设计说明书-V1.md"], "bytes": 282356}, {"file": "03-软件详细设计说明书.pdf", "title": "软件详细设计说明书", "pages": 14, "sources": ["docs/软件详细设计说明书-V1.md"], "bytes": 277899}, {"file": "04-数据库设计.pdf", "title": "数据库设计", "pages": 12, "sources": ["docs/数据库设计-V1.md"], "bytes": 188312}, {"file": "05-API文档.pdf", "title": "API 文档", "pages": 14, "sources": ["docs/API文档-V1.md"], "bytes": 193462}, {"file": "06-测试计划报告与追溯.pdf", "title": "测试计划、测试报告与追溯", "pages": 20, "sources": ["docs/practice-2026/01-use-case-scope.md", "docs/practice-2026/10-e2e-test-spec.md", "docs/practice-2026/06-evidence-and-dod.md", "docs/practice-2026/13-resilience-performance-experiments.md"], "bytes": 374025}, {"file": "07-三层模型源.pdf", "title": "UC01–UC06 三层模型源", "pages": 10, "sources": ["docs/practice-2026/14-uc01-05-three-layer-models.md", "docs/practice-2026/10-uc06-state-diagrams.md"], "bytes": 197222}]`
