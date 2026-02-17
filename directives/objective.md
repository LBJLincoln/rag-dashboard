# Objectif Final & Situation Actuelle

## Objectif

Construire un **Multi-RAG Orchestrator SOTA** capable de router intelligemment des questions vers 4 pipelines RAG specialisees (Standard, Graph, Quantitative, Orchestrator) et d'atteindre des performances state-of-the-art sur des benchmarks HuggingFace progressifs.

**Cible finale** : 1M+ questions, accuracy > 75% overall, cout $0 en LLM.

---

## Architecture Multi-Repo (Session 9+)

Le projet est distribue sur **5 repos prives** pilotes depuis la VM Google Cloud :

| Repo | Role | Execution |
|------|------|-----------|
| `mon-ipad` | Tour de controle centrale | VM (permanent) |
| `rag-tests` | Tests des 4 pipelines RAG | Codespaces |
| `rag-website` | Site business 4 secteurs | Vercel |
| `rag-dashboard` | Dashboard live technique | Vercel/GH Pages |
| `rag-data-ingestion` | Ingestion + enrichissement BDD | Codespaces |

Architecture detaillee : `propositions` (fichier racine)

---

## Plan global en 4 phases

```
PHASE A : RAG Pipeline Iteration (prioritaire)
  1/1 -> 5/5 -> 10/10 -> 200q -> 1000q -> 10Kq -> 100Kq -> 1M+q
  Repo : rag-tests (Codespaces pour 500q+)

PHASE B : Analyse SOTA 2026 (recherche academique)
  Papiers recents -> Techniques SOTA -> Design optimise
  Repo : mon-ipad (controle)

PHASE C : Ingestion & Enrichment (post-analyse SOTA)
  Analyse des workflows existants -> Nouvelles BDD -> Tests iteratifs
  Repo : rag-data-ingestion (Codespaces)

PHASE D : Production & Deploiement
  Site business + Dashboard live + Monitoring
  Repos : rag-website + rag-dashboard (Vercel)
```

Details complets : `technicals/phases-overview.md`

---

## Pipelines RAG (4) — Docker n8n (34.136.180.66:5678)

| Pipeline | Role | Base de donnees | Webhook | Cible Phase 1 |
|----------|------|-----------------|---------|---------------|
| **Standard** | RAG vectoriel classique | Pinecone (10.4K vecteurs) | `/webhook/rag-multi-index-v3` | >= 85% |
| **Graph** | RAG sur graphe d'entites | Neo4j (110 entites) | `/webhook/ff622742-...` | >= 70% |
| **Quantitative** | RAG SQL sur tables financieres | Supabase (88 lignes) | `/webhook/3e0f8010-...` | >= 85% |
| **Orchestrator** | Route vers les 3 pipelines | Aucune (meta-pipeline) | `/webhook/92217bb8-...` | >= 70% |

## Workflow IDs — Docker (source de verite)

| Pipeline | Docker ID | Verifie |
|----------|-----------|---------|
| **Standard** | `TmgyRP20N4JFd9CB` | 2026-02-14 via API |
| **Graph** | `6257AfT1l4FMC6lY` | 2026-02-14 via API |
| **Quantitative** | `e465W7V9Q8uK6zJE` | 2026-02-14 via API |
| **Orchestrator** | `aGsYnJY9nNCaTM82` | 2026-02-14 via API |

### Trace Cloud (anciens IDs — OBSOLETE, reference uniquement)

| Pipeline | Cloud ID | Executions reussies |
|----------|----------|---------------------|
| Standard | `IgQeo5svGlIAPkBc` | #19404 |
| Graph | `95x2BBAbJlLWZtWEJn6rb` | #19305 |
| Quantitative | `E19NZG9WfM7FNsxr` | #19326 |
| Orchestrator | `ALd4gOEqiKL5KR1p` | #19323 |

## Workflows supplementaires (9)

| Workflow | Role | Docker ID |
|----------|------|-----------|
| **Ingestion V3.1** | Ingestion de documents | `15sUKy5lGL4rYW0L` |
| **Enrichissement V3.1** | Enrichissement donnees | `9V2UTVRbf4OJXPto` |
| **Feedback V3.1** | Boucle de feedback | `F70g14jMxIGCZnFz` |
| **Benchmark V3.0** | Benchmark automatise | `LKZO1QQY9jvBltP0` |
| **Dataset Ingestion** | Ingestion datasets HF | `YaHS9rVb1osRUJpE` |
| **Monitoring** | Monitoring & Alerting | `tLNh3wTty7sEprLj` |
| **Orchestrator Tester** | Tests orchestrateur | `m9jaYzWMSVbBFeSf` |
| **RAG Batch Tester** | Tests batch RAG | `y2FUkI5SZfau67dN` |
| **SQL Executor** | Execution SQL | `22k9541l9mHENlLD` |

---

## Situation Actuelle

> **Lire `docs/status.json` pour les metriques live.**

### Session 16 fev 2026 (Sessions 6-8)
- **Phase 1 COMPLETE** (85.5% overall) — All 4 pipelines pass Phase 1 gates
- **Phase 2 evaluation** started (50q quantitative, 50q graph, 50q orchestrator)
- **n8n task runner FIXED** (session 8) — Grant token TTL 15s→120s for slow VM (970MB RAM)
- **Jina migration VALIDATED** (session 8) — Standard 3/3, Graph 3/3 confirmed with Jina embeddings
- **Trailing comma fix** (session 8) — Standard embedding JSON body had trailing comma from Jina migration
- **Migration Jina COMPLETE** (session 7) — 10,411 vectors + 2 workflows migrated Cohere→Jina
- **Security scrub** (session 7) — 27 files cleaned, CLAUDE.md v2, .env.example rewritten

### Prochaine action prioritaire (mis à jour 2026-02-17, session 13)

### Priorités pipeline
1. **Graph RAG** : 68.7% → 70% (entity disambiguation Neo4j)
2. **Quantitative** : 78.3% → 85% (CompactRAG pattern + BM25 pour colonnes)
3. **RAGAS metrics** : Ajouter faithfulness + context_recall aux eval scripts

### Website/Dashboard (livrés en session 13)
- Hero redesigné (problem-first, dual CTA, pain points cycliques)
- 4 sector cards Apple-style (pain point BIG + ROI chips + vidéo modal)
- HowItWorks repositionné "Sous le capot" (pipelines = sous-section)
- DashboardCTA section (transparence, lien vers /dashboard)
- VideoModal (storyboard cinématique des scripts Kimi)
- Dashboard SSE (evalStore, useEvalStream, XPProgressionBar, live Q&A feed)

Suivre le processus : `directives/workflow-process.md`

---

## Etat des BDD (verifie le 2026-02-16)

### Pinecone
- **10,411 vecteurs**, 12 namespaces, dimension **1024** (Jina embeddings-v3)
- Index principal : `sota-rag-jina-1024` (host: `sota-rag-jina-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io`)
- Index backup : `sota-rag-cohere-1024` (Cohere embed-english-v3.0, conserve)
- Namespaces : benchmark-msmarco (1000), benchmark-frames (824), benchmark-asqa (948), benchmark-squad_v2 (1000), benchmark-triviaqa (1000), default (639), benchmark-popqa (1000), benchmark-narrativeqa (1000), benchmark-natural_questions (1000), benchmark-finqa (500), benchmark-hotpotqa (1000), benchmark-pubmedqa (500)

### Neo4j
- **19,788 noeuds**, **76,717 relations**
- Top types : Person (8,531), Entity (8,218), Organization (1,775), City (840), Technology (139)
- Top relations : CONNECTE (75,205), SOUS_ENSEMBLE_DE (554), A_CREE (497)
- Acces : HTTPS API `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2`

### Supabase
- **40 tables**, **~17,000+ lignes**
- Tables principales : benchmark_datasets (9,772), rag_task_executions (1,596), transactions (1,515), sales_data (1,152), financials (24), quarterly_revenue (12), community_summaries (9)
- Acces : PostgreSQL pooler `aws-1-eu-west-1.pooler.supabase.com:6543`
- Credential n8n Docker : `Supabase Postgres (Pooler)` (ID: `USU8ngVzsUbED3mn`)

---

## Enterprise Production Gates 2026 (Standard industrie)

Seuils requis pour "production readiness" selon recherche Feb 2026 :

| Métrique | Seuil | État actuel |
|---------|-------|-------------|
| Accuracy (overall) | >= 75% | **78.1% PASS** |
| Accuracy Standard | >= 85% | **85.5% PASS** |
| Accuracy Graph | >= 70% | **68.7% FAIL** |
| Accuracy Quantitative | >= 85% | **78.3% FAIL** |
| Faithfulness | >= 95% | **non mesuré** |
| Context Recall | >= 85% | **non mesuré** |
| Hallucination Rate | <= 2% | **non mesuré** |
| Mean Latency | <= 2.5s | **non mesuré** |

→ Action : Ajouter RAGAS faithfulness + context_recall aux scripts eval.

## Stack Technique

Voir `technicals/stack.md` pour le detail complet.

**Resume** :
- **Workflows** : n8n Docker self-hosted (34.136.180.66:5678)
- **LLM** : Modeles gratuits via OpenRouter ($0)
- **Embeddings** : Jina embeddings-v3 (1024-dim, primary) + Cohere (backup)
- **Vector DB** : Pinecone (free tier, serverless)
- **Graph DB** : Neo4j (via n8n Docker)
- **SQL DB** : Supabase (free tier)
- **Eval** : Python scripts locaux
- **Dev** : Claude Code (Max plan) via Termius

---

## Analyse Nodulaire Double — OBLIGATOIRE

A chaque question testee, executer **LES DEUX ANALYSES** :

### 1. node-analyzer.py (diagnostics auto)
```bash
python3 eval/node-analyzer.py --execution-id <ID>
```

### 2. analyze_n8n_executions.py (donnees brutes)
```bash
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
```

Les deux outils sont complementaires et DOIVENT etre utilises systematiquement.
