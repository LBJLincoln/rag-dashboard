#!/usr/bin/env python3
"""
Update HuggingFace Space variables (not secrets) via API
Space variables are like environment variables but not encrypted
Usage: python3 update-hf-space-vars.py
"""

import os
from huggingface_hub import HfApi, SpaceVariable

# Source the .env.local first
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("ERROR: HF_TOKEN not found in environment. Run 'source .env.local' first.")
    exit(1)

SPACE_ID = "LBJLincoln/nomos-rag-engine"

# Initialize API
api = HfApi(token=HF_TOKEN)

# New model configuration to avoid Llama 70B rate limit
new_vars = {
    "LLM_SQL_MODEL": "qwen/qwen-2.5-coder-32b-instruct:free",
    "LLM_SQL_FALLBACK_MODEL": "deepseek/deepseek-chat-v3-0324:free",
}

print(f"Updating HF Space variables for {SPACE_ID}...")
print(f"Changes:")
for key, value in new_vars.items():
    print(f"  {key} = {value}")

try:
    # Add variables to the space (not secrets)
    for key, value in new_vars.items():
        print(f"\nUpdating {key}...")
        api.add_space_variable(
            repo_id=SPACE_ID,
            key=key,
            value=value,
            token=HF_TOKEN
        )
        print(f"✓ {key} updated successfully")

    print(f"\n✅ All variables updated successfully!")
    print(f"\nNOTE: The HF Space will automatically restart to pick up the new variables.")

except Exception as e:
    print(f"\n❌ Error updating variables: {e}")
    print(f"\nAlternative: Update manually at:")
    print(f"https://huggingface.co/spaces/{SPACE_ID}/settings")
    exit(1)
