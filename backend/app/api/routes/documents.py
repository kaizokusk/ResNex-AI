"""Document upload, listing, and detail routes."""
from __future__ import annotations

import os
import uuid as _uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.queue import get_queue
from app.db.models import Document, PaperSummary
from app.db.session import get_db
from app.jobs.ingest import ingest_document
from app.schemas.document import DocumentRead, DocumentWithSummary, PaperSummaryRead

router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(
    workspace_id: UUID,
    file: UploadFile = File(...),
    title: str = Form(""),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Save file to disk
    file_id = str(_uuid.uuid4())
    ws_dir = os.path.join(settings.upload_dir, str(workspace_id))
    os.makedirs(ws_dir, exist_ok=True)
    file_path = os.path.join(ws_dir, f"{file_id}.pdf")

    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    doc_title = title or file.filename or "Untitled"
    doc = Document(
        workspace_id=workspace_id,
        title=doc_title,
        source_type="pdf",
        storage_path=file_path,
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Queue ingestion job
    try:
        get_queue().enqueue(ingest_document, str(doc.id), job_timeout=600)
    except Exception as e:
        print(f"Failed to enqueue ingest job: {e}")

    return doc


@router.get("", response_model=list[DocumentRead])
def list_documents(workspace_id: UUID, db: Session = Depends(get_db)):
    docs = db.scalars(
        select(Document)
        .where(Document.workspace_id == workspace_id)
        .order_by(Document.created_at.desc())
    ).all()
    return list(docs)


@router.get("/{document_id}", response_model=DocumentWithSummary)
def get_document(workspace_id: UUID, document_id: UUID, db: Session = Depends(get_db)):
    doc = db.scalar(
        select(Document)
        .options(joinedload(Document.paper_summary))
        .where(Document.id == document_id, Document.workspace_id == workspace_id)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{document_id}/summary", response_model=PaperSummaryRead)
def get_document_summary(workspace_id: UUID, document_id: UUID, db: Session = Depends(get_db)):
    summary = db.scalar(
        select(PaperSummary).where(PaperSummary.document_id == document_id)
    )
    if summary is None:
        raise HTTPException(status_code=404, detail="Summary not yet available")
    return summary


@router.post("/{document_id}/reindex", response_model=dict)
def reindex_document(workspace_id: UUID, document_id: UUID, db: Session = Depends(get_db)):
    doc = db.scalar(
        select(Document).where(Document.id == document_id, Document.workspace_id == workspace_id)
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "pending"
    db.commit()

    try:
        job = get_queue().enqueue(ingest_document, str(doc.id), job_timeout=600)
        return {"job_id": job.id, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
