"""Unit tests for citation guardrails (no LLM calls needed)."""
from __future__ import annotations

from app.services.guardrails import validate_citations, check_confidence, apply_guardrails


def test_validate_citations_keeps_valid():
    context = [
        {"document_id": "doc-1", "document_title": "Paper A", "text": "Transformers use self-attention"},
    ]
    answer = {
        "answer": "Transformers use self-attention.",
        "citations": [
            {"document_id": "doc-1", "document_title": "Paper A", "chunk_text": "self-attention"},
        ],
        "confidence": "high",
    }
    result = validate_citations(answer, context)
    assert len(result["citations"]) == 1
    assert result["_guardrail"]["removed"] == 0


def test_validate_citations_removes_fabricated():
    context = [
        {"document_id": "doc-1", "document_title": "Paper A", "text": "Some real content"},
    ]
    answer = {
        "answer": "Some answer",
        "citations": [
            {"document_id": "doc-FAKE", "document_title": "Nonexistent Paper", "chunk_text": "fabricated text"},
        ],
        "confidence": "high",
    }
    result = validate_citations(answer, context)
    assert len(result["citations"]) == 0
    assert result["_guardrail"]["removed"] == 1


def test_check_confidence_downgrades_hedging():
    answer = {"answer": "I'm not sure about this, but maybe...", "confidence": "high"}
    result = check_confidence(answer)
    assert result["confidence"] == "low"


def test_check_confidence_keeps_confident():
    answer = {"answer": "BERT uses bidirectional attention.", "confidence": "high"}
    result = check_confidence(answer)
    assert result["confidence"] == "high"


def test_apply_guardrails_full():
    context = [
        {"document_id": "d1", "document_title": "Real Paper", "text": "BERT is a language model"},
    ]
    answer = {
        "answer": "BERT is a language model.",
        "citations": [
            {"document_id": "d1", "document_title": "Real Paper", "chunk_text": "BERT is a language model"},
            {"document_id": "FAKE", "document_title": "Ghost Paper", "chunk_text": "nonexistent"},
        ],
        "confidence": "high",
    }
    result = apply_guardrails(answer, context)
    assert len(result["citations"]) == 1
    assert result["_guardrail"]["removed"] == 1
    assert result["confidence"] == "high"
