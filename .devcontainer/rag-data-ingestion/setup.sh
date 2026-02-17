#!/bin/bash
# rag-data-ingestion Codespace bootstrap
# Installs: local n8n stack (ingestion + enrichment) + Claude Code CLI + MCP
set -euo pipefail

echo "=== Nomos AI — rag-data-ingestion Codespace Setup ==="

N8N_URL="${N8N_HOST:-http://localhost:5678}"
WORKFLOW_DIR="/workspace/n8n/live"
MAX_WAIT=120

# --- 1. Wait for n8n to be ready ---
echo "[1/7] Waiting for local n8n stack..."
elapsed=0
until curl -sf "${N8N_URL}/healthz" > /dev/null 2>&1; do
  sleep 2; elapsed=$((elapsed + 2))
  if [ $elapsed -ge $MAX_WAIT ]; then
    echo "ERROR: n8n not ready after ${MAX_WAIT}s"; exit 1
  fi
done
echo "  n8n ready (${elapsed}s)"

# --- 2. Import ingestion + enrichment workflows ---
echo "[2/7] Importing ingestion workflows..."
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
echo "[3/7] Installing Python dependencies..."
pip install -q requests python-dotenv 2>/dev/null

# --- 4. Install Claude Code CLI ---
echo "[4/7] Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code 2>/dev/null && echo "  claude installed" || echo "  WARN: claude install failed"
npm install -g neo4j-mcp 2>/dev/null || true
npm install @pinecone-database/mcp 2>/dev/null || true

# --- 5. Generate MCP config ---
echo "[5/7] Configuring MCP servers..."
cat > /workspace/.mcp.json << MCPEOF
{
  "mcpServers": {
    "n8n": {
      "type": "http",
      "url": "${N8N_URL}/mcp-server/http",
      "headers": {
        "Authorization": "Bearer ${N8N_MCP_TOKEN:-}"
      }
    },
    "neo4j": {
      "type": "stdio",
      "command": "neo4j-mcp",
      "args": [],
      "env": {
        "NEO4J_URI": "${NEO4J_URI:-neo4j+s://38c949a2.databases.neo4j.io}",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD:-}",
        "NEO4J_DATABASE": "neo4j"
      }
    },
    "pinecone": {
      "type": "stdio",
      "command": "node",
      "args": ["/workspace/node_modules/@pinecone-database/mcp/dist/index.js"],
      "env": {
        "PINECONE_API_KEY": "${PINECONE_API_KEY:-}"
      }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=ayqviqmxifzmhphiqfmj",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_MCP_TOKEN:-}"
      }
    },
    "jina-embeddings": {
      "type": "stdio",
      "command": "python3",
      "args": ["/workspace/mcp/jina-embeddings-server.py"],
      "env": {
        "JINA_API_KEY": "${JINA_API_KEY:-}",
        "PINECONE_API_KEY": "${PINECONE_API_KEY:-}",
        "PINECONE_HOST": "${PINECONE_HOST:-}",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY:-}",
        "N8N_API_KEY": "${N8N_API_KEY:-}",
        "N8N_HOST": "${N8N_URL}"
      }
    }
  }
}
MCPEOF
echo "  .mcp.json generated (n8n → local)"

# --- 6. Verify external DB connectivity ---
echo "[6/7] Verifying external DB connectivity..."
python3 -c "
import os
checks = {
    'PINECONE_API_KEY': 'Pinecone (vector store)',
    'NEO4J_URI': 'Neo4j (graph DB)',
    'NEO4J_PASSWORD': 'Neo4j auth',
    'SUPABASE_URL': 'Supabase (SQL DB)',
    'JINA_API_KEY': 'Jina (embeddings)',
}
for key, label in checks.items():
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING (set as Codespace secret)'
    print(f'  {label}: {status}')
" 2>/dev/null

# --- 7. Verify sector datasets ---
echo "[7/7] Checking sector datasets..."
for sector in btp industrie finance juridique; do
  count=$(find /workspace/datasets -iname "*${sector}*" 2>/dev/null | wc -l)
  echo "  ${sector}: ${count} files"
done

echo ""
echo "=== Setup complete ==="
echo "  n8n local:    ${N8N_URL}"
echo "  Claude Code:  claude (run from /workspace)"
echo "  Workflows:    Ingestion V3.1 + Enrichissement V3.1"
echo "  Workers:      2 (queue mode, concurrency 5 each)"
echo ""
echo "Next steps:"
echo "  1. source .env.local (if exists)"
echo "  2. claude  (launches Claude Code in agentic mode)"
