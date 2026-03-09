"""Integration tests for workspace CRUD and project state."""
from __future__ import annotations


def test_create_workspace(api):
    ws = api("post", "/workspaces", json={
        "name": "Test WS",
        "description": "pytest workspace",
        "created_by": "pytest",
    })
    assert ws["id"]
    assert ws["name"] == "Test WS"


def test_get_workspace(api, workspace_id):
    ws = api("get", f"/workspaces/{workspace_id}")
    assert ws["id"] == workspace_id
    assert ws["name"] == "Integration Test Workspace"


def test_update_project_state(api, workspace_id):
    state = api("patch", f"/workspaces/{workspace_id}/state", json={
        "research_goal": "Test goal from pytest",
        "scope": "Test scope",
    })
    assert state["research_goal"] == "Test goal from pytest"


def test_get_project_state(api, workspace_id):
    state = api("get", f"/workspaces/{workspace_id}/state")
    assert state["research_goal"] == "Test goal from pytest"
