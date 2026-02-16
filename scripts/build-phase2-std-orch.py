#!/usr/bin/env python3
"""
Build Phase 2 standard + orchestrator dataset (2000 questions total).
Queries Supabase benchmark_datasets table and creates:
  - 1000 standard questions (from 8 factual QA datasets)
  - 1000 orchestrator questions (mixed routing: ~333 std + ~334 graph + ~333 quant)

Output: datasets/phase-2/standard-orch-1000x2.json
"""

import json
import os
import sys
import random
from datetime import datetime

# Load env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_API_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_API_KEY not set")
    sys.exit(1)

import urllib.request
import urllib.parse

def query_supabase(table, select="*", filters=None, limit=1000, offset=0):
    """Query Supabase REST API directly."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={urllib.parse.quote(select)}"
    if filters:
        for f in filters:
            url += f"&{f}"
    url += f"&limit={limit}&offset={offset}"

    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })

    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


# ── Dataset config ──────────────────────────────────────────────
STANDARD_DATASETS = {
    # dataset_name: (count_to_take, category)
    "triviaqa": (125, "single_hop_qa"),
    "popqa": (125, "single_hop_qa"),
    "natural_questions": (125, "single_hop_qa"),
    "narrativeqa": (125, "long_form_qa"),
    "hotpotqa": (125, "multi_hop_qa"),
    "frames": (125, "multi_hop_qa"),
    "pubmedqa": (125, "domain_specific_qa"),
    "squad_v2": (125, "extractive_qa"),
}

# For orchestrator: mix of all pipeline types
ORCH_STANDARD_DATASETS = {
    # Different questions from standard datasets (offset by 125 to avoid overlap)
    "triviaqa": (84, "single_hop_qa"),
    "popqa": (83, "single_hop_qa"),
    "natural_questions": (83, "single_hop_qa"),
    "narrativeqa": (83, "long_form_qa"),
}
# = 333 standard-routed orchestrator questions

ORCH_GRAPH_DATASETS = {
    # hotpotqa is graph-type (multi-hop), use questions not in standard set
    "hotpotqa": (200, "multi_hop_qa"),
    "musique": (67, "multi_hop_qa"),
    "2wikimultihopqa": (67, "multi_hop_qa"),
}
# = 334 graph-routed orchestrator questions

ORCH_QUANT_DATASETS = {
    "finqa": (200, "financial_qa"),
    "tatqa": (83, "table_qa"),
    "convfinqa": (50, "financial_qa"),
}
# = 333 quant-routed orchestrator questions


def fetch_questions(dataset_name, count, offset=0, require_answer=True):
    """Fetch questions from Supabase benchmark_datasets table."""
    filters = [f"dataset_name=eq.{dataset_name}"]
    if require_answer:
        filters.append("expected_answer=neq.")
        filters.append("expected_answer=neq.null")

    rows = query_supabase(
        "benchmark_datasets",
        select="id,dataset_name,question,expected_answer,context,category",
        filters=filters,
        limit=count,
        offset=offset
    )
    return rows


def clean_expected_answer(answer):
    """Clean expected_answer - handle JSON arrays, nulls, etc."""
    if not answer or answer == "null":
        return ""
    # Handle JSON array format (e.g., popqa: ["politician", "political leader"])
    if answer.startswith("["):
        try:
            arr = json.loads(answer)
            if isinstance(arr, list) and len(arr) > 0:
                return arr[0]  # Take first answer
        except json.JSONDecodeError:
            pass
    return answer.strip()


def build_question(row, idx, prefix, rag_target, category=None, expected_route=None):
    """Build a question dict in Phase 2 format."""
    q = {
        "id": f"{prefix}-{idx}",
        "dataset_name": row["dataset_name"],
        "category": category or row.get("category", "general"),
        "question": row["question"],
        "expected_answer": clean_expected_answer(row.get("expected_answer", "")),
        "rag_target": rag_target,
        "tenant_id": "benchmark",
        "metadata": {
            "source_dataset": row["dataset_name"],
            "rag_target": rag_target,
        }
    }
    if expected_route:
        q["metadata"]["expected_route"] = expected_route
    return q


def main():
    random.seed(42)  # Reproducible

    questions = []
    stats = {"standard": {}, "orchestrator": {"std_route": {}, "graph_route": {}, "quant_route": {}}}

    # ── 1. Standard questions (1000) ──────────────────────────────
    print("=" * 60)
    print("Building 1000 STANDARD questions...")
    print("=" * 60)

    std_idx = 0
    for ds_name, (count, category) in STANDARD_DATASETS.items():
        print(f"  Fetching {count} from {ds_name}...", end=" ")
        rows = fetch_questions(ds_name, count, offset=0)

        actual = min(len(rows), count)
        for row in rows[:actual]:
            q = build_question(row, std_idx, "std", "standard", category)
            questions.append(q)
            std_idx += 1

        stats["standard"][ds_name] = actual
        print(f"got {actual}")

    print(f"\n  Total standard: {std_idx}")

    # ── 2. Orchestrator questions (1000) ──────────────────────────
    print("\n" + "=" * 60)
    print("Building 1000 ORCHESTRATOR questions...")
    print("=" * 60)

    orch_idx = 0

    # 2a. Standard-routed (333 questions)
    print("\n  -- Standard-routed (333q) --")
    for ds_name, (count, category) in ORCH_STANDARD_DATASETS.items():
        # Offset by 125 to avoid overlapping with the 1000 standard questions
        print(f"  Fetching {count} from {ds_name} (offset 125)...", end=" ")
        rows = fetch_questions(ds_name, count, offset=125)

        actual = min(len(rows), count)
        for row in rows[:actual]:
            q = build_question(row, orch_idx, "orch", "orchestrator", category, expected_route="standard")
            questions.append(q)
            orch_idx += 1

        stats["orchestrator"]["std_route"][ds_name] = actual
        print(f"got {actual}")

    # 2b. Graph-routed (334 questions)
    print("\n  -- Graph-routed (334q) --")
    for ds_name, (count, category) in ORCH_GRAPH_DATASETS.items():
        # For hotpotqa: offset by 125 (already used in standard)
        # For musique/2wiki: offset by 0 (not used in standard, may overlap with hf-1000 but that's fine for orchestrator)
        offset = 125 if ds_name == "hotpotqa" else 0
        print(f"  Fetching {count} from {ds_name} (offset {offset})...", end=" ")
        rows = fetch_questions(ds_name, count, offset=offset)

        actual = min(len(rows), count)
        for row in rows[:actual]:
            q = build_question(row, orch_idx, "orch", "orchestrator", category, expected_route="graph")
            questions.append(q)
            orch_idx += 1

        stats["orchestrator"]["graph_route"][ds_name] = actual
        print(f"got {actual}")

    # 2c. Quantitative-routed (333 questions)
    print("\n  -- Quant-routed (333q) --")
    for ds_name, (count, category) in ORCH_QUANT_DATASETS.items():
        print(f"  Fetching {count} from {ds_name}...", end=" ")
        rows = fetch_questions(ds_name, count, offset=0)

        actual = min(len(rows), count)
        for row in rows[:actual]:
            q = build_question(row, orch_idx, "orch", "orchestrator", category, expected_route="quantitative")
            questions.append(q)
            orch_idx += 1

        stats["orchestrator"]["quant_route"][ds_name] = actual
        print(f"got {actual}")

    print(f"\n  Total orchestrator: {orch_idx}")

    # ── 3. Build output ───────────────────────────────────────────
    output = {
        "metadata": {
            "title": "RAG Test Questions — Standard + Orchestrator (2000 questions)",
            "generated_at": datetime.utcnow().isoformat(),
            "total_questions": len(questions),
            "standard_questions": std_idx,
            "orchestrator_questions": orch_idx,
            "datasets": list(set(q["dataset_name"] for q in questions)),
            "stats": stats,
            "note": "Standard questions test Pinecone vector search. Orchestrator questions test routing to correct sub-pipeline."
        },
        "questions": questions
    }

    outpath = os.path.join(os.path.dirname(__file__), '..', 'datasets', 'phase-2', 'standard-orch-1000x2.json')
    os.makedirs(os.path.dirname(outpath), exist_ok=True)

    with open(outpath, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 60}")
    print(f"DONE — {len(questions)} questions written to {outpath}")
    print(f"  Standard: {std_idx}")
    print(f"  Orchestrator: {orch_idx}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
