# Status de Session — 16 Fevrier 2026 (Session 6)

> Session Phase 2 : diagnostic et fix des pipelines quantitative et standard.
> Fix modeles LLM (3 nodes nemotron/gemma brises), audit complet des modeles.

---

## Fichiers modifies ou crees lors de cette session

### Fichiers modifies (11)
| Fichier | Modification |
|---------|-------------|
| `db/readiness/phase-1.json` | Mis a jour avec les derniers resultats |
| `db/readiness/phase-2.json` | Mis a jour avec resultats Phase 2 partiels |
| `docs/data.json` | Regenere avec toutes les evaluations Phase 2 |
| `docs/status.json` | Regenere avec phase_gates et resultats |
| `docs/tested_ids.json` | IDs des questions testees Phase 2 |
| `eval/run-eval-parallel.py` | Modifications Phase 2 (types, force flag) |
| `eval/run-eval.py` | Modifications pour Phase 2 |
| `logs/diagnostics/*.json` | Diagnostics graph + standard |
| `n8n/manifest.json` | Mis a jour avec versions v4/v3/v7/v4 |

### Fichiers crees (nouveau)
| Fichier | Description |
|---------|-------------|
| `datasets/phase-2/standard-orch-1000x2.json` | 2000 questions (1000 standard + 1000 orchestrator) generees depuis HF |
| `scripts/build-phase2-std-orch.py` | Script de generation du dataset standard+orchestrator |
| `snapshot/workflows/*.json` | 7 snapshots de workflows (standard v4, graph v3, quant v7, orch v4) |
| `logs/pipeline-results/*.json` | 14 fichiers de resultats (1 standard, 4 graph, 9 quantitative) |
| `logs/db-snapshots/*.json` | 36 snapshots DB pre/post eval |
| `logs/errors/*.json` | 7 fichiers d'erreurs (timeouts, server errors) |
| `n8n_analysis_results/*.json` | 5 analyses d'executions n8n |

### Modifications n8n (via API REST)
| Workflow | Modification | Version |
|---------|-------------|---------|
| Standard (TmgyRP20N4JFd9CB) | LLM Generation: `nvidia/nemotron-3-nano-30b-a3b:free` → `arcee-ai/trinity-large-preview:free` (nemotron retournait des reponses VIDES) | v4 |
| Graph (6257AfT1l4FMC6lY) | Aucun changement | v3 |
| Quantitative (e465W7V9Q8uK6zJE) | Prepare SQL Request: bypass Phase 2 (UNION ALL sur finqa/tatqa/convfinqa_tables). Prepare Interpretation: revert gemma → trinity | v7 |
| Orchestrator (aGsYnJY9nNCaTM82) | LLM 2 Task Planner: `nvidia/nemotron-3-nano-30b-a3b:free` → `arcee-ai/trinity-large-preview:free` | v4 |

---

## Audit LLM complet (tous les nodes, tous les pipelines)

### Modeles utilises actuellement (apres fixes)
| Pipeline | Node | Modele | Role | Status |
|----------|------|--------|------|--------|
| Standard | HyDE Generator | arcee-ai/trinity-large-preview:free | Generation HyDE | OK |
| Standard | LLM Generation | arcee-ai/trinity-large-preview:free | Generation reponse | **FIXE** (etait nemotron) |
| Standard | Query Decomposer | arcee-ai/trinity-large-preview:free | Decomposition question | OK |
| Standard | HyDE Embedding | embed-english-v3.0 (Cohere) | Embedding | **BLOQUE (429)** |
| Standard | Original Embedding | embed-english-v3.0 (Cohere) | Embedding | **BLOQUE (429)** |
| Standard | Cohere Reranker | rerank-v3.5 (Cohere) | Reranking | **BLOQUE (429)** |
| Graph | WF3: HyDE & Entity Extract | arcee-ai/trinity-large-preview:free | HyDE + entites | OK |
| Graph | LLM Answer Synthesis | arcee-ai/trinity-large-preview:free | Synthese reponse | OK |
| Graph | Generate HyDE Embedding | embed-english-v3.0 (Cohere) | Embedding | **BLOQUE (429)** |
| Graph | WF3: Cohere Reranker | rerank-v3.5 (Cohere) | Reranking | **BLOQUE (429)** |
| Quant | Prepare SQL Request (P1) | arcee-ai/trinity-large-preview:free | Generation SQL | OK |
| Quant | Prepare Interpretation (P2) | arcee-ai/trinity-large-preview:free | Interpretation | **FIXE** (etait gemma-27b) |
| Quant | SQL Repair | arcee-ai/trinity-large-preview:free | Reparation SQL | OK |
| Orch | LLM 1: Intent Analyzer | arcee-ai/trinity-large-preview:free | Classification intent | OK |
| Orch | LLM 2: Task Planner | arcee-ai/trinity-large-preview:free | Planification tache | **FIXE** (etait nemotron) |
| Orch | LLM 3: Agent Harness | arcee-ai/trinity-large-preview:free | Jugement reponse | OK |

### Modeles gratuits testes (OpenRouter)
| Modele | Status | Qualite | Rate Limit |
|--------|--------|---------|------------|
| arcee-ai/trinity-large-preview:free | **ACTIF** | Bon (40% quant P2, 92% quant P1) | 20 req/min, 50/jour |
| google/gemma-3-27b-it:free | 429 rate limited | 0/5 quant P2 (timeouts) | Epuise |
| google/gemma-3-12b-it:free | **ACTIF** | Bon maths (96.18%) | 20 req/min |
| nvidia/nemotron-3-nano-30b-a3b:free | **200 mais VIDE** | Ne retourne rien | N/A |
| deepseek/deepseek-r1-0528:free | **ACTIF** | Lent (thinking model) | 20 req/min |
| meta-llama/llama-3.3-70b-instruct:free | 429 rate limited | N/A | Epuise |
| qwen/qwen3-coder:free | 429 rate limited | N/A | Epuise |
| mistralai/mistral-small-3.1-24b-instruct:free | 429 rate limited | N/A | Epuise |
| nousresearch/hermes-3-llama-3.1-405b:free | 429 rate limited | N/A | Epuise |

---

## Resultats Phase 2

### Quantitative Phase 2 (FinQA/TaTQA/ConvFinQA)
| Version | Modele | Questions | Correct | Accuracy | Notes |
|---------|--------|-----------|---------|----------|-------|
| v1-v5 (ancien) | trinity | N/A | 0 | 0% | SQL generation echoue (architecture mismatch) |
| v6b (bypass) | trinity | 5 | 2 | 40% | Premier bypass fonctionnel |
| v6c (prompt) | trinity | 10 | 2 | 20% | Regression prompt |
| v6d (clean) | trinity | 5 | 2 | 40% | Format texte propre |
| v6d (llama-70b) | llama-3.3-70b | 5 | 0 | 0% | 429 rate limit |
| v6e (gemma-27b) | gemma-3-27b | 5 | 0 | 0% | Timeouts + vide |
| **v7 (revert trinity)** | **trinity** | **-** | **-** | **~40%** | **Deploye, non encore teste** |

### Graph Phase 2 (MuSiQue)
| Eval | Questions | Correct | Accuracy |
|------|-----------|---------|----------|
| graph-5q | 5 | 2 | 40% |
| graph-10q | 10 | 4 | 40% |
| graph-20q | 20 | 8 | 40% |
| graph-50q | 50 | 21 | 42% |

### Standard Phase 2
- BLOQUE : Cohere API exhausted (Trial key 1000 calls/month)
- Les 2 cles (existante + backup) sont toutes les 2 epuisees

---

## Probleme Cohere (CRITIQUE)

Les pipelines **Standard** et **Graph** utilisent Cohere pour :
1. **Embeddings** (`embed-english-v3.0`) — pour interroger Pinecone
2. **Reranking** (`rerank-v3.5`) — pour re-trier les resultats

**Les 2 cles Cohere sont Trial (1000 calls/month) et sont epuisees.**

### Pourquoi on ne peut PAS simplement migrer vers Jina
- Les vecteurs Pinecone ont ete embeddes avec **Cohere embed-english-v3.0** (1024 dimensions)
- Jina utilise un espace vectoriel **different** (meme si 1024 dimensions)
- Interroger des vecteurs Cohere avec des embeddings Jina ne marchera PAS (cosine similarity incohérente)
- Il faudrait **re-embedder les 10,411 vecteurs Pinecone** avec Jina, ce qui est un gros chantier

### Solutions possibles
1. **Obtenir une cle Cohere Production** (payante) — le plus simple
2. **Attendre le reset mensuel** des cles Trial
3. **Re-embedder Pinecone avec Jina** — gros chantier mais gratuit
4. **Utiliser Cohere via OpenRouter** — mais OpenRouter n'expose pas l'API embed

---

## Etat des pipelines

| Pipeline | Phase 1 (50q) | Phase 2 | Status |
|----------|---------------|---------|--------|
| Standard | 92% PASS | BLOQUE (Cohere 429) | En attente |
| Graph | 78% PASS | ~42% (50q) | En cours |
| Quantitative | 92% PASS | ~40% (5q) | En cours |
| Orchestrator | 80% PASS | Non lance | En attente |
| **Overall P1** | **85.5%** | - | **PASS** |

---

## Etat des bases de donnees

| Database | Content | Status |
|----------|---------|--------|
| **Pinecone** (sota-rag-cohere-1024) | 10,411 vectors, 12 namespaces | OK |
| **Pinecone** (sota-rag-phase2-graph) | 1,248 vectors, 1 namespace (musique) | OK |
| **Neo4j** | 19,788 nodes, 76,717 relationships | OK |
| **Supabase** | 38 tables, 10,772+ rows | OK |
| **Supabase Phase 2** | finqa_tables (200), tatqa_tables (150), convfinqa_tables (100) | OK |

---

## Blockers restants

1. **Cohere API epuisee** : Les 2 cles Trial (1000 calls/month) sont 429. Bloque Standard + Graph embeddings.
2. **Quantitative Phase 2 plafonne a ~40%** : Le modele LLM gratuit (trinity) ne peut pas mieux interpreter les tables financieres.
3. **Graph Phase 2 plafonne a ~42%** : MuSiQue multi-hop questions necessitent des entites pas toujours dans Neo4j.

---

## Prochaine action

```
1. PRIORITE : Obtenir cle Cohere Production OU attendre reset mensuel
   - OU re-embedder Pinecone avec Jina (gros chantier)
2. Tester quantitative v7 (trinity revert) pour confirmer ~40%
3. Continuer graph Phase 2 iteratif si Cohere available pour reranker
4. Lancer orchestrator Phase 2 (pas de dependance Cohere)
```

---

## Prompt exact pour la prochaine session

```
Continue le travail sur mon-ipad. Session 16-fev (session 7) :
- Phase 1 COMPLETE — 4/4 pipelines PASS (std 92%, graph 78%, quant 92%, orch 80%), overall 85.5%
- Phase 2 en cours : graph 42%, quant 40%, standard BLOQUE (Cohere 429)
- AUDIT LLM COMPLET : tous les nodes utilisent arcee-ai/trinity-large-preview:free
  (seul modele gratuit fiable sur OpenRouter)
- 3 nodes fixes cette session : nemotron (Standard, Orchestrator) + gemma (Quantitative)
- BLOCKER CRITIQUE : Cohere API epuisee (2 cles Trial 429)
  - Standard+Graph utilisent Cohere embed-english-v3.0 + rerank-v3.5
  - Migration Jina impossible sans re-embedder 10K+ vecteurs Pinecone
- TOUJOURS : source .env.local avant scripts Python
```
