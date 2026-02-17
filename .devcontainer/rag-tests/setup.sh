#!/bin/bash
# rag-tests Codespace bootstrap — connects 2 workers to VM via SSH tunnel
set -euo pipefail

echo "=== Nomos AI — rag-tests Codespace Setup ==="

VM_HOST="${VM_HOST:-34.136.180.66}"
N8N_URL="http://${VM_HOST}:5678"
MAX_WAIT=60

# --- 1. Verify VM connectivity ---
echo "[1/5] Checking VM connectivity (${VM_HOST})..."
if curl -sf --connect-timeout 10 "${N8N_URL}/healthz" > /dev/null 2>&1; then
  echo "  VM n8n reachable directly"
else
  echo "  WARN: VM n8n not reachable directly"
  echo "  SSH tunnel may be needed. From the VM, run:"
  echo "    gh codespace ssh -c \$(gh codespace list --json name -q '.[0].name') -- \\"
  echo "      -R 6379:localhost:6379 -R 5432:localhost:5432"
  echo ""
  echo "  Or set up tunnel from this Codespace:"
  echo "    ssh -L 6379:localhost:6379 -L 5432:localhost:5432 termius@${VM_HOST}"
fi

# --- 2. Install Python deps ---
echo "[2/5] Installing Python dependencies..."
pip install -q requests python-dotenv numpy 2>/dev/null

# --- 3. Verify eval scripts ---
echo "[3/5] Verifying eval scripts..."
for script in eval/quick-test.py eval/iterative-eval.py eval/run-eval-parallel.py eval/node-analyzer.py; do
  if [ -f "/workspace/${script}" ]; then
    echo "  OK: ${script}"
  else
    echo "  MISSING: ${script}"
  fi
done

# --- 4. Verify datasets ---
echo "[4/5] Checking datasets..."
dataset_count=$(find /workspace/datasets -name "*.json" 2>/dev/null | wc -l)
echo "  Found ${dataset_count} dataset files"

# --- 5. Check environment ---
echo "[5/5] Checking environment..."
python3 -c "
import os
for key in ['N8N_HOST', 'OPENROUTER_API_KEY', 'JINA_API_KEY', 'PINECONE_API_KEY', 'NEO4J_URI', 'SUPABASE_URL']:
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING'
    print(f'  {key}: {status}')
" 2>/dev/null

echo ""
echo "=== Setup complete ==="
echo "  VM n8n: ${N8N_URL}"
echo "  Workers: docker-compose up -d (launches 2 n8n workers)"
echo ""
echo "Next steps:"
echo "  1. source .env.local"
echo "  2. docker-compose up -d  (start workers)"
echo "  3. python3 eval/quick-test.py --questions 5 --pipeline standard"
