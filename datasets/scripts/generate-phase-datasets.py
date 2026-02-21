#!/usr/bin/env python3
"""
Generate dataset files for Phases 3, 4, and 5 from downloaded HF JSONL files.

Phase 3: ~10,700 questions (all 16 datasets)
Phase 4: ~100K questions (10x scale)
Phase 5: 1M+ (full datasets — requires paid infrastructure)

Usage:
    python3 datasets/scripts/generate-phase-datasets.py --phase 3
    python3 datasets/scripts/generate-phase-datasets.py --phase 4 --limit 10000
    python3 datasets/scripts/generate-phase-datasets.py --all
"""

import argparse
import json
import os
import random
from pathlib import Path
from datetime import datetime

# Phase 3 targets (from phases-overview.md)
PHASE_3 = {
    "standard": {
        "squad_v2": 1000, "triviaqa": 1000, "popqa": 1000, "narrativeqa": 1000,
        "msmarco": 1000, "asqa": 948, "frames": 824, "pubmedqa": 500,
        "natural_questions": 1000,
    },
    "graph": {
        "hotpotqa": 1000, "musique": 200, "2wikimultihopqa": 300,
    },
    "quantitative": {
        "finqa": 200, "tatqa": 150, "convfinqa": 100, "wikitablequestions": 50,
    },
}

# Phase 4 targets (10x Phase 3 where available)
PHASE_4 = {
    "standard": {
        "squad_v2": 10000, "triviaqa": 10000, "popqa": 10000, "narrativeqa": 10000,
        "msmarco": 10000, "asqa": 6000, "frames": 824, "pubmedqa": 5000,
        "natural_questions": 10000,
    },
    "graph": {
        "hotpotqa": 10000, "musique": 2000, "2wikimultihopqa": 3000,
    },
    "quantitative": {
        "finqa": 2000, "tatqa": 1500, "convfinqa": 1000, "wikitablequestions": 500,
    },
}


def load_jsonl(path, limit=None):
    """Load JSONL file, return list of dicts."""
    items = []
    if not path.exists():
        return items
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            if limit and i >= limit:
                break
            try:
                items.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
    return items


def normalize_question(item, dataset_name, pipeline, idx):
    """Normalize a raw HF item into a standard question format."""
    # Try common field names for question
    question = (
        item.get("question") or item.get("query") or
        item.get("Prompt") or item.get("ambiguous_question") or
        item.get("text") or ""
    )
    if isinstance(question, dict):
        question = question.get("text", str(question))

    # Try common field names for answer
    answer = (
        item.get("answer") or item.get("answers") or item.get("Answer") or
        item.get("final_decision") or item.get("possible_answers") or
        item.get("qa_pairs") or ""
    )
    if isinstance(answer, dict):
        answer = answer.get("value", str(answer))
    if isinstance(answer, list):
        answer = answer[0] if answer else ""
        if isinstance(answer, dict):
            answer = answer.get("text", answer.get("value", str(answer)))

    # Get context if available
    context = item.get("context") or item.get("passage") or item.get("document") or ""
    if isinstance(context, dict):
        context = json.dumps(context, ensure_ascii=False)
    if isinstance(context, list):
        context = json.dumps(context, ensure_ascii=False)

    return {
        "id": f"{dataset_name}_{idx}",
        "dataset_name": dataset_name,
        "pipeline": pipeline,
        "question": str(question)[:2000],
        "expected_answer": str(answer)[:2000],
        "context": str(context)[:5000] if context else "",
        "phase": "auto-generated",
    }


def generate_phase(phase_num, targets, hf_dir, output_dir, limit_per_ds=None):
    """Generate a phase dataset file from downloaded HF JSONL files."""
    all_questions = []
    stats = {"pipeline": {}, "dataset": {}}

    for pipeline, datasets in targets.items():
        pipeline_count = 0
        for ds_name, target_count in datasets.items():
            actual_limit = min(target_count, limit_per_ds) if limit_per_ds else target_count
            jsonl_path = hf_dir / f"{ds_name}.jsonl"

            items = load_jsonl(jsonl_path, limit=actual_limit)
            if not items:
                print(f"  [MISS] {ds_name}: no data (file not found or empty)")
                stats["dataset"][ds_name] = 0
                continue

            questions = []
            for idx, item in enumerate(items):
                q = normalize_question(item, ds_name, pipeline, idx)
                if q["question"]:
                    questions.append(q)

            all_questions.extend(questions)
            stats["dataset"][ds_name] = len(questions)
            pipeline_count += len(questions)
            print(f"  [OK] {ds_name}: {len(questions)}/{actual_limit} questions")

        stats["pipeline"][pipeline] = pipeline_count

    # Shuffle for variety
    random.seed(42)
    random.shuffle(all_questions)

    # Write output
    output_file = output_dir / f"phase-{phase_num}-questions.json"
    output = {
        "phase": phase_num,
        "generated_at": datetime.now().isoformat(),
        "total_questions": len(all_questions),
        "stats": stats,
        "questions": all_questions,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n  Phase {phase_num}: {len(all_questions)} questions -> {output_file}")
    print(f"  By pipeline: {json.dumps(stats['pipeline'])}")
    return len(all_questions)


def main():
    parser = argparse.ArgumentParser(description="Generate phase dataset files")
    parser.add_argument("--phase", type=int, choices=[3, 4, 5], default=3)
    parser.add_argument("--all", action="store_true", help="Generate all phases")
    parser.add_argument("--limit", type=int, default=0, help="Limit per dataset (0=no limit)")
    args = parser.parse_args()

    base = Path(__file__).parent.parent
    hf_dir = base / "hf"
    output_dir = base
    output_dir.mkdir(parents=True, exist_ok=True)

    phases = [3, 4] if args.all else [args.phase]

    for phase in phases:
        print(f"\n{'='*60}")
        print(f"GENERATING PHASE {phase} DATASET")
        print(f"{'='*60}")

        targets = PHASE_3 if phase == 3 else PHASE_4
        limit = args.limit if args.limit > 0 else None
        generate_phase(phase, targets, hf_dir, output_dir, limit)

    # Also create phase-specific directories
    for phase in phases:
        phase_dir = base / f"phase-{phase}"
        phase_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n  Created directory: {phase_dir}")


if __name__ == "__main__":
    main()
