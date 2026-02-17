# Session State — 17 Fevrier 2026 (Session 11)

## Objectif de session
Deploiement complet de l'architecture multi-repo : chaque projet autonome dans son Codespace, mon-ipad comme tour de controle.

## Taches completees cette session

### Phase A — Credentials
- Token GitHub mis a jour sur les 5 remotes (ghp_M89...)
- Cle OpenRouter mise a jour dans .env.local (sk-or-v1-a56...)
- gh CLI authentifie (LBJLincoln, scopes complets incl. codespace)

### Phase B — Architecture Codespace complete
- **rag-website** : devcontainer.json + docker-compose.yml (n8n avec 4 pipelines RAG + PG) + setup.sh
- **rag-tests** : devcontainer.json mis a jour + setup.sh (SSH tunnel vers VM Redis/PG)
- **rag-data-ingestion** : devcontainer.json mis a jour + setup.sh (stack n8n isole)
- **rag-dashboard** : devcontainer.json + setup.sh + CLAUDE.md (NOUVEAU — manquait)
- Tous les devcontainers utilisent `postCreateCommand: bash .devcontainer/<repo>/setup.sh`

### Phase C — Scripts d'orchestration (tour de controle)
- `scripts/deploy-codespaces.sh` : create/start/stop/ssh/tunnel/status/push-all
- `scripts/sync-workflows.sh` : export workflows n8n API → n8n/live/ + snapshot/current/

### Phase D — Fix port 8080
- Port 8080 bloque par firewall GCP (pas de permission compute.firewalls.create)
- Workaround : webhook `/webhook/nomos-status` (KcfzvJD6yydxY9Uk) sur port 5678 = accessible externe
- API dashboard + SSE stream mis a jour pour utiliser 5678/webhook/nomos-status
- Teste et valide : HTTP 200 depuis IP externe

## Decisions prises
- STATUS_API_URL = `http://34.136.180.66:5678/webhook/nomos-status` (pas port 8080)
- rag-website a son PROPRE n8n avec les 4 pipelines importees via setup.sh
- rag-data-ingestion a son PROPRE n8n isole (PG + Redis locaux)
- rag-tests utilise les workers connectes au n8n de la VM via SSH tunnel
- rag-dashboard = site statique, pas de Docker
- Chaque repo est autonome avec setup.sh, CLAUDE.md role-specifique, docker-compose

## Etat des workflows (VM)
| Workflow | ID | Active |
|----------|-----|--------|
| Orchestrator V10.1 | aGsYnJY9nNCaTM82 | ON |
| Standard RAG V3.4 | TmgyRP20N4JFd9CB | ON |
| Graph RAG V3.3 | 6257AfT1l4FMC6lY | ON |
| Quantitative V2.0 | e465W7V9Q8uK6zJE | ON |
| Dashboard Status API | KcfzvJD6yydxY9Uk | ON |
| Benchmark V3.0 | LKZO1QQY9jvBltP0 | ON |
| Monitoring Dashboard | tLNh3wTty7sEprLj | ON |
| SQL Executor | 22k9541l9mHENlLD | ON |
| Orchestrator Tester | m9jaYzWMSVbBFeSf | ON |
| RAG Batch Tester | y2FUkI5SZfau67dN | ON |
| Feedback V3.1 | F70g14jMxIGCZnFz | ON |
| Ingestion V3.1 | 15sUKy5lGL4rYW0L | OFF (→ Codespace) |
| Enrichissement V3.1 | 9V2UTVRbf4OJXPto | OFF (→ Codespace) |
| Dataset Ingestion | YaHS9rVb1osRUJpE | OFF (→ Codespace) |

## Distribution des workflows par repo
| Repo | Workflows n8n | Docker | Execution |
|------|--------------|--------|-----------|
| mon-ipad (VM) | 11 actifs (4 RAG + 7 support) | n8n + PG + Redis | Permanent |
| rag-website | 4 RAG + feedback + benchmark (importes via setup.sh) | n8n + PG | Codespace |
| rag-tests | Aucun local (workers connectes a VM) | 2 workers n8n | Codespace |
| rag-data-ingestion | Ingestion V3.1 + Enrichissement V3.1 | n8n + 2 workers + PG + Redis | Codespace |
| rag-dashboard | Aucun (read-only) | Aucun | Vercel/GH Pages |

## Etat Phase 1 (inchange)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Repos impactes
- mon-ipad (origin) — scripts, devcontainers, API routes, session-state
- rag-website — devcontainer + docker-compose + setup.sh
- rag-tests — devcontainer + setup.sh
- rag-data-ingestion — devcontainer + setup.sh
- rag-dashboard — devcontainer + CLAUDE.md + setup.sh (NOUVEAU)

## Blockers resolus
- ~~gh CLI pas installe~~ → gh 2.86.0 installe + authentifie
- ~~Port 8080 bloque~~ → workaround webhook 5678

## Blockers restants
- Vercel : user doit connecter via browser (pas encore fait)
- Codespaces : pas encore crees (scripts prets, attente push)
- Codespace secrets : credentials non configures dans GitHub Settings

## Derniere action
Push vers tous les 5 repos avec scripts + devcontainers complets

## Prochaine action
1. Creer les Codespaces via `bash scripts/deploy-codespaces.sh create-all`
2. Configurer les Codespace secrets (OPENROUTER_API_KEY, JINA_API_KEY, etc.)
3. Deployer Vercel (connecter repo rag-website dans browser)
4. Phase 2 : corriger Graph (68.7% → 70%) et Quantitative (78.3% → 85%)

## Commits
- [pending] session11: architecture multi-repo complete + orchestration scripts
