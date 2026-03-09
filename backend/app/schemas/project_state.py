from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    research_goal: str | None
    scope: str | None
    selected_document_ids: list[str]
    key_findings: list[str]
    open_questions: list[str]
    decisions: list[str]
    tasks: list[dict]
    owners: list[str]
    report_status: str
    last_chat_summary_id: str | None
    created_at: datetime
    updated_at: datetime


class ProjectStateUpdate(BaseModel):
    research_goal: str | None = None
    scope: str | None = None
    selected_document_ids: list[str] | None = None
    key_findings: list[str] | None = None
    open_questions: list[str] | None = None
    decisions: list[str] | None = None
    tasks: list[dict] | None = None
    owners: list[str] | None = None
    report_status: str | None = None
    last_chat_summary_id: str | None = None