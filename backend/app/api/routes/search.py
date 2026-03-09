"""Semantic search and Q&A routes."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.models import ChatMessage, Document, DocumentChunk
from app.db.session import get_db
from app.services.llm import create_embedding
from app.services.agents.qa import answer_question
from app.services.guardrails import apply_guardrails

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["search"])


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = 10


class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    text: str
    page_number: int | None
    score: float


class SearchResponse(BaseModel):
    results: list[SearchResult]
    query: str


class QARequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = 8


class QAResponse(BaseModel):
    answer: str
    citations: list[dict]
    confidence: str
    source_chunks: list[SearchResult]


def _vector_search(db: Session, workspace_id: UUID, query_embedding: list[float], top_k: int) -> list[dict]:
    """Perform cosine similarity search using pgvector-compatible raw SQL."""
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    sql = text("""
        SELECT dc.id, dc.document_id, dc.text, dc.page_number, dc.chunk_index,
               d.title as document_title,
               1 - (CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector)) as score
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE dc.workspace_id = :workspace_id
          AND dc.embedding IS NOT NULL
        ORDER BY CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)
    rows = db.execute(sql, {
        "workspace_id": str(workspace_id),
        "embedding": embedding_str,
        "top_k": top_k,
    }).fetchall()

    results = []
    for row in rows:
        results.append({
            "chunk_id": str(row.id),
            "document_id": str(row.document_id),
            "document_title": row.document_title,
            "text": row.text,
            "page_number": row.page_number,
            "score": float(row.score) if row.score else 0.0,
        })
    return results


@router.post("/search", response_model=SearchResponse)
def semantic_search(workspace_id: UUID, payload: SearchRequest, db: Session = Depends(get_db)):
    query_embedding = create_embedding(payload.query)
    results = _vector_search(db, workspace_id, query_embedding, payload.top_k)
    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        query=payload.query,
    )


@router.post("/qa", response_model=QAResponse)
def question_answer(workspace_id: UUID, payload: QARequest, db: Session = Depends(get_db)):
    query_embedding = create_embedding(payload.question)
    results = _vector_search(db, workspace_id, query_embedding, payload.top_k)

    if not results:
        return QAResponse(
            answer="No relevant documents found in this workspace. Please upload some papers first.",
            citations=[],
            confidence="low",
            source_chunks=[],
        )

    # Call QA agent + apply guardrails
    qa_result = answer_question(payload.question, results)
    qa_result = apply_guardrails(qa_result, results)

    answer_text = qa_result.get("answer", "")
    citations = qa_result.get("citations", [])

    # Save as agent chat message so it appears in the chat
    agent_msg = ChatMessage(
        workspace_id=workspace_id,
        sender_type="agent",
        sender_id="librarian",
        sender_name="Librarian Agent",
        text=answer_text,
        citations=citations,
        agent_payload=qa_result,
    )
    db.add(agent_msg)
    db.commit()

    return QAResponse(
        answer=answer_text,
        citations=citations,
        confidence=qa_result.get("confidence", "medium"),
        source_chunks=[SearchResult(**r) for r in results[:5]],
    )
