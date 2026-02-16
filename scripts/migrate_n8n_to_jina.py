#!/usr/bin/env python3
"""
Migrate n8n workflows from Cohere to Jina embeddings + reranking.

Replaces hardcoded Cohere values with Jina equivalents in Standard and Graph workflows.

Changes:
1. Embedding URL: cohere.com/v2/embed → jina.ai/v1/embeddings
2. Embedding body: "texts" → "input", "input_type" → "task", remove "embedding_types"
3. Reranker URL: cohere.ai/v1/rerank → jina.ai/v1/rerank
4. Reranker model: rerank-v3.5 → jina-reranker-v2-base-multilingual
5. Auth headers: Cohere key → Jina key
6. Pinecone host: sota-rag-cohere-1024 → sota-rag-jina-1024

Usage:
  python3 scripts/migrate_n8n_to_jina.py --dry-run     # Preview changes
  python3 scripts/migrate_n8n_to_jina.py                # Apply changes
  python3 scripts/migrate_n8n_to_jina.py --revert       # Revert to Cohere
"""

import json
import os
import sys
import urllib.request
import argparse
from datetime import datetime

N8N_HOST = "http://localhost:5678"
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")

# Workflow IDs
STANDARD_WF = "TmgyRP20N4JFd9CB"
GRAPH_WF = "6257AfT1l4FMC6lY"

# API keys
COHERE_KEY = os.environ.get("COHERE_API_KEY", "")
JINA_KEY = os.environ.get("JINA_API_KEY", "")

# String replacements: (old, new) for migration TO Jina
REPLACEMENTS_TO_JINA = [
    # URLs
    ("https://api.cohere.com/v2/embed", "https://api.jina.ai/v1/embeddings"),
    ("https://api.cohere.ai/v1/rerank", "https://api.jina.ai/v1/rerank"),
    ("https://api.cohere.com/v1/rerank", "https://api.jina.ai/v1/rerank"),
    # Embedding body: field names
    ('"texts"', '"input"'),
    ('"input_type"', '"task"'),
    ('"search_query"', '"retrieval.query"'),
    ("'search_query'", "'retrieval.query'"),
    # Remove embedding_types (various formatting)
    (', "embedding_types": ["float"]', ''),
    (',"embedding_types":["float"]', ''),
    ('"embedding_types": ["float"],', ''),
    ('"embedding_types": ["float"]', ''),
    # Models
    ("embed-english-v3.0", "jina-embeddings-v3"),
    ("rerank-v3.5", "jina-reranker-v2-base-multilingual"),
    ("rerank-multilingual-v3.0", "jina-reranker-v2-base-multilingual"),
    # Auth (hardcoded Cohere key → Jina key)
    (f"Bearer {COHERE_KEY}", f"Bearer {JINA_KEY}"),
    # Pinecone host
    ("sota-rag-cohere-1024-a4mkzmz", "sota-rag-jina-1024-a4mkzmz"),
]

# Reverse replacements for revert
REPLACEMENTS_TO_COHERE = [(new, old) for old, new in REPLACEMENTS_TO_JINA]

ALLOWED_SETTINGS = {"executionOrder", "callerPolicy", "saveManualExecutions",
                    "saveExecutionProgress"}
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "snapshot", "pre-jina-migration")


def n8n_api(method, path, data=None):
    """Make n8n REST API request."""
    url = f"{N8N_HOST}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def clean_workflow_for_put(wf):
    """Keep only fields accepted by n8n PUT /api/v1/workflows/{id}."""
    return {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": wf.get("settings", {}),
        "staticData": wf.get("staticData"),
    }


def apply_replacements(obj, replacements):
    """Recursively apply string replacements to all string values in a JSON object.
    Returns (modified_obj, list_of_changes)."""
    changes = []

    if isinstance(obj, str):
        new_str = obj
        for old, new in replacements:
            if old in new_str:
                new_str = new_str.replace(old, new)
                changes.append(f"'{old[:40]}...' → '{new[:40]}...'")
        return new_str, changes

    if isinstance(obj, list):
        new_list = []
        for item in obj:
            new_item, item_changes = apply_replacements(item, replacements)
            new_list.append(new_item)
            changes.extend(item_changes)
        return new_list, changes

    if isinstance(obj, dict):
        new_dict = {}
        for k, v in obj.items():
            new_v, v_changes = apply_replacements(v, replacements)
            new_dict[k] = new_v
            changes.extend(v_changes)
        return new_dict, changes

    return obj, changes


def process_workflow(wf_id, wf_name, replacements, dry_run=False):
    """Process a single workflow with the given replacements."""
    print(f"\n{'='*60}")
    print(f"  Workflow: {wf_name} ({wf_id})")
    print(f"{'='*60}")

    # 1. Fetch workflow
    wf = n8n_api("GET", f"/api/v1/workflows/{wf_id}")
    nodes = wf.get("nodes", [])
    print(f"  Nodes: {len(nodes)}")

    # Backup
    if not dry_run:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        backup_path = os.path.join(BACKUP_DIR, f"{wf_id}-backup.json")
        with open(backup_path, "w") as f:
            json.dump(wf, f, indent=2)
        print(f"  Backup: {backup_path}")

    # 2. Apply replacements to all nodes
    all_changes = {}
    new_nodes = []
    for node in nodes:
        new_node, node_changes = apply_replacements(node, replacements)
        new_nodes.append(new_node)
        if node_changes:
            # Deduplicate changes per node
            unique_changes = list(dict.fromkeys(node_changes))
            all_changes[node["name"]] = unique_changes

    # 3. Report changes
    if not all_changes:
        print(f"  No changes needed")
        return False

    for node_name, changes in all_changes.items():
        print(f"\n  {node_name}:")
        for c in changes:
            print(f"    - {c}")

    total = sum(len(c) for c in all_changes.values())
    print(f"\n  Total changes: {total} across {len(all_changes)} nodes")

    if dry_run:
        print("  DRY RUN — not applying")
        return False

    # 4. Deploy
    print("  Deploying...")
    wf["nodes"] = new_nodes
    clean = clean_workflow_for_put(wf)

    try:
        # Deactivate first (ignore errors if already inactive)
        try:
            n8n_api("POST", f"/api/v1/workflows/{wf_id}/deactivate")
        except Exception:
            pass
        # Update
        n8n_api("PUT", f"/api/v1/workflows/{wf_id}", clean)
        # Activate
        try:
            n8n_api("POST", f"/api/v1/workflows/{wf_id}/activate")
        except Exception:
            pass  # webhook workflows may not need activation
        print("  Deployed successfully")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"  ERROR: HTTP {e.code}: {body}")
        return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Migrate n8n workflows: Cohere ↔ Jina")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes only")
    parser.add_argument("--revert", action="store_true", help="Revert to Cohere")
    parser.add_argument("--workflow", choices=["standard", "graph", "both"], default="both")
    args = parser.parse_args()

    replacements = REPLACEMENTS_TO_COHERE if args.revert else REPLACEMENTS_TO_JINA
    direction = "Jina → Cohere (revert)" if args.revert else "Cohere → Jina"

    print(f"n8n Workflow Migration: {direction}")
    print(f"Time: {datetime.now().isoformat()}")
    print(f"Dry run: {args.dry_run}")

    results = {}
    if args.workflow in ("standard", "both"):
        results["standard"] = process_workflow(STANDARD_WF, "Standard RAG", replacements, args.dry_run)
    if args.workflow in ("graph", "both"):
        results["graph"] = process_workflow(GRAPH_WF, "Graph RAG", replacements, args.dry_run)

    print(f"\n{'='*60}")
    print("  SUMMARY")
    for name, success in results.items():
        status = "UPDATED" if success else ("NO CHANGES" if not args.dry_run else "DRY RUN")
        print(f"  {name}: {status}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
