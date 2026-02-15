# Credentials & Cles API

> **Ce fichier DOIT etre mis a jour** apres chaque rotation de cle ou changement de service.
> Derniere mise a jour : 2026-02-15 (credentials Postgres + Redis recreees, workflow IDs corriges)

---

## Configuration Docker n8n

### Acces
- **Host** : `http://34.136.180.66:5678`
- **UI** : `admin@mon-ipad.com` / `SotaRAG2026!` (n8n 2.7.4 — champ `emailOrLdapLoginId`)
- **API Key** : JWT Docker (dans `.env.local`, pas dans le repo)
- **MCP natif** : `http://34.136.180.66:5678/mcp-server/http` (token MCP separe)
- **PostgreSQL local** : localhost:5432 (n8n / n8n_password_secure_2026) — usage interne n8n
- **Redis local** : localhost:6379 (sans password) — usage interne bull queues

### Credentials n8n Docker (2 creees le 2026-02-15)
| Credential | Type | ID n8n | Details |
|------------|------|--------|---------|
| Supabase Postgres (Pooler) | postgres | `USU8ngVzsUbED3mn` | host: aws-1-eu-west-1.pooler.supabase.com, port: 6543, user: postgres.ayqviqmxifzmhphiqfmj |
| Redis Upstash | redis | `CWih07lwPxfwFeY6` | host: dynamic-frog-47846.upstash.io, port: 6379, TLS: true |

### Variables d'environnement
Les cles API sont configurees dans :
1. **Docker n8n** : env vars du container (source de verite pour les workflows)
2. **`.env.local`** : pour les scripts Python locaux (gitignore)
3. **`.claude/settings.json`** : pour les MCP servers (gitignore les vrais secrets)

> **IMPORTANT** : Les cles API ne doivent PAS etre dans le repo GitHub.
> Utiliser `.env.local` (gitignore) pour les scripts locaux.

---

## Services configures

### n8n Docker
- **Host** : `http://34.136.180.66:5678`
- **API Key** : JWT Docker (dans .env.local)
- **Variables** : `$env.VAR_NAME` (pas `$vars` — free tier)

### Pinecone
- **Index** : `sota-rag-cohere-1024`
- **Host** : Voir .env.local
- **Plan** : Free (serverless)
- **Dimensions** : 1024 (Cohere)

### Supabase
- **Project ref** : `ayqviqmxifzmhphiqfmj`
- **URL** : `https://ayqviqmxifzmhphiqfmj.supabase.co`
- **Plan** : Free tier

### Neo4j
- **URI** : `bolt://localhost:7687` (Docker VM)
- **API** : `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2`

### OpenRouter
- **Cle** : Dans .env.local et Docker env
- **Rate limit** : 20 req/min (avec credit)

### Cohere
- **Embeddings** : `embed-english-v3.0` (1024-dim)
- **Reranker** : `rerank-multilingual-v3.0`

### Jina AI
- **Modele** : `jina-embeddings-v3` (1024-dim)
- **Limite** : 10M tokens/mois (gratuit)

### HuggingFace
- **Token** : Dans .env.local et env vars VM

---

## Workflow IDs Docker (13 workflows actifs)

### Pipelines RAG (4)
| Pipeline | Docker ID | Webhook |
|----------|-----------|---------|
| Standard RAG V3.4 | `TmgyRP20N4JFd9CB` | `/webhook/rag-multi-index-v3` |
| Graph RAG V3.3 | `6257AfT1l4FMC6lY` | `/webhook/ff622742-6d71-4e91-af71-b5c666088717` |
| Quantitative V2.0 | `e465W7V9Q8uK6zJE` | `/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9` |
| Orchestrator V10.1 | `aGsYnJY9nNCaTM82` | `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0` |

### Workflows Support (9)
| Workflow | Docker ID |
|----------|-----------|
| Ingestion V3.1 | `15sUKy5lGL4rYW0L` |
| Enrichissement V3.1 | `9V2UTVRbf4OJXPto` |
| Feedback V3.1 | `F70g14jMxIGCZnFz` |
| Benchmark V3.0 | `LKZO1QQY9jvBltP0` |
| Dataset Ingestion | `YaHS9rVb1osRUJpE` |
| Monitoring & Alerting | `tLNh3wTty7sEprLj` |
| Orchestrator Tester | `m9jaYzWMSVbBFeSf` |
| RAG Batch Tester | `y2FUkI5SZfau67dN` |
| SQL Executor | `22k9541l9mHENlLD` |

> Mapping complet : `n8n/docker-workflow-ids.json`

### Trace Cloud (OBSOLETE)
| Pipeline | Cloud ID | Execution reussie |
|----------|----------|-------------------|
| Standard | `IgQeo5svGlIAPkBc` | #19404 |
| Graph | `95x2BBAbJlLWZtWEJn6rb` | #19305 |
| Quantitative | `E19NZG9WfM7FNsxr` | #19326 |
| Orchestrator | `ALd4gOEqiKL5KR1p` | #19323 |
