#!/usr/bin/env python3
"""
CI helper: prepare workflow JSON files for import into a fresh n8n instance.

Strips fields that cause foreign key constraint violations when importing
into a fresh n8n database that has no users/projects from the source VM.

Fields stripped:
  - shared: contains projectId/userId references → FK violation on workflow_entity
  - ownedBy: user reference
  - meta: may contain instanceId/userId

Usage:
  python3 scripts/ci_prepare_workflows.py [--workflow-dir n8n/live]
"""
import argparse
import json
import os

WORKFLOW_FILES = [
    "n8n/live/standard.json",
    "n8n/live/graph.json",
    "n8n/live/quantitative.json",
    "n8n/live/orchestrator.json",
]

# Fields to remove that cause FK constraint issues in fresh DB
FIELDS_TO_STRIP = ["shared", "ownedBy"]


def prepare_workflow(filepath):
    if not os.path.exists(filepath):
        print(f"  Skip (not found): {filepath}")
        return False

    with open(filepath) as f:
        data = json.load(f)

    stripped = []
    for field in FIELDS_TO_STRIP:
        if field in data and data[field]:
            stripped.append(field)
            data[field] = [] if isinstance(data[field], list) else None

    # Also clear meta if it has instanceId (can cause issues)
    if data.get("meta") and data["meta"].get("instanceId"):
        data["meta"].pop("instanceId", None)
        stripped.append("meta.instanceId")

    print(f"  {filepath}: stripped {stripped if stripped else 'nothing'}")

    with open(filepath, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workflow-dir", default=None, help="Override workflow directory")
    args = parser.parse_args()

    files = WORKFLOW_FILES
    if args.workflow_dir:
        files = [os.path.join(args.workflow_dir, os.path.basename(f)) for f in files]

    print("=== Preparing workflow JSONs for CI import ===")
    ok = 0
    for f in files:
        if prepare_workflow(f):
            ok += 1
    print(f"Prepared {ok}/{len(files)} workflow files")


if __name__ == "__main__":
    main()
