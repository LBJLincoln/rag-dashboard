#!/bin/bash
# ============================================================
# DEPLOY CODESPACE n8n INSTANCE — Self-contained eval node
# ============================================================
# Run this INSIDE a Codespace to:
# 1. Start n8n + Redis + Postgres (docker-compose)
# 2. Import all workflows
# 3. Activate all workflows
# 4. Configure OpenRouter key (pass via OPENROUTER_API_KEY_2 or _3)
# 5. Launch eval pipelines as nohup
#
# Usage (inside codespace):
#   bash scripts/deploy-codespace.sh
#
# To be called from VM:
#   gh codespace ssh --codespace <cs> -- 'cd mon-ipad && bash scripts/deploy-codespace.sh'
#
# Last updated: 2026-02-22
# ============================================================

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

echo "============================================"
echo "  CODESPACE n8n DEPLOYMENT"
echo "============================================"

# 1. Start docker-compose
echo "  Starting n8n stack..."
if [ -f docker-compose.yml ]; then
    docker compose up -d
    echo "  Waiting 15s for n8n to initialize..."
    sleep 15
else
    echo "  No docker-compose.yml found. Creating minimal config..."
    cat > docker-compose.yml <<'COMPOSE'
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
      - GENERIC_TIMEZONE=Europe/Paris
      - N8N_RUNNERS_ENABLED=false
    volumes:
      - n8n_data:/home/node/.n8n
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n
      - POSTGRES_DB=n8n
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  n8n_data:
  pg_data:
COMPOSE
    docker compose up -d
    echo "  Waiting 20s for fresh n8n to initialize..."
    sleep 20
fi

# 2. Check n8n is up
echo "  Checking n8n health..."
for i in $(seq 1 10); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz 2>/dev/null | grep -q "200"; then
        echo "  n8n is UP"
        break
    fi
    echo "  Waiting... ($i/10)"
    sleep 5
done

# 3. Import workflows from n8n/live/
echo "  Importing workflows..."
N8N_API_KEY="${N8N_API_KEY:-}"
if [ -z "$N8N_API_KEY" ]; then
    echo "  WARN: N8N_API_KEY not set. Using cookie auth..."
fi

for wf_file in n8n/live/*.json; do
    [ -f "$wf_file" ] || continue
    WF_NAME=$(basename "$wf_file" .json)
    echo "    Importing $WF_NAME..."

    curl -s -X POST "http://localhost:5678/api/v1/workflows" \
        -H "Content-Type: application/json" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -d @"$wf_file" > /dev/null 2>&1 || echo "    (may already exist)"
done

# 4. Activate all workflows
echo "  Activating workflows..."
WORKFLOW_IDS=$(curl -s "http://localhost:5678/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" 2>/dev/null | \
    python3 -c "import sys,json; [print(w['id']) for w in json.load(sys.stdin).get('data',[])]" 2>/dev/null || true)

for WF_ID in $WORKFLOW_IDS; do
    curl -s -X POST "http://localhost:5678/api/v1/workflows/$WF_ID/activate" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" > /dev/null 2>&1
done
echo "  Workflows activated."

# 5. Set OpenRouter variables
echo "  Configuring n8n variables..."
if [ -n "$OPENROUTER_API_KEY" ]; then
    curl -s -X POST "http://localhost:5678/api/v1/variables" \
        -H "X-N8N-API-KEY: $N8N_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"OPENROUTER_API_KEY\", \"value\": \"$OPENROUTER_API_KEY\"}" > /dev/null 2>&1 || true
fi

echo ""
echo "============================================"
echo "  CODESPACE READY"
echo "  n8n: http://localhost:5678"
echo "  Webhooks active"
echo "============================================"
echo ""
echo "  To run eval from HERE:"
echo "    source .env.local && python3 eval/run-eval-parallel.py --dataset phase-2 --all-parallel --workers 4 --batch-size 5 --force --label 'codespace-eval'"
echo ""
echo "  To tunnel from VM:"
echo "    gh codespace ports forward 5678:5678 --codespace \$(gh codespace list --json name -q '.[0].name')"
