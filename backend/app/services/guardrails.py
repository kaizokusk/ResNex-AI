"""Citation integrity checks and hallucination guardrails.

Post-processes LLM agent outputs to:
  1. Validate that cited document IDs exist in context
  2. Check that quoted text actually appears in source chunks
  3. Flag low-confidence or unsupported claims
  4. Strip fabricated citations
"""
from __future__ import annotations

import logging
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


def validate_citations(answer: dict, context_chunks: list[dict]) -> dict:
    """Validate and filter citations in a QA answer against source chunks.

    Returns the answer dict with:
      - ``citations`` stripped of any that can't be traced back
      - ``_guardrail`` metadata added
    """
    raw_citations = answer.get("citations") or []
    if not raw_citations:
        answer["_guardrail"] = {"checked": True, "removed": 0, "kept": 0}
        return answer

    # Build lookup sets from the context we actually sent to the LLM
    known_doc_ids = {c.get("document_id") for c in context_chunks if c.get("document_id")}
    known_titles = {c.get("document_title", "").lower() for c in context_chunks if c.get("document_title")}
    chunk_texts = [c.get("text", "") for c in context_chunks]

    valid = []
    removed = 0
    for cit in raw_citations:
        # 1. Check document_id or title exists in context
        cid = cit.get("document_id", "")
        ctitle = (cit.get("document_title") or "").lower()
        id_ok = cid in known_doc_ids if cid else False
        title_ok = any(ctitle and ctitle in kt for kt in known_titles) if ctitle else False

        if not id_ok and not title_ok:
            logger.info("Guardrail: removed citation with unknown source %s / %s", cid, ctitle)
            removed += 1
            continue

        # 2. If chunk_text provided, verify it roughly matches something in context
        quoted = cit.get("chunk_text", "")
        if quoted and len(quoted) > 20:
            best_ratio = max(
                _fuzzy_contains(chunk, quoted) for chunk in chunk_texts
            ) if chunk_texts else 0.0
            if best_ratio < 0.4:
                logger.info("Guardrail: removed citation with unverifiable quote (best=%.2f)", best_ratio)
                removed += 1
                continue

        valid.append(cit)

    answer["citations"] = valid
    answer["_guardrail"] = {"checked": True, "removed": removed, "kept": len(valid)}
    return answer


def check_confidence(answer: dict) -> dict:
    """Downgrade confidence if the answer text contains hedging language
    or the model itself signalled uncertainty."""
    text = (answer.get("answer") or "").lower()
    confidence = answer.get("confidence", "medium")

    hedging = [
        "i'm not sure", "i am not sure", "it is unclear",
        "the context does not", "no relevant information",
        "cannot determine", "not enough information",
        "i don't have", "i do not have",
    ]
    if any(h in text for h in hedging):
        confidence = "low"

    answer["confidence"] = confidence
    return answer


def apply_guardrails(answer: dict, context_chunks: list[dict]) -> dict:
    """Run all guardrail checks on a QA answer."""
    answer = validate_citations(answer, context_chunks)
    answer = check_confidence(answer)
    return answer


# ── helpers ──────────────────────────────────────────────────────────────

def _fuzzy_contains(haystack: str, needle: str) -> float:
    """Return a 0-1 score for how well *needle* is contained in *haystack*."""
    if not needle or not haystack:
        return 0.0
    # Quick exact substring check
    if needle.lower() in haystack.lower():
        return 1.0
    # Fall back to fuzzy ratio on overlapping windows
    needle_lower = needle.lower()[:200]
    haystack_lower = haystack.lower()
    return SequenceMatcher(None, needle_lower, haystack_lower).ratio()
