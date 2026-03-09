"""Integration tests for chat messages and agent @mention auto-trigger."""
from __future__ import annotations

import time


def test_send_message(api, workspace_id):
    msg = api("post", f"/workspaces/{workspace_id}/messages", json={
        "sender_id": "pytest",
        "sender_name": "Pytest Runner",
        "text": "Hello from integration test",
    })
    assert msg["id"]
    assert msg["text"] == "Hello from integration test"
    assert msg["sender_type"] == "human"


def test_list_messages(api, workspace_id):
    msgs = api("get", f"/workspaces/{workspace_id}/messages")
    assert isinstance(msgs, list)
    assert len(msgs) >= 1


def test_mention_triggers_agent(api, workspace_id):
    """Send a message with @librarian and verify agent responds."""
    api("post", f"/workspaces/{workspace_id}/messages", json={
        "sender_id": "pytest",
        "sender_name": "Pytest Runner",
        "text": "@librarian What is machine learning?",
    })
    # Agent runs asynchronously — give it time
    time.sleep(20)
    msgs = api("get", f"/workspaces/{workspace_id}/messages")
    agent_msgs = [m for m in msgs if m["sender_type"] == "agent" and "Librarian" in (m.get("sender_name") or "")]
    assert len(agent_msgs) >= 1, "Expected at least one Librarian Agent response"
