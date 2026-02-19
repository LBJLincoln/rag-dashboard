#!/usr/bin/env python3
"""
Check HuggingFace Space status and variables
Usage: python3 check-hf-space-status-v2.py
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
    print(f"  Stage: {space_info.runtime.stage if hasattr(space_info.runtime, 'stage') else 'N/A'}")
    print(f"  Hardware: {space_info.runtime.hardware if hasattr(space_info.runtime, 'hardware') else 'N/A'}")

    # Check for error message
    if hasattr(space_info.runtime, 'raw') and 'errorMessage' in space_info.runtime.raw:
        print(f"  ❌ Error: {space_info.runtime.raw['errorMessage']}")

    # List variables
    print(f"\n📋 Checking variables...")
    variables = api.get_space_variables(repo_id=SPACE_ID, token=HF_TOKEN)

    print(f"  Total variables: {len(variables)}")

    # Print all variables
    if variables:
        print(f"\nAll variables:")
        for var in variables:
            if isinstance(var, dict):
                print(f"  - {var.get('key', 'unknown')}")
            else:
                # It might be a SpaceVariable object
                try:
                    print(f"  - {var.key if hasattr(var, 'key') else var}")
                except:
                    print(f"  - {var}")

except Exception as e:
    print(f"❌ Error checking space: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
