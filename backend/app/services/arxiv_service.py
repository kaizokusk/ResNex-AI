"""arXiv API integration — search papers, fetch metadata, download PDFs."""
from __future__ import annotations

import os
import logging
from pathlib import Path

import arxiv

from app.core.config import get_settings

logger = logging.getLogger(__name__)

CATEGORY_MAP = {
    "cs.AI": "Artificial Intelligence",
    "cs.CL": "Computation and Language",
    "cs.CV": "Computer Vision",
    "cs.LG": "Machine Learning",
    "cs.NE": "Neural and Evolutionary Computing",
    "cs.IR": "Information Retrieval",
    "stat.ML": "Machine Learning (Statistics)",
}


def search_arxiv(
    query: str,
    max_results: int = 10,
    categories: list[str] | None = None,
    sort_by: str = "relevance",
) -> list[dict]:
    """Search arXiv and return structured results."""
    sort_criterion = {
        "relevance": arxiv.SortCriterion.Relevance,
        "submitted": arxiv.SortCriterion.SubmittedDate,
        "updated": arxiv.SortCriterion.LastUpdatedDate,
    }.get(sort_by, arxiv.SortCriterion.Relevance)

    # Build query with optional category filter
    full_query = query
    if categories:
        cat_filter = " OR ".join(f"cat:{c}" for c in categories)
        full_query = f"({query}) AND ({cat_filter})"

    client = arxiv.Client()
    search = arxiv.Search(
        query=full_query,
        max_results=max_results,
        sort_by=sort_criterion,
    )

    results = []
    for paper in client.results(search):
        results.append({
            "arxiv_id": paper.get_short_id(),
            "title": paper.title,
            "authors": [a.name for a in paper.authors],
            "abstract": paper.summary,
            "published": paper.published.isoformat() if paper.published else None,
            "updated": paper.updated.isoformat() if paper.updated else None,
            "year": paper.published.year if paper.published else None,
            "categories": paper.categories,
            "primary_category": paper.primary_category,
            "pdf_url": paper.pdf_url,
            "url": paper.entry_id,
            "doi": paper.doi,
            "comment": paper.comment,
            "journal_ref": paper.journal_ref,
        })
    return results


def fetch_paper_metadata(arxiv_id: str) -> dict | None:
    """Fetch metadata for a single paper by arXiv ID."""
    client = arxiv.Client()
    search = arxiv.Search(id_list=[arxiv_id])
    results = list(client.results(search))
    if not results:
        return None
    paper = results[0]
    return {
        "arxiv_id": paper.get_short_id(),
        "title": paper.title,
        "authors": [a.name for a in paper.authors],
        "abstract": paper.summary,
        "published": paper.published.isoformat() if paper.published else None,
        "year": paper.published.year if paper.published else None,
        "categories": paper.categories,
        "primary_category": paper.primary_category,
        "pdf_url": paper.pdf_url,
        "url": paper.entry_id,
        "doi": paper.doi,
    }


def download_paper_pdf(arxiv_id: str) -> str:
    """Download a paper's PDF and return the local file path."""
    settings = get_settings()
    download_dir = Path(settings.upload_dir)
    download_dir.mkdir(parents=True, exist_ok=True)

    client = arxiv.Client()
    search = arxiv.Search(id_list=[arxiv_id])
    results = list(client.results(search))
    if not results:
        raise ValueError(f"Paper {arxiv_id} not found on arXiv")

    paper = results[0]
    # Use arxiv_id as filename (replace / with _)
    safe_id = arxiv_id.replace("/", "_").replace(".", "_")
    filename = f"arxiv_{safe_id}.pdf"
    filepath = str(download_dir / filename)

    paper.download_pdf(dirpath=str(download_dir), filename=filename)
    logger.info(f"Downloaded arXiv paper {arxiv_id} to {filepath}")
    return filepath
