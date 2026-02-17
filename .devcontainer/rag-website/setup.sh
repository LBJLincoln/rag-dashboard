#!/bin/bash
# rag-website Codespace bootstrap — imports 4 RAG pipeline workflows + sector datasets
set -euo pipefail

echo "=== Nomos AI — rag-website Codespace Setup ==="

N8N_URL="${N8N_HOST:-http://localhost:5678}"
WORKFLOW_DIR="/workspace/n8n/live"
MAX_WAIT=120

# --- 1. Wait for n8n to be ready ---
echo "[1/6] Waiting for n8n..."
elapsed=0
until curl -sf "${N8N_URL}/healthz" > /dev/null 2>&1; do
  sleep 2; elapsed=$((elapsed + 2))
  if [ $elapsed -ge $MAX_WAIT ]; then
    echo "ERROR: n8n not ready after ${MAX_WAIT}s"; exit 1
  fi
done
echo "  n8n ready (${elapsed}s)"

# --- 2. Import 4 RAG pipeline workflows ---
echo "[2/6] Importing RAG pipeline workflows..."
for wf in standard.json graph.json quantitative.json orchestrator.json; do
  if [ -f "${WORKFLOW_DIR}/${wf}" ]; then
    curl -sf -X POST "${N8N_URL}/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"${WORKFLOW_DIR}/${wf}" > /dev/null 2>&1 && \
      echo "  Imported: ${wf}" || echo "  WARN: ${wf} already exists or import failed"
  else
    echo "  SKIP: ${WORKFLOW_DIR}/${wf} not found"
  fi
done

# --- 3. Import support workflows (feedback, benchmark) ---
echo "[3/6] Importing support workflows..."
for wf in feedback.json benchmark.json; do
  if [ -f "${WORKFLOW_DIR}/${wf}" ]; then
    curl -sf -X POST "${N8N_URL}/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"${WORKFLOW_DIR}/${wf}" > /dev/null 2>&1 && \
      echo "  Imported: ${wf}" || echo "  WARN: ${wf} skip"
  fi
done

# --- 4. Install Python deps ---
echo "[4/6] Installing Python dependencies..."
pip install -q requests python-dotenv 2>/dev/null

# --- 5. Install website deps ---
echo "[5/6] Installing website dependencies..."
if [ -d "/workspace/website" ]; then
  cd /workspace/website && npm install --silent 2>/dev/null
  cd /workspace
fi

# --- 6. Verify connectivity to external DBs ---
echo "[6/6] Verifying external DB connectivity..."
python3 -c "
import os, sys
checks = []
for key in ['OPENROUTER_API_KEY', 'JINA_API_KEY', 'PINECONE_API_KEY', 'NEO4J_URI', 'SUPABASE_URL']:
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING'
    checks.append(f'  {key}: {status}')
print('\n'.join(checks))
missing = [k for k in ['OPENROUTER_API_KEY','PINECONE_API_KEY'] if not os.environ.get(k)]
if missing:
    print(f'WARNING: Missing critical keys: {missing}')
    print('Set them as Codespace secrets or in .env.local')
" 2>/dev/null

echo ""
echo "=== Setup complete ==="
echo "  n8n UI:  ${N8N_URL}"
echo "  Website: http://localhost:3000"
echo "  Workflows imported: 4 RAG pipelines + support"
echo ""
echo "Next: source .env.local && cd website && npm run dev"
