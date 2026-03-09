from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=3, max_length=255)
    description: str | None = None
    created_by: str = Field(min_length=1, max_length=255)
    research_goal: str | None = None
    scope: str | None = None


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime