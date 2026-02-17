# Topologie n8n — Architecture Distribuee Complete

> Version 1.0 — 16 fevrier 2026
> 6 processus n8n, 10 containers Docker, 3 environnements

---

## Vue d'ensemble

```
                         INTERNET
                            │
                ┌───────────┴───────────┐
                │  Website + Dashboard   │
                │  http://34.136.180.66  │
                │  :3000 (Next.js)       │
                └───────────┬───────────┘
                            │ (API calls)
┌── VM Google Cloud (e2-micro, 970MB) ──────────────────────────┐
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ n8n-main     │  │ PostgreSQL   │  │ Redis        │        │
│  │ :5678        │  │ :5432        │  │ :6379        │        │
│  │ 4 WF RAG     │  │ Exec history │  │ BullMQ       │        │
│  │ ~50MB        │  │ ~20MB        │  │ ~4MB         │        │
│  │ concurrency=2│  │              │  │              │        │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘        │
│         │                                    │                │
│  ┌──────┴────────────────────────────────────┴───────┐       │
│  │         Redis :6379 exposed via SSH tunnel         │       │
│  │         PG :5432 exposed via SSH tunnel            │       │
│  └──────┬────────────────────────────────────┬───────┘       │
│         │                                    │                │
└─────────┼────────────────────────────────────┼────────────────┘
          │ Tunnel A                           │ Tunnel B
          │ (reverse SSH)                      │ (reverse SSH)
          │                                    │
┌─────────┴────────────────────┐  ┌────────────┴───────────────┐
│  Codespace A (rag-tests)     │  │  Codespace B (ingestion)   │
│  4-core, 16GB RAM            │  │  4-core, 16GB RAM          │
│                              │  │                            │
│  ┌────────────────────────┐  │  │  ┌──────────────────────┐  │
│  │ n8n-worker-1           │  │  │  │ n8n-ingestion-main   │  │
│  │ Standard + Graph       │  │  │  │ 2 WF (ingest+enrich) │  │
│  │ concurrency=5          │  │  │  │ concurrency=2        │  │
│  │ ~512MB                 │  │  │  │ ~50MB                │  │
│  └────────────────────────┘  │  │  └──────────────────────┘  │
│  ┌────────────────────────┐  │  │  ┌──────────────────────┐  │
│  │ n8n-worker-2           │  │  │  │ n8n-ingestion-wk-1   │  │
│  │ Quant + Orchestrator   │  │  │  │ Ingestion V3.1       │  │
│  │ concurrency=5          │  │  │  │ concurrency=5        │  │
│  │ ~512MB                 │  │  │  │ ~512MB               │  │
│  └────────────────────────┘  │  │  └──────────────────────┘  │
│  ┌────────────────────────┐  │  │  ┌──────────────────────┐  │
│  │ Claude Code (monitor)  │  │  │  │ n8n-ingestion-wk-2   │  │
│  │ claude -p "..."        │  │  │  │ Enrichissement V3.1  │  │
│  │ Live analysis + stop   │  │  │  │ concurrency=5        │  │
│  └────────────────────────┘  │  │  │ ~512MB               │  │
│                              │  │  └──────────────────────┘  │
│  Usage: ~1GB / 16GB         │  │  ┌──────────────────────┐  │
│  Tests: 200q+, Phase 2-5    │  │  │ PostgreSQL + Redis   │  │
└──────────────────────────────┘  │  │ (local, isolated)    │  │
                                  │  │ ~24MB                │  │
                                  │  └──────────────────────┘  │
                                  │  ┌──────────────────────┐  │
                                  │  │ Claude Code (agentic)│  │
                                  │  │ claude -p "..."      │  │
                                  │  │ Auto-ingestion       │  │
                                  │  └──────────────────────┘  │
                                  │                            │
                                  │  Usage: ~1.1GB / 16GB     │
                                  └────────────────────────────┘
```

---

## Inventaire complet

### Processus n8n (6)

| # | Nom | Role | Env | Workflows | Mode | Concurrency | RAM |
|---|-----|------|-----|-----------|------|-------------|-----|
| 1 | `n8n-main` | Processus principal RAG | VM | Standard, Graph, Quant, Orchestrator | Queue (main) | 2 | ~50MB |
| 2 | `n8n-worker-1` | Worker RAG (Standard + Graph) | Codespace A | — (execute les jobs de n8n-main) | Queue (worker) | 5 | ~512MB |
| 3 | `n8n-worker-2` | Worker RAG (Quant + Orchestrator) | Codespace A | — (execute les jobs de n8n-main) | Queue (worker) | 5 | ~512MB |
| 4 | `n8n-ingestion-main` | Processus principal Ingestion | Codespace B | Ingestion V3.1, Enrichissement V3.1 | Queue (main) | 2 | ~50MB |
| 5 | `n8n-ingestion-wk-1` | Worker Ingestion | Codespace B | — (execute les jobs d'ingestion) | Queue (worker) | 5 | ~512MB |
| 6 | `n8n-ingestion-wk-2` | Worker Enrichissement | Codespace B | — (execute les jobs d'enrichissement) | Queue (worker) | 5 | ~512MB |

### Containers Docker (10)

| # | Container | Service | Env | Port | RAM |
|---|-----------|---------|-----|------|-----|
| 1 | `n8n-main` | n8n (main) | VM | 5678 | ~50MB |
| 2 | `n8n-postgres` | PostgreSQL | VM | 5432 | ~20MB |
| 3 | `n8n-redis` | Redis | VM | 6379 | ~4MB |
| 4 | `n8n-worker-1` | n8n (worker) | Codespace A | — | ~512MB |
| 5 | `n8n-worker-2` | n8n (worker) | Codespace A | — | ~512MB |
| 6 | `n8n-ingestion-main` | n8n (main) | Codespace B | 5679 | ~50MB |
| 7 | `n8n-ingestion-wk-1` | n8n (worker) | Codespace B | — | ~512MB |
| 8 | `n8n-ingestion-wk-2` | n8n (worker) | Codespace B | — | ~512MB |
| 9 | `n8n-ingestion-pg` | PostgreSQL | Codespace B | 5433 | ~20MB |
| 10 | `n8n-ingestion-redis` | Redis | Codespace B | 6380 | ~4MB |

### Environnements (3)

| Env | Machine | RAM totale | RAM n8n | RAM libre | Role |
|-----|---------|-----------|---------|-----------|------|
| VM Google Cloud | e2-micro | 970MB | ~74MB (+80MB Next.js) | ~500MB | Controle + quick tests + site web |
| Codespace A | rag-tests | 16GB | ~1GB | ~15GB | Tests lourds RAG (200q+) |
| Codespace B | rag-data-ingestion | 16GB | ~1.1GB | ~14.9GB | Ingestion + enrichissement |

---

## Workflows (6)

| # | Workflow | Pipeline | Instance | Webhook | Docker ID |
|---|----------|----------|----------|---------|-----------|
| 1 | Standard RAG | Standard | n8n-main (VM) | `/webhook/rag-multi-index-v3` | `TmgyRP20N4JFd9CB` |
| 2 | Graph RAG | Graph | n8n-main (VM) | `/webhook/ff622742-...` | `6257AfT1l4FMC6lY` |
| 3 | Quantitative RAG | Quantitative | n8n-main (VM) | `/webhook/3e0f8010-...` | `e465W7V9Q8uK6zJE` |
| 4 | Orchestrator | Orchestrator | n8n-main (VM) | `/webhook/92217bb8-...` | `aGsYnJY9nNCaTM82` |
| 5 | Ingestion V3.1 | Ingestion | n8n-ingestion (CS-B) | TBD | `15sUKy5lGL4rYW0L` |
| 6 | Enrichissement V3.1 | Enrichissement | n8n-ingestion (CS-B) | TBD | `9V2UTVRbf4OJXPto` |

---

## Capacite de traitement

### Quick tests (VM seule)
- Concurrency: 2
- Debit: ~2-3 exec/s
- Cas d'usage: 1/1, 5/5, 10/10, 50/50

### Heavy tests (VM + Codespace A)
- Workers: 2 x concurrency 5 = 10 jobs paralleles
- Debit: ~10-15 exec/s (limite par LLM API rate limits)
- Cas d'usage: 200q, 1000q (Phase 2), 10Kq+ (Phase 3)

### Ingestion (Codespace B)
- Workers: 2 x concurrency 5 = 10 jobs paralleles
- Debit: ~5-10 docs/s (limite par embedding API)
- Cas d'usage: Ingestion bulk, enrichissement continu

### Free tier limits
- Codespaces: 60h/mois (2 Codespaces x 30h chacun)
- OpenRouter: $0 (modeles gratuits uniquement)
- Jina: 1M tokens/mois embeddings
- Pinecone: 1 index serverless, 100K vecteurs
- Neo4j Aura: 200K noeuds, 400K relations
- Supabase: 500MB, 2 projets

---

## Connexion reseau

### SSH Tunnels (VM → Codespaces)

**Tunnel A (VM → Codespace rag-tests):**
```bash
# Depuis la VM, ouvre un tunnel inverse
# Le Codespace peut acceder au Redis/PG de la VM via localhost
ssh -R 6379:localhost:6379 -R 5432:localhost:5432 \
  codespace-user@codespace-a-hostname
```

Methode recommandee avec GitHub CLI (si installe) :
```bash
gh codespace ssh -c <codespace-name> -- \
  -R 6379:localhost:6379 \
  -R 5432:localhost:5432
```

**Tunnel B (VM → Codespace rag-data-ingestion):**
```bash
# Meme principe, mais l'ingestion a sa propre infra
# Le tunnel sert uniquement a piloter depuis la VM
ssh -L 5679:localhost:5679 codespace-user@codespace-b-hostname
```

### Ports exposes

| Port | Service | Acces |
|------|---------|-------|
| 3000 | Next.js (website + dashboard) | Public (VM IP) |
| 5678 | n8n main (RAG) | Public (webhooks) + Localhost (API) |
| 5432 | PostgreSQL | Localhost + tunnel |
| 6379 | Redis | Localhost + tunnel |
| 5679 | n8n ingestion | Codespace B uniquement |

---

## Configuration Docker

### VM — docker-compose.yml (existant, a modifier pour queue mode)

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=2
      - GENERIC_TIMEZONE=Europe/Paris
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=n8n
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${N8N_PG_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  n8n_data:
  postgres_data:
```

### Codespace A — docker-compose.worker.yml

```yaml
services:
  worker-1:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=host.docker.internal
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=host.docker.internal
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
      - GENERIC_TIMEZONE=Europe/Paris
    extra_hosts:
      - "host.docker.internal:host-gateway"

  worker-2:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=host.docker.internal
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=host.docker.internal
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
      - GENERIC_TIMEZONE=Europe/Paris
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Codespace B — docker-compose.ingestion.yml

```yaml
services:
  n8n-ingestion:
    image: n8nio/n8n:latest
    ports:
      - "5679:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=2
      - GENERIC_TIMEZONE=Europe/Paris
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker-ingestion-1:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    depends_on:
      - n8n-ingestion

  worker-ingestion-2:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${N8N_PG_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    depends_on:
      - n8n-ingestion

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=n8n_ingestion
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${N8N_PG_PASSWORD}
    volumes:
      - ingestion_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ingestion_pg_data:
```

---

## Pilotage depuis la VM (Termius)

### Tests RAG (quick)
```bash
# Depuis la VM (mon-ipad)
source .env.local
python3 eval/quick-test.py --questions 5 --pipeline standard
```

### Tests RAG (heavy, via Codespace)
```bash
# 1. Lancer le Codespace
gh codespace create -r LBJLincoln/rag-tests -m basicLinux32gb

# 2. Ouvrir le tunnel SSH inverse
gh codespace ssh -c <name> -- -R 6379:localhost:6379 -R 5432:localhost:5432

# 3. Dans le Codespace : lancer les workers
docker compose -f docker-compose.worker.yml up -d

# 4. Depuis la VM : lancer les tests (les jobs seront routes vers les workers)
python3 eval/run-eval-parallel.py --reset --label "Phase2-200q"
```

### Monitoring live (Claude Code headless)
```bash
# Dans le Codespace (via SSH depuis VM)
claude -p "Monitor the current n8n execution. \
  Read logs/latest.json every 10s. \
  If accuracy drops below 60% after 20 questions, stop the test. \
  Report final stats."
```

### Ingestion (via Codespace B)
```bash
# 1. Lancer le Codespace
gh codespace create -r LBJLincoln/rag-data-ingestion -m basicLinux32gb

# 2. Lancer la stack d'ingestion
docker compose -f docker-compose.ingestion.yml up -d

# 3. Lancer l'ingestion via Claude Code agentic
claude -p "Ingest all documents from datasets/sector-btp/ into Pinecone. \
  Use the Ingestion V3.1 workflow via webhook. \
  Monitor progress and report when done."
```

---

## Checklist de deploiement

- [x] VM : n8n-main + PostgreSQL + Redis (en place)
- [ ] VM : Activer EXECUTIONS_MODE=queue
- [ ] VM : Deployer Next.js (port 3000)
- [ ] Codespace A : Creer devcontainer.json
- [ ] Codespace A : docker-compose.worker.yml
- [ ] Codespace A : Tester tunnel SSH
- [ ] Codespace B : Creer devcontainer.json
- [ ] Codespace B : docker-compose.ingestion.yml
- [ ] Codespace B : Migrer workflows ingestion/enrichissement
- [ ] Tests : Valider 6 workflows operationnels
