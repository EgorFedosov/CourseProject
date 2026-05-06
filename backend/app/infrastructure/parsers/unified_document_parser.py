from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from xml.etree import ElementTree as ET

DOCX_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _w(tag: str) -> str:
    return f"{DOCX_NS}{tag}"


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _extract_xml_attribute(element: ET.Element | None, attr_name: str) -> str | None:
    if element is None:
        return None
    return element.get(f"{DOCX_NS}{attr_name}") or element.get(attr_name)


def _looks_like_heading(text: str) -> bool:
    normalized = _normalize_text(text)
    if not normalized:
        return False

    if normalized in {
        "introduction",
        "введение",
        "conclusion",
        "заключение",
        "выводы",
    }:
        return True

    word_count = len(normalized.split())
    if word_count > 7:
        return False
    if normalized.endswith((".", "!", "?")):
        return False
    return len(normalized) <= 90


@dataclass(frozen=True, slots=True)
class ParsedFileContent:
    raw_text: str
    sections: list[str]
    font_families: list[str]
    font_sizes: list[float]


@dataclass(frozen=True, slots=True)
class UnifiedDocumentParser:
    def parse(
        self,
        *,
        storage_path: str,
        file_format: Literal["pdf", "docx"],
    ) -> ParsedFileContent:
        if file_format == "docx":
            return self._parse_docx(storage_path=storage_path)
        return self._parse_pdf(storage_path=storage_path)

    def _parse_docx(self, *, storage_path: str) -> ParsedFileContent:
        path = Path(storage_path)
        raw_lines: list[str] = []
        sections: list[str] = []
        font_families: list[str] = []
        font_sizes: list[float] = []

        with zipfile.ZipFile(path) as archive:
            document_xml = archive.read("word/document.xml")
            default_font, default_size = self._extract_docx_defaults(archive=archive)
            root = ET.fromstring(document_xml)

            for paragraph in root.findall(f".//{_w('p')}"):
                paragraph_text_parts: list[str] = []
                paragraph_fonts: list[str] = []
                paragraph_sizes: list[float] = []

                style = _extract_xml_attribute(
                    paragraph.find(f"./{_w('pPr')}/{_w('pStyle')}"), "val"
                )
                is_heading_style = bool(style) and (
                    style.lower().startswith("heading")
                    or "заголовок" in style.lower()
                )

                for run in paragraph.findall(f"./{_w('r')}"):
                    run_text = "".join(
                        text_node.text or ""
                        for text_node in run.findall(f".//{_w('t')}")
                    )
                    if run_text:
                        paragraph_text_parts.append(run_text)

                    run_properties = run.find(f"./{_w('rPr')}")
                    run_font = self._extract_docx_run_font(run_properties)
                    if run_font:
                        paragraph_fonts.append(run_font)
                    run_size = self._extract_docx_run_size(run_properties)
                    if run_size is not None:
                        paragraph_sizes.append(run_size)

                paragraph_text = "".join(paragraph_text_parts).strip()
                if paragraph_text:
                    raw_lines.append(paragraph_text)
                    if is_heading_style or _looks_like_heading(paragraph_text):
                        sections.append(paragraph_text)

                if not paragraph_fonts and default_font:
                    paragraph_fonts.append(default_font)
                if not paragraph_sizes and default_size is not None:
                    paragraph_sizes.append(default_size)

                font_families.extend(paragraph_fonts)
                font_sizes.extend(paragraph_sizes)

        return ParsedFileContent(
            raw_text="\n".join(raw_lines),
            sections=self._deduplicate_sections(sections),
            font_families=font_families,
            font_sizes=font_sizes,
        )

    def _parse_pdf(self, *, storage_path: str) -> ParsedFileContent:
        path = Path(storage_path)
        text_chunks: list[str] = []
        sections: list[str] = []
        font_families: list[str] = []
        font_sizes: list[float] = []

        parsed_with_library = self._try_parse_pdf_with_pymupdf(
            path=path,
            text_chunks=text_chunks,
            sections=sections,
            font_families=font_families,
            font_sizes=font_sizes,
        )

        if not parsed_with_library:
            self._try_parse_pdf_with_pypdf(path=path, text_chunks=text_chunks, sections=sections)

        raw_text = "\n".join(chunk.strip() for chunk in text_chunks if chunk.strip())
        if not raw_text:
            raw_text = path.read_bytes().decode(errors="ignore")

        return ParsedFileContent(
            raw_text=raw_text,
            sections=self._deduplicate_sections(sections),
            font_families=font_families,
            font_sizes=font_sizes,
        )

    def _extract_docx_defaults(
        self,
        *,
        archive: zipfile.ZipFile,
    ) -> tuple[str | None, float | None]:
        if "word/styles.xml" not in archive.namelist():
            return (None, None)

        styles_root = ET.fromstring(archive.read("word/styles.xml"))
        default_run_properties = styles_root.find(
            f".//{_w('docDefaults')}/{_w('rPrDefault')}/{_w('rPr')}"
        )
        default_font = self._extract_docx_run_font(default_run_properties)
        default_size = self._extract_docx_run_size(default_run_properties)
        return (default_font, default_size)

    def _extract_docx_run_font(self, run_properties: ET.Element | None) -> str | None:
        if run_properties is None:
            return None
        fonts = run_properties.find(f"./{_w('rFonts')}")
        if fonts is None:
            return None
        return (
            _extract_xml_attribute(fonts, "ascii")
            or _extract_xml_attribute(fonts, "hAnsi")
            or _extract_xml_attribute(fonts, "cs")
            or _extract_xml_attribute(fonts, "eastAsia")
        )

    def _extract_docx_run_size(self, run_properties: ET.Element | None) -> float | None:
        if run_properties is None:
            return None
        size_node = run_properties.find(f"./{_w('sz')}")
        size_raw = _extract_xml_attribute(size_node, "val")
        if not size_raw:
            return None
        try:
            return round(int(size_raw) / 2, 2)
        except ValueError:
            return None

    def _try_parse_pdf_with_pymupdf(
        self,
        *,
        path: Path,
        text_chunks: list[str],
        sections: list[str],
        font_families: list[str],
        font_sizes: list[float],
    ) -> bool:
        try:
            import pymupdf  # type: ignore[import-not-found]
        except ImportError:
            return False

        document = pymupdf.open(str(path))
        try:
            for page in document:
                page_text = page.get_text("text") or ""
                if page_text:
                    text_chunks.append(page_text)

                page_dict = page.get_text("dict")
                if not isinstance(page_dict, dict):
                    continue

                for block in page_dict.get("blocks", []):
                    if not isinstance(block, dict) or block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        if not isinstance(line, dict):
                            continue
                        spans = line.get("spans", [])
                        if not isinstance(spans, list):
                            continue

                        line_text = "".join(
                            str(span.get("text", ""))
                            for span in spans
                            if isinstance(span, dict)
                        ).strip()
                        if line_text and _looks_like_heading(line_text):
                            sections.append(line_text)

                        for span in spans:
                            if not isinstance(span, dict):
                                continue
                            font_name = span.get("font")
                            if isinstance(font_name, str) and font_name.strip():
                                font_families.append(font_name.strip())
                            font_size = span.get("size")
                            if isinstance(font_size, (int, float)):
                                font_sizes.append(round(float(font_size), 2))
        finally:
            document.close()

        return True

    def _try_parse_pdf_with_pypdf(
        self,
        *,
        path: Path,
        text_chunks: list[str],
        sections: list[str],
    ) -> None:
        try:
            from pypdf import PdfReader  # type: ignore[import-not-found]
        except ImportError:
            return

        reader = PdfReader(str(path))
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if not page_text:
                continue
            text_chunks.append(page_text)
            for line in page_text.splitlines():
                normalized_line = line.strip()
                if normalized_line and _looks_like_heading(normalized_line):
                    sections.append(normalized_line)

    def _deduplicate_sections(self, sections: list[str]) -> list[str]:
        seen: set[str] = set()
        unique_sections: list[str] = []
        for section in sections:
            marker = _normalize_text(section)
            if not marker or marker in seen:
                continue
            seen.add(marker)
            unique_sections.append(section.strip())
        return unique_sections
