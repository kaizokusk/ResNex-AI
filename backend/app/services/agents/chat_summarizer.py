"""Chat summary agent — summarizes workspace discussions."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def summarize_chat(messages: list[dict]) -> dict:
    """Summarize a list of chat messages."""
    msg_text = ""
    for m in messages:
        sender = m.get("sender_name") or m.get("sender_id", "Unknown")
        msg_text += f"[{sender}]: {m.get('text', '')}\n"

    user_prompt = f"Summarize this research team discussion:\n\n{msg_text}"
    return chat_completion_json(get_prompt("chat_summarizer"), user_prompt)
