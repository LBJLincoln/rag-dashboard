#!/bin/bash
# rag-website Codespace bootstrap
# Installs: n8n (4 RAG pipelines) + Claude Code CLI + MCP servers + website deps
set -euo pipefail

echo "=== Nomos AI — rag-website Codespace Setup ==="

DEVCONTAINER_DIR="/workspaces/${localWorkspaceFolderBasename:-.}/.devcontainer/rag-website"
REPO_ROOT="/workspaces/${localWorkspaceFolderBasename:-.}"
N8N_URL="http://localhost:5678"
WORKFLOW_DIR="${REPO_ROOT}/n8n/live"
MAX_WAIT=180

# --- 1. Start n8n stack via docker compose ---
echo "[1/8] Starting n8n stack (docker compose)..."
if [ -f "${DEVCONTAINER_DIR}/docker-compose.yml" ]; then
  docker compose -f "${DEVCONTAINER_DIR}/docker-compose.yml" up -d
  echo "  n8n stack starting..."
else
  echo "  WARN: docker-compose.yml not found, skipping n8n start"
fi

# --- 2. Wait for n8n to be ready ---
echo "[2/8] Waiting for n8n..."
elapsed=0
until curl -sf "${N8N_URL}/healthz" > /dev/null 2>&1; do
  sleep 3; elapsed=$((elapsed + 3))
  if [ $elapsed -ge $MAX_WAIT ]; then
    echo "ERROR: n8n not ready after ${MAX_WAIT}s"; exit 1
  fi
done
echo "  n8n ready (${elapsed}s)"

# --- 3. Import 4 RAG pipeline workflows ---
echo "[3/8] Importing RAG pipeline workflows..."
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

# --- 4. Import support workflows ---
echo "[4/8] Importing support workflows..."
for wf in feedback.json benchmark.json; do
  if [ -f "${WORKFLOW_DIR}/${wf}" ]; then
    curl -sf -X POST "${N8N_URL}/api/v1/workflows" \
      -H "Content-Type: application/json" \
      -d @"${WORKFLOW_DIR}/${wf}" > /dev/null 2>&1 && \
      echo "  Imported: ${wf}" || echo "  WARN: ${wf} skip"
  fi
done

# --- 5. Install Python deps ---
echo "[5/8] Installing Python dependencies..."
pip install -q requests python-dotenv 2>/dev/null || true

# --- 6. Install website deps ---
echo "[6/8] Installing website dependencies..."
if [ -d "${REPO_ROOT}/website" ]; then
  cd "${REPO_ROOT}/website" && npm install --silent 2>/dev/null || true
  cd "${REPO_ROOT}"
fi

# --- 7. Install Claude Code CLI + MCP ---
echo "[7/8] Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code 2>/dev/null && echo "  claude installed" || echo "  WARN: claude install failed"
npm install -g neo4j-mcp 2>/dev/null || true
npm install @pinecone-database/mcp 2>/dev/null || true

# Generate MCP config
cat > "${REPO_ROOT}/.mcp.json" << MCPEOF
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
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true"
      }
    },
    "pinecone": {
      "type": "stdio",
      "command": "node",
      "args": ["${REPO_ROOT}/node_modules/@pinecone-database/mcp/dist/index.js"],
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
      "args": ["${REPO_ROOT}/mcp/jina-embeddings-server.py"],
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
echo "  .mcp.json generated"

# --- 8. Verify environment ---
echo "[8/8] Verifying environment..."
python3 -c "
import os
for key in ['OPENROUTER_API_KEY', 'JINA_API_KEY', 'PINECONE_API_KEY', 'NEO4J_URI', 'SUPABASE_URL']:
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING (set as Codespace secret)'
    print(f'  {key}: {status}')
" 2>/dev/null || true

echo ""
echo "=== Setup complete ==="
echo "  n8n UI:      ${N8N_URL}"
echo "  Website:     http://localhost:3000"
echo "  Claude Code: claude (run from ${REPO_ROOT})"
echo "  Workflows:   4 RAG pipelines + support"
echo ""
echo "Next steps:"
echo "  1. source .env.local (if exists)"
echo "  2. claude  (launches Claude Code with CLAUDE.md)"
echo "  3. cd website && npm run dev  (starts Next.js)"
