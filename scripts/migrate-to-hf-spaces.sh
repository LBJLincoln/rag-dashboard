#!/usr/bin/env bash
#
# migrate-to-hf-spaces.sh — Migration Codespaces → HuggingFace Spaces
#
# Crée un HF Space Docker avec n8n + postgres + redis (16GB RAM, $0)
# permanent, non-éphémère, pilotable depuis la VM.
#
# Usage:
#   source .env.local && bash scripts/migrate-to-hf-spaces.sh
#
# Prérequis: HF_TOKEN dans .env.local
#
# Last updated: 2026-02-18T23:45:00+01:00

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SPACE_NAME="nomos-rag-engine"
HF_USER="LBJLincoln"
WORK_DIR="/tmp/hf-space-setup"

# ============================================================
# CHECKS
# ============================================================

if [ -z "${HF_TOKEN:-}" ]; then
    echo -e "${RED}ERROR: HF_TOKEN not set. Run: source .env.local${NC}"
    exit 1
fi

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Migration Codespaces → HuggingFace Spaces                ║${NC}"
echo -e "${CYAN}║   16GB RAM · $0 · Permanent · Docker                       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================
# STEP 1: Create HF Space via API
# ============================================================

echo -e "${CYAN}[1/5] Creating HF Space: ${HF_USER}/${SPACE_NAME}${NC}"

CREATE_RESULT=$(curl -s -X POST "https://huggingface.co/api/repos/create" \
    -H "Authorization: Bearer ${HF_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"space\",
        \"name\": \"${SPACE_NAME}\",
        \"private\": true,
        \"sdk\": \"docker\",
        \"hardware\": \"cpu-basic\"
    }" 2>&1)

if echo "$CREATE_RESULT" | grep -q '"url"'; then
    echo -e "${GREEN}  Space created: https://huggingface.co/spaces/${HF_USER}/${SPACE_NAME}${NC}"
elif echo "$CREATE_RESULT" | grep -q 'already'; then
    echo -e "${YELLOW}  Space already exists, updating...${NC}"
else
    echo -e "${YELLOW}  Response: ${CREATE_RESULT}${NC}"
fi

# ============================================================
# STEP 2: Prepare Dockerfile + docker-compose
# ============================================================

echo -e "${CYAN}[2/5] Preparing Docker files${NC}"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

# Dockerfile for HF Spaces (exposes port 7860 as required by HF)
cat > "$WORK_DIR/Dockerfile" << 'DOCKERFILE'
FROM docker:24-dind

RUN apk add --no-cache \
    bash curl python3 py3-pip git nodejs npm supervisor

# Install docker-compose
RUN pip3 install --break-system-packages docker-compose

WORKDIR /app

# Copy compose file
COPY docker-compose.yml /app/docker-compose.yml
COPY supervisord.conf /app/supervisord.conf
COPY entrypoint.sh /app/entrypoint.sh
COPY healthcheck.py /app/healthcheck.py
COPY n8n-workflows/ /app/n8n-workflows/

RUN chmod +x /app/entrypoint.sh

# HF Spaces requires port 7860
EXPOSE 7860

CMD ["/app/entrypoint.sh"]
DOCKERFILE

# docker-compose for all services
cat > "$WORK_DIR/docker-compose.yml" << 'COMPOSE'
version: '3.8'

services:
  n8n-main:
    image: n8nio/n8n:latest
    restart: unless-stopped
    mem_limit: 2g
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://0.0.0.0:5678
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=48
      - EXECUTIONS_DATA_PRUNE_MAX_COUNT=1000
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=3
      - NODE_OPTIONS=--max-old-space-size=1536
    ports:
      - "5678:5678"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 5

  n8n-worker-1:
    image: n8nio/n8n:latest
    restart: unless-stopped
    mem_limit: 2g
    command: worker --concurrency=3
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - NODE_OPTIONS=--max-old-space-size=1536
    depends_on:
      n8n-main:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  n8n-worker-2:
    image: n8nio/n8n:latest
    restart: unless-stopped
    mem_limit: 2g
    command: worker --concurrency=3
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - NODE_OPTIONS=--max-old-space-size=1536
    depends_on:
      n8n-main:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  n8n-worker-3:
    image: n8nio/n8n:latest
    restart: unless-stopped
    mem_limit: 2g
    command: worker --concurrency=3
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      - NODE_OPTIONS=--max-old-space-size=1536
    depends_on:
      n8n-main:
        condition: service_healthy
    volumes:
      - n8n_data:/home/node/.n8n

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    mem_limit: 512m
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n
    command: >
      postgres
      -c shared_buffers=128MB
      -c effective_cache_size=256MB
      -c work_mem=8MB
      -c max_connections=50
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    mem_limit: 256m
    command: >
      redis-server
      --maxmemory 192mb
      --maxmemory-policy allkeys-lru
      --appendonly no
      --save ""
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Nginx reverse proxy: routes port 7860 → n8n 5678
  # (HF Spaces only exposes port 7860)
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    mem_limit: 64m
    ports:
      - "7860:7860"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      n8n-main:
        condition: service_healthy

volumes:
  n8n_data:
  postgres_data:
COMPOSE

# Nginx config to proxy 7860 → 5678
cat > "$WORK_DIR/nginx.conf" << 'NGINX'
server {
    listen 7860;

    # Health check for HF Spaces
    location /healthz {
        proxy_pass http://n8n-main:5678/healthz;
        proxy_set_header Host $host;
    }

    # n8n webhooks
    location /webhook/ {
        proxy_pass http://n8n-main:5678/webhook/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # n8n API
    location /api/ {
        proxy_pass http://n8n-main:5678/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # n8n UI (optional — for debugging)
    location / {
        proxy_pass http://n8n-main:5678/;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

# Entrypoint: starts Docker daemon + docker-compose
cat > "$WORK_DIR/entrypoint.sh" << 'ENTRYPOINT'
#!/bin/bash
set -e

echo "=== Starting Docker daemon ==="
dockerd &
sleep 5

echo "=== Starting n8n stack ==="
cd /app
docker-compose up -d

echo "=== Waiting for n8n health ==="
for i in $(seq 1 30); do
    if curl -sf http://localhost:5678/healthz > /dev/null 2>&1; then
        echo "n8n is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

echo "=== Importing workflows ==="
for wf in /app/n8n-workflows/*.json; do
    if [ -f "$wf" ]; then
        echo "Importing: $(basename $wf)"
        curl -s -X POST "http://localhost:5678/api/v1/workflows" \
            -H "Content-Type: application/json" \
            -d @"$wf" > /dev/null 2>&1 || echo "  (already exists or error)"
    fi
done

echo "=== Stack ready! ==="
echo "n8n: http://localhost:5678 (proxied via 7860)"

# Keep container alive
tail -f /dev/null
ENTRYPOINT

# Healthcheck script
cat > "$WORK_DIR/healthcheck.py" << 'HEALTH'
#!/usr/bin/env python3
import urllib.request, json, sys
try:
    resp = urllib.request.urlopen("http://localhost:5678/healthz", timeout=5)
    print(json.dumps({"status": "healthy", "code": resp.getcode()}))
except Exception as e:
    print(json.dumps({"status": "unhealthy", "error": str(e)}))
    sys.exit(1)
HEALTH

# ============================================================
# STEP 3: Copy n8n workflows
# ============================================================

echo -e "${CYAN}[3/5] Copying n8n workflows${NC}"

mkdir -p "$WORK_DIR/n8n-workflows"
if ls "$REPO_ROOT/n8n/live/"*.json 1>/dev/null 2>&1; then
    cp "$REPO_ROOT/n8n/live/"*.json "$WORK_DIR/n8n-workflows/"
    echo -e "${GREEN}  Copied $(ls "$WORK_DIR/n8n-workflows/"*.json | wc -l) workflows${NC}"
else
    echo -e "${YELLOW}  No workflows found in n8n/live/ — will import manually${NC}"
fi

# ============================================================
# STEP 4: Push to HF Space via git
# ============================================================

echo -e "${CYAN}[4/5] Pushing to HuggingFace Space${NC}"

cd "$WORK_DIR"
git init
git config user.email "alexis.moret6@outlook.fr"
git config user.name "LBJLincoln"
git add -A
git commit -m "feat: n8n engine — 3 workers, queue mode, 16GB RAM"
git remote add space "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${HF_USER}/${SPACE_NAME}" 2>/dev/null || \
    git remote set-url space "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${HF_USER}/${SPACE_NAME}"
git push -f space main 2>&1 || git push -f space master:main 2>&1

echo -e "${GREEN}  Pushed to HF Space${NC}"

# ============================================================
# STEP 5: Verify deployment
# ============================================================

echo -e "${CYAN}[5/5] Space deploying...${NC}"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Migration lancée!                                         ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║   Space URL: https://huggingface.co/spaces/${HF_USER}/${SPACE_NAME}  ║${NC}"
echo -e "${GREEN}║   n8n URL:   https://${HF_USER}-${SPACE_NAME}.hf.space     ║${NC}"
echo -e "${GREEN}║   Webhooks:  https://${HF_USER}-${SPACE_NAME}.hf.space/webhook/...  ║${NC}"
echo -e "${GREEN}║                                                              ║${NC}"
echo -e "${GREEN}║   Le build Docker prend 5-10 min.                            ║${NC}"
echo -e "${GREEN}║   Vérifier: curl https://${HF_USER}-${SPACE_NAME}.hf.space/healthz  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Pour mettre à jour N8N_HOST dans les scripts eval:"
echo "  export N8N_HOST=https://${HF_USER}-${SPACE_NAME}.hf.space"
echo ""
echo "Pour le keep-alive (crontab VM):"
echo "  */30 * * * * curl -sf https://${HF_USER}-${SPACE_NAME}.hf.space/healthz > /dev/null"

cd "$REPO_ROOT"
rm -rf "$WORK_DIR"
