"""Semantic Scholar API integration — search papers, find related work."""
from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS = "paperId,title,authors,abstract,year,venue,citationCount,referenceCount,openAccessPdf,externalIds,url"


def _get(path: str, params: dict | None = None, timeout: float = 15.0) -> dict | None:
    """Make a GET request to Semantic Scholar API."""
    try:
        resp = httpx.get(f"{BASE_URL}{path}", params=params or {}, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.warning(f"Semantic Scholar API error: {e}")
        return None


def _format_paper(paper: dict) -> dict:
    """Normalise a Semantic Scholar paper object."""
    oap = paper.get("openAccessPdf") or {}
    ext = paper.get("externalIds") or {}
    return {
        "semantic_scholar_id": paper.get("paperId"),
        "title": paper.get("title"),
        "authors": [a.get("name") for a in (paper.get("authors") or [])],
        "abstract": paper.get("abstract"),
        "year": paper.get("year"),
        "venue": paper.get("venue"),
        "citation_count": paper.get("citationCount"),
        "reference_count": paper.get("referenceCount"),
        "open_access_pdf_url": oap.get("url"),
        "arxiv_id": ext.get("ArXiv"),
        "doi": ext.get("DOI"),
        "url": paper.get("url"),
    }


def search_papers(query: str, limit: int = 10, year: str | None = None) -> list[dict]:
    """Search Semantic Scholar by keyword.

    Args:
        query: search terms
        limit: max results (up to 100)
        year: optional year filter, e.g. "2020-" or "2018-2023"
    """
    params = {"query": query, "limit": min(limit, 100), "fields": FIELDS}
    if year:
        params["year"] = year
    data = _get("/paper/search", params)
    if not data:
        return []
    return [_format_paper(p) for p in data.get("data", [])]


def get_paper(paper_id: str) -> dict | None:
    """Get details for a single paper by Semantic Scholar ID, DOI, or arXiv ID.

    Accepts: S2 paper ID, DOI (DOI:xxx), arXiv ID (ARXIV:xxx), or URL.
    """
    data = _get(f"/paper/{paper_id}", {"fields": FIELDS})
    if not data:
        return None
    return _format_paper(data)


def get_related_papers(paper_id: str, limit: int = 10) -> list[dict]:
    """Get papers related to a given paper (via Semantic Scholar recommendations)."""
    params = {"fields": FIELDS, "limit": min(limit, 100)}
    data = _get(f"/recommendations/v1/papers/forpaper/{paper_id}", params)
    if not data:
        # Fallback to citations + references
        return _get_citations_and_references(paper_id, limit)
    return [_format_paper(p) for p in data.get("recommendedPapers", [])]


def _get_citations_and_references(paper_id: str, limit: int = 10) -> list[dict]:
    """Fallback: get a mix of citations and references for a paper."""
    results = []
    half = limit // 2

    # Citations (papers that cite this one)
    cit_data = _get(f"/paper/{paper_id}/citations", {"fields": FIELDS, "limit": half})
    if cit_data:
        for item in cit_data.get("data", []):
            citing = item.get("citingPaper")
            if citing and citing.get("title"):
                results.append(_format_paper(citing))

    # References (papers this one cites)
    ref_data = _get(f"/paper/{paper_id}/references", {"fields": FIELDS, "limit": half})
    if ref_data:
        for item in ref_data.get("data", []):
            cited = item.get("citedPaper")
            if cited and cited.get("title"):
                results.append(_format_paper(cited))

    return results[:limit]
