"""LLM and embedding client helpers.

Supports OpenRouter (or any OpenAI-compatible provider) for chat completions,
and OpenAI for embeddings. Falls back to a local hash-based embedding when
no OpenAI key is configured.
"""
from __future__ import annotations

import hashlib
import json
import math
import re

from openai import OpenAI

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Client factories
# ---------------------------------------------------------------------------

def _llm_client() -> OpenAI:
    """Client for chat completions — prefers LLM_API_KEY (OpenRouter)."""
    settings = get_settings()
    if settings.llm_api_key:
        return OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_api_base_url,
        )
    # Fallback to OpenAI direct
    return OpenAI(api_key=settings.openai_api_key)


def _embedding_client() -> OpenAI | None:
    """Client for embeddings — only available when OPENAI_API_KEY is set."""
    settings = get_settings()
    if settings.openai_api_key:
        return OpenAI(api_key=settings.openai_api_key)
    return None


def _llm_model() -> str:
    settings = get_settings()
    if settings.llm_api_key:
        return settings.llm_model
    return settings.openai_model


# ---------------------------------------------------------------------------
# Chat completions
# ---------------------------------------------------------------------------

def chat_completion(system_prompt: str, user_prompt: str, *, temperature: float = 0.3, model: str | None = None) -> str:
    resp = _llm_client().chat.completions.create(
        model=model or _llm_model(),
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    return resp.choices[0].message.content or ""


def chat_completion_json(system_prompt: str, user_prompt: str, *, temperature: float = 0.2, model: str | None = None) -> dict:
    """Get a JSON response from the LLM. Tries response_format first, falls
    back to parsing JSON from freeform text if the provider doesn't support it."""
    client = _llm_client()
    chosen_model = model or _llm_model()

    # First try with response_format (works on OpenAI, most OpenRouter models)
    try:
        resp = client.chat.completions.create(
            model=chosen_model,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)
    except Exception:
        pass

    # Fallback: ask without response_format and extract JSON from text
    resp = client.chat.completions.create(
        model=chosen_model,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt + "\n\nYou MUST respond with valid JSON only. No markdown, no extra text."},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    # Strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

def _local_embedding(text: str, dimensions: int = 1536) -> list[float]:
    """Hash-based local embedding fallback. Not as good as a real model but
    provides consistent fixed-size vectors with basic word-overlap semantics."""
    words = text.lower().split()
    vec = [0.0] * dimensions
    for word in words:
        h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
        idx = h % dimensions
        sign = 1.0 if (h // dimensions) % 2 == 0 else -1.0
        vec[idx] += sign
    # L2-normalise
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def create_embeddings(texts: list[str]) -> list[list[float]]:
    settings = get_settings()
    client = _embedding_client()
    if client:
        resp = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=texts,
        )
        return [item.embedding for item in resp.data]
    # Local fallback
    return [_local_embedding(t, settings.embedding_dimensions) for t in texts]


def create_embedding(text: str) -> list[float]:
    return create_embeddings([text])[0]
