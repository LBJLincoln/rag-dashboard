#!/usr/bin/env python3
"""
Check HuggingFace Space status and secrets
Usage: python3 check-hf-space-status.py
"""

import os
from huggingface_hub import HfApi

# Source the .env.local first
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("ERROR: HF_TOKEN not found in environment. Run 'source .env.local' first.")
    exit(1)

SPACE_ID = "LBJLincoln/nomos-rag-engine"

# Initialize API
api = HfApi(token=HF_TOKEN)

print(f"Checking HF Space {SPACE_ID}...")

try:
    # Get space info
    space_info = api.space_info(repo_id=SPACE_ID, token=HF_TOKEN)

    print(f"\n✅ Space Info:")
    print(f"  Runtime: {space_info.runtime}")
    print(f"  Stage: {space_info.runtime.stage if hasattr(space_info.runtime, 'stage') else 'N/A'}")
    print(f"  Hardware: {space_info.runtime.hardware if hasattr(space_info.runtime, 'hardware') else 'N/A'}")

    # List secrets (we can only see the keys, not values)
    print(f"\n📋 Checking secrets...")
    secrets = api.get_space_variables(repo_id=SPACE_ID, token=HF_TOKEN)

    print(f"  Total secrets: {len(secrets)}")

    # Check for our newly added secrets
    secret_keys = [s.key for s in secrets]

    if "LLM_SQL_MODEL" in secret_keys:
        print(f"  ✓ LLM_SQL_MODEL is set")
    else:
        print(f"  ✗ LLM_SQL_MODEL NOT found")

    if "LLM_SQL_FALLBACK_MODEL" in secret_keys:
        print(f"  ✓ LLM_SQL_FALLBACK_MODEL is set")
    else:
        print(f"  ✗ LLM_SQL_FALLBACK_MODEL NOT found")

    print(f"\nAll secret keys:")
    for key in sorted(secret_keys):
        print(f"  - {key}")

except Exception as e:
    print(f"❌ Error checking space: {e}")
    exit(1)
