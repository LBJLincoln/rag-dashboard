# Session State — 17 Février 2026 (Session 11b → refactoring directives)

## Objectif de session
Refactoring complet des directives : CLAUDE.md enrichi avec infra réelle,
création des directives personnelles par repo satellite (directives/repos/).

## Architecture finale (DEFINITIVE)

### Principe Codespaces
- `devcontainer.json` = image-based UNIQUEMENT (PAS de dockerComposeFile)
- `docker-compose.yml` = fichier STANDALONE, démarré par `setup.sh` via `docker compose up -d`
- Évite que SSH atterrisse dans le mauvais container (bug précédent)

### Distribution par repo
| Repo | Exécution | n8n | Docker compose | Workflows |
|------|-----------|-----|---------------|-----------|
| **mon-ipad** | VM GCP e2-micro | Permanent (11 actifs) | Déjà en place | 4 RAG + 7 support |
| **rag-website** | Codespace | Local (démarré par setup.sh) | n8n + PG | Sectoriels |
| **rag-tests** | Codespace | Remote (VM via SSH tunnel) | Aucun | Aucun local |
| **rag-data-ingestion** | Codespace | Local (démarré par setup.sh) | n8n + 2 workers + PG + Redis | Ingestion V3.1 + Enrichissement V3.1 |
| **rag-dashboard** | Vercel / GH Pages | Aucun | Aucun | Aucun (read-only) |

## Tâches complétées cette session

### Phase A — Session 11b (Codespaces architecture)
- ✅ Token GitHub mis à jour sur les 5 remotes
- ✅ 4 devcontainer configs image-based
- ✅ docker-compose.yml standalone pour rag-website et rag-data-ingestion
- ✅ setup.sh démarre docker-compose + attend n8n + importe workflows + installe Claude Code
- ✅ scripts/deploy-codespaces.sh et scripts/sync-workflows.sh

### Phase B — Refactoring directives (17 fév)
- ✅ CLAUDE.md entièrement réécrit :
  - Section "CE QUE TU ES ET CE QUE TU FAIS PRÉCISÉMENT"
  - Section "INFRASTRUCTURE RÉELLE ET PRÉCISE" (VM specs, Docker, MCP, BDD, limites)
  - Rôles précis par repo avec directives/repos/ référencés
  - 20 règles d'or (dont RAM critique, directives repos)
- ✅ directives/repos/rag-tests.md (workflow-process adapté testeur)
- ✅ directives/repos/rag-website.md (objectif sectoriel, 20 datasets, recherche 2026)
- ✅ directives/repos/rag-data-ingestion.md (recherche papiers 2026 obligatoire, Ingestion V4)
- ✅ directives/repos/rag-dashboard.md (statique, read-only)
- ✅ scripts/push-directives.sh (push CLAUDE.md vers chaque repo satellite)
- ✅ directives/status.md mis à jour (session 11b + refactoring)

## Décisions prises
- Chaque repo a sa directive personnelle dans directives/repos/
- directives/repos/*.md = source → poussé comme CLAUDE.md dans chaque repo satellite
- rag-website : part de mon-ipad Phase 2, BDD SÉPARÉES, datasets sectoriels
- rag-data-ingestion : recherche papiers 2026 OBLIGATOIRE avant développement
- rag-tests : SSH tunnel vers VM, pas de n8n local
- rag-dashboard : statique, pas de Codespace

## État des workflows (VM)
| Workflow | ID | Active |
|----------|-----|--------|
| Orchestrator V10.1 | aGsYnJY9nNCaTM82 | ON |
| Standard RAG V3.4 | TmgyRP20N4JFd9CB | ON |
| Graph RAG V3.3 | 6257AfT1l4FMC6lY | ON |
| Quantitative V2.0 | e465W7V9Q8uK6zJE | ON |
| Dashboard Status API | KcfzvJD6yydxY9Uk | ON |
| Benchmark V3.0 | LKZO1QQY9jvBltP0 | ON |
| Monitoring Dashboard | tLNh3wTty7sEprLj | ON |
| Ingestion V3.1 | 15sUKy5lGL4rYW0L | ON |
| Enrichissement V3.1 | 9V2UTVRbf4OJXPto | ON |
| Feedback V3.1 | F70g14jMxIGCZnFz | ON |
| Dataset Ingestion | YaHS9rVb1osRUJpE | ON |

## État Phase 1 (inchangé)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Dernière action
Refactoring complet directives — CLAUDE.md + directives/repos/ (4 fichiers) + push-directives.sh

## Prochaine action
1. Committer + pusher ce refactoring : `git add -A && git commit -m "..."`
2. Pousser les directives vers les repos satellites : `bash scripts/push-directives.sh`
3. Phase 1 : corriger Graph (68.7% → 70%) et Quantitative (78.3% → 85%)
4. Créer/vérifier les Codespaces rag-tests et rag-data-ingestion

## Repos impactés
- mon-ipad (origin) — ce refactoring
- rag-tests, rag-website, rag-data-ingestion, rag-dashboard — via push-directives.sh
