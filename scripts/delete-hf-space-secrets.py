#!/usr/bin/env python3
"""
Delete HuggingFace Space secrets that conflict with variables
Usage: python3 delete-hf-space-secrets.py
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

# Secrets to delete (they conflict with variables)
secrets_to_delete = [
    "LLM_SQL_MODEL",
    "LLM_SQL_FALLBACK_MODEL",
]

print(f"Deleting conflicting secrets from {SPACE_ID}...")

try:
    for key in secrets_to_delete:
        print(f"\nDeleting secret {key}...")
        api.delete_space_secret(
            repo_id=SPACE_ID,
            key=key,
            token=HF_TOKEN
        )
        print(f"✓ {key} deleted successfully")

    print(f"\n✅ All conflicting secrets deleted!")
    print(f"The variables will now work correctly.")

except Exception as e:
    print(f"\n❌ Error deleting secrets: {e}")
    print(f"You may need to delete manually at:")
    print(f"https://huggingface.co/spaces/{SPACE_ID}/settings")
    exit(1)
