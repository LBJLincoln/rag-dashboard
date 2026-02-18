#!/usr/bin/env python3
"""
Patch n8n workflow JSON files to replace credential IDs.
Used in GitHub Actions CI to adapt workflows from VM credential IDs
to freshly-created CI credential IDs.

Usage:
  python3 scripts/patch_workflow_credentials.py \
    --old1 <old_id1> --new1 <new_id1> \
    --old2 <old_id2> --new2 <new_id2>
"""
import argparse
import json
import os
import sys

WORKFLOW_FILES = [
    "n8n/live/quantitative.json",
    "n8n/live/graph.json",
    "n8n/live/standard.json",
    "n8n/live/orchestrator.json",
]


def patch_credentials(workflow_files, cred_map):
    """Replace old credential IDs with new ones in workflow JSON files."""
    total_patched = 0
    for fname in workflow_files:
        if not os.path.exists(fname):
            print(f"  Skip (not found): {fname}")
            continue
        with open(fname) as f:
            data = json.load(f)
        patched = False
        for node in data.get("nodes", []):
            for cred_type, cred_info in node.get("credentials", {}).items():
                old_id = cred_info.get("id", "")
                if old_id in cred_map:
                    new_id = cred_map[old_id]
                    if new_id and new_id not in ("ERROR", ""):
                        print(f"  Patched {fname}: node='{node['name'][:40]}' {old_id} -> {new_id}")
                        cred_info["id"] = new_id
                        patched = True
                        total_patched += 1
                    else:
                        print(f"  Skip patch {fname}: new_id is empty/error for {old_id}")
        if patched:
            with open(fname, "w") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Total credential patches applied: {total_patched}")
    return total_patched


def main():
    parser = argparse.ArgumentParser(description="Patch n8n workflow credential IDs")
    parser.add_argument("--old1", required=True, help="Old credential ID 1 (Supabase PostgreSQL)")
    parser.add_argument("--new1", required=True, help="New credential ID 1")
    parser.add_argument("--old2", default="", help="Old credential ID 2 (Supabase Pooler)")
    parser.add_argument("--new2", default="", help="New credential ID 2")
    args = parser.parse_args()

    cred_map = {}
    if args.old1 and args.new1:
        cred_map[args.old1] = args.new1
    if args.old2 and args.new2:
        cred_map[args.old2] = args.new2

    print(f"Credential map: {cred_map}")
    patched = patch_credentials(WORKFLOW_FILES, cred_map)
    if patched == 0:
        print("Warning: no credentials were patched (IDs may not match)")
    print("Done.")


if __name__ == "__main__":
    main()
