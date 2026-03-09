"""Chat message and summary schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ChatMessageCreate(BaseModel):
    sender_type: str = "human"
    sender_id: str
    sender_name: str | None = None
    text: str = Field(min_length=1)
    mentions: list[str] = []


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    thread_id: str | None
    sender_type: str
    sender_id: str
    sender_name: str | None
    text: str
    mentions: list[str]
    citations: list[dict]
    agent_payload: dict | None
    created_at: datetime


class ChatSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    summary: str
    decisions_extracted: list[str]
    action_items: list[str]
    open_questions: list[str]
    created_at: datetime
