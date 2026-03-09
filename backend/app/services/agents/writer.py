"""Writer agent — generates literature review sections."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def draft_literature_review(paper_summaries: list[dict], topic: str = "", evidence_chunks: list[dict] | None = None) -> dict:
    """Draft a literature review section from paper summaries."""
    papers_text = ""
    for ps in paper_summaries:
        papers_text += f"\n--- {ps.get('title', 'Untitled')} (ID: {ps.get('document_id', '')}) ---\n"
        for key in ["summary_long", "problem_statement", "methodology", "findings", "limitations"]:
            val = ps.get(key, "N/A")
            papers_text += f"  {key}: {val}\n"

    evidence_text = ""
    if evidence_chunks:
        evidence_text = "\n\nSupporting evidence chunks:\n"
        for chunk in evidence_chunks[:20]:
            evidence_text += f"[From {chunk.get('document_title', 'Unknown')}]: {chunk.get('text', '')[:500]}\n"

    user_prompt = f"Topic/focus: {topic or 'General literature review'}\n\nPaper summaries:\n{papers_text}{evidence_text}\n\nDraft a related work / literature review section."
    return chat_completion_json(get_prompt("writer"), user_prompt)
