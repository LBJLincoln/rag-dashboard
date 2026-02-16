# Status de Session — 16 Fevrier 2026 (Session 7)

> Session infrastructure : security scrub, MCP fixes, CLAUDE.md v2, migration Jina embeddings.
> Migration Cohere → Jina COMPLETE (10,411 vecteurs + 2 workflows).
> Blocker identifie : n8n task runner (Code nodes timeout).

---

## Fichiers modifies ou crees lors de cette session

### Fichiers crees (6)
| Fichier | Description |
|---------|-------------|
| `db/populate/migrate_to_jina.py` | Script migration Pinecone Cohere→Jina (10,411 vectors) |
| `scripts/migrate_n8n_to_jina.py` | Script migration workflows n8n (Cohere→Jina via REST API) |
| `directives/session-state.md` | Memoire de travail inter-sessions |
| `snapshot/pre-jina-migration/TmgyRP20N4JFd9CB-backup.json` | Backup Standard workflow pre-migration |
| `snapshot/pre-jina-migration/6257AfT1l4FMC6lY-backup.json` | Backup Graph workflow pre-migration |

### Fichiers modifies (4)
| Fichier | Modification |
|---------|-------------|
| `CLAUDE.md` | v2 : ajout Phase 0 (persistence), credential management, team-agentic |
| `.env.example` | Reecrit avec placeholders generiques (scrubbed credentials) |
| `~/n8n/docker-compose.yml` | Jina env vars + OpenRouter key fixee + runners config |
| `directives/session-state.md` | Mis a jour avec etat final migration |

### Security scrub (27 fichiers)
Credentials en clair supprimes de : eval/, scripts/, technicals/, mcp/, .claude/, datasets/, db/, n8n/

### Modifications n8n (via API REST)
| Workflow | Modification | Nodes changes |
|---------|-------------|---------------|
| Standard (TmgyRP20N4JFd9CB) | Cohere→Jina: URLs, models, auth, Pinecone host | 6 nodes, 22 changes |
| Graph (6257AfT1l4FMC6lY) | Cohere→Jina: URLs, models, auth, Pinecone host | 4 nodes, 13 changes |

---

## Migration Jina — Details

### Pinecone Index Migration
- **Source**: sota-rag-cohere-1024 (Cohere embed-english-v3.0, 1024d)
- **Target**: sota-rag-jina-1024 (Jina embeddings-v3, 1024d)
- **Vectors migres**: 10,411 / 10,411 (100%)
- **Namespaces**: 12/12
- **Tokens Jina utilises**: 383,151
- **Duree**: 80 minutes
- **Backup**: Index Cohere conserve comme backup

### n8n Workflow Changes
| Node | Avant (Cohere) | Apres (Jina) |
|------|---------------|-------------|
| Embedding URL | api.cohere.com/v2/embed | api.jina.ai/v1/embeddings |
| Embedding model | embed-english-v3.0 | jina-embeddings-v3 |
| Body: texts | "texts" | "input" |
| Body: input_type | "input_type":"search_query" | "task":"retrieval.query" |
| Reranker URL | api.cohere.ai/v1/rerank | api.jina.ai/v1/rerank |
| Reranker model | rerank-v3.5 | jina-reranker-v2-base-multilingual |
| Auth | Bearer {COHERE_KEY} | Bearer {JINA_KEY} |
| Pinecone host | sota-rag-cohere-1024-a4mkzmz | sota-rag-jina-1024-a4mkzmz |

---

## Blocker: n8n Task Runner

Apres le restart Docker, les Code nodes ne s'executent plus :
- Les executions se creent (webhook recoit la requete)
- Mais aucun node ne s'execute (runData vide, lastNodeExecuted: null)
- Logs: "Task request timed out after 60 seconds"
- Logs: "Task runner connection attempt failed with status code 403"
- Python runner: "Python 3 is missing from this system"

**Hypotheses**:
1. n8n latest image a change le systeme de task runners
2. N8N_RUNNERS_DISABLED=true bloque les Code nodes dans les nouvelles versions
3. Conflit entre task broker interne et config Docker

**Non lie a Jina** — les workflow changes sont correctes (verifie manuellement).

---

## Etat des pipelines

| Pipeline | Phase 1 (50q) | Phase 2 | Jina Migration | Status |
|----------|---------------|---------|----------------|--------|
| Standard | 92% PASS | BLOQUE (etait Cohere) | FAIT | Task runner bloque |
| Graph | 78% PASS | ~42% (50q) | FAIT | Task runner bloque |
| Quantitative | 92% PASS | ~40% (30q) | N/A | Task runner bloque |
| Orchestrator | 80% PASS | Non lance | N/A | Task runner bloque |
| **Overall P1** | **85.5%** | - | - | **PASS** |

---

## Etat des bases de donnees

| Database | Content | Status |
|----------|---------|--------|
| **Pinecone** (sota-rag-jina-1024) | 10,411 vectors, 12 namespaces (Jina) | OK — NOUVEAU |
| **Pinecone** (sota-rag-cohere-1024) | 10,411 vectors, 12 namespaces (Cohere) | OK — BACKUP |
| **Pinecone** (sota-rag-phase2-graph) | 1,248 vectors, 1 namespace (e5-large) | OK |
| **Neo4j** | 19,788 nodes, 76,717 relationships | OK |
| **Supabase** | 38 tables, 17,000+ rows | OK |

---

## Prochaine action

```
Session 8 — Priorites :
1. URGENT: Fixer n8n task runner (Code nodes timeout)
   - Tester sans N8N_RUNNERS_DISABLED
   - Tester avec version specifique n8n (pas :latest)
   - Verifier config task broker
2. Valider migration Jina: tester standard + graph 5q chacun
3. Si OK → Debloquer Phase 2 Standard (etait bloque par Cohere)
4. Continuer quantitative (~40% → 70% target)
5. Lancer orchestrator Phase 2
```

---

## Prompt exact pour la prochaine session

```
Continue le travail sur mon-ipad. Session 16-fev (session 8) :
- Session 7 a complete : security scrub, CLAUDE.md v2, migration Jina embeddings
- Migration Jina FAITE : 10,411 vecteurs Pinecone + 2 workflows n8n mis a jour
- BLOCKER CRITIQUE : n8n task runner casse (Code nodes timeout apres Docker restart)
  - Les executions se creent mais aucun node ne s'execute
  - Logs: "Task request timed out 60s" + "Task runner connection failed 403"
  - Hypothese: n8n latest a change le systeme de Code execution
  - PREMIERE PRIORITE : fixer ca avant tout test
- Une fois fixe : valider Standard + Graph avec Jina (5q chacun)
- Phase 2 : Standard debloque (etait Cohere 429), Graph 42%, Quant 40%
- TOUJOURS : source .env.local avant scripts Python
```
