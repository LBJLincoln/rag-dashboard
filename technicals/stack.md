# Stack Technique Complete — Docker Era

> Post-migration Docker (2026-02-12)

---

## Infrastructure

### VM Google Cloud (free tier)
- **IP** : 34.136.180.66
- **Acces** : SSH via Termius (iPad)
- **Docker** : n8n + Redis

### n8n Docker Self-Hosted
- **Host** : `http://34.136.180.66:5678`
- **UI** : admin / SotaRAG2026!
- **PostgreSQL** : localhost:5432 (n8n / n8n_password_secure_2026)
- **Redis** : localhost:6379 (cache)
- **13 workflows actifs** (4 pipelines + 9 support)

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
- **Acces** : bolt://localhost:7687 (Docker VM)
- **API** : https://38c949a2.databases.neo4j.io
- **Contenu** : 110 entites, 151 relations
- **Acces** : Direct depuis Docker, MCP neo4j configure

### Supabase (SQL DB)
- **Plan** : Free tier
- **Project** : ayqviqmxifzmhphiqfmj
- **URL** : https://ayqviqmxifzmhphiqfmj.supabase.co
- **Contenu** : 88 lignes, 5 tables financieres
- **Acces** : Direct depuis Docker + MCP supabase configure

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
