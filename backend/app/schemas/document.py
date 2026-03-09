"""Document and chunk schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    source_type: str
    title: str
    authors: str | None
    abstract: str | None
    year: int | None
    venue: str | None
    doi: str | None
    arxiv_id: str | None
    url: str | None
    status: str
    page_count: int | None
    created_at: datetime
    updated_at: datetime


class PaperSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    summary_short: str | None
    summary_long: str | None
    problem_statement: str | None
    methodology: str | None
    datasets: str | None
    metrics: str | None
    findings: str | None
    limitations: str | None
    assumptions: str | None
    keywords: list[str]
    created_at: datetime


class DocumentWithSummary(DocumentRead):
    paper_summary: PaperSummaryRead | None = None


class ChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    chunk_index: int
    section: str | None
    text: str
    token_count: int | None
    page_number: int | None
