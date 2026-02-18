#!/bin/bash
# setup-codespace-rag-tests.sh
# Script de démarrage pour Codespace rag-tests
# À lancer UNE FOIS après création/redémarrage du Codespace
#
# Usage: bash scripts/setup-codespace-rag-tests.sh

set -e

echo "=== SETUP CODESPACE rag-tests ==="
echo "Date: $(date)"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 0. Configurer Opus 4.6
echo ""
echo "1/5 — Configuration Claude Code Opus 4.6..."
bash "$REPO_ROOT/scripts/setup-claude-opus.sh" 2>/dev/null || true

# 1. Préparer docker-compose.yml
echo ""
echo "2/5 — Préparer n8n docker-compose..."
if [ ! -f "$REPO_ROOT/docker-compose.yml" ]; then
    if [ -f "$REPO_ROOT/rag-tests-docker-compose.yml" ]; then
        cp "$REPO_ROOT/rag-tests-docker-compose.yml" "$REPO_ROOT/docker-compose.yml"
        echo "✅ docker-compose.yml créé depuis rag-tests-docker-compose.yml"
    else
        echo "❌ rag-tests-docker-compose.yml introuvable!"
        exit 1
    fi
else
    echo "✅ docker-compose.yml déjà présent"
fi

# 2. Démarrer n8n LOCAL
echo ""
echo "3/5 — Démarrer n8n LOCAL (3 workers)..."
cd "$REPO_ROOT"
docker compose up -d
echo "Attendre n8n (30s)..."
sleep 30

# Vérifier n8n
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf http://localhost:5678/healthz > /dev/null 2>&1; then
        echo "✅ n8n UP en ${WAITED}s"
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ n8n ne démarre pas après ${MAX_WAIT}s"
    docker logs n8n-n8n-1 --tail 20
    exit 1
fi

# 3. Importer les workflows n8n depuis n8n/live/
echo ""
echo "4/5 — Importer workflows n8n (Phase 1 fixés)..."
source "$REPO_ROOT/.env.local" 2>/dev/null || true
N8N_KEY="${N8N_API_KEY:-admin}"

for wf_file in "$REPO_ROOT/n8n/live/standard.json" \
               "$REPO_ROOT/n8n/live/graph.json" \
               "$REPO_ROOT/n8n/live/quantitative.json" \
               "$REPO_ROOT/n8n/live/orchestrator.json"; do
    if [ -f "$wf_file" ]; then
        wf_name=$(python3 -c "import json; d=json.load(open('$wf_file')); print(d.get('name','?'))" 2>/dev/null)
        RESP=$(curl -s -X POST "http://localhost:5678/api/v1/workflows" \
            -H "X-N8N-API-KEY: $N8N_KEY" \
            -H "Content-Type: application/json" \
            --data @"$wf_file" 2>&1)
        if echo "$RESP" | grep -q '"id"'; then
            echo "✅ Importé: $wf_name"
        else
            echo "⚠️  Peut-être déjà importé: $wf_name"
        fi
    fi
done

# 4. Activer les workflows
echo ""
echo "5/5 — Activer les workflows..."
curl -s "http://localhost:5678/api/v1/workflows?limit=20" \
    -H "X-N8N-API-KEY: $N8N_KEY" | python3 -c "
import sys, json, urllib.request, os

d = json.loads(sys.stdin.read())
for w in d.get('data', []):
    if not w.get('active'):
        wid = w['id']
        name = w.get('name', '')[:50]
        # Activate via API
        req = urllib.request.Request(
            f'http://localhost:5678/api/v1/workflows/{wid}/activate',
            method='POST',
            headers={'X-N8N-API-KEY': '${N8N_KEY}'}
        )
        try:
            urllib.request.urlopen(req)
            print(f'Activated: {name}')
        except Exception as e:
            print(f'Error activating {name}: {e}')
    else:
        print(f'Already active: {w.get(\"name\",\"\")[:50]}')
" 2>/dev/null || true

echo ""
echo "=== SETUP COMPLET ==="
echo ""
echo "Test de vérification (5 questions quantitative):"
echo "  source .env.local && python3 eval/quick-test.py --questions 3 --pipeline quantitative"
echo ""
echo "Lancer les tests Phase 1:"
echo "  source .env.local && python3 eval/iterative-eval.py --label 'Phase1-fix-session14'"
