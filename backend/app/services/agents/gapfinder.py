"""Gap-finder agent — identifies research gaps across papers."""
from __future__ import annotations

from app.services.llm import chat_completion_json
from app.services.agents.prompt_registry import get_prompt


def find_gaps(paper_summaries: list[dict], research_goal: str = "") -> dict:
    """Identify research gaps across papers."""
    papers_text = ""
    for ps in paper_summaries:
        papers_text += f"\n--- {ps.get('title', 'Untitled')} ---\n"
        for key in ["summary_long", "problem_statement", "methodology", "findings", "limitations"]:
            val = ps.get(key, "N/A")
            papers_text += f"  {key}: {val}\n"

    goal_text = f"\nResearch goal: {research_goal}\n" if research_goal else ""
    user_prompt = f"{goal_text}Analyze these papers and identify research gaps:\n{papers_text}"
    return chat_completion_json(get_prompt("gapfinder"), user_prompt)
