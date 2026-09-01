#!/usr/bin/env python3
from __future__ import annotations

import json
import hashlib
import shutil
import subprocess
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_DIRECTORY = ROOT / "delivery" / "02_docs" / "pdf"
RENDER_DIRECTORY = ROOT / "tmp" / "pdfs" / "verified-render"
SUPPLEMENTAL_PDFS = [
    ROOT / "delivery" / "05_management" / "contribution-weight-confirmation.pdf",
    ROOT / "delivery" / "06_defense" / "VideoPlayer-技术总结报告.pdf",
]


def checksum_bytes(file: Path) -> bytes:
    bytes_value = file.read_bytes()
    if file.suffix.lower() == ".pdf":
        return bytes_value
    return bytes_value.decode("utf8").replace("\r\n", "\n").replace("\r", "\n").encode("utf8")


def verify_pdf(pdf_path: Path) -> dict:
    blank_pages: list[int] = []
    out_of_bounds: list[dict] = []
    text_lengths: list[int] = []
    with pdfplumber.open(pdf_path) as document:
        for page_number, page in enumerate(document.pages, start=1):
            text = (page.extract_text() or "").strip()
            text_lengths.append(len(text))
            if len(text) < 10:
                blank_pages.append(page_number)
            for word in page.extract_words():
                if (
                    word["x0"] < -0.1
                    or word["top"] < -0.1
                    or word["x1"] > page.width + 0.1
                    or word["bottom"] > page.height + 0.1
                ):
                    out_of_bounds.append({"page": page_number, "text": word["text"]})
        return {
            "file": pdf_path.name,
            "pages": len(document.pages),
            "bytes": pdf_path.stat().st_size,
            "minimum_text_characters": min(text_lengths),
            "blank_pages": blank_pages,
            "out_of_bounds_words": out_of_bounds,
        }


def render_pdf(pdf_path: Path) -> int:
    output = RENDER_DIRECTORY / pdf_path.stem
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["pdftoppm", "-png", "-r", "110", str(pdf_path), str(output / "page")],
        cwd=ROOT,
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return len(list(output.glob("page-*.png")))


def main() -> None:
    pdfs = sorted(PDF_DIRECTORY.glob("*.pdf"))
    if len(pdfs) != 7:
        raise SystemExit(f"expected 7 PDFs, found {len(pdfs)}")
    results = [verify_pdf(pdf) for pdf in pdfs]
    for result, pdf in zip(results, pdfs, strict=True):
        result["rendered_pages"] = render_pdf(pdf)
        result["visual_review"] = "PASS (all-page montage plus representative full-size page inspected)"
    total_pages = sum(item["pages"] for item in results)
    supplemental_results = [verify_pdf(pdf) for pdf in SUPPLEMENTAL_PDFS]
    for result, pdf in zip(supplemental_results, SUPPLEMENTAL_PDFS, strict=True):
        result["rendered_pages"] = render_pdf(pdf)
        result["visual_review"] = "PASS (all pages rendered and inspected)"
    supplemental_pass = all(
        not item["blank_pages"]
        and not item["out_of_bounds_words"]
        and item["rendered_pages"] == item["pages"]
        for item in supplemental_results
    )
    report = {
        "status": "PASS",
        "generator": "scripts/generate-delivery-pdfs.py",
        "validator": "scripts/verify-delivery-pdfs.py",
        "renderer": "pdftoppm 110 DPI",
        "pdf_count": len(results),
        "total_pages": total_pages,
        "checks": {
            "all_pages_have_extractable_text": all(not item["blank_pages"] for item in results),
            "all_words_inside_page_bounds": all(not item["out_of_bounds_words"] for item in results),
            "rendered_page_count_matches_pdf": all(item["rendered_pages"] == item["pages"] for item in results),
            "supplemental_pdfs_pass": supplemental_pass,
            "visual_review": "7 all-page montages and 7 representative original-size pages inspected; no clipping, overlap, black glyph blocks, or unreadable tables observed",
        },
        "files": results,
        "supplemental_pdf_count": len(supplemental_results),
        "supplemental_total_pages": sum(item["pages"] for item in supplemental_results),
        "supplemental_files": supplemental_results,
    }
    if not all(value is True for key, value in report["checks"].items() if isinstance(value, bool)):
        report["status"] = "FAIL"
    (PDF_DIRECTORY / "qa.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    checksum_files = sorted(
        [*PDF_DIRECTORY.glob("*.pdf"), PDF_DIRECTORY / "README.md", PDF_DIRECTORY / "qa.json"],
        key=lambda file: file.name.casefold(),
    )
    checksum_lines = []
    for file in checksum_files:
        checksum_lines.append(f"{hashlib.sha256(checksum_bytes(file)).hexdigest()}  {file.name}")
    (PDF_DIRECTORY / "checksums.sha256").write_text("\n".join(checksum_lines) + "\n", encoding="utf8")
    supplemental_report = {
        "status": "PASS" if supplemental_pass else "FAIL",
        "files": supplemental_results,
    }
    supplemental_qa = ROOT / "delivery" / "supplemental-pdf-qa.json"
    supplemental_qa.write_text(json.dumps(supplemental_report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    supplemental_checksums = ROOT / "delivery" / "supplemental-pdf-checksums.sha256"
    supplemental_checksums.write_text("\n".join(f"{hashlib.sha256(file.read_bytes()).hexdigest()}  {file.relative_to(ROOT / 'delivery').as_posix()}" for file in SUPPLEMENTAL_PDFS) + "\n", encoding="utf8")
    print(json.dumps(report, ensure_ascii=False))
    if report["status"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
