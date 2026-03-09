"""Retrieval-augmented Q&A agent."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def answer_question(question: str, context_chunks: list[dict]) -> dict:
    """Answer a question using retrieved document chunks."""
    context_text = ""
    for chunk in context_chunks:
        context_text += f"\n--- From: {chunk.get('document_title', 'Unknown')} (ID: {chunk.get('document_id', '')}, Page: {chunk.get('page_number', '?')}) ---\n"
        context_text += chunk.get("text", "") + "\n"

    user_prompt = f"Question: {question}\n\nContext from workspace documents:\n{context_text}"
    return chat_completion_json(get_prompt("qa"), user_prompt)
