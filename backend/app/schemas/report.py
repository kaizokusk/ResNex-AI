"""Report schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=512)


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    title: str
    status: str
    outline: dict | None
    created_at: datetime
    updated_at: datetime


class ReportSectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    report_id: UUID
    section_key: str
    title: str
    content: str | None
    source_document_ids: list[str]
    citations: list[dict]
    version: int
    created_at: datetime


class ReportWithSections(ReportRead):
    sections: list[ReportSectionRead] = []
