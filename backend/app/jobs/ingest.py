"""Document ingestion job — parse PDF, chunk, embed, summarize."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.db.models import Document, DocumentChunk, PaperSummary
from app.services.pdf_parser import extract_text_from_pdf
from app.services.chunker import chunk_text
from app.services.llm import create_embeddings
from app.services.agents.summarizer import generate_paper_summary


def ingest_document(document_id: str) -> dict:
    """Full ingestion pipeline: parse -> chunk -> embed -> summarize."""
    settings = get_settings()
    db = SessionLocal()
    try:
        doc = db.get(Document, uuid.UUID(document_id))
        if doc is None:
            return {"error": "Document not found", "document_id": document_id}

        doc.status = "processing"
        db.commit()

        # 1. Parse PDF
        file_path = doc.storage_path
        if not file_path:
            doc.status = "failed"
            db.commit()
            return {"error": "No file path", "document_id": document_id}

        extraction = extract_text_from_pdf(file_path)
        doc.full_text = extraction["full_text"]
        doc.page_count = extraction["page_count"]
        db.commit()

        # 2. Chunk
        chunks = chunk_text(extraction["pages"])
        if not chunks:
            doc.status = "ready"
            db.commit()
            return {"document_id": document_id, "status": "ready", "chunks_created": 0, "page_count": extraction["page_count"]}

        # 3. Embed (batch)
        chunk_texts = [c["text"] for c in chunks]
        batch_size = 50
        all_embeddings: list[list[float]] = []
        for i in range(0, len(chunk_texts), batch_size):
            batch = chunk_texts[i:i + batch_size]
            embs = create_embeddings(batch)
            all_embeddings.extend(embs)

        # 4. Store chunks
        for chunk_data, embedding in zip(chunks, all_embeddings):
            chunk_obj = DocumentChunk(
                document_id=doc.id,
                workspace_id=doc.workspace_id,
                chunk_index=chunk_data["chunk_index"],
                text=chunk_data["text"],
                token_count=chunk_data.get("token_count"),
                page_number=chunk_data.get("page_number"),
                embedding=embedding,
            )
            db.add(chunk_obj)
        db.commit()

        # 5. Generate summary
        try:
            summary_data = generate_paper_summary(extraction["full_text"], title=doc.title)
            paper_summary = PaperSummary(
                document_id=doc.id,
                summary_short=summary_data.get("summary_short", ""),
                summary_long=summary_data.get("summary_long", ""),
                problem_statement=summary_data.get("problem_statement", ""),
                methodology=summary_data.get("methodology", ""),
                datasets=summary_data.get("datasets", ""),
                metrics=summary_data.get("metrics", ""),
                findings=summary_data.get("findings", ""),
                limitations=summary_data.get("limitations", ""),
                assumptions=summary_data.get("assumptions", ""),
                keywords=summary_data.get("keywords", []),
            )
            db.add(paper_summary)
        except Exception as e:
            print(f"Summary generation failed: {e}")

        doc.status = "ready"
        db.commit()

        return {
            "document_id": document_id,
            "status": "ready",
            "chunks_created": len(chunks),
            "page_count": extraction["page_count"],
        }

    except Exception as e:
        doc = db.get(Document, uuid.UUID(document_id))
        if doc:
            doc.status = "failed"
            db.commit()
        return {"error": str(e), "document_id": document_id}
    finally:
        db.close()
