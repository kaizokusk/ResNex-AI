"""Chat message and summary routes."""
from __future__ import annotations

import logging
import re
import threading
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ChatMessage, ChatSummary, Document, PaperSummary, ProjectState
from app.db.session import get_db, SessionLocal
from app.schemas.chat import ChatMessageCreate, ChatMessageRead, ChatSummaryRead
from app.services.agents.chat_summarizer import summarize_chat

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["chat"])
logger = logging.getLogger(__name__)

AGENT_NAMES = {"summarizer", "reviewer", "planner", "writer", "visualizer", "gapfinder", "meeting-agent", "librarian"}


def _parse_mentions(text: str) -> list[str]:
    """Extract @agent mentions from message text."""
    found = re.findall(r"@(\w[\w-]*)", text)
    return [m for m in found if m in AGENT_NAMES]


def _run_agent_for_mention(workspace_id: str, mention: str, user_text: str):
    """Run the appropriate agent for a detected @mention and save response as chat message."""
    db = SessionLocal()
    try:
        if mention == "librarian":
            from app.services.agents.qa import answer_question
            from app.services.llm import create_embedding
            # Use the user's message as a question, retrieve context chunks
            query_embedding = create_embedding(user_text)
            embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
            from sqlalchemy import text as sa_text
            rows = db.execute(sa_text("""
                SELECT dc.id, dc.document_id, dc.text, dc.page_number, dc.chunk_index,
                       d.title as document_title,
                       1 - (CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector)) as score
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE dc.workspace_id = :workspace_id AND dc.embedding IS NOT NULL
                ORDER BY CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector)
                LIMIT 5
            """), {"workspace_id": workspace_id, "embedding": embedding_str, "top_k": 5}).fetchall()
            context = [{"document_id": str(r.document_id), "document_title": r.document_title, "text": r.text, "page_number": r.page_number} for r in rows]
            result = answer_question(user_text, context)
            answer = result.get("answer", "I couldn't find relevant information.")
            msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="librarian", sender_name="Librarian Agent", text=answer, citations=result.get("citations", []), agent_payload=result)
            db.add(msg); db.commit()

        elif mention == "planner":
            from app.services.agents.planner import extract_tasks
            messages = db.scalars(select(ChatMessage).where(ChatMessage.workspace_id == workspace_id).order_by(ChatMessage.created_at.desc()).limit(30)).all()
            msg_dicts = [{"sender_name": m.sender_name or m.sender_id, "text": m.text} for m in reversed(list(messages))]
            result = extract_tasks(msg_dicts)
            tasks = result.get("tasks", [])
            text = "I've extracted the following tasks from the discussion:\n" + "\n".join(f"- **{t['title']}** ({t.get('priority','medium')}): {t.get('description','')}" for t in tasks)
            if result.get("next_steps"):
                text += "\n\nNext steps:\n" + "\n".join(f"- {s}" for s in result["next_steps"])
            msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="planner", sender_name="Planner Agent", text=text, agent_payload=result)
            db.add(msg); db.commit()

        elif mention == "writer":
            from app.services.agents.writer import draft_section
            summaries = db.scalars(select(PaperSummary).join(Document).where(Document.workspace_id == workspace_id)).all()
            summary_dicts = [{"title": s.document_id, "summary": s.summary_long or s.summary_short} for s in summaries]
            # Extract topic from user message
            topic = re.sub(r"@\w[\w-]*", "", user_text).strip() or "literature review"
            result = draft_section(topic, summary_dicts)
            text = f"**{result.get('title', topic)}**\n\n{result.get('content', '')}"
            msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="writer", sender_name="Writer Agent", text=text, agent_payload=result)
            db.add(msg); db.commit()

        elif mention == "gapfinder":
            from app.services.agents.gapfinder import find_gaps
            summaries = db.scalars(select(PaperSummary).join(Document).where(Document.workspace_id == workspace_id)).all()
            summary_dicts = [{"title": s.document_id, "summary": s.summary_long or s.summary_short, "limitations": s.limitations, "methodology": s.methodology} for s in summaries]
            result = find_gaps(summary_dicts)
            gaps = result.get("gaps", [])
            text = "**Research Gaps Identified:**\n\n" + "\n".join(f"- **{g.get('title', g.get('gap',''))}**: {g.get('description', g.get('explanation',''))}" for g in gaps)
            if result.get("suggested_directions"):
                text += "\n\n**Suggested Directions:**\n" + "\n".join(f"- {d}" for d in result["suggested_directions"])
            elif result.get("overall_assessment"):
                text += "\n\n**Overall Assessment:**\n" + result["overall_assessment"]
            msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="gapfinder", sender_name="Gap Finder Agent", text=text, agent_payload=result)
            db.add(msg); db.commit()

        elif mention in ("meeting-agent", "summarizer"):
            # Trigger chat summary inline
            messages = db.scalars(select(ChatMessage).where(ChatMessage.workspace_id == workspace_id).order_by(ChatMessage.created_at.desc()).limit(50)).all()
            if messages:
                msg_dicts = [{"sender_name": m.sender_name or m.sender_id, "text": m.text} for m in reversed(list(messages))]
                result = summarize_chat(msg_dicts)
                msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="meeting-agent", sender_name="Meeting Agent", text=result.get("summary", "Summary generated."), agent_payload=result)
                db.add(msg); db.commit()

        elif mention == "reviewer":
            from app.services.agents.comparison import compare_papers
            summaries = db.scalars(select(PaperSummary).join(Document).where(Document.workspace_id == workspace_id)).all()
            if len(summaries) >= 2:
                summary_dicts = [{"document_id": str(s.document_id), "title": str(s.document_id), "summary": s.summary_long or s.summary_short, "methodology": s.methodology, "findings": s.findings, "limitations": s.limitations, "datasets": s.datasets, "metrics": s.metrics} for s in summaries[:5]]
                result = compare_papers(summary_dicts)
                text = result.get("narrative_summary", "Comparison completed.")
                msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="reviewer", sender_name="Reviewer Agent", text=text, agent_payload=result)
                db.add(msg); db.commit()
            else:
                msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id="reviewer", sender_name="Reviewer Agent", text="I need at least 2 papers in the library to run a comparison.")
                db.add(msg); db.commit()

    except Exception as e:
        logger.error(f"Agent @{mention} failed: {e}")
        try:
            err_msg = ChatMessage(workspace_id=workspace_id, sender_type="agent", sender_id=mention, sender_name=f"{mention.title()} Agent", text=f"Sorry, I encountered an error: {str(e)[:200]}")
            db.add(err_msg); db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.get("/messages", response_model=list[ChatMessageRead])
def list_messages(workspace_id: UUID, limit: int = 100, db: Session = Depends(get_db)):
    msgs = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.workspace_id == workspace_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    ).all()
    return list(msgs)


@router.post("/messages", response_model=ChatMessageRead, status_code=status.HTTP_201_CREATED)
def send_message(workspace_id: UUID, payload: ChatMessageCreate, bg: BackgroundTasks = BackgroundTasks(), db: Session = Depends(get_db)):
    mentions = _parse_mentions(payload.text)
    msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type=payload.sender_type,
        sender_id=payload.sender_id,
        sender_name=payload.sender_name,
        text=payload.text,
        mentions=mentions or payload.mentions,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Auto-trigger agents for detected @mentions
    for mention in mentions:
        bg.add_task(_run_agent_for_mention, str(workspace_id), mention, payload.text)

    return msg


@router.post("/summaries/chat", response_model=ChatSummaryRead)
def generate_chat_summary(workspace_id: UUID, db: Session = Depends(get_db)):
    """Summarize recent chat messages and update project state."""
    messages = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.workspace_id == workspace_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(50)
    ).all()

    if not messages:
        raise HTTPException(status_code=400, detail="No messages to summarize")

    msg_dicts = [
        {"sender_name": m.sender_name, "sender_id": m.sender_id, "text": m.text}
        for m in reversed(list(messages))
    ]

    result = summarize_chat(msg_dicts)

    summary = ChatSummary(
        workspace_id=workspace_id,
        summary=result.get("summary", ""),
        decisions_extracted=result.get("decisions", []),
        action_items=result.get("action_items", []),
        open_questions=result.get("open_questions", []),
    )
    db.add(summary)

    # Update project state with findings from chat summary
    state = db.scalar(select(ProjectState).where(ProjectState.workspace_id == workspace_id))
    if state:
        if result.get("decisions"):
            existing = state.decisions or []
            state.decisions = existing + result["decisions"]
        if result.get("open_questions"):
            existing = state.open_questions or []
            state.open_questions = existing + result["open_questions"]
        if result.get("key_findings"):
            existing = state.key_findings or []
            state.key_findings = existing + result["key_findings"]
        state.last_chat_summary_id = str(summary.id)

    db.commit()
    db.refresh(summary)

    # Also post summary as agent message
    agent_msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="meeting-agent",
        sender_name="Meeting Agent",
        text=result.get("summary", "Summary generated."),
        agent_payload=result,
    )
    db.add(agent_msg)
    db.commit()

    return summary


@router.get("/summaries/chat", response_model=list[ChatSummaryRead])
def list_chat_summaries(workspace_id: UUID, db: Session = Depends(get_db)):
    summaries = db.scalars(
        select(ChatSummary)
        .where(ChatSummary.workspace_id == workspace_id)
        .order_by(ChatSummary.created_at.desc())
        .limit(10)
    ).all()
    return list(summaries)
