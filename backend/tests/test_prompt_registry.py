"""Unit tests for the prompt registry (no LLM calls needed)."""
from __future__ import annotations

from app.services.agents.prompt_registry import get_prompt, list_agents


def test_all_agents_registered():
    agents = list_agents()
    expected = {"qa", "summarizer", "comparison", "gapfinder", "planner", "writer", "chat_summarizer"}
    assert expected.issubset(set(agents.keys())), f"Missing agents: {expected - set(agents.keys())}"


def test_get_prompt_returns_string():
    for agent in ["qa", "summarizer", "comparison", "gapfinder", "planner", "writer", "chat_summarizer"]:
        prompt = get_prompt(agent)
        assert isinstance(prompt, str)
        assert len(prompt) > 50, f"Prompt for {agent} is suspiciously short"


def test_get_prompt_pinned_version():
    prompt = get_prompt("qa", "1.0")
    assert "citations" in prompt.lower()


def test_get_prompt_unknown_agent_raises():
    import pytest
    with pytest.raises(KeyError):
        get_prompt("nonexistent_agent")


def test_get_prompt_unknown_version_raises():
    import pytest
    with pytest.raises(KeyError):
        get_prompt("qa", "99.99")
