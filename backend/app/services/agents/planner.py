"""Planner agent — extracts tasks from discussions."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def extract_tasks(messages: list[dict], project_context: str = "") -> dict:
    """Extract tasks from chat messages."""
    msg_text = ""
    for m in messages:
        sender = m.get("sender_name") or m.get("sender_id", "Unknown")
        msg_text += f"[{sender}]: {m.get('text', '')}\n"

    user_prompt = f"Project context:\n{project_context}\n\nRecent discussion:\n{msg_text}\n\nExtract tasks and next steps from this discussion."
    return chat_completion_json(get_prompt("planner"), user_prompt)
