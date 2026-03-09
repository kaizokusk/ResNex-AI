"""Document chunking with metadata."""
from __future__ import annotations

import re


def chunk_text(pages: list[str], chunk_size: int = 800, chunk_overlap: int = 200) -> list[dict]:
    """Split page texts into overlapping chunks with page provenance."""
    chunks: list[dict] = []
    idx = 0
    for page_num, page_text in enumerate(pages, start=1):
        if not page_text.strip():
            continue
        # Split into paragraphs first
        paragraphs = re.split(r"\n{2,}", page_text)
        buffer = ""
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(buffer) + len(para) > chunk_size and buffer:
                chunks.append({
                    "chunk_index": idx,
                    "text": buffer.strip(),
                    "page_number": page_num,
                    "token_count": len(buffer.split()),
                })
                idx += 1
                # Keep overlap
                words = buffer.split()
                overlap_words = words[-chunk_overlap // 4:] if len(words) > chunk_overlap // 4 else words
                buffer = " ".join(overlap_words) + " " + para
            else:
                buffer = buffer + "\n\n" + para if buffer else para

        if buffer.strip():
            chunks.append({
                "chunk_index": idx,
                "text": buffer.strip(),
                "page_number": page_num,
                "token_count": len(buffer.split()),
            })
            idx += 1

    return chunks
