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
                "hf_id": "ChanceFocus/flare-convfinqa",
                "split": "train",
                "priority": "P1",
                "note": "3,892 conversational financial QA with numerical reasoning",
            },
            {
                "name": "tatqa",
                "hf_id": "ChanceFocus/flare-tatqa",
                "split": "test",
                "priority": "P1",
                "note": "1K-10K QA over tables and text from financial reports",
            },
            {
                "name": "sec_qa",
                "hf_id": "zefang-liu/secqa",
                "config": "secqa_v2",
                "split": "test",
                "priority": "P2",
                "note": "Multiple-choice QA on SEC filings security topics",
            },
            {
                "name": "tatqa_ragbench",
                "hf_id": "galileo-ai/ragbench",
                "config": "tatqa",
                "split": "train",
                "priority": "P3",
                "note": "RAGBench TatQA subset — table-text financial QA",
            },
            {
                "name": "finqa_ragbench",
                "hf_id": "galileo-ai/ragbench",
                "config": "finqa",
                "split": "train",
                "priority": "P2",
                "note": "RAGBench FinQA subset — financial QA benchmark",
            },
        ],
    },
    "juridique": {
        "priority": "P1",
        "pipeline": "graph",
        "impact": "Strengthens Neo4j with French legal entities — Graph from 68.7% to ~72%",
        "datasets": [
            {
                "name": "french_case_law_juri",
                "hf_id": "artefactory/Argimi-Legal-French-Jurisprudence",
                "config": "juri",
                "split": "train",
                "priority": "P1",
                "note": "French legal jurisprudence (general) — primary source for legal Graph RAG",
            },
            {
                "name": "french_case_law_cetat",
                "hf_id": "artefactory/Argimi-Legal-French-Jurisprudence",
                "config": "cetat",
                "split": "train",
                "priority": "P1",
                "note": "Conseil d'Etat administrative law — enriches legal graph",
            },
            {
                "name": "cold_french_law",
                "hf_id": "harvard-lil/cold-french-law",
                "split": "train",
                "priority": "P1",
                "note": "~10K French legal texts (codes, statutes) — enriches Neo4j legal graph",
            },
            {
                "name": "hotpotqa_ragbench",
                "hf_id": "galileo-ai/ragbench",
                "config": "hotpotqa",
                "split": "train",
                "priority": "P2",
                "note": "RAGBench HotpotQA subset — multi-hop reasoning for legal-style analysis",
            },
            {
                "name": "cail2018",
                "hf_id": "china-ai-law-challenge/cail2018",
                "split": "first_stage_train",
                "priority": "P3",
                "note": "Chinese legal cases — structural reference for legal QA format",
            },
        ],
    },
    "btp": {
        "priority": "P2",
        "pipeline": "standard",
        "impact": "Powers BTP sector demo on rag-website",
        "datasets": [
            {
                "name": "code_accord_entities",
                "hf_id": "ACCORD-NLP/CODE-ACCORD-Entities",
                "split": "train",
                "priority": "P2",
                "note": "NER entities from building regulations — BTP compliance",
            },
            {
                "name": "code_accord_relations",
                "hf_id": "ACCORD-NLP/CODE-ACCORD-Relations",
                "split": "train",
                "priority": "P2",
                "note": "Relations from building regulations — BTP compliance",
            },
            {
                "name": "ragbench_techqa",
                "hf_id": "galileo-ai/ragbench",
                "config": "techqa",
                "split": "train",
                "priority": "P2",
                "note": "RAGBench TechQA subset — technical/engineering domain",
            },
            {
                "name": "docie",
                "hf_id": "sercetexam9/docie_test",
                "split": "test",
                "priority": "P2",
                "note": "Document information extraction — useful for BTP document parsing",
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
                "hf_id": "karthiyayani/manufacturing-qa-v1",
                "split": "train",
                "priority": "P2",
                "note": "Manufacturing Q&A — domain coverage for industrial sector",
            },
            {
                "name": "ragbench_emanual",
                "hf_id": "galileo-ai/ragbench",
                "config": "emanual",
                "split": "train",
                "priority": "P2",
                "note": "RAGBench eManual subset — industrial/technical manuals",
            },
            {
                "name": "additive_manufacturing",
                "hf_id": "g3lu/additive_manufacturing_questions-R1",
                "split": "train",
                "priority": "P2",
                "note": "Additive manufacturing questions — specialized industrial domain",
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
    config = ds_config.get("config", None)
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
        config_str = f" (config: {config})" if config else ""
        print(f"  [DL] [{priority}] {name}: downloading from {hf_id}{config_str}...")
        if note:
            print(f"       Note: {note}")

    try:
        load_args = {"path": hf_id, "split": split, "streaming": True}
        if config:
            load_args["name"] = config
        ds = load_dataset(**load_args)
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
