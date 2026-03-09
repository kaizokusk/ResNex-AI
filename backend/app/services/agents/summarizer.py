"""Paper summary agent — generates structured summaries for a single paper."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def generate_paper_summary(full_text: str, title: str = "") -> dict:
    """Generate a structured summary for a paper."""
    # Truncate very long texts to fit context window
    max_chars = 60000
    text_input = full_text[:max_chars] if len(full_text) > max_chars else full_text

    user_prompt = f"Paper title: {title}\n\nFull text:\n{text_input}"
    return chat_completion_json(get_prompt("summarizer"), user_prompt)
