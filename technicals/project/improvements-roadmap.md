# Improvements Roadmap — Centralized

> Last updated: 2026-02-22T17:20:00+01:00
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
| H3 | Migrer SQLite → PostgreSQL persistant (Supabase externe) | **CRITICAL** — Pas de perte au reboot | Moyen | **PRIORITE 1 (Session 40)** |
| H4 | Exporter les fixes VM vers HF Space | Workflow a jour | Faible | A FAIRE |
| H5 | Multi-API-key OpenRouter | 3x rate limit | Faible | A FAIRE |
| H6 | Keep-alive plus fiable (webhook interne) | Uptime 99.9% | Faible | FAIT (cron VM) |
| **H7** | **HF /data persistent volume activation** | Survit aux rebuilds (alternative à H3) | Faible | **ALTERNATIVE H3** |
| **H8** | **Robust entrypoint.sh avec verification** | Detect failed activations | Faible | **PRIORITE 1 (Session 40)** |
| **H9** | **Activation health check POST-deploy** | Test webhooks before marking success | Faible | **PRIORITE 1** |

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

### 3.1 Core Optimizations

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| N1 | Workflow versioning automatique (snapshot avant chaque modification) | Fiabilite | Moyen | A FAIRE |
| N2 | Health check endpoint dedié (/webhook/health) | Monitoring | Faible | A FAIRE |
| N3 | Metrics Prometheus via n8n metrics endpoint | Observabilite | Faible | PARTIEL (N8N_METRICS=true) |
| N4 | Error notification webhook (Slack/Discord) | Alerting | Faible | A FAIRE |
| N5 | Workflow export automatique apres chaque activation | Backup | Moyen | A FAIRE |

### 3.2 Queue Mode & Scalability (2026 Best Practices)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **N6** | **Configurer QUEUE_HEALTH_CHECK_ACTIVE=true** pour /healthz readiness | Detect worker failures | Faible | RECOMMANDE |
| **N7** | **Worker count = CPU cores** (3 workers sur HF Space 2-core) | Optimal throughput | Faible | A FAIRE |
| **N8** | **Binary data → S3 external storage** (required for queue mode) | Prevent file system errors | Moyen | SI BINARIES NEEDED |
| **N9** | **Concurrency control per workflow** (limite 5 executions simultanées) | Prevent rate-limit cascade | Faible | RECOMMANDE |
| **N10** | **Redis queue persistence** (AOF enabled) | Survive Redis restarts | Faible | A FAIRE |

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

### 5.1 Enterprise Production Metrics (2026 Standards) — BLOCKING PHASE GATE

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **E1** | **Mesurer Faithfulness (>= 95%)** via LLM-as-judge | **BLOCKING** — Phase Gate requis | Moyen | **PRIORITE 2** |
| **E2** | **Mesurer Context Recall (>= 85%)** compare retrieved vs. golden | **BLOCKING** — Phase Gate requis | Moyen | **PRIORITE 2** |
| **E3** | **Mesurer Hallucination Rate (<= 2%)** inverse de faithfulness | **BLOCKING** — Phase Gate requis | Moyen | **PRIORITE 2** |
| **E4** | **Mesurer Latency p50/p95 (<= 2.5s)** end-to-end | **BLOCKING** — Phase Gate requis | Faible | **PRIORITE 2** |
| E5 | Evaluation parallele avec asyncio | 3x speedup eval | Moyen | A FAIRE |
| E6 | Dashboard live accuracy en temps reel | Visibilite | Faible | PARTIEL (SSE) |
| E7 | A/B testing entre versions de workflows | Qualite | Eleve | PLANIFIE |
| **E8** | **Integrer RAGAS framework** pour faithfulness/context recall offline | Enterprise standard | Moyen | **RECOMMANDE Session 40+** |
| **E9** | **Integrer DeepEval dans GitHub Actions CI** pour regression detection | Prevent quality drops | Moyen | **RECOMMANDE** |
| **E10** | **Calibrer LLM-as-judge avec 50-100 human-labeled examples** | Fix judge bias | Faible | A FAIRE |
| **E11** | **Component-level eval** (retriever-only tests, no generator) | Pinpoint failures | Moyen | A FAIRE |

### 5.2 Autonomous Testing Architecture (Prevent Session 39 PID Deaths)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **E12** | **Auto-recovery logic dans eval scripts** (retry on rate-limit, stop on 3 failures) | No manual restart | Moyen | **PRIORITE 1** |
| **E13** | **Structured JSON logging** pour monitoring distant | Observability | Faible | A FAIRE |
| **E14** | **Auto-commit every 15 min** during long runs | Never lose results | Faible | **PRIORITE 1** |
| **E15** | **Progress webhook POST to n8n** every 15 min pour dashboard | Real-time visibility | Faible | RECOMMANDE |
| **E16** | **Kill switch** (auto-stop if disk > 90% or RAM > 95%) | Prevent VM crash | Faible | RECOMMANDE |
| **E17** | **Self-healing nohup wrapper** around run-eval-parallel.py | 10+ hrs autonomous | Moyen | **PRIORITE 1** |

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

---

## 9. SESSION 39 LESSONS — CRITICAL FIXES

### 9.1 HF Space Reliability (ALL WEBHOOKS 404 After Rebuild)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **S39-1** | **Migrate HF Space to external Supabase DB** (same as improvements-roadmap.md H3) | **CRITICAL** — Prevent data loss | Moyen | **MUST DO Session 40** |
| **S39-2** | **Add /data persistent volume** (HF Spaces setting) | Alternative to S39-1 | Faible | **ALTERNATIVE** |
| **S39-3** | **Fix entrypoint.sh activation verification** (see knowledge-base.md 9.2) | Detect silent failures | Faible | **MUST DO Session 40** |
| **S39-4** | **POST-deploy webhook health check** (test all 7 webhooks before success) | Prevent 404 surprise | Faible | **MUST DO Session 40** |

### 9.2 Orchestrator Failure (0% Phase 2)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **S39-5** | **Debug Orchestrator intent classifier** (why 404 on every Phase 2 question?) | Fix 0% accuracy | Moyen | **PRIORITE 1 Session 40** |
| **S39-6** | **Add intent classifier unit tests** (independent of full pipeline) | Regression detection | Faible | RECOMMANDE |

### 9.3 Standard Pipeline Degradation (85.5% → 36%)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **S39-7** | **Diagnose Standard pipeline Phase 2 degradation** (retrieval or LLM?) | +49pp accuracy | Moyen | **PRIORITE 1 Session 40** |
| **S39-8** | **Component-level eval** (test retriever separately from generator) | Pinpoint root cause | Moyen | RECOMMANDE |

### 9.4 PME Workflows (Imported but NOT Activated)

| # | Amélioration | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| **S39-9** | **Configure Google API credentials** in HF Space (key exists: AIzaSyBWN3...) | PME workflows functional | Faible | Session 40 |
| **S39-10** | **GitHub Actions CI for PME workflows** (validate before HF deploy) | Prevent broken imports | Moyen | RECOMMANDE |
| **S39-11** | **PME independent test suite** in rag-pme-connectors repo | Decouple from rag-tests | Moyen | RECOMMANDE |

---

## HISTORIQUE DES AJOUTS

| Session | Ajouts | Date |
|---------|--------|------|
| 25 | Creation du document, 50+ ameliorations listees | 2026-02-19 |
| 39 | +20 ameliorations (HF persistence, RAG eval 2026, autonomous testing, Session 39 lessons) | 2026-02-22 |

---

> **REGLE** : Mettre a jour ce fichier apres chaque session avec les nouvelles ameliorations identifiees.
> Marquer le statut (A FAIRE → EN COURS → APPLIQUE) au fur et a mesure.

---

## REFERENCES WEB (Session 39 Research)

### RAG Evaluation 2026
- [RAG Evaluation Metrics (Patronus AI)](https://www.patronus.ai/llm-testing/rag-evaluation-metrics)
- [RAG Evaluation Best Practices (EvidentlyAI)](https://www.evidentlyai.com/llm-guide/rag-evaluation)
- [RAG Evaluation Complete Guide (Maxim AI)](https://www.getmaxim.ai/articles/rag-evaluation-a-complete-guide-for-2025/)
- [Faithfulness, Context Recall Guide (Kinde)](https://www.kinde.com/learn/ai-for-software-engineering/best-practice/rag-evaluation-in-practice-faithfulness-context-recall-answer-relevancy/)
- [DeepEval CI/CD Integration](https://www.confident-ai.com/blog/how-to-evaluate-rag-applications-in-ci-cd-pipelines-with-deepeval)
- [RAGAS Framework Cookbook](https://haystack.deepset.ai/cookbook/rag_eval_ragas)

### n8n Optimization & Queue Mode
- [n8n Queue Mode Documentation](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [n8n Scaling & Reliability Guide (Medium)](https://medium.com/@orami98/the-n8n-scaling-reliability-guide-queue-mode-topologies-error-handling-at-scale-and-production-9f33b13d2be8)
- [n8n Performance Optimization Guide](https://www.wednesday.is/writing-articles/n8n-performance-optimization-for-high-volume-workflows)
- [n8n Concurrency Control](https://docs.n8n.io/hosting/scaling/concurrency-control/)

### HuggingFace Spaces n8n Deployment
- [Free n8n Deployment on HF with Supabase](https://www.ubitools.com/deploy-n8n-huggingface-supabase-guide/)
- [How to Deploy n8n on HF Spaces (Apidog)](https://apidog.com/blog/deploy-n8n-free-huggingface/)
- [HF Docker Spaces Documentation](https://huggingface.co/docs/hub/main/spaces-sdks-docker)
- [n8n on HF Community Thread](https://community.n8n.io/t/how-to-deploy-n8n-in-hugging-face-space/35961)

---

## 10. REPO HEALTH & ARCHITECTURE CLEANLINESS

> Based on comprehensive repo inspection (Session 42)

### 10.1 Mon-ipad Repo (Control Tower)

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| RH1 | All directives fresh (<48h) except rag-data-ingestion.md (46h) | Health ✓ | — | OK |
| RH2 | 5,405 Python/MD files, 11MB logs, no dead .log files | Clean ✓ | — | OK |
| RH3 | Git pack file 16MB (.git/objects/pack) — consider gc | Disk space | Faible | Optional |
| RH4 | Update directives/repos/rag-data-ingestion.md timestamp | Consistency | Faible | Next session |
| RH5 | No __pycache__ or .pyc cleanup needed (gitignored) | Clean ✓ | — | OK |
| RH6 | Create automated weekly git gc cron job | Disk hygiene | Faible | RECOMMANDE |
| RH7 | Add pre-commit hook to check directive timestamps | Prevent staleness | Faible | RECOMMANDE |

### 10.2 Rag-tests Repo

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| RT1 | Last push: 2026-02-22 18:43 (today) — Active ✓ | Health ✓ | — | OK |
| RT2 | 0 open issues, single main branch — Clean ✓ | Health ✓ | — | OK |
| RT3 | Size: 34,719 KB (~34MB) — Normal | Health ✓ | — | OK |
| RT4 | Add GitHub Actions CI for eval scripts linting | Code quality | Faible | RECOMMANDE |
| RT5 | Create CONTRIBUTING.md for external contributors | Documentation | Faible | Future |
| RT6 | Add pytest unit tests for quick-test.py, iterative-eval.py | Reliability | Moyen | RECOMMANDE |
| RT7 | Document expected Codespace setup in README.md | Onboarding | Faible | RECOMMANDE |

### 10.3 Rag-data-ingestion Repo

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| DI1 | Last push: 2026-02-21 05:50 (2 days ago) — Stale warning | Activity ⚠ | — | Monitor |
| DI2 | 0 open issues, single main branch — Clean ✓ | Health ✓ | — | OK |
| DI3 | Size: 31,842 KB (~31MB) — Normal | Health ✓ | — | OK |
| DI4 | No Codespace created yet (per CLAUDE.md) | Workflow blocked | Moyen | Session 40+ |
| DI5 | Create sample ingestion job for testing (100 docs) | Testing | Faible | RECOMMANDE |
| DI6 | Document dataset download process (14 benchmarks ~4GB) | Documentation | Faible | A FAIRE |
| DI7 | Add dry-run mode for ingestion (preview without write) | Safety | Faible | RECOMMANDE |

### 10.4 Rag-pme-connectors Repo

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| PME1 | Last push: 2026-02-21 05:50 (2 days ago) — Recent ✓ | Health ✓ | — | OK |
| PME2 | 0 open issues, single main branch — Clean ✓ | Health ✓ | — | OK |
| PME3 | Size: 32,211 KB (~31MB) — Normal | Health ✓ | — | OK |
| PME4 | CLAUDE.md exists ✓ | Documentation ✓ | — | OK |
| PME5 | n8n/pme-connectors workflows present ✓ | Infrastructure ✓ | — | OK |
| **PME6** | **NO directives/repos/rag-pme-connectors.md in mon-ipad** | Missing directive | Faible | **CREATE Session 40** |
| **PME7** | **Add test infrastructure** (eval scripts for PME workflows) | Quality | Moyen | **PRIORITE 2** |
| PME8 | GitHub Actions CI for Next.js build | Regression | Faible | RECOMMANDE |
| PME9 | Vercel deployment health check in CI | Deployment safety | Faible | RECOMMANDE |
| PME10 | Document 15 connectors with test scenarios | Testing | Moyen | A FAIRE |
| PME11 | Add E2E tests for chatbot MacBook-style interface | UX quality | Moyen | RECOMMANDE |

### 10.5 Rag-dashboard Repo

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| RD1 | Last push: 2026-02-22 18:44 (today) — Active ✓ | Health ✓ | — | OK |
| RD2 | 0 open issues, single main branch — Clean ✓ | Health ✓ | — | OK |
| RD3 | Size: 37,285 KB (~36MB) — Normal | Health ✓ | — | OK |
| RD4 | PUBLIC repo (unlike others) — Intentional ✓ | Visibility | — | OK |
| RD5 | GitHub Pages enabled ✓ | Deployment ✓ | — | OK |
| RD6 | Vercel deployment: nomos-dashboard.vercel.app ✓ | Production ✓ | — | OK |
| RD7 | Add uptime monitoring (UptimeRobot free tier) | Reliability | Faible | RECOMMANDE |
| RD8 | Implement fallback if n8n webhook fails | Resilience | Faible | RECOMMANDE |

### 10.6 Rag-website Repo

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| RW1 | Last push: 2026-02-21 05:50 (2 days ago) — Recent ✓ | Health ✓ | — | OK |
| RW2 | 0 open issues, single main branch — Clean ✓ | Health ✓ | — | OK |
| RW3 | Size: 31,872 KB (~31MB) — Normal | Health ✓ | — | OK |
| RW4 | Vercel deployment: nomos-ai-pied.vercel.app ✓ | Production ✓ | — | OK |
| RW5 | Add Playwright E2E tests for 4 sector pages | Quality | Moyen | RECOMMANDE |
| RW6 | Lighthouse CI for performance tracking | Performance | Faible | RECOMMANDE |

### 10.7 Rag-pme-usecases Repo (NEW)

| # | Issue/Improvement | Impact | Effort | Statut |
|---|-------------------|--------|--------|--------|
| PU1 | Basic Next.js structure present ✓ | Infrastructure ✓ | — | OK |
| **PU2** | **Missing CLAUDE.md** | Documentation | Faible | **CREATE Session 40** |
| **PU3** | **Missing directives/repos/rag-pme-usecases.md in mon-ipad** | Missing directive | Faible | **CREATE Session 40** |
| PU4 | NO deployment URL configured yet | Deployment | Faible | TODO Session 40+ |
| PU5 | Add 200 use cases content (JSON or markdown) | Content | Eleve | A FAIRE |
| PU6 | Implement filtering by sector (8 sectors) | UX | Moyen | A FAIRE |
| PU7 | Add Vercel deployment configuration | Deployment | Faible | Session 40+ |

---

## 11. CROSS-REPO CONSISTENCY & GOVERNANCE

> Ensuring all satellite repos follow the same standards

### 11.1 Missing Governance Files

| # | Issue | Impact | Effort | Statut |
|---|-------|--------|--------|--------|
| **GOV1** | **Create directives/repos/rag-pme-connectors.md** | Consistency | Faible | **Session 40** |
| **GOV2** | **Create directives/repos/rag-pme-usecases.md** | Consistency | Faible | **Session 40** |
| GOV3 | Standardize .gitignore across all 7 repos | Hygiene | Faible | RECOMMANDE |
| GOV4 | Create template CLAUDE.md for new repos | Onboarding | Faible | RECOMMANDE |
| GOV5 | Add CODE_OF_CONDUCT.md for public repos | Community | Faible | Future |

### 11.2 CI/CD Standardization

| # | Improvement | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| CI5 | Template GitHub Actions workflow for all repos | Consistency | Faible | RECOMMANDE |
| CI6 | Pre-commit hooks config (black, ruff, prettier) | Code quality | Faible | RECOMMANDE |
| CI7 | Dependabot for all repos (Python, Node.js) | Security | Faible | RECOMMANDE |
| CI8 | Branch protection rules (require CI pass) | Quality | Faible | Future |

### 11.3 Documentation Completeness Matrix

| Repo | CLAUDE.md | Directive (mon-ipad) | README.md | .env.example | Status |
|------|-----------|---------------------|-----------|--------------|--------|
| rag-tests | ✓ | ✓ | ? | ✓ | Good |
| rag-data-ingestion | ✓ | ✓ (46h old) | ? | ✓ | OK |
| rag-pme-connectors | ✓ | ✗ **MISSING** | ? | ✓ | **Action needed** |
| rag-pme-usecases | ✗ **MISSING** | ✗ **MISSING** | ? | ? | **Action needed** |
| rag-dashboard | ✓ | ✓ | ? | N/A | Good |
| rag-website | ✓ | ✓ | ? | ✓ | Good |

**Priority Action**: Create missing directives and CLAUDE.md files for rag-pme-* repos.

---

## 12. INFRASTRUCTURE & RESOURCE OPTIMIZATION

> Based on repo sizes, file counts, and resource usage patterns

### 12.1 Disk Space Management

| # | Improvement | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| DISK1 | Git gc monthly on all repos (pack optimization) | Free 20-30% disk | Faible | RECOMMANDE |
| DISK2 | Logs rotation policy (delete >30 days) | Free 11MB (mon-ipad) | Faible | RECOMMANDE |
| DISK3 | Node_modules cleanup script for website repos | Free ~200MB per repo | Faible | RECOMMANDE |
| DISK4 | .venv excluded from git (check .gitignore) | Prevent bloat | Faible | OK |
| DISK5 | Outputs/ archive compression (gzip old sessions) | Free ~50MB | Faible | RECOMMANDE |

### 12.2 Multi-Repo Operations Efficiency

| # | Improvement | Impact | Effort | Statut |
|---|-------------|--------|--------|--------|
| MR1 | Improve scripts/push-directives.sh error handling | Reliability | Faible | RECOMMANDE |
| MR2 | Add scripts/bulk-status.sh (git status all 7 repos) | Visibility | Faible | RECOMMANDE |
| MR3 | Add scripts/bulk-pull.sh (fetch all repos) | Sync | Faible | RECOMMANDE |
| MR4 | Create GitHub Actions workflow to sync directives | Automation | Moyen | Future |

---

## 13. TESTING & QUALITY ASSURANCE GAP ANALYSIS

> Critical testing gaps identified across repos

### 13.1 Missing Test Coverage

| Repo | Unit Tests | Integration Tests | E2E Tests | CI/CD | Gap Score |
|------|-----------|------------------|-----------|-------|-----------|
| rag-tests | ✗ | Partial (eval scripts) | ✗ | Partial | **HIGH** |
| rag-data-ingestion | ✗ | ✗ | ✗ | ✗ | **CRITICAL** |
| rag-pme-connectors | ✗ | ✗ | ✗ | ✗ | **CRITICAL** |
| rag-pme-usecases | ✗ | ✗ | ✗ | ✗ | **CRITICAL** |
| rag-dashboard | ✗ | ✗ | ✗ | ✗ | HIGH |
| rag-website | ✗ | ✗ | ✗ | ✗ | HIGH |
| mon-ipad | Partial | Partial | ✗ | Partial | MEDIUM |

### 13.2 Priority Test Implementation

| # | Test to Implement | Repo | Impact | Effort | Statut |
|---|-------------------|------|--------|--------|--------|
| **TEST1** | **Unit tests for PME workflows** | rag-pme-connectors | Prevent regressions | Moyen | **PRIORITE 1** |
| **TEST2** | **Component tests for eval scripts** | rag-tests | Reliability | Moyen | **PRIORITE 2** |
| TEST3 | E2E tests for website chatbots | rag-website, pme-connectors | UX quality | Eleve | RECOMMANDE |
| TEST4 | Integration tests for ingestion pipeline | rag-data-ingestion | Data quality | Eleve | RECOMMANDE |
| TEST5 | Smoke tests for all n8n webhooks | All repos | Infrastructure | Faible | RECOMMANDE |

---

## HISTORIQUE DES AJOUTS

| Session | Ajouts | Date |
|---------|--------|------|
| 25 | Creation du document, 50+ ameliorations listees | 2026-02-19 |
| 42 | Repo health inspection: 70+ nouveaux items (sections 10-13) | 2026-02-22 |

---

> **REGLE** : Mettre a jour ce fichier apres chaque session avec les nouvelles ameliorations identifiees.
> Marquer le statut (A FAIRE → EN COURS → APPLIQUE) au fur et a mesure.
