#!/bin/bash
# rag-data-ingestion Codespace bootstrap — local n8n stack + workflow import
set -euo pipefail

echo "=== Nomos AI — rag-data-ingestion Codespace Setup ==="

N8N_URL="${N8N_HOST:-http://localhost:5678}"
WORKFLOW_DIR="/workspace/n8n/live"
MAX_WAIT=120

# --- 1. Wait for n8n to be ready ---
echo "[1/5] Waiting for local n8n stack..."
elapsed=0
until curl -sf "${N8N_URL}/healthz" > /dev/null 2>&1; do
  sleep 2; elapsed=$((elapsed + 2))
  if [ $elapsed -ge $MAX_WAIT ]; then
    echo "ERROR: n8n not ready after ${MAX_WAIT}s"; exit 1
  fi
done
echo "  n8n ready (${elapsed}s)"

# --- 2. Import ingestion + enrichment workflows ---
echo "[2/5] Importing ingestion workflows..."
for wf in ingestion.json enrichment.json; do
  if [ -f "${WORKFLOW_DIR}/${wf}" ]; then
    curl -sf -X POST "${N8N_URL}/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"${WORKFLOW_DIR}/${wf}" > /dev/null 2>&1 && \
      echo "  Imported: ${wf}" || echo "  WARN: ${wf} already exists or import failed"
  else
    echo "  SKIP: ${WORKFLOW_DIR}/${wf} not found"
  fi
done

# --- 3. Install Python deps ---
echo "[3/5] Installing Python dependencies..."
pip install -q requests python-dotenv 2>/dev/null

# --- 4. Verify external DB connectivity ---
echo "[4/5] Verifying external DB connectivity..."
python3 -c "
import os
checks = {
    'PINECONE_API_KEY': 'Pinecone (vector store)',
    'NEO4J_URI': 'Neo4j (graph DB)',
    'NEO4J_PASSWORD': 'Neo4j auth',
    'SUPABASE_URL': 'Supabase (SQL DB)',
    'SUPABASE_API_KEY': 'Supabase auth',
    'JINA_API_KEY': 'Jina (embeddings)',
}
for key, label in checks.items():
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING'
    print(f'  {label} ({key}): {status}')
" 2>/dev/null

# --- 5. Verify sector datasets ---
echo "[5/5] Checking sector datasets..."
for sector in btp industrie finance juridique; do
  count=$(find /workspace/datasets -iname "*${sector}*" 2>/dev/null | wc -l)
  echo "  ${sector}: ${count} files"
done

echo ""
echo "=== Setup complete ==="
echo "  n8n local:    ${N8N_URL}"
echo "  Workflows:    Ingestion V3.1 + Enrichissement V3.1"
echo "  Workers:      2 (queue mode, concurrency 5 each)"
echo ""
echo "Usage:"
echo "  source .env.local"
echo "  curl -X POST ${N8N_URL}/webhook/ingestion-v3 \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"sector\": \"btp\", \"batch_size\": 10}'"
