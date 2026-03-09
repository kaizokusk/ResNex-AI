from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func, event
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# ---------------------------------------------------------------------------
# Workspace & Project State
# ---------------------------------------------------------------------------

class Workspace(TimestampMixin, Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text())
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)

    project_state: Mapped[ProjectState | None] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    documents: Mapped[list[Document]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    chat_messages: Mapped[list[ChatMessage]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    chat_summaries: Mapped[list[ChatSummary]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    decisions: Mapped[list[Decision]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    reports: Mapped[list[Report]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    agent_runs: Mapped[list[AgentRun]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    comparisons: Mapped[list[Comparison]] = relationship(back_populates="workspace", cascade="all, delete-orphan")


class ProjectState(TimestampMixin, Base):
    __tablename__ = "project_states"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    research_goal: Mapped[str | None] = mapped_column(Text())
    scope: Mapped[str | None] = mapped_column(Text())
    selected_document_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    key_findings: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    open_questions: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    decisions: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    tasks: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default="[]")
    owners: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    report_status: Mapped[str] = mapped_column(String(50), default="not-started", server_default="not-started")
    last_chat_summary_id: Mapped[str | None] = mapped_column(String(255))

    workspace: Mapped[Workspace] = relationship(back_populates="project_state")


# ---------------------------------------------------------------------------
# Documents & Chunks (with pgvector embeddings)
# ---------------------------------------------------------------------------

class Document(TimestampMixin, Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(50), default="pdf")
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    authors: Mapped[str | None] = mapped_column(Text())
    abstract: Mapped[str | None] = mapped_column(Text())
    year: Mapped[int | None] = mapped_column(Integer())
    venue: Mapped[str | None] = mapped_column(String(512))
    doi: Mapped[str | None] = mapped_column(String(255))
    arxiv_id: Mapped[str | None] = mapped_column(String(255))
    url: Mapped[str | None] = mapped_column(Text())
    storage_path: Mapped[str | None] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(50), default="pending", server_default="pending")
    page_count: Mapped[int | None] = mapped_column(Integer())
    full_text: Mapped[str | None] = mapped_column(Text())

    workspace: Mapped[Workspace] = relationship(back_populates="documents")
    chunks: Mapped[list[DocumentChunk]] = relationship(back_populates="document", cascade="all, delete-orphan")
    paper_summary: Mapped[PaperSummary | None] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(TimestampMixin, Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer(), nullable=False)
    section: Mapped[str | None] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text(), nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer())
    page_number: Mapped[int | None] = mapped_column(Integer())
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    # embedding stored as float array; we create a pgvector column via DDL event
    embedding: Mapped[list | None] = mapped_column(ARRAY(Float), nullable=True)

    document: Mapped[Document] = relationship(back_populates="chunks")


class PaperSummary(TimestampMixin, Base):
    __tablename__ = "paper_summaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    summary_short: Mapped[str | None] = mapped_column(Text())
    summary_long: Mapped[str | None] = mapped_column(Text())
    problem_statement: Mapped[str | None] = mapped_column(Text())
    methodology: Mapped[str | None] = mapped_column(Text())
    datasets: Mapped[str | None] = mapped_column(Text())
    metrics: Mapped[str | None] = mapped_column(Text())
    findings: Mapped[str | None] = mapped_column(Text())
    limitations: Mapped[str | None] = mapped_column(Text())
    assumptions: Mapped[str | None] = mapped_column(Text())
    keywords: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")

    document: Mapped[Document] = relationship(back_populates="paper_summary")


# ---------------------------------------------------------------------------
# Chat & Collaboration
# ---------------------------------------------------------------------------

class ChatMessage(TimestampMixin, Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[str | None] = mapped_column(String(255))
    sender_type: Mapped[str] = mapped_column(String(50), default="human")  # human | agent
    sender_id: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_name: Mapped[str | None] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text(), nullable=False)
    mentions: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    citations: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default="[]")
    agent_payload: Mapped[dict | None] = mapped_column(JSONB)

    workspace: Mapped[Workspace] = relationship(back_populates="chat_messages")


class ChatSummary(TimestampMixin, Base):
    __tablename__ = "chat_summaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[str | None] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text(), nullable=False)
    decisions_extracted: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    action_items: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    open_questions: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")

    workspace: Mapped[Workspace] = relationship(back_populates="chat_summaries")


class Decision(TimestampMixin, Base):
    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(50), default="proposed")
    source_chat_summary_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    workspace: Mapped[Workspace] = relationship(back_populates="decisions")


class Task(TimestampMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text())
    status: Mapped[str] = mapped_column(String(50), default="proposed", server_default="proposed")
    priority: Mapped[str] = mapped_column(String(50), default="medium", server_default="medium")
    assignee: Mapped[str | None] = mapped_column(String(255))
    due_date: Mapped[str | None] = mapped_column(String(50))
    created_by: Mapped[str | None] = mapped_column(String(255))

    workspace: Mapped[Workspace] = relationship(back_populates="tasks")


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

class Comparison(TimestampMixin, Base):
    __tablename__ = "comparisons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    document_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    comparison_matrix: Mapped[dict | None] = mapped_column(JSONB)
    narrative_summary: Mapped[str | None] = mapped_column(Text())

    workspace: Mapped[Workspace] = relationship(back_populates="comparisons")


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

class Report(TimestampMixin, Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", server_default="draft")
    outline: Mapped[dict | None] = mapped_column(JSONB)

    workspace: Mapped[Workspace] = relationship(back_populates="reports")
    sections: Mapped[list[ReportSection]] = relationship(back_populates="report", cascade="all, delete-orphan")


class ReportSection(TimestampMixin, Base):
    __tablename__ = "report_sections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    section_key: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str | None] = mapped_column(Text())
    source_document_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    citations: Mapped[list[dict]] = mapped_column(JSONB, default=list, server_default="[]")
    version: Mapped[int] = mapped_column(Integer(), default=1, server_default="1")

    report: Mapped[Report] = relationship(back_populates="sections")


# ---------------------------------------------------------------------------
# Agent Runs
# ---------------------------------------------------------------------------

class AgentRun(TimestampMixin, Base):
    __tablename__ = "agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(100), default="manual")
    input_payload: Mapped[dict | None] = mapped_column(JSONB)
    output_payload: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(50), default="queued", server_default="queued")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workspace: Mapped[Workspace] = relationship(back_populates="agent_runs")