# Status de Session — 16 Fevrier 2026 (Session 8)

> Session infrastructure : task runner fix, Jina validation, embedding trailing comma fix.
> n8n task runner FIXED (grant token TTL 15s→120s for 970MB RAM VM).
> Standard + Graph VALIDATED with Jina embeddings (3/3 each).
> Quantitative remains at 78.3% (1/3 on quick test, known SQL edge cases).

---

## Fichiers modifies ou crees lors de cette session

### Fichiers crees (1)
| Fichier | Description |
|---------|-------------|
| `~/n8n/task-broker-auth.service.js` | Modified n8n auth service: grant token TTL 15s→120s |

### Fichiers modifies (7)
| Fichier | Modification |
|---------|-------------|
| `~/n8n/docker-compose.yml` | Task runner config: removed N8N_RUNNERS_DISABLED, added volume mount for TTL fix |
| `directives/objective.md` | Updated session notes, Jina primary, Pinecone index names |
| `directives/n8n-endpoints.md` | Updated webhook test timestamps, Jina pitfall note |
| `technicals/architecture.md` | Jina primary in embeddings section, dual Pinecone indices |
| `technicals/stack.md` | Jina primary, Cohere backup, Docker env vars updated |
| `technicals/credentials.md` | Jina primary section, Cohere marked as backup/epuise |
| `directives/status.md` | This file (Session 8 status) |

### Modifications n8n (via API REST)
| Workflow | Modification | Nodes changes |
|---------|-------------|---------------|
| Standard (TmgyRP20N4JFd9CB) | Trailing comma fix in embedding JSON body | 2 nodes (HyDE Embedding, Original Embedding) |

### n8n sync (via n8n/sync.py)
| Workflow | Status | Details |
|---------|--------|---------|
| Standard | UPDATED | v5, 24 nodes, 9 changed |
| Graph | UPDATED | v4, 26 nodes, 6 changed |
| Quantitative | UNCHANGED | — |
| Orchestrator | UNCHANGED | — |

---

## Task Runner Fix — Details

### Root Cause
n8n 2.7.4 task runner grant token TTL (15 seconds) too short for memory-constrained VM.
- VM: 970MB RAM, 1.4GB swap used
- Claude Code process: ~297MB RAM
- Task runner V8 compilation: >15s when VM is swapping
- Grant token expires before runner connects → 403 Forbidden loop

### Fix Applied
Modified `task-broker-auth.service.js`:
- `GRANT_TOKEN_TTL = 15 * seconds` → `120 * seconds`
- Mounted as read-only volume in docker-compose.yml
- Persists across container recreation

### Verification
- 163 successful executions between 01:00-03:47 UTC (when Claude Code not running)
- After TTL fix: Standard 3/3, Graph 3/3, Quantitative 1/3
- n8n stable at 36% CPU after fix

---

## Trailing Comma Fix — Details

### Root Cause
Jina migration script (session 7) removed `"embedding_types": ["float"]` from Standard embedding nodes
but left a trailing comma in the JSON body:
```
"task": "retrieval.query",

}
```

### Fix Applied
Regex replacement via n8n REST API:
```python
re.sub(r',\s*\n\s*\n\s*}', '\n}', body)
```
Applied to HyDE Embedding and Original Embedding nodes.

---

## Etat des pipelines

| Pipeline | Phase 1 (200q) | Session 8 Test | Jina Migration | Status |
|----------|---------------|----------------|----------------|--------|
| Standard | 85.5% PASS | 3/3 PASS | VALIDATED | OK |
| Graph | 68.7% (~70%) | 3/3 PASS | VALIDATED | OK |
| Quantitative | 78.3% FAIL | 1/3 FAIL | N/A (SQL) | Needs work |
| Orchestrator | 80% PASS | Not tested | N/A (meta) | OK |
| **Overall P1** | **78.1%** | - | - | **PASS (>75%)** |

---

## Etat des bases de donnees

| Database | Content | Status |
|----------|---------|--------|
| **Pinecone** (sota-rag-jina-1024) | 10,411 vectors, 12 namespaces (Jina) | OK — PRIMARY |
| **Pinecone** (sota-rag-cohere-1024) | 10,411 vectors, 12 namespaces (Cohere) | OK — BACKUP |
| **Pinecone** (sota-rag-phase2-graph) | 1,296 vectors, 1 namespace (e5-large) | OK |
| **Neo4j** | 19,788 nodes, 76,717 relationships | OK |
| **Supabase** | 40 tables, ~17,000+ rows | OK |

---

## Prochaine action

```
Session 9 — Priorites :
1. Quantitative pipeline: 78.3% → 85% target
   - SQL edge cases: multi-table JOINs, period filtering
   - Run iterative-eval 5→10→50q
2. Graph pipeline: 68.7% → 70% target (close!)
   - Entity extraction improvements
3. Phase 2 full eval: 1000q (hf-1000.json) once Phase 1 gates stable
4. Consider: pin n8n Docker to specific version (avoid task runner regressions)
```

---

## Prompt exact pour la prochaine session

```
Continue le travail sur mon-ipad. Session 16-fev (session 9) :
- Session 8 a fixe : task runner (TTL 15s→120s), trailing comma Standard, Jina valide
- TOUS les pipelines fonctionnent : Standard 3/3, Graph 3/3, Quant 1/3
- Phase 1 overall 78.1% (>75% target PASS)
- PRIORITE 1 : Quantitative 78.3% → 85% (SQL edge cases)
- PRIORITE 2 : Graph 68.7% → 70% (entity extraction)
- PRIORITE 3 : Phase 2 full eval (1000q)
- Docker: task-broker-auth.service.js monte en volume (TTL fix persistant)
- TOUJOURS : source .env.local avant scripts Python
```
