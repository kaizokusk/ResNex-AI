#!/usr/bin/env python3
"""Seed a demo workspace with real arXiv papers for hackathon demo.

Usage:
    python -m scripts.seed_demo              # from backend/ directory
    docker compose exec api python -m scripts.seed_demo  # via Docker

Papers selected to showcase cross-paper comparison, gap-finding, and
literature review generation on a coherent AI/NLP research theme.
"""
from __future__ import annotations

import os
import sys
import time

import requests

API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000/api/v1")

# ── Demo papers: landmark AI/NLP papers for a compelling demo ──
DEMO_PAPERS = [
    {
        "arxiv_id": "1706.03762",
        "note": "Attention Is All You Need (Transformer)",
    },
    {
        "arxiv_id": "2005.14165",
        "note": "Language Models are Few-Shot Learners (GPT-3)",
    },
    {
        "arxiv_id": "1810.04805",
        "note": "BERT: Pre-training of Deep Bidirectional Transformers",
    },
]

DEMO_WORKSPACE = {
    "name": "AI Foundation Models Research",
    "description": "Collaborative research workspace studying transformer architectures and large language models — from attention mechanisms to few-shot learning.",
    "created_by": "demo-user",
}

DEMO_STATE = {
    "research_goal": "Understand the evolution of transformer-based language models, compare their architectures and training approaches, and identify research gaps for future work.",
    "scope": "Focus on the Transformer, BERT, and GPT-3 papers. Analyze attention mechanisms, pre-training strategies, scaling laws, and downstream task performance.",
}


def api(method: str, path: str, json_data: dict | None = None) -> dict:
    url = f"{API_BASE}{path}"
    resp = getattr(requests, method)(url, json=json_data, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main():
    print("=" * 60)
    print("  ResNex AI — Demo Workspace Seeder")
    print("=" * 60)

    # 1. Create workspace
    print("\n[1/5] Creating demo workspace...")
    ws = api("post", "/workspaces", DEMO_WORKSPACE)
    ws_id = ws["id"]
    print(f"  ✓ Workspace: {ws['name']} ({ws_id})")

    # 2. Set project state
    print("\n[2/5] Setting research goal and scope...")
    api("patch", f"/workspaces/{ws_id}/state", DEMO_STATE)
    print(f"  ✓ Goal: {DEMO_STATE['research_goal'][:80]}...")

    # 3. Import papers from arXiv
    print(f"\n[3/5] Importing {len(DEMO_PAPERS)} papers from arXiv...")
    doc_ids = []
    for paper in DEMO_PAPERS:
        print(f"  → Importing {paper['note']}...")
        result = api("post", f"/workspaces/{ws_id}/discover/arxiv/import", {"arxiv_id": paper["arxiv_id"]})
        doc_ids.append(result["document_id"])
        print(f"    ✓ {result['title']} (doc: {result['document_id'][:8]}...)")

    # 4. Wait for ingestion
    print(f"\n[4/5] Waiting for paper ingestion (PDF parse → chunk → embed → summarize)...")
    max_wait = 180  # 3 minutes
    start = time.time()
    while time.time() - start < max_wait:
        docs = api("get", f"/workspaces/{ws_id}/documents")
        statuses = {d["title"][:30]: d["status"] for d in docs}
        ready = sum(1 for s in statuses.values() if s == "ready")
        total = len(statuses)
        print(f"  [{int(time.time()-start):3d}s] {ready}/{total} ready: {statuses}")
        if ready == total:
            break
        time.sleep(10)
    else:
        print("  ⚠ Timeout — some papers may still be processing")

    # 5. Send initial chat messages to populate the conversation
    print("\n[5/5] Seeding initial chat messages...")
    messages = [
        {"text": "Hey team! I've uploaded three landmark papers on transformer-based language models. Let's start by understanding the key differences.", "qa": False},
        {"text": "What are the main architectural differences between BERT and GPT-3?", "qa": True},
    ]
    for msg in messages:
        api("post", f"/workspaces/{ws_id}/messages", {
            "sender_id": "demo-user",
            "sender_name": "Alex (Researcher)",
            "text": msg["text"],
        })
        print(f"  ✓ Sent: {msg['text'][:60]}...")
        if msg["qa"]:
            print("    → Triggering QA agent...")
            try:
                api("post", f"/workspaces/{ws_id}/qa", {"question": msg["text"], "top_k": 5})
                print("    ✓ QA response saved to chat")
            except Exception as e:
                print(f"    ⚠ QA failed: {e}")
        time.sleep(2)

    # Wait for any background agent responses
    time.sleep(5)

    print("\n" + "=" * 60)
    print("  Demo workspace ready!")
    print(f"  Workspace ID: {ws_id}")
    print(f"  Frontend URL: http://localhost:3000/workspace/{ws_id}")
    print("=" * 60)
    print("\nDemo flow suggestions:")
    print("  1. Open the workspace in the browser")
    print("  2. Go to 'Discover' tab → search arXiv for more papers")
    print("  3. Go to 'AI Chat' → ask questions about the papers")
    print("  4. Type '@planner Extract research tasks' in chat")
    print("  5. Type '@writer Write a literature review on transformers' in chat")
    print("  6. Type '@gapfinder Find research gaps' in chat")
    print("  7. Go to 'Compare' tab → compare all papers")
    print("  8. Go to 'Library' → view AI-generated summaries")
    print("  9. Go to 'Tasks' → view extracted tasks")
    print(" 10. Go to 'Project State' → view research memory")


if __name__ == "__main__":
    main()
