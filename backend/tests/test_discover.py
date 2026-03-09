"""Integration tests for arXiv and Semantic Scholar discovery endpoints."""
from __future__ import annotations


def test_arxiv_search(api, workspace_id):
    result = api("post", f"/workspaces/{workspace_id}/discover/arxiv/search", json={
        "query": "attention mechanism",
        "max_results": 3,
    })
    assert result["count"] >= 1
    assert len(result["results"]) >= 1
    first = result["results"][0]
    assert "title" in first
    assert "arxiv_id" in first


def test_semantic_scholar_search(api, workspace_id):
    """Semantic Scholar may rate-limit; verify the response shape even if empty."""
    result = api("post", f"/workspaces/{workspace_id}/discover/semantic-scholar/search", json={
        "query": "transformer architecture",
        "limit": 3,
    })
    assert "count" in result
    assert "results" in result
    assert isinstance(result["results"], list)
    # If results came back, verify shape
    if result["count"] >= 1:
        first = result["results"][0]
        assert "title" in first


def test_arxiv_import(api, workspace_id):
    result = api("post", f"/workspaces/{workspace_id}/discover/arxiv/import", json={
        "arxiv_id": "2301.10226",
    })
    assert result["document_id"]
    assert result["status"] in ("pending", "processing", "ready")
    assert result.get("title")


def test_arxiv_import_duplicate(api, workspace_id):
    """Importing same paper again should detect duplicate."""
    result = api("post", f"/workspaces/{workspace_id}/discover/arxiv/import", json={
        "arxiv_id": "2301.10226",
    })
    assert result["duplicate"] is True
