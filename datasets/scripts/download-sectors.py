#!/usr/bin/env python3
"""
Download sector-specific datasets for rag-website demos and rag-tests.
Priority order: Finance P1 -> Juridique P1 -> BTP -> Industrie

Usage:
    python3 datasets/scripts/download-sectors.py --sector finance
    python3 datasets/scripts/download-sectors.py --all --limit 500
    python3 datasets/scripts/download-sectors.py --sector juridique --priority P1
"""

import argparse
import json
import os
import sys
from pathlib import Path

SECTOR_DATASETS = {
    "finance": {
        "priority": "P1",
        "pipeline": "quantitative",
        "impact": "Pushes Quantitative from 78.3% to ~85% (Phase 1 target)",
        "datasets": [
            {
                "name": "financebench",
                "hf_id": "PatronusAI/financebench",
                "split": "train",
                "priority": "P1",
                "note": "150 real financial Q&A from annual reports — key for Quant pipeline",
            },
            {
                "name": "convfinqa",
                "hf_id": "czyssrs/ConvFinQA",
                "split": "train",
                "priority": "P1",
                "note": "3,892 conversational financial QA with numerical reasoning",
            },
            {
                "name": "tatqa",
                "hf_id": "kasnerz/tatqa",
                "split": "train",
                "priority": "P1",
                "note": "16,552 QA over tables and text from financial reports",
            },
            {
                "name": "sec_qa",
                "hf_id": "jkung2003/sec-qa",
                "split": "train",
                "priority": "P2",
                "note": "~5,000 QA from SEC filings (10-K, 10-Q)",
            },
            {
                "name": "financial_phrasebank",
                "hf_id": "takala/financial_phrasebank",
                "split": "train",
                "priority": "P3",
                "note": "4,846 financial sentiment sentences — useful for context enrichment",
            },
        ],
    },
    "juridique": {
        "priority": "P1",
        "pipeline": "graph",
        "impact": "Strengthens Neo4j with French legal entities — Graph from 68.7% to ~72%",
        "datasets": [
            {
                "name": "french_case_law",
                "hf_id": "rcds/french_case_law",
                "split": "train",
                "priority": "P1",
                "note": "~50K French court decisions — primary source for legal Graph RAG",
            },
            {
                "name": "cold_french_law",
                "hf_id": "rcds/cold-french-law",
                "split": "train",
                "priority": "P1",
                "note": "~10K French legal texts (codes, statutes) — enriches Neo4j legal graph",
            },
            {
                "name": "legalbench",
                "hf_id": "nguha/legalbench",
                "split": "test",
                "priority": "P2",
                "note": "162 legal reasoning tasks — gold benchmark for legal RAG evaluation",
            },
            {
                "name": "eurlex",
                "hf_id": "EurLex/eurlex",
                "split": "train",
                "priority": "P2",
                "note": "~20K EU legal documents — cross-border regulatory coverage",
            },
            {
                "name": "cail2018",
                "hf_id": "thunlp/cail2018",
                "split": "train",
                "priority": "P3",
                "note": "183K Chinese legal cases — structural reference for legal QA format",
            },
        ],
    },
    "btp": {
        "priority": "P2",
        "pipeline": "standard",
        "impact": "Powers BTP sector demo on rag-website",
        "datasets": [
            {
                "name": "code_accord",
                "hf_id": "GT4SD/code-accord",
                "split": "train",
                "priority": "P2",
                "note": "~5K building regulation Q&A pairs — directly applicable to BTP compliance",
            },
            {
                "name": "ragbench_btp",
                "hf_id": "rungalileo/ragbench",
                "split": "train",
                "priority": "P2",
                "note": "~100K general RAG benchmark — filtered for construction/engineering domain",
            },
            {
                "name": "docie",
                "hf_id": "Sygil/DocIE",
                "split": "train",
                "priority": "P2",
                "note": "~3K document information extraction — useful for BTP document parsing",
            },
        ],
    },
    "industrie": {
        "priority": "P2",
        "pipeline": "standard",
        "impact": "Powers Industrie sector demo on rag-website",
        "datasets": [
            {
                "name": "manufacturing_qa",
                "hf_id": "thesven/manufacturing-qa-gpt4o",
                "split": "train",
                "priority": "P2",
                "note": "~3K GPT-4o generated manufacturing Q&A — high quality domain coverage",
            },
            {
                "name": "ragbench",
                "hf_id": "rungalileo/ragbench",
                "split": "train",
                "priority": "P2",
                "note": "~100K RAG benchmark — general industrial and technical knowledge",
            },
        ],
    },
}


def download_sector_dataset(ds_config, sector, limit, output_dir):
    """Download a single sector dataset and save as JSONL."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("  Installing datasets library...")
        os.system(f"{sys.executable} -m pip install datasets -q")
        from datasets import load_dataset

    name = ds_config["name"]
    hf_id = ds_config["hf_id"]
    split = ds_config["split"]
    priority = ds_config["priority"]
    note = ds_config.get("note", "")

    out_file = output_dir / sector / f"{name}.jsonl"
    out_file.parent.mkdir(parents=True, exist_ok=True)

    if out_file.exists():
        with open(out_file) as f:
            existing = sum(1 for _ in f)
        if existing >= limit:
            print(f"  [OK] [{priority}] {name}: {existing} items already downloaded")
            return existing
        print(f"  [->] [{priority}] {name}: resuming ({existing}/{limit})...")
    else:
        print(f"  [DL] [{priority}] {name}: downloading from {hf_id}...")
        if note:
            print(f"       Note: {note}")

    try:
        ds = load_dataset(hf_id, split=split, trust_remote_code=True, streaming=True)
        items = []
        for i, item in enumerate(ds):
            if i >= limit:
                break
            flat = {"id": f"{name}_{i}", "dataset": name, "sector": sector, "priority": priority}
            for k, v in item.items():
                if isinstance(v, (str, int, float, bool)):
                    flat[k] = v
                elif isinstance(v, list) and v and isinstance(v[0], str):
                    flat[k] = v[0]
                elif isinstance(v, dict):
                    flat[str(k)] = str(v)
            items.append(flat)

        with open(out_file, "w", encoding="utf-8") as f:
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

        print(f"  [OK] [{priority}] {name}: {len(items)} items -> {out_file}")
        return len(items)

    except Exception as e:
        print(f"  [ERR] [{priority}] {name}: {e}")
        return 0


def main():
    parser = argparse.ArgumentParser(
        description="Download sector-specific datasets for rag-website and rag-tests"
    )
    parser.add_argument(
        "--sector",
        choices=["finance", "juridique", "btp", "industrie", "all"],
        default="all",
        help="Sector to download (default: all)",
    )
    parser.add_argument(
        "--priority",
        choices=["P1", "P2", "P3", "all"],
        default="all",
        help="Filter by priority (default: all)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=500,
        help="Max items per dataset (default: 500)",
    )
    parser.add_argument("--all", action="store_true", help="Download all sectors")
    args = parser.parse_args()

    sectors = (
        list(SECTOR_DATASETS.keys()) if (args.sector == "all" or args.all) else [args.sector]
    )
    output_dir = Path(__file__).parent.parent / "sectors"
    output_dir.mkdir(parents=True, exist_ok=True)

    total = 0
    skipped = 0
    for sector in sectors:
        info = SECTOR_DATASETS[sector]
        print(
            f"\n=== Secteur: {sector.upper()} "
            f"(pipeline: {info['pipeline']}, {info['priority']}) ==="
        )
        print(f"    Impact: {info['impact']}")
        for ds_config in info["datasets"]:
            if args.priority != "all" and ds_config["priority"] != args.priority:
                print(
                    f"  [SKIP] [{ds_config['priority']}] {ds_config['name']}: "
                    f"filtered (--priority {args.priority})"
                )
                skipped += 1
                continue
            count = download_sector_dataset(ds_config, sector, args.limit, output_dir)
            total += count

    print(f"\n[DONE] Total: {total} items downloaded, {skipped} datasets skipped")
    print(f"Output: {output_dir}/")


if __name__ == "__main__":
    main()
