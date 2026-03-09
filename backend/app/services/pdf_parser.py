"""PDF text extraction using pypdf."""
from __future__ import annotations

from pathlib import Path

from pypdf import PdfReader


def extract_text_from_pdf(file_path: str | Path) -> dict:
    """Return full text, page texts, and page count."""
    reader = PdfReader(str(file_path))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)

    full_text = "\n\n".join(pages)
    return {
        "full_text": full_text,
        "pages": pages,
        "page_count": len(pages),
    }
