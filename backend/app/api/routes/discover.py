"""Paper discovery routes — arXiv search/import, Semantic Scholar."""
from __future__ import annotations

import os
import uuid as _uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.queue import get_queue
from app.db.models import Document
from app.db.session import get_db
from app.jobs.ingest import ingest_document
from app.services.arxiv_service import search_arxiv, fetch_paper_metadata, download_paper_pdf
from app.services.semantic_scholar_service import (
    search_papers as ss_search,
    get_related_papers as ss_related,
    get_paper as ss_get_paper,
)

router = APIRouter(prefix="/workspaces/{workspace_id}/discover", tags=["discover"])


# ─── arXiv ───────────────────────────────────────────────────────────────

class ArxivSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    max_results: int = 10
    categories: list[str] | None = None
    sort_by: str = "relevance"


class ArxivImportRequest(BaseModel):
    arxiv_id: str = Field(min_length=1)


@router.post("/arxiv/search")
def arxiv_search(workspace_id: UUID, payload: ArxivSearchRequest):
    """Search arXiv for papers matching a query."""
    results = search_arxiv(
        query=payload.query,
        max_results=payload.max_results,
        categories=payload.categories,
        sort_by=payload.sort_by,
    )
    return {"results": results, "count": len(results), "query": payload.query}


@router.post("/arxiv/import")
def arxiv_import(
    workspace_id: UUID,
    payload: ArxivImportRequest,
    db: Session = Depends(get_db),
):
    """Import a paper from arXiv by ID — downloads PDF and triggers ingestion."""
    # Check for duplicate (strip version suffix for matching)
    base_id = payload.arxiv_id.split("v")[0] if "v" in payload.arxiv_id else payload.arxiv_id
    existing = db.scalar(
        select(Document).where(
            Document.workspace_id == workspace_id,
            Document.arxiv_id.ilike(f"{base_id}%"),
        )
    )
    if existing:
        return {
            "document_id": str(existing.id),
            "status": existing.status,
            "message": "Paper already imported",
            "duplicate": True,
        }

    # Fetch metadata
    meta = fetch_paper_metadata(payload.arxiv_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"arXiv paper {payload.arxiv_id} not found")

    # Download PDF
    try:
        file_path = download_paper_pdf(payload.arxiv_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to download PDF: {e}")

    # Create document record with full metadata
    authors_list = meta.get("authors") or []
    doc = Document(
        workspace_id=workspace_id,
        title=meta["title"],
        source_type="arxiv",
        storage_path=file_path,
        status="pending",
        authors=", ".join(authors_list) if authors_list else None,
        abstract=meta.get("abstract"),
        year=meta.get("year"),
        arxiv_id=meta.get("arxiv_id"),
        doi=meta.get("doi"),
        url=meta.get("url"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Queue ingestion
    try:
        job = get_queue().enqueue(ingest_document, str(doc.id), job_timeout=600)
    except Exception as e:
        print(f"Failed to enqueue ingest job: {e}")

    return {
        "document_id": str(doc.id),
        "title": doc.title,
        "arxiv_id": doc.arxiv_id,
        "status": "pending",
        "message": "Paper imported — ingestion started",
        "duplicate": False,
    }


# ─── Semantic Scholar ────────────────────────────────────────────────────

class SSSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = 10
    year: str | None = None


class SSRelatedRequest(BaseModel):
    paper_id: str = Field(min_length=1, description="S2 paper ID, DOI (DOI:xxx), or arXiv ID (ARXIV:xxx)")
    limit: int = 10


@router.post("/semantic-scholar/search")
def semantic_scholar_search(workspace_id: UUID, payload: SSSearchRequest):
    """Search Semantic Scholar for papers."""
    results = ss_search(query=payload.query, limit=payload.limit, year=payload.year)
    return {"results": results, "count": len(results), "query": payload.query}


@router.post("/semantic-scholar/related")
def semantic_scholar_related(workspace_id: UUID, payload: SSRelatedRequest):
    """Find papers related to a given paper via Semantic Scholar."""
    results = ss_related(paper_id=payload.paper_id, limit=payload.limit)
    return {"results": results, "count": len(results), "paper_id": payload.paper_id}


# ─── Import from URL / Semantic Scholar result ──────────────────────────

class URLImportRequest(BaseModel):
    pdf_url: str = Field(min_length=1)
    title: str = ""
    authors: list[str] | None = None
    abstract: str | None = None
    year: int | None = None
    arxiv_id: str | None = None
    doi: str | None = None


@router.post("/import-url")
def import_from_url(
    workspace_id: UUID,
    payload: URLImportRequest,
    db: Session = Depends(get_db),
):
    """Import a paper by downloading its PDF from a URL."""
    import httpx

    settings = get_settings()
    ws_dir = os.path.join(settings.upload_dir, str(workspace_id))
    os.makedirs(ws_dir, exist_ok=True)

    file_id = str(_uuid.uuid4())
    file_path = os.path.join(ws_dir, f"{file_id}.pdf")

    # Download the PDF
    try:
        resp = httpx.get(payload.pdf_url, follow_redirects=True, timeout=30.0)
        resp.raise_for_status()
        with open(file_path, "wb") as f:
            f.write(resp.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to download PDF: {e}")

    authors_list = payload.authors or []
    doc = Document(
        workspace_id=workspace_id,
        title=payload.title or "Imported Paper",
        source_type="url",
        storage_path=file_path,
        status="pending",
        authors=", ".join(authors_list) if authors_list else None,
        abstract=payload.abstract,
        year=payload.year,
        arxiv_id=payload.arxiv_id,
        doi=payload.doi,
        url=payload.pdf_url,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        get_queue().enqueue(ingest_document, str(doc.id), job_timeout=600)
    except Exception as e:
        print(f"Failed to enqueue ingest job: {e}")

    return {
        "document_id": str(doc.id),
        "title": doc.title,
        "status": "pending",
        "message": "Paper imported from URL — ingestion started",
    }
