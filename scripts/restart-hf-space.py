#!/usr/bin/env python3
"""
Restart HuggingFace Space to pick up new secrets
Usage: python3 restart-hf-space.py
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

print(f"Restarting HF Space {SPACE_ID}...")

try:
    # Restart the space
    api.restart_space(repo_id=SPACE_ID, token=HF_TOKEN)
    print(f"✅ Space restart initiated successfully!")
    print(f"\nThe space will restart and pick up the new LLM_SQL_MODEL and LLM_SQL_FALLBACK_MODEL.")
    print(f"This may take 1-2 minutes.")
    print(f"\nMonitor status: https://huggingface.co/spaces/{SPACE_ID}")

except Exception as e:
    print(f"❌ Error restarting space: {e}")
    print(f"\nYou may need to restart manually at:")
    print(f"https://huggingface.co/spaces/{SPACE_ID}/settings")
    exit(1)
