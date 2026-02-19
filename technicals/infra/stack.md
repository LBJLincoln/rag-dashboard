# Stack Technique Complete — Docker Era

> Last updated: 2026-02-19T15:30:00+01:00
> Post-migration Docker (2026-02-12) — Decision VM=pilotage only (Session 25)

---

## Infrastructure

### VM Google Cloud (free tier) — PILOTAGE UNIQUEMENT
- **IP** : 34.136.180.66
- **Acces** : SSH via Termius (iPad)
- **Docker** : n8n + Redis + PostgreSQL
- **RAM** : 969 MB total, ~100 MB dispo (CRITIQUE)
- **Role** : Pilotage UNIQUEMENT. ZERO tests, ZERO modifications workflow (Rule 28)
- **MCP Servers** : ~6MB total (negligeable — neo4j 2.5MB, pinecone 1.4MB, HF 0.8MB, jina 0.7MB, cohere 0.6MB)

### n8n Docker Self-Hosted (VM)
- **Host** : `http://localhost:5678` (interne VM)
- **UI** : `admin@mon-ipad.com` / SotaRAG2026!
- **PostgreSQL** : localhost:5432 (n8n / n8n_password_secure_2026) — n8n internal DB
- **Redis** : localhost:6379 — queue mode (Bull queues, pas cache)
- **9 workflows actifs** (4 pipelines + 5 support), cible 16
- **⚠️ Task Runner cache** : le code compile n'est pas rafraichi meme apres restart (Pattern 2.11)

### HF Space n8n (execution distante — 16GB RAM)
- **URL** : https://lbjlincoln-nomos-rag-engine.hf.space
- **n8n** : 2.8.3 (latest), SQLite + Redis, 12/12 credentials
- **RAM** : 16 GB ($0, cpu-basic)
- **Etat** : Standard 200 OK, Graph/Orch 404, Quant 500
- **REST API** : BROKEN (FIX-15 — proxy HF strip POST body pour /api/)
- **Keep-alive** : cron VM */30 min

---

## Services & Bases de Donnees

### Pinecone (Vector DB)
- **Plan** : Free tier (serverless)
- **Index principal** : `sota-rag-jina-1024` (Jina embeddings-v3, 1024-dim)
- **Index backup** : `sota-rag-cohere-1024` (Cohere embed-english-v3.0, 1024-dim)
- **Index Phase 2 Graph** : `sota-rag-phase2-graph` (e5-large, 1024-dim)
- **Contenu** : 10,411 vecteurs, 12 namespaces (migres vers Jina le 2026-02-16)
- **Acces** : Direct via API + via n8n

### Neo4j (Graph DB)
- **Acces** : HTTPS API `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2`
- **Protocole** : HTTPS (pas bolt:// — incompatible avec HTTP Request node n8n)
- **Contenu** : 19,788 noeuds, 76,717 relations
- **Acces** : Direct via MCP neo4j configure + n8n HTTP Request nodes

### Supabase (SQL DB)
- **Plan** : Free tier
- **Project** : ayqviqmxifzmhphiqfmj
- **URL** : https://ayqviqmxifzmhphiqfmj.supabase.co
- **Contenu** : 40 tables, ~17,000+ lignes
- **Acces** : PostgreSQL pooler `aws-1-eu-west-1.pooler.supabase.com:6543` + MCP supabase

---

## LLM & Embeddings

### LLM (gratuit via OpenRouter)
| Modele | Usage | Cout |
|--------|-------|------|
| `meta-llama/llama-3.3-70b-instruct:free` | SQL, Intent, Planning, HyDE, Agent | $0 |
| `google/gemma-3-27b-it:free` | Fast/Lite operations | $0 |
| `arcee-ai/trinity-large-preview:free` | Extraction, Community, Fallback | $0 |

### Embeddings
| Provider | Modele | Dimensions | Usage |
|----------|--------|------------|-------|
| **Jina AI** (primary) | jina-embeddings-v3 | 1024 | Pinecone indexing + query (migre 2026-02-16) |
| **Jina AI** (reranker) | jina-reranker-v2-base-multilingual | N/A | Result reranking |
| **Cohere** (backup) | embed-english-v3.0 | 1024 | Legacy index backup |

---

## Outils de Developpement

### Claude Code (Max Plan)
- **Terminal** : `claude` CLI dans Termius
- **MCP Servers** : 7 configures dans `.claude/settings.json`
  - n8n (natif Docker), jina-embeddings, neo4j, pinecone, supabase, cohere, huggingface

### GitHub
- **Repo** : `LBJLincoln/mon-ipad`
- **Branche** : `main`
- **Pages** : Dashboard deploye automatiquement

---

## Docker Env Vars (n8n)

Les modeles LLM sont configures via variables d'environnement dans Docker :
```
OPENROUTER_API_KEY, JINA_API_KEY, PINECONE_API_KEY
LLM_SQL_MODEL, LLM_FAST_MODEL, LLM_INTENT_MODEL, etc.
EMBEDDING_MODEL=jina-embeddings-v3, EMBEDDING_DIM=1024
EMBEDDING_API_URL=https://api.jina.ai/v1/embeddings
RERANKER_MODEL=jina-reranker-v2-base-multilingual
```

Mapping complet : `n8n/docker-workflow-ids.json`
