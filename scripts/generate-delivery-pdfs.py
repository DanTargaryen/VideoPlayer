#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
import textwrap
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    XPreformatted,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "delivery" / "02_docs" / "pdf"
FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = PAGE_WIDTH - 34 * mm

PDF_GROUPS = [
    ("01-软件需求规格说明书.pdf", "软件需求规格说明书", ["docs/软件需求规格说明书-V1.md"]),
    ("02-软件概要设计说明书.pdf", "软件概要设计说明书", ["docs/软件概要设计说明书-V1.md"]),
    ("03-软件详细设计说明书.pdf", "软件详细设计说明书", ["docs/软件详细设计说明书-V1.md"]),
    ("04-数据库设计.pdf", "数据库设计", ["docs/数据库设计-V1.md"]),
    ("05-API文档.pdf", "API 文档", ["docs/API文档-V1.md"]),
    (
        "06-测试计划报告与追溯.pdf",
        "测试计划、测试报告与追溯",
        [
            "docs/practice-2026/01-use-case-scope.md",
            "docs/practice-2026/10-e2e-test-spec.md",
            "docs/practice-2026/06-evidence-and-dod.md",
            "docs/practice-2026/13-resilience-performance-experiments.md",
        ],
    ),
    (
        "07-三层模型源.pdf",
        "UC01–UC06 三层模型源",
        [
            "docs/practice-2026/14-uc01-05-three-layer-models.md",
            "docs/practice-2026/10-uc06-state-diagrams.md",
        ],
    ),
]


def register_fonts() -> None:
    if not FONT_PATH.exists():
        raise FileNotFoundError(f"CJK font missing: {FONT_PATH}")
    pdfmetrics.registerFont(TTFont("DeliveryCJK", str(FONT_PATH)))


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "DeliveryTitle", parent=base["Title"], fontName="DeliveryCJK",
            fontSize=24, leading=32, textColor=colors.HexColor("#141413"),
            alignment=TA_CENTER, spaceAfter=14 * mm,
        ),
        "subtitle": ParagraphStyle(
            "DeliverySubtitle", parent=base["Normal"], fontName="DeliveryCJK",
            fontSize=10, leading=15, textColor=colors.HexColor("#5F6670"),
            alignment=TA_CENTER, spaceAfter=6 * mm,
        ),
        "h1": ParagraphStyle(
            "DeliveryH1", parent=base["Heading1"], fontName="DeliveryCJK",
            fontSize=17, leading=23, textColor=colors.HexColor("#141413"),
            spaceBefore=7 * mm, spaceAfter=3.5 * mm, keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "DeliveryH2", parent=base["Heading2"], fontName="DeliveryCJK",
            fontSize=13.5, leading=19, textColor=colors.HexColor("#B85C3E"),
            spaceBefore=5 * mm, spaceAfter=2.5 * mm, keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "DeliveryH3", parent=base["Heading3"], fontName="DeliveryCJK",
            fontSize=11.5, leading=16, textColor=colors.HexColor("#3D3D3A"),
            spaceBefore=4 * mm, spaceAfter=2 * mm, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "DeliveryBody", parent=base["BodyText"], fontName="DeliveryCJK",
            fontSize=9.2, leading=14.2, textColor=colors.HexColor("#2D2D2A"),
            wordWrap="CJK", spaceAfter=2.4 * mm,
        ),
        "bullet": ParagraphStyle(
            "DeliveryBullet", parent=base["BodyText"], fontName="DeliveryCJK",
            fontSize=9.1, leading=14, leftIndent=5 * mm, firstLineIndent=-3.2 * mm,
            bulletIndent=1.5 * mm, wordWrap="CJK", spaceAfter=1.6 * mm,
        ),
        "code": ParagraphStyle(
            "DeliveryCode", parent=base["Code"], fontName="DeliveryCJK",
            fontSize=6.8, leading=9.1, leftIndent=3 * mm, rightIndent=3 * mm,
            borderColor=colors.HexColor("#D1CFC5"), borderWidth=0.6,
            borderPadding=4, backColor=colors.HexColor("#F0EEE6"),
            textColor=colors.HexColor("#2D2D2A"), spaceBefore=1.5 * mm,
            spaceAfter=3 * mm,
        ),
        "table": ParagraphStyle(
            "DeliveryTable", parent=base["BodyText"], fontName="DeliveryCJK",
            fontSize=6.8, leading=9.1, wordWrap="CJK", textColor=colors.HexColor("#2D2D2A"),
        ),
        "table_head": ParagraphStyle(
            "DeliveryTableHead", parent=base["BodyText"], fontName="DeliveryCJK",
            fontSize=7, leading=9.5, wordWrap="CJK", textColor=colors.HexColor("#141413"),
            alignment=TA_CENTER,
        ),
        "caption": ParagraphStyle(
            "DeliveryCaption", parent=base["BodyText"], fontName="DeliveryCJK",
            fontSize=7.5, leading=11, textColor=colors.HexColor("#6B6B66"),
            alignment=TA_CENTER, spaceAfter=3 * mm,
        ),
    }


def inline_markup(value: str) -> str:
    value = html.escape(value.strip())
    value = re.sub(r"&lt;br\s*/?&gt;", "<br/>", value, flags=re.IGNORECASE)
    value = re.sub(r"!\[([^]]*)\]\(([^)]+)\)", r"[图片：\1]", value)
    value = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<a href="\2" color="#3D6E9E">\1</a>', value)
    value = re.sub(r"`([^`]+)`", r'<font color="#B85C3E">\1</font>', value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    return value


def split_table_row(line: str) -> list[str]:
    line = line.strip().strip("|")
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", line)]


def table_flowable(lines: list[str], style_map: dict[str, ParagraphStyle]):
    rows = [split_table_row(line) for line in lines]
    if len(rows) >= 2 and all(re.fullmatch(r":?-{3,}:?", item.replace(" ", "")) for item in rows[1]):
        rows.pop(1)
    if not rows:
        return Spacer(1, 1)
    columns = max(len(row) for row in rows)
    normalized = [row + [""] * (columns - len(row)) for row in rows]
    if columns > 6:
        cards = []
        headers = normalized[0]
        for index, row in enumerate(normalized[1:], start=1):
            values = [Paragraph(f"<b>{inline_markup(headers[col])}</b>：{inline_markup(row[col])}", style_map["body"]) for col in range(columns)]
            cards.append(KeepTogether([
                Paragraph(f"记录 {index}", style_map["h3"]),
                *values,
                HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#D1CFC5"), spaceAfter=2 * mm),
            ]))
        return cards

    lengths = []
    for column in range(columns):
        lengths.append(max(6, min(40, max(len(row[column]) for row in normalized))))
    total = sum(lengths)
    widths = [CONTENT_WIDTH * length / total for length in lengths]
    data = []
    for row_index, row in enumerate(normalized):
        row_style = style_map["table_head"] if row_index == 0 else style_map["table"]
        data.append([Paragraph(inline_markup(cell), row_style) for cell in row])
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E3DACC")),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#B8BCC4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3.2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3.2),
        ("TOPPADDING", (0, 0), (-1, -1), 3.2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.2),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAF9F5")]),
    ]))
    return table


def wrapped_code(value: str) -> str:
    output: list[str] = []
    for line in value.splitlines() or [""]:
        if len(line) <= 100:
            output.append(line)
            continue
        indent = len(line) - len(line.lstrip())
        chunks = textwrap.wrap(line.strip(), width=max(40, 100 - indent), replace_whitespace=False, drop_whitespace=False)
        output.extend((" " * indent) + chunk for chunk in chunks)
    return "\n".join(output)


def markdown_story(path: Path, style_map: dict[str, ParagraphStyle]):
    lines = path.read_text(encoding="utf8").splitlines()
    story = [Paragraph(f"源文件：{html.escape(str(path.relative_to(ROOT)))}", style_map["caption"])]
    index = 0
    paragraph_lines: list[str] = []

    def flush_paragraph():
        nonlocal paragraph_lines
        if paragraph_lines:
            value = " ".join(item.strip() for item in paragraph_lines).strip()
            if value:
                story.append(Paragraph(inline_markup(value), style_map["body"]))
            paragraph_lines = []

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if stripped.startswith("```"):
            flush_paragraph()
            language = stripped[3:].strip()
            index += 1
            code_lines = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            label = f"代码 / 模型源（{language or 'text'}）"
            story.append(Paragraph(label, style_map["caption"]))
            story.append(XPreformatted(html.escape(wrapped_code("\n".join(code_lines))), style_map["code"]))
        elif stripped.startswith("|") and index + 1 < len(lines) and lines[index + 1].strip().startswith("|"):
            flush_paragraph()
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            index -= 1
            table_result = table_flowable(table_lines, style_map)
            if isinstance(table_result, list):
                story.extend(table_result)
            else:
                story.append(table_result)
                story.append(Spacer(1, 3 * mm))
        elif match := re.match(r"^(#{1,6})\s+(.+)$", stripped):
            flush_paragraph()
            level = len(match.group(1))
            style_name = "h1" if level == 1 else "h2" if level == 2 else "h3"
            story.append(Paragraph(inline_markup(match.group(2)), style_map[style_name]))
        elif re.match(r"^[-*+]\s+", stripped):
            flush_paragraph()
            story.append(Paragraph(inline_markup(re.sub(r"^[-*+]\s+", "", stripped)), style_map["bullet"], bulletText="•"))
        elif re.match(r"^\d+[.)]\s+", stripped):
            flush_paragraph()
            number = re.match(r"^(\d+)[.)]\s+", stripped).group(1)
            story.append(Paragraph(inline_markup(re.sub(r"^\d+[.)]\s+", "", stripped)), style_map["bullet"], bulletText=f"{number}."))
        elif stripped.startswith(">"):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped.lstrip("> ")), style_map["bullet"], bulletText="▌"))
        elif stripped in {"---", "***", "___"}:
            flush_paragraph()
            story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#D1CFC5"), spaceBefore=2 * mm, spaceAfter=2 * mm))
        elif not stripped:
            flush_paragraph()
        else:
            paragraph_lines.append(line)
        index += 1
    flush_paragraph()
    return story


def footer(canvas, document, title: str):
    canvas.saveState()
    canvas.setFont("DeliveryCJK", 7)
    canvas.setFillColor(colors.HexColor("#777772"))
    canvas.drawString(17 * mm, 10 * mm, "观澜视频平台 · 课程最终交付")
    canvas.drawRightString(PAGE_WIDTH - 17 * mm, 10 * mm, f"{title} · 第 {document.page} 页")
    canvas.setStrokeColor(colors.HexColor("#D1CFC5"))
    canvas.line(17 * mm, 14 * mm, PAGE_WIDTH - 17 * mm, 14 * mm)
    canvas.restoreState()


def build_pdf(filename: str, title: str, sources: list[str], style_map: dict[str, ParagraphStyle], output_directory: Path = OUTPUT):
    output_directory.mkdir(parents=True, exist_ok=True)
    output = output_directory / filename
    document = SimpleDocTemplate(
        str(output), pagesize=A4,
        leftMargin=17 * mm, rightMargin=17 * mm,
        topMargin=17 * mm, bottomMargin=19 * mm,
        title=title, author="VideoPlayer 第4组", subject="软件工程基础实践最终交付",
    )
    story = [Spacer(1, 28 * mm), Paragraph(title, style_map["title"]), Paragraph("观澜视频平台 · 第 4 组 · 2026 夏季软件工程基础实践", style_map["subtitle"])]
    story.append(Paragraph("可编辑源文件与本 PDF 同时提交；本文由仓库脚本生成，页脚标注页码，最终以 Git 中的 Markdown/Mermaid 源为准。", style_map["subtitle"]))
    story.append(PageBreak())
    for source_index, relative_path in enumerate(sources):
        source = ROOT / relative_path
        if not source.exists():
            raise FileNotFoundError(source)
        if source_index:
            story.append(PageBreak())
        story.extend(markdown_story(source, style_map))
    document.build(story, onFirstPage=lambda c, d: footer(c, d, title), onLaterPages=lambda c, d: footer(c, d, title))
    reader = PdfReader(str(output))
    return {"file": filename, "title": title, "pages": len(reader.pages), "sources": sources, "bytes": output.stat().st_size}


def main() -> None:
    register_fonts()
    style_map = styles()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    results = [build_pdf(*group, style_map) for group in PDF_GROUPS]
    supplemental = [
        build_pdf(
            "contribution-weight-confirmation.pdf",
            "个人贡献权重与全员确认表（待签）",
            ["delivery/05_management/contribution-weight-confirmation.md"],
            style_map,
            ROOT / "delivery" / "05_management",
        ),
        build_pdf(
            "VideoPlayer-技术总结报告.pdf",
            "观澜视频平台技术总结报告",
            ["delivery/06_defense/technical-summary.md"],
            style_map,
            ROOT / "delivery" / "06_defense",
        ),
    ]
    readme_lines = [
        "# 02_docs PDF 交付件",
        "",
        "> 生成命令：`python3 scripts/generate-delivery-pdfs.py`。PDF 与可编辑 Markdown/Mermaid 源同时提交。",
        "",
        "| PDF | 页数 | 字节 | 可编辑/模型源 |",
        "| --- | ---: | ---: | --- |",
    ]
    for item in results:
        links = "、".join(f"[`{source}`](../../../{source})" for source in item["sources"])
        readme_lines.append(f"| [`{item['file']}`]({item['file']}) | {item['pages']} | {item['bytes']} | {links} |")
    readme_lines.extend([
        "",
        "## 验收",
        "",
        "- 所有页面必须使用 `pdftoppm` 渲染后视觉检查。",
        "- 使用 `pdfplumber` 检查每页可提取文字、页面边界和页码。",
        "- Mermaid 模型在 PDF 中保留为可阅读的版本化源文本；原始可编辑模型仍在 Markdown 文件中。",
        "",
        f"生成清单：`{json.dumps(results, ensure_ascii=False)}`",
        "",
    ])
    (OUTPUT / "README.md").write_text("\n".join(readme_lines), encoding="utf8")
    print(json.dumps({"docs": results, "supplemental": supplemental}, ensure_ascii=False))


if __name__ == "__main__":
    main()
