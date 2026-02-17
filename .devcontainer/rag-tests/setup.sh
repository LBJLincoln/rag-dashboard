#!/bin/bash
# rag-tests Codespace bootstrap
# Installs: 2 n8n workers (SSH tunnel to VM) + Claude Code CLI + eval scripts
set -euo pipefail

echo "=== Nomos AI — rag-tests Codespace Setup ==="

VM_HOST="${VM_HOST:-34.136.180.66}"
N8N_URL="http://${VM_HOST}:5678"
MAX_WAIT=60

# --- 1. Verify VM connectivity ---
echo "[1/7] Checking VM connectivity (${VM_HOST})..."
if curl -sf --connect-timeout 10 "${N8N_URL}/healthz" > /dev/null 2>&1; then
  echo "  VM n8n reachable directly"
else
  echo "  WARN: VM n8n not reachable directly"
  echo "  From the VM, run: bash scripts/deploy-codespaces.sh tunnel rag-tests"
fi

# --- 2. Install Python deps ---
echo "[2/7] Installing Python dependencies..."
pip install -q requests python-dotenv numpy 2>/dev/null

# --- 3. Verify eval scripts ---
echo "[3/7] Verifying eval scripts..."
for script in eval/quick-test.py eval/iterative-eval.py eval/run-eval-parallel.py eval/node-analyzer.py; do
  if [ -f "/workspace/${script}" ]; then
    echo "  OK: ${script}"
  else
    echo "  MISSING: ${script}"
  fi
done

# --- 4. Verify datasets ---
echo "[4/7] Checking datasets..."
dataset_count=$(find /workspace/datasets -name "*.json" 2>/dev/null | wc -l)
echo "  Found ${dataset_count} dataset files"

# --- 5. Install Claude Code CLI ---
echo "[5/7] Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code 2>/dev/null && echo "  claude installed" || echo "  WARN: claude install failed"
npm install -g neo4j-mcp 2>/dev/null || true
npm install @pinecone-database/mcp 2>/dev/null || true

# --- 6. Generate MCP config ---
echo "[6/7] Configuring MCP servers..."
cat > /workspace/.mcp.json << MCPEOF
{
  "mcpServers": {
    "n8n": {
      "type": "http",
      "url": "http://${VM_HOST}:5678/mcp-server/http",
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
        "N8N_HOST": "http://${VM_HOST}:5678"
      }
    }
  }
}
MCPEOF
echo "  .mcp.json generated (n8n → VM remote)"

# --- 7. Check environment ---
echo "[7/7] Checking environment..."
python3 -c "
import os
for key in ['N8N_HOST', 'OPENROUTER_API_KEY', 'JINA_API_KEY', 'PINECONE_API_KEY', 'NEO4J_URI', 'SUPABASE_URL']:
    val = os.environ.get(key, '')
    status = 'OK' if val else 'MISSING (set as Codespace secret)'
    print(f'  {key}: {status}')
" 2>/dev/null

echo ""
echo "=== Setup complete ==="
echo "  VM n8n:      http://${VM_HOST}:5678"
echo "  Claude Code: claude (run from /workspace)"
echo "  Workers:     docker-compose up -d (starts 2 n8n workers)"
echo ""
echo "Next steps:"
echo "  1. source .env.local (if exists)"
echo "  2. docker-compose -f .devcontainer/rag-tests/docker-compose.yml up -d"
echo "  3. claude  (launches Claude Code with CLAUDE.md from .devcontainer/rag-tests/)"
