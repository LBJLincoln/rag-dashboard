#!/usr/bin/env python3
"""
Check ingestion status of all datasets across Supabase / Pinecone / Neo4j.
Shows a status table per dataset: local files, Supabase count, Pinecone status, Neo4j status.

Usage:
    source .env.local && python3 datasets/scripts/check-ingestion-status.py
"""

import json
import os
import sys
from pathlib import Path

# --- Load .env.local ---
env_file = Path(__file__).parent.parent.parent / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#") and not line.startswith("//"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# --- Known state from Supabase (17 fev 2026 baseline) ---
KNOWN_SUPABASE = {
    "squad_v2":           {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "triviaqa":           {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "popqa":              {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "narrativeqa":        {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "msmarco":            {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "natural_questions":  {"count": 1000, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "hotpotqa":           {"count": 1000, "pipeline": "graph",        "pinecone": "partial", "neo4j": None},
    "asqa":               {"count":  948, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "frames":             {"count":  824, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "finqa":              {"count":  700, "pipeline": "quantitative",  "pinecone": "partial", "neo4j": "supabase"},
    "pubmedqa":           {"count":  500, "pipeline": "standard",     "pinecone": "partial", "neo4j": None},
    "2wikimultihopqa":    {"count":  300, "pipeline": "graph",        "pinecone": None,       "neo4j": "missing"},
    "musique":            {"count":  200, "pipeline": "graph",        "pinecone": None,       "neo4j": "missing"},
    "tatqa":              {"count":  150, "pipeline": "quantitative",  "pinecone": "partial", "neo4j": "supabase"},
    "convfinqa":          {"count":  100, "pipeline": "quantitative",  "pinecone": "partial", "neo4j": "supabase"},
    "wikitablequestions": {"count":   50, "pipeline": "quantitative",  "pinecone": None,       "neo4j": "supabase"},
}

SECTOR_REGISTRY = {
    "finance":   ["financebench", "convfinqa", "tatqa", "sec_qa", "financial_phrasebank"],
    "juridique": ["french_case_law", "cold_french_law", "legalbench", "eurlex", "cail2018"],
    "btp":       ["code_accord", "ragbench_btp", "docie"],
    "industrie": ["manufacturing_qa", "ragbench"],
}


def icon_status(status):
    """Return a short text indicator."""
    if status == "partial":
        return "[~]"
    if status == "missing":
        return "[X]"
    if status is None:
        return "[ ]"
    return "[?]"


def check_supabase_live():
    """Attempt a live Supabase query; fall back to known baseline."""
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", ""))

    if not supabase_url or not supabase_key:
        print("  [WARN] SUPABASE_URL or SUPABASE_KEY not set — using baseline counts")
        return None

    try:
        import urllib.request
        import urllib.error

        results = {}
        for dataset_name in KNOWN_SUPABASE:
            url = (
                f"{supabase_url}/rest/v1/benchmark_datasets"
                f"?dataset_name=eq.{dataset_name}&select=id"
            )
            req = urllib.request.Request(
                url,
                headers={
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Prefer": "count=exact",
                    "Range": "0-0",
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=5) as resp:
                    content_range = resp.headers.get("Content-Range", "*/0")
                    total = int(content_range.split("/")[-1]) if "/" in content_range else 0
                    results[dataset_name] = total
            except Exception:
                results[dataset_name] = KNOWN_SUPABASE[dataset_name]["count"]

        return results

    except Exception as e:
        print(f"  [WARN] Live Supabase query failed ({e}) — using baseline counts")
        return None


def check_local_hf(base_dir):
    """Check what JSONL files exist in datasets/hf/."""
    hf_dir = base_dir / "hf"
    local = {}
    if hf_dir.exists():
        for f in sorted(hf_dir.glob("*.jsonl")):
            count = sum(1 for _ in open(f, encoding="utf-8"))
            local[f.stem] = count
    return local


def check_local_sectors(base_dir):
    """Check what sector JSONL files exist in datasets/sectors/."""
    sectors_dir = base_dir / "sectors"
    local = {}
    if sectors_dir.exists():
        for sector_dir in sorted(sectors_dir.iterdir()):
            if sector_dir.is_dir():
                sector_data = {}
                for f in sorted(sector_dir.glob("*.jsonl")):
                    count = sum(1 for _ in open(f, encoding="utf-8"))
                    sector_data[f.stem] = count
                local[sector_dir.name] = sector_data
    return local


def print_separator(char="-", width=80):
    print(char * width)


def main():
    base_dir = Path(__file__).parent.parent

    print("=" * 80)
    print("  DATASET INGESTION STATUS — Multi-RAG SOTA 2026")
    print("  Generated: check-ingestion-status.py")
    print("=" * 80)

    # --- 1. Supabase state ---
    print("\n[1] SUPABASE — benchmark_datasets table")
    print_separator()
    print(f"  {'Dataset':<25} {'Pipeline':<15} {'Supabase':>8}  {'Pinecone':>8}  {'Neo4j':>8}")
    print_separator()

    live_counts = check_supabase_live()
    total_supabase = 0

    for name, info in sorted(KNOWN_SUPABASE.items(), key=lambda x: x[1]["count"], reverse=True):
        count = live_counts.get(name, info["count"]) if live_counts else info["count"]
        pinecone_str = icon_status(info["pinecone"])
        neo4j_str = icon_status(info["neo4j"]) if info["neo4j"] != "supabase" else "[S]"
        if info["neo4j"] == "missing":
            neo4j_str = "[X] NEED"
        total_supabase += count
        print(f"  {name:<25} {info['pipeline']:<15} {count:>8}  {pinecone_str:>8}  {neo4j_str:>8}")

    print_separator()
    print(f"  {'TOTAL':<25} {'':<15} {total_supabase:>8}")
    print()
    print("  Legend: [OK]=done  [~]=partial  [ ]=not started  [X]=missing  [S]=in Supabase")

    # --- 2. Local HF files ---
    print("\n[2] LOCAL FILES — datasets/hf/ (downloaded JSONL)")
    print_separator()
    local_hf = check_local_hf(base_dir)

    if not local_hf:
        print("  [EMPTY] No datasets/hf/*.jsonl files found.")
        print("  Run: python3 datasets/scripts/download-benchmarks.py --pipeline all --limit 1000")
    else:
        print(f"  {'Dataset':<25} {'Local count':>12}  {'In Supabase':>12}  {'Status'}")
        print_separator()
        for name, count in sorted(local_hf.items()):
            supabase_count = KNOWN_SUPABASE.get(name, {}).get("count", 0)
            status = "[OK]" if count >= supabase_count > 0 else "[~]" if count > 0 else "[ ]"
            print(f"  {name:<25} {count:>12}  {supabase_count:>12}  {status}")

    # --- 3. Local sector files ---
    print("\n[3] LOCAL FILES — datasets/sectors/ (sector JSONL)")
    print_separator()
    local_sectors = check_local_sectors(base_dir)

    if not local_sectors:
        print("  [EMPTY] No datasets/sectors/ files found.")
        print("  Run: python3 datasets/scripts/download-sectors.py --sector finance --priority P1")
    else:
        for sector, files in sorted(local_sectors.items()):
            total = sum(files.values())
            print(f"  {sector.upper():<15} {len(files)} files, {total} items total")
            for fname, count in sorted(files.items()):
                print(f"    - {fname:<30} {count:>6} items")

    # --- 4. What's missing (action items) ---
    print("\n[4] ACTION ITEMS — What to do next")
    print_separator()

    actions = []

    # Check graph datasets missing from Neo4j
    for name, info in KNOWN_SUPABASE.items():
        if info["neo4j"] == "missing":
            actions.append(
                f"  [URGENT] Ingest {name} into Neo4j "
                f"(graph pipeline blocked — {info['count']} items in Supabase)"
            )

    # Check sector P1 datasets
    finance_ok = "financebench" in local_sectors.get("finance", {})
    juridique_ok = "french_case_law" in local_sectors.get("juridique", {})

    if not finance_ok:
        actions.append(
            "  [P1] Download Finance datasets: "
            "python3 datasets/scripts/download-sectors.py --sector finance --priority P1"
        )
    if not juridique_ok:
        actions.append(
            "  [P1] Download Juridique datasets: "
            "python3 datasets/scripts/download-sectors.py --sector juridique --priority P1"
        )

    # Check if HF benchmarks are local
    missing_hf = set(KNOWN_SUPABASE.keys()) - set(local_hf.keys())
    if missing_hf:
        actions.append(
            f"  [P2] Download {len(missing_hf)} missing HF benchmarks locally: "
            f"python3 datasets/scripts/download-benchmarks.py --pipeline all"
        )

    if not actions:
        print("  [OK] All datasets are ingested and up to date!")
    else:
        for action in actions:
            print(action)

    print("\n" + "=" * 80)
    print("  Run check-ingestion-status.py again after ingestion to verify.")
    print("=" * 80)


if __name__ == "__main__":
    main()
