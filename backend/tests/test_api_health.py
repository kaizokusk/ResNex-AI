"""Test health and core API endpoints."""
from __future__ import annotations

import requests

API_BASE = "http://localhost:8000"
API_V1 = f"{API_BASE}/api/v1"


def test_health_endpoint():
    resp = requests.get(f"{API_BASE}/health", timeout=10)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["database"] == "up"
    assert data["redis"] == "up"


def test_openapi_schema():
    resp = requests.get(f"{API_BASE}/openapi.json", timeout=10)
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    assert len(paths) >= 27


def test_list_workspaces():
    resp = requests.get(f"{API_V1}/workspaces", timeout=10)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
