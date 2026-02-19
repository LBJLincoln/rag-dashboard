# Improvements Roadmap — Centralized

> Last updated: 2026-02-19T13:30:00+01:00
> **Document centralisé de TOUTES les améliorations possibles**, classées par catégorie et priorité.
> Référencé par CLAUDE.md. Mis à jour à chaque session.

---

## TABLE DES MATIERES

1. [Pipelines RAG — Accuracy](#1-pipelines-rag--accuracy)
2. [Infrastructure — Scalabilité 1000q+](#2-infrastructure--scalabilite)
3. [n8n Workflows — Optimisations](#3-n8n-workflows)
4. [Databases — Enrichissement](#4-databases)
5. [Evaluation — Méthodologie](#5-evaluation)
6. [Website — Contenu & UX](#6-website)
7. [Documentation — Structure](#7-documentation)
8. [DevOps — CI/CD & Monitoring](#8-devops)

---

## 1. PIPELINES RAG — ACCURACY

### 1.1 Quantitative (78.3% → 85%) — PRIORITE 1

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| Q1 | Timeouts/retries HTTP Request (90s, 3 retries, 8s wait) | +3pp | Fait | APPLIQUE session 25 |
| Q2 | SQL templates pour questions simples (bypass LLM) | +2pp | Fait | APPLIQUE session 25 |
| Q3 | Sample data dans le prompt LLM | +1pp | Fait | APPLIQUE session 25 |
| Q4 | Rotation multi-modeles (Llama/Qwen/Gemma par minute) | +2pp | Moyen | A FAIRE |
| Q5 | Schema statique compact dans le prompt | +1pp | Faible | A FAIRE |
| Q6 | ILIKE au lieu de = pour les noms d'entreprise | +0.5pp | Faible | A FAIRE |
| Q7 | Delai inter-questions dans eval scripts (8s pour quant) | +1pp | Faible | A FAIRE |
| Q8 | CompactRAG : pre-compute QA pairs pour questions frequentes | +2pp | Eleve | PLANIFIE |
| Q9 | BM25 hybrid search pour contexte SQL | +1pp | Moyen | PLANIFIE |

### 1.2 Graph (68.7% → 70%) — PRIORITE 2

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| G1 | Entity disambiguation Neo4j (fuzzy matching) | +1.5pp | Moyen | A FAIRE |
| G2 | Enrichir graph avec sector datasets (juridique, finance) | +2pp | Eleve | DATASETS PRETS |
| G3 | Community summaries multilingual (fr/en) | +0.5pp | Moyen | A FAIRE |
| G4 | Traversal depth adaptatif (2→3 hops pour questions complexes) | +0.5pp | Faible | A FAIRE |

### 1.3 Standard (85.5% — PASS)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| S1 | Late chunking (Jina late_chunking=True) | +1pp | Moyen | PLANIFIE |
| S2 | Hybrid search (dense + sparse) | +1pp | Moyen | A FAIRE |
| S3 | Reranking ameliore (cross-encoder) | +0.5pp | Faible | A FAIRE |

### 1.4 Orchestrator (80.0% — PASS)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| O1 | A-RAG (agentic hierarchical retrieval) | +3pp | Eleve | PLANIFIE |
| O2 | Routing dynamique base sur confidence scores | +1pp | Moyen | A FAIRE |

---

## 2. INFRASTRUCTURE — SCALABILITE

### 2.1 Capacité actuelle vs cible

| Composant | Actuel | Cible 1000q | Cible 10Kq | Action |
|-----------|--------|------------|------------|--------|
| **n8n concurrency** | 1 (VM) / 1 (HF) | 5 workers | 10 workers | Ajouter workers dans docker-compose |
| **OpenRouter rate** | ~20 req/min | ~60 req/min | ~200 req/min | Multi-key OU modeles payants |
| **RAM** | 969MB (VM) / 16GB (HF) | 16GB | 32GB | HF Space gpu-basic ($0.60/h) |
| **PostgreSQL** | Supabase free | Supabase free | Supabase Pro | OK pour 1000q |
| **Pinecone** | 10K vecteurs | 50K vecteurs | 100K vecteurs | Ingestion Phase 2 |
| **Neo4j** | 19K nodes | 50K nodes | 200K nodes (max free) | Ingestion secteurs |
| **Eval parallelism** | Sequential | 3 parallel | 10 parallel | asyncio + aiohttp |

### 2.2 HF Space — Améliorations possibles

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| H1 | Connecter Supabase depuis HF Space (env vars) | Quantitative fonctionne | Faible | A FAIRE |
| H2 | Ajouter 3 workers n8n dans le Dockerfile | 3x throughput | Moyen | A FAIRE |
| H3 | Migrer SQLite → PostgreSQL persistant | Pas de perte au reboot | Moyen | PLANIFIE |
| H4 | Exporter les fixes VM vers HF Space | Workflow a jour | Faible | A FAIRE |
| H5 | Multi-API-key OpenRouter | 3x rate limit | Faible | A FAIRE |
| H6 | Keep-alive plus fiable (webhook interne) | Uptime 99.9% | Faible | FAIT (cron VM) |

### 2.3 Estimation temps pour 1000q par pipeline

| Config | Standard | Graph | Quantitative | Orchestrator | Total 4000q |
|--------|----------|-------|-------------|-------------|-------------|
| **Actuel** (seq, 1 worker) | ~3h | ~5h | ~8h | ~5h | ~21h |
| **Optimise** (3 workers, 8s delay) | ~1h | ~2h | ~3h | ~2h | ~8h |
| **Ideal** (10 workers, multi-key) | ~20min | ~40min | ~1h | ~40min | ~2.5h |

### 2.4 Architecture cible pour Phase 2 (1000q)

```
VM (mon-ipad)
  └─ Pilotage + monitoring

HF Space (nomos-rag-engine) — 16GB RAM, $0
  ├─ n8n main + 3 workers
  ├─ PostgreSQL (local, persistent volume)
  ├─ Redis (queue mode)
  └─ Nginx (reverse proxy)

Cloud DBs
  ├─ Pinecone (50K vecteurs)
  ├─ Neo4j Aura (50K nodes)
  └─ Supabase (40 tables, 17K+ rows)

Eval
  └─ VM ou Codespace envoie les questions → HF Space webhooks
```

---

## 3. N8N WORKFLOWS

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| N1 | Workflow versioning automatique (snapshot avant chaque modification) | Fiabilite | Moyen | A FAIRE |
| N2 | Health check endpoint dedié (/webhook/health) | Monitoring | Faible | A FAIRE |
| N3 | Metrics Prometheus via n8n metrics endpoint | Observabilite | Faible | PARTIEL (N8N_METRICS=true) |
| N4 | Error notification webhook (Slack/Discord) | Alerting | Faible | A FAIRE |
| N5 | Workflow export automatique apres chaque activation | Backup | Moyen | A FAIRE |

---

## 4. DATABASES

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| D1 | Ingerer 7,609 items sectoriels dans Pinecone | +2pp accuracy | Eleve | DATASETS PRETS |
| D2 | Enrichir Neo4j avec entites juridiques francaises | +1pp Graph | Eleve | DATASETS PRETS |
| D3 | Ajouter BM25 index dans Pinecone (sparse vectors) | +1pp hybrid | Moyen | PLANIFIE |
| D4 | Indexer les 14 benchmarks Phase 2 dans Pinecone | Phase 2 requis | Eleve | A FAIRE |
| D5 | Creer des tables Supabase pour les donnees sectorielles | Quant sector | Moyen | A FAIRE |

---

## 5. EVALUATION

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| E1 | Mesurer Faithfulness (>= 95%) | Qualite | Moyen | A FAIRE |
| E2 | Mesurer Context Recall (>= 85%) | Qualite | Moyen | A FAIRE |
| E3 | Mesurer Hallucination Rate (<= 2%) | Fiabilite | Moyen | A FAIRE |
| E4 | Mesurer Latency moyenne (<= 2.5s) | Performance | Faible | A FAIRE |
| E5 | Evaluation parallele avec asyncio | 3x speedup | Moyen | A FAIRE |
| E6 | Dashboard live accuracy en temps reel | Visibilite | Faible | PARTIEL (SSE) |
| E7 | A/B testing entre versions de workflows | Qualite | Eleve | PLANIFIE |

---

## 6. WEBSITE

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| W1 | Integrer vrais docs sectoriels (BTP/Industrie/Finance/Juridique) | Business | Moyen | DATASETS PRETS |
| W2 | Chat live avec pipeline selection | UX | Moyen | PARTIEL |
| W3 | Dashboard public avec metriques accuracy | Credibilite | Faible | FAIT (Vercel) |
| W4 | Videos sectorielles (scripts Kimi) | Marketing | Moyen | SCRIPTS PRETS |

---

## 7. DOCUMENTATION

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| DOC1 | knowledge-base.md enrichi a chaque session | Performance agent | Continu | EN COURS |
| DOC2 | fixes-library.md enrichi a chaque fix | Debug rapide | Continu | EN COURS |
| DOC3 | improvements-roadmap.md (CE FICHIER) | Vision produit | Continu | EN COURS |
| DOC4 | Architecture decision records (ADRs) | Tracabilite | Moyen | A FAIRE |
| DOC5 | API documentation des webhooks | Integration | Faible | A FAIRE |

---

## 8. DEVOPS

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| CI1 | CI smoke tests toutes les 4 pipelines | Regression | Fait | ACTIF (GitHub Actions) |
| CI2 | Nightly eval (50q) automatique | Monitoring | Moyen | A FAIRE |
| CI3 | Auto-deploy HF Space depuis GitHub push | DevOps | Moyen | A FAIRE |
| CI4 | Alertes si accuracy drop > 2pp | Regression | Faible | A FAIRE |

---

## STATS REPO (inventaire)

| Dossier | Fichiers | Role |
|---------|----------|------|
| technicals/ | ~15 | Documentation technique |
| directives/ | ~10 | Mission control |
| eval/ | ~8 | Scripts evaluation Python |
| scripts/ | ~12 | Utilitaires + pilotage |
| n8n/ | ~15 | Workflows JSON |
| datasets/ | ~20 | Donnees de test + secteurs |
| website/ | ~50 | Next.js site ETI |
| website-pme-*/ | ~90 | Next.js sites PME |
| docs/ | ~5 | Dashboard data |
| snapshot/ | ~10 | References |
| mcp/ | ~5 | Serveurs MCP |
| infra/ | ~8 | Infrastructure docs |

**Total repo** : ~500+ fichiers core (mon-ipad)

---

## HISTORIQUE DES AJOUTS

| Session | Ajouts | Date |
|---------|--------|------|
| 25 | Creation du document, 50+ ameliorations listees | 2026-02-19 |

---

> **REGLE** : Mettre a jour ce fichier apres chaque session avec les nouvelles ameliorations identifiees.
> Marquer le statut (A FAIRE → EN COURS → APPLIQUE) au fur et a mesure.
