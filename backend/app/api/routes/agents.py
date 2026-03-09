"""Agent orchestration routes — comparison, planner, writer."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    AgentRun, ChatMessage, Comparison, Document, DocumentChunk,
    PaperSummary, ProjectState, Report, ReportSection, Task,
)
from app.db.session import get_db
from app.services.agents.comparison import compare_papers
from app.services.agents.gapfinder import find_gaps
from app.services.agents.planner import extract_tasks
from app.services.agents.writer import draft_literature_review
from app.services.llm import create_embedding
from app.api.routes.search import _vector_search

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["agents"])


# ---- Comparison ----

class CompareRequest(BaseModel):
    document_ids: list[str] = Field(min_length=2)


class CompareResponse(BaseModel):
    id: str
    comparison_matrix: dict | None
    narrative_summary: str | None
    document_ids: list[str]


@router.post("/compare", response_model=CompareResponse)
def compare_documents(workspace_id: UUID, payload: CompareRequest, db: Session = Depends(get_db)):
    paper_summaries_data = []
    for doc_id in payload.document_ids:
        doc = db.get(Document, UUID(doc_id))
        if not doc:
            continue
        summary = db.scalar(select(PaperSummary).where(PaperSummary.document_id == UUID(doc_id)))
        ps_dict = {
            "document_id": doc_id,
            "title": doc.title,
        }
        if summary:
            for field in ["summary_long", "problem_statement", "methodology", "datasets", "metrics", "findings", "limitations"]:
                ps_dict[field] = getattr(summary, field, None) or "Not available"
        else:
            # Use first chunks as fallback
            chunks = db.scalars(
                select(DocumentChunk)
                .where(DocumentChunk.document_id == UUID(doc_id))
                .order_by(DocumentChunk.chunk_index)
                .limit(5)
            ).all()
            ps_dict["summary_long"] = "\n".join(c.text for c in chunks)[:3000] if chunks else "No content available"
        paper_summaries_data.append(ps_dict)

    if len(paper_summaries_data) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 valid documents to compare")

    result = compare_papers(paper_summaries_data)

    comp = Comparison(
        workspace_id=workspace_id,
        document_ids=payload.document_ids,
        comparison_matrix=result.get("comparison_matrix"),
        narrative_summary=result.get("narrative_summary", ""),
    )
    db.add(comp)

    # Log agent run
    run = AgentRun(
        workspace_id=workspace_id,
        agent_name="reviewer",
        trigger_type="manual",
        input_payload={"document_ids": payload.document_ids},
        output_payload=result,
        status="completed",
    )
    db.add(run)
    db.commit()
    db.refresh(comp)

    # Post as agent message
    from app.db.models import ChatMessage as CM
    agent_msg = CM(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="reviewer",
        sender_name="Reviewer Agent",
        text=result.get("narrative_summary", "Comparison complete."),
        agent_payload=result,
    )
    db.add(agent_msg)
    db.commit()

    return CompareResponse(
        id=str(comp.id),
        comparison_matrix=comp.comparison_matrix,
        narrative_summary=comp.narrative_summary,
        document_ids=comp.document_ids,
    )


# ---- Planner ----

class PlannerRequest(BaseModel):
    message_limit: int = 30


class PlannerResponse(BaseModel):
    tasks: list[dict]
    blockers: list[str]
    next_steps: list[str]


@router.post("/planner/extract", response_model=PlannerResponse)
def run_planner(workspace_id: UUID, payload: PlannerRequest, db: Session = Depends(get_db)):
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.workspace_id == workspace_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(payload.message_limit)
    ).all()

    if not messages:
        raise HTTPException(status_code=400, detail="No messages to analyze")

    msg_dicts = [
        {"sender_name": m.sender_name, "sender_id": m.sender_id, "text": m.text}
        for m in reversed(list(messages))
    ]

    # Get project context
    state = db.scalar(select(ProjectState).where(ProjectState.workspace_id == workspace_id))
    ctx = ""
    if state:
        ctx = f"Research goal: {state.research_goal or 'Not set'}\nScope: {state.scope or 'Not set'}"

    result = extract_tasks(msg_dicts, project_context=ctx)

    # Create task records
    created_tasks = []
    for t in result.get("tasks", []):
        task = Task(
            workspace_id=workspace_id,
            title=t.get("title", "Untitled task"),
            description=t.get("description"),
            priority=t.get("priority", "medium"),
            assignee=t.get("assignee"),
            status="proposed",
            created_by="planner-agent",
        )
        db.add(task)
        created_tasks.append(t)

    # Log agent run
    run = AgentRun(
        workspace_id=workspace_id,
        agent_name="planner",
        trigger_type="manual",
        input_payload={"message_count": len(msg_dicts)},
        output_payload=result,
        status="completed",
    )
    db.add(run)
    db.commit()

    # Post as agent message
    task_list = "\n".join(f"- {t.get('title', '')}" for t in created_tasks)
    agent_msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="planner",
        sender_name="Planner Agent",
        text=f"I've extracted the following tasks from the discussion:\n{task_list}",
        agent_payload=result,
    )
    db.add(agent_msg)
    db.commit()

    return PlannerResponse(
        tasks=result.get("tasks", []),
        blockers=result.get("blockers", []),
        next_steps=result.get("next_steps", []),
    )


# ---- Writer ----

class WriterRequest(BaseModel):
    document_ids: list[str] = []
    topic: str = ""
    report_id: str | None = None


class WriterResponse(BaseModel):
    title: str
    content: str
    citations: list[dict]
    report_id: str | None
    section_id: str | None


@router.post("/writer/draft", response_model=WriterResponse)
def run_writer(workspace_id: UUID, payload: WriterRequest, db: Session = Depends(get_db)):
    # Gather paper summaries
    paper_summaries_data = []
    doc_ids = payload.document_ids

    if not doc_ids:
        # Use all workspace documents
        docs = db.scalars(
            select(Document).where(
                Document.workspace_id == workspace_id,
                Document.status == "ready",
            )
        ).all()
        doc_ids = [str(d.id) for d in docs]

    for doc_id in doc_ids:
        doc = db.get(Document, UUID(doc_id))
        if not doc:
            continue
        summary = db.scalar(select(PaperSummary).where(PaperSummary.document_id == UUID(doc_id)))
        ps_dict = {"document_id": doc_id, "title": doc.title}
        if summary:
            for field in ["summary_long", "problem_statement", "methodology", "findings", "limitations"]:
                ps_dict[field] = getattr(summary, field, None) or "N/A"
        paper_summaries_data.append(ps_dict)

    if not paper_summaries_data:
        raise HTTPException(status_code=400, detail="No documents available for writing")

    # Get evidence chunks if topic provided
    evidence = []
    if payload.topic:
        try:
            emb = create_embedding(payload.topic)
            evidence = _vector_search(db, workspace_id, emb, 15)
        except Exception:
            pass

    result = draft_literature_review(paper_summaries_data, topic=payload.topic, evidence_chunks=evidence)

    # Store in report if report_id provided
    section_id = None
    if payload.report_id:
        report = db.get(Report, UUID(payload.report_id))
        if report:
            section = ReportSection(
                report_id=report.id,
                section_key="related-work",
                title=result.get("title", "Related Work"),
                content=result.get("content", ""),
                source_document_ids=doc_ids,
                citations=result.get("citations", []),
            )
            db.add(section)
            db.commit()
            db.refresh(section)
            section_id = str(section.id)

    # Log agent run
    run = AgentRun(
        workspace_id=workspace_id,
        agent_name="writer",
        trigger_type="manual",
        input_payload={"document_ids": doc_ids, "topic": payload.topic},
        output_payload=result,
        status="completed",
    )
    db.add(run)
    db.commit()

    # Post as agent message
    content_preview = (result.get("content", "")[:300] + "...") if len(result.get("content", "")) > 300 else result.get("content", "")
    agent_msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="writer",
        sender_name="Writer Agent",
        text=f"**{result.get('title', 'Literature Review')}**\n\n{content_preview}",
        agent_payload=result,
    )
    db.add(agent_msg)
    db.commit()

    return WriterResponse(
        title=result.get("title", "Literature Review"),
        content=result.get("content", ""),
        citations=result.get("citations", []),
        report_id=payload.report_id,
        section_id=section_id,
    )


# ---- Gap Finder ----

class GapFinderResponse(BaseModel):
    gaps: list[dict]
    overall_assessment: str


@router.post("/gaps", response_model=GapFinderResponse)
def find_research_gaps(workspace_id: UUID, db: Session = Depends(get_db)):
    docs = db.scalars(
        select(Document).where(Document.workspace_id == workspace_id, Document.status == "ready")
    ).all()

    if not docs:
        raise HTTPException(status_code=400, detail="No processed documents in workspace")

    paper_summaries_data = []
    for doc in docs:
        summary = db.scalar(select(PaperSummary).where(PaperSummary.document_id == doc.id))
        ps_dict = {"document_id": str(doc.id), "title": doc.title}
        if summary:
            for field in ["summary_long", "problem_statement", "methodology", "findings", "limitations"]:
                ps_dict[field] = getattr(summary, field, None) or "N/A"
        paper_summaries_data.append(ps_dict)

    state = db.scalar(select(ProjectState).where(ProjectState.workspace_id == workspace_id))
    goal = state.research_goal if state else ""

    result = find_gaps(paper_summaries_data, research_goal=goal)

    # Log agent run
    run = AgentRun(
        workspace_id=workspace_id,
        agent_name="gapfinder",
        trigger_type="manual",
        input_payload={"document_count": len(docs)},
        output_payload=result,
        status="completed",
    )
    db.add(run)

    # Post as agent message
    gaps_text = "\n".join(f"- **{g.get('title', '')}**: {g.get('description', '')}" for g in result.get("gaps", []))
    agent_msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="gapfinder",
        sender_name="Gap Finder Agent",
        text=f"Research gaps identified:\n{gaps_text}\n\n{result.get('overall_assessment', '')}",
        agent_payload=result,
    )
    db.add(agent_msg)
    db.commit()

    return GapFinderResponse(
        gaps=result.get("gaps", []),
        overall_assessment=result.get("overall_assessment", ""),
    )
