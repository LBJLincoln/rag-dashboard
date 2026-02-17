# Topologie n8n — Architecture Distribuée

> 6 processus n8n, 10 conteneurs Docker, 3 environnements, 6 workflows.
> Dernière mise à jour : 16 février 2026

---

## Vue d'ensemble

```
                     Internet
                        │
            ┌───────────┴───────────┐
            │    VM Google Cloud     │
            │    34.136.180.66       │
            │                       │
            │  ┌─ n8n-main :5678    │  ← 4 RAG workflows
            │  ├─ PostgreSQL :5432  │  ← Shared DB
            │  ├─ Redis :6379       │  ← BullMQ broker
            │  └─ Next.js :3000     │  ← Website + Dashboard
            │       ~160MB / 970MB  │
            └───────┬───────┬───────┘
                    │       │
           SSH Tunnel A    SSH Tunnel B
                    │       │
     ┌──────────────┘       └──────────────┐
     ▼                                     ▼
┌── Codespace A ──────────┐  ┌── Codespace B ──────────┐
│   repo: rag-tests       │  │  repo: rag-data-ingestion│
│   4-core, 16GB RAM      │  │  4-core, 16GB RAM       │
│                         │  │                          │
│  ┌─ n8n-worker-1        │  │ ┌─ n8n-ingestion-main   │
│  └─ n8n-worker-2        │  │ ├─ n8n-ingestion-wk-1   │
│     ~1GB / 16GB         │  │ ├─ n8n-ingestion-wk-2   │
│                         │  │ ├─ PostgreSQL            │
│  Claude Code (monitor)  │  │ ├─ Redis                 │
└─────────────────────────┘  │ └─ ~1.1GB / 16GB        │
                             │                          │
                             │  Claude Code (agentic)   │
                             └──────────────────────────┘
```

---

## Environnement 1 : VM Google Cloud — "Tour de Contrôle"

**Machine** : e2-micro (1 vCPU partagé, 970 MB RAM)
**Rôle** : Contrôle central, tests rapides, hébergement web

### Conteneurs Docker

| # | Container | Rôle | Port | RAM | Config |
|---|-----------|------|------|-----|--------|
| 1 | `n8n-main` | Processus n8n principal | 5678 | ~50MB | EXECUTIONS_MODE=queue |
| 2 | `n8n-postgres` | Base de données partagée | 5432 | ~20MB | pg_stat_statements=on |
| 3 | `n8n-redis` | Broker BullMQ | 6379 | ~4MB | maxmemory 64mb |

### Service additionnel

| # | Service | Rôle | Port | RAM |
|---|---------|------|------|-----|
| 4 | Next.js | Website + Dashboard | 3000 | ~80MB |

**Total VM** : ~160MB / 970MB (16.5%) — laisse ~500MB pour l'OS + outils

### Workflows hébergés (4 RAG)

| Workflow | ID Docker | Webhook | Base |
|----------|-----------|---------|------|
| Standard | TmgyRP20N4JFd9CB | /webhook/rag-multi-index-v3 | Pinecone |
| Graph | 6257AfT1l4FMC6lY | /webhook/ff622742-... | Neo4j |
| Quantitative | e465W7V9Q8uK6zJE | /webhook/3e0f8010-... | Supabase |
| Orchestrator | aGsYnJY9nNCaTM82 | /webhook/92217bb8-... | Meta |

### Tests autorisés sur VM
- 1/1 (smoke test)
- 5/5 (validation rapide)
- 10/10 (validation étendue)
- 50/50 (max absolu, surveiller RAM)

### Variables n8n critiques
```
EXECUTIONS_MODE=queue
N8N_CONCURRENCY_PRODUCTION_LIMIT=2
QUEUE_BULL_REDIS_HOST=redis
QUEUE_BULL_REDIS_PORT=6379
N8N_ENCRYPTION_KEY=<identique partout>
```

---

## Environnement 2 : Codespace A — "RAG Heavy Testing"

**Repo** : `rag-tests`
**Machine** : GitHub Codespace 4-core, 16GB RAM
**Rôle** : Tests lourds (200q+), évaluation Phase 2-4

### Conteneurs Docker

| # | Container | Rôle | RAM | Config |
|---|-----------|------|-----|--------|
| 5 | `n8n-worker-1` | Worker Standard + Graph | ~512MB | N8N_CONCURRENCY=5 |
| 6 | `n8n-worker-2` | Worker Quantitative + Orchestrator | ~512MB | N8N_CONCURRENCY=5 |

**Total Codespace A** : ~1GB / 16GB (6.25%)

### Connexion au broker VM
```bash
# Reverse SSH tunnel : expose VM Redis/PG dans le Codespace
gh codespace ssh -c rag-tests-codespace -- \
  -R 6379:localhost:6379 \
  -R 5432:localhost:5432
```

### Variables n8n workers
```
EXECUTIONS_MODE=queue
N8N_WORKER=true
N8N_CONCURRENCY_PRODUCTION_LIMIT=5
QUEUE_BULL_REDIS_HOST=localhost
QUEUE_BULL_REDIS_PORT=6379
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
N8N_ENCRYPTION_KEY=<identique a la VM>
```

### Tests autorisés
- 200q (Phase 1 full eval)
- 1000q (Phase 2, hf-1000.json)
- 10Kq+ (Phase 3-4)

### Monitoring
- Claude Code headless : `claude -p "analyser les 5 dernières exécutions"`
- Live writer : `python3 eval/live-writer.py` → écrit status.json en temps réel
- Auto-stop : si 3+ régressions consécutives → arrêt automatique (workflow-process.md)

---

## Environnement 3 : Codespace B — "Ingestion Stack"

**Repo** : `rag-data-ingestion`
**Machine** : GitHub Codespace 4-core, 16GB RAM
**Rôle** : Ingestion de documents + enrichissement BDD (instance n8n séparée)

### Conteneurs Docker

| # | Container | Rôle | RAM | Config |
|---|-----------|------|-----|--------|
| 7 | `n8n-ingestion-main` | Instance n8n ingestion | ~50MB | EXECUTIONS_MODE=queue |
| 8 | `n8n-ingestion-wk-1` | Worker Ingestion V3.1 | ~512MB | N8N_CONCURRENCY=5 |
| 9 | `n8n-ingestion-wk-2` | Worker Enrichissement V3.1 | ~512MB | N8N_CONCURRENCY=5 |
| 10 | `n8n-ingestion-pg` | PostgreSQL (local) | ~20MB | — |
| 11 | `n8n-ingestion-redis` | Redis (local) | ~4MB | — |

**Total Codespace B** : ~1.1GB / 16GB (6.9%)

### Workflows hébergés (2 ingestion)

| Workflow | ID Docker | Rôle |
|----------|-----------|------|
| Ingestion V3.1 | 15sUKy5lGL4rYW0L | Ingestion de documents (1000+ types par secteur) |
| Enrichissement V3.1 | 9V2UTVRbf4OJXPto | Enrichissement des données existantes |

### Monitoring
- Claude Code agentic : `claude -p "lancer l'ingestion pour le secteur BTP, 50 documents"`
- Dashboard ingestion potentiel : monitoring séparé des jobs d'ingestion
- Logs : poussés vers rag-data-ingestion repo

---

## Résumé chiffré

| Métrique | Valeur |
|----------|--------|
| **Processus n8n (main)** | 2 (1 RAG + 1 ingestion) |
| **Workers n8n** | 4 (2 RAG + 2 ingestion) |
| **Total processus n8n** | **6** |
| **PostgreSQL** | 2 (1 VM + 1 Codespace B) |
| **Redis** | 2 (1 VM + 1 Codespace B) |
| **Total conteneurs Docker** | **10** |
| **Environnements** | 3 (1 VM + 2 Codespaces) |
| **Workflows** | 6 (4 RAG + 2 ingestion) |
| **Workers par workflow** | 1-2 |
| **Concurrency max** | 22 jobs simultanés |
| **RAM totale disponible** | 33GB (970MB + 16GB + 16GB) |
| **RAM utilisée** | ~2.3GB (7%) |
| **Coût mensuel** | $0 (free tiers) |

### Décomposition concurrency

| Environnement | Workers | Concurrency/worker | Total |
|---------------|---------|--------------------|-------|
| VM (quick tests) | 0 workers (main=2) | 2 | 2 |
| Codespace A (RAG) | 2 | 5 | 10 |
| Codespace B (ingestion) | 2 | 5 | 10 |
| **Total** | **4 + 1 main** | — | **22** |

---

## Connexions réseau

### SSH Tunnels (pilotage depuis VM)

```bash
# Tunnel vers Codespace A (rag-tests) — expose Redis/PG
gh codespace ssh -c rag-tests -- -R 6379:localhost:6379 -R 5432:localhost:5432

# Tunnel vers Codespace B (rag-data-ingestion) — accès web UI ingestion
gh codespace ssh -c rag-data-ingestion -- -L 5679:localhost:5678
```

### Ports exposés

| Hôte | Port | Service | Accès |
|------|------|---------|-------|
| VM (34.136.180.66) | 5678 | n8n main (RAG) | Public (webhooks) |
| VM (34.136.180.66) | 3000 | Website + Dashboard | Public |
| VM (localhost) | 5432 | PostgreSQL | Local + tunnel |
| VM (localhost) | 6379 | Redis | Local + tunnel |
| Codespace B | 5678 | n8n ingestion | Via tunnel (5679 local) |

---

## Activation séquentielle

### Phase 1 : VM seule (actuel)
1. n8n main + PG + Redis ✅ (déjà en place)
2. Next.js server ← à déployer maintenant
3. Tests 1/1 → 50/50 depuis la VM

### Phase 2 : + Codespace A (rag-tests)
4. Créer devcontainer.json avec docker-compose worker
5. Lancer Codespace A
6. Établir SSH tunnel (Redis/PG)
7. Vérifier que les workers traitent les jobs
8. Tests 200q+ lancés depuis VM, exécutés sur Codespace

### Phase 3 : + Codespace B (rag-data-ingestion)
9. Instance n8n séparée avec ses propres workflows
10. Workers ingestion + enrichissement
11. Claude Code agentic pour automation
12. Dashboard ingestion (optionnel)

---

## docker-compose.yml — Workers Codespace A

```yaml
version: '3.8'
services:
  n8n-worker-1:
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
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    extra_hosts:
      - "host.docker.internal:host-gateway"

  n8n-worker-2:
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
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## docker-compose.yml — Ingestion Codespace B

```yaml
version: '3.8'
services:
  n8n-ingestion:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=2
    volumes:
      - n8n_ingestion_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  n8n-ingestion-worker-1:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    depends_on:
      - n8n-ingestion

  n8n-ingestion-worker-2:
    image: n8nio/n8n:latest
    command: worker
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n_ingestion
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_POSTGRESDB_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=5
    depends_on:
      - n8n-ingestion

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: n8n_ingestion
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${DB_POSTGRESDB_PASSWORD}
    volumes:
      - postgres_ingestion_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n -d n8n_ingestion"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_ingestion_data:/data

volumes:
  n8n_ingestion_data:
  postgres_ingestion_data:
  redis_ingestion_data:
```
