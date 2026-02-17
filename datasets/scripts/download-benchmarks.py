#!/usr/bin/env python3
"""
Download HuggingFace benchmark datasets for Multi-RAG evaluation.
Usage:
    python3 datasets/scripts/download-benchmarks.py --pipeline graph --limit 500
    python3 datasets/scripts/download-benchmarks.py --all --limit 1000
"""

import argparse
import json
import os
import sys
from pathlib import Path

# --- Dataset registry ---
DATASETS = {
    "standard": [
        {"name": "squad_v2",            "hf_id": "rajpurkar/squad_v2",                    "split": "validation", "text_field": "question", "answer_field": "answers"},
        {"name": "triviaqa",            "hf_id": "mandarjoshi/trivia_qa",                  "split": "validation", "config": "rc", "text_field": "question", "answer_field": "answer"},
        {"name": "popqa",               "hf_id": "akariasai/PopQA",                        "split": "test",       "text_field": "question", "answer_field": "possible_answers"},
        {"name": "narrativeqa",         "hf_id": "deepmind/narrativeqa",                   "split": "test",       "text_field": "question.text", "answer_field": "answers"},
        {"name": "pubmedqa",            "hf_id": "qiaojin/PubMedQA",                       "split": "train",      "config": "pqa_labeled", "text_field": "question", "answer_field": "final_decision"},
        {"name": "frames",              "hf_id": "google/frames-benchmark",                "split": "test",       "text_field": "Prompt", "answer_field": "Answer"},
        {"name": "natural_questions",   "hf_id": "google-research-datasets/natural_questions", "split": "validation", "text_field": "question.text", "answer_field": "annotations"},
        {"name": "msmarco",             "hf_id": "microsoft/ms_marco",                     "split": "test",       "config": "v2.1", "text_field": "query", "answer_field": "answers"},
        {"name": "asqa",                "hf_id": "din0s/asqa",                             "split": "dev",        "text_field": "ambiguous_question", "answer_field": "qa_pairs"},
    ],
    "graph": [
        {"name": "hotpotqa",            "hf_id": "hotpot_qa",                              "split": "validation", "config": "distractor", "text_field": "question", "answer_field": "answer"},
        {"name": "musique",             "hf_id": "StanfordNLP/musique",                    "split": "validation", "text_field": "question", "answer_field": "answer"},
        {"name": "2wikimultihopqa",     "hf_id": "xanhho/2WikiMultihopQA",                 "split": "dev",        "text_field": "question", "answer_field": "answer"},
    ],
    "quantitative": [
        {"name": "finqa",               "hf_id": "ibm/finqa",                              "split": "test",       "text_field": "question", "answer_field": "answer"},
        {"name": "tatqa",               "hf_id": "kasnerz/tatqa",                          "split": "test",       "text_field": "question", "answer_field": "answer"},
        {"name": "convfinqa",           "hf_id": "czyssrs/ConvFinQA",                      "split": "test",       "text_field": "question", "answer_field": "answer"},
        {"name": "wikitablequestions",  "hf_id": "wikitablequestions",                     "split": "test",       "text_field": "question", "answer_field": "answers"},
    ],
}


def download_dataset(ds_config, limit, output_dir):
    """Download a single dataset and save as JSONL."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("Installing datasets library...")
        os.system(f"{sys.executable} -m pip install datasets -q")
        from datasets import load_dataset

    name = ds_config["name"]
    hf_id = ds_config["hf_id"]
    split = ds_config["split"]
    config = ds_config.get("config")

    out_file = output_dir / f"{name}.jsonl"

    if out_file.exists():
        with open(out_file) as f:
            existing = sum(1 for _ in f)
        if existing >= limit:
            print(f"  [OK] {name}: {existing} items already downloaded, skipping")
            return existing
        print(f"  [->] {name}: {existing} items found, downloading up to {limit}...")
    else:
        print(f"  [DL] {name}: downloading up to {limit} items from {hf_id}...")

    try:
        kwargs = {"path": hf_id, "split": split, "trust_remote_code": True}
        if config:
            kwargs["name"] = config
        ds = load_dataset(**kwargs, streaming=True)

        items = []
        for i, item in enumerate(ds):
            if i >= limit:
                break
            # Flatten to simple dict
            flat = {"id": f"{name}_{i}", "dataset": name, "pipeline": "unknown"}
            for k, v in item.items():
                if isinstance(v, (str, int, float, bool)):
                    flat[k] = v
                elif isinstance(v, list) and len(v) > 0 and isinstance(v[0], str):
                    flat[k] = v[0]  # Take first element for simple lists
                elif isinstance(v, dict):
                    flat[str(k)] = str(v)
            items.append(flat)

        with open(out_file, "w", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

        print(f"  [OK] {name}: {len(items)} items saved to {out_file}")
        return len(items)

    except Exception as e:
        print(f"  [ERR] {name}: ERROR — {e}")
        return 0


def main():
    parser = argparse.ArgumentParser(description="Download HuggingFace benchmark datasets")
    parser.add_argument("--pipeline", choices=["standard", "graph", "quantitative", "all"], default="all")
    parser.add_argument("--limit", type=int, default=1000, help="Max items per dataset")
    parser.add_argument("--all", action="store_true", help="Download all pipelines")
    args = parser.parse_args()

    # Determine which datasets to download
    if args.pipeline == "all" or args.all:
        pipelines = ["standard", "graph", "quantitative"]
    else:
        pipelines = [args.pipeline]

    # Setup output directory
    output_dir = Path(__file__).parent.parent / "hf"
    output_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    for pipeline in pipelines:
        print(f"\n--- Pipeline: {pipeline.upper()} ---")
        for ds_config in DATASETS[pipeline]:
            count = download_dataset(ds_config, args.limit, output_dir)
            total += count

    dataset_count = sum(len(DATASETS[p]) for p in pipelines)
    print(f"\n[DONE] Total downloaded: {total} items across {dataset_count} datasets")
    print(f"Output: {output_dir}/")


if __name__ == "__main__":
    main()
