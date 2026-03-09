"""Multi-paper comparison agent."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def compare_papers(paper_summaries: list[dict]) -> dict:
    """Compare multiple papers based on their summaries."""
    papers_text = ""
    for i, ps in enumerate(paper_summaries, 1):
        papers_text += f"\n\n--- Paper {i}: {ps.get('title', 'Untitled')} (ID: {ps.get('document_id', 'unknown')}) ---\n"
        for key in ["summary_long", "problem_statement", "methodology", "datasets", "metrics", "findings", "limitations"]:
            val = ps.get(key, "Not available")
            papers_text += f"{key}: {val}\n"

    user_prompt = f"Compare the following {len(paper_summaries)} papers:\n{papers_text}"
    return chat_completion_json(get_prompt("comparison"), user_prompt)
