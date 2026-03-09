"""Shared test fixtures for backend integration tests.

These tests run against the LIVE Docker services (API at localhost:8000).
They are integration tests, not unit tests — they verify real API behaviour.
"""
from __future__ import annotations

import os
import pytest
import requests

API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")


@pytest.fixture(scope="session")
def api_base():
    return API_BASE


@pytest.fixture(scope="session")
def api():
    """Return a helper that calls the live API."""
    session = requests.Session()

    def _call(method: str, path: str, **kwargs):
        url = f"{API_BASE}{path}"
        resp = getattr(session, method)(url, timeout=60, **kwargs)
        resp.raise_for_status()
        return resp.json()

    return _call


@pytest.fixture(scope="session")
def workspace(api):
    """Create a disposable test workspace that persists for the test session."""
    ws = api("post", "/workspaces", json={
        "name": "Integration Test Workspace",
        "description": "Auto-created by pytest",
        "created_by": "pytest",
    })
    yield ws
    # No teardown — workspace persists for inspection if needed


@pytest.fixture(scope="session")
def workspace_id(workspace):
    return workspace["id"]
