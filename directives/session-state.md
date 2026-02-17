# Session State — 17 Fevrier 2026 (Session 11b)

## Objectif de session
Deploiement complet de l'architecture multi-repo : chaque projet autonome dans son Codespace, mon-ipad comme tour de controle.

## Architecture finale (DEFINITIVE)

### Principe
- `devcontainer.json` = image-based UNIQUEMENT (PAS de dockerComposeFile)
- `docker-compose.yml` = fichier STANDALONE, demarre par `setup.sh` via `docker compose up -d`
- Cela evite que SSH atterrisse dans le mauvais conteneur (bug precedent)

### Distribution par repo
| Repo | Execution | n8n | Docker compose | Workflows |
|------|-----------|-----|---------------|-----------|
| **mon-ipad** | VM GCP e2-micro | Permanent (11 actifs) | Deja en place | 4 RAG + 7 support |
| **rag-website** | Codespace | Local (demarre par setup.sh) | n8n + PG | 4 RAG + feedback + benchmark |
| **rag-tests** | Codespace | Remote (VM via SSH tunnel) | Aucun | Aucun local |
| **rag-data-ingestion** | Codespace | Local (demarre par setup.sh) | n8n + 2 workers + PG + Redis | Ingestion V3.1 + Enrichissement V3.1 |
| **rag-dashboard** | Vercel / GH Pages | Aucun | Aucun | Aucun (read-only) |

### Chaque Codespace inclut
- Ubuntu (mcr.microsoft.com/devcontainers/universal:2)
- Python 3.11, Node.js 20, Docker-in-Docker
- Claude Code CLI (`@anthropic-ai/claude-code`)
- `.mcp.json` auto-genere (n8n, neo4j, pinecone, supabase, jina)
- `CLAUDE.md` role-specifique

## Taches completees cette session

### Phase A — Credentials
- Token GitHub mis a jour sur les 5 remotes
- Cle OpenRouter mise a jour dans .env.local
- gh CLI authentifie (LBJLincoln, scopes complets)

### Phase B — Architecture Codespace
- 4 devcontainer configs (rag-website, rag-tests, rag-data-ingestion, rag-dashboard)
- docker-compose.yml STANDALONE pour rag-website et rag-data-ingestion
- setup.sh demarre docker-compose + attend n8n + importe workflows + installe Claude Code
- rag-tests = pas de n8n local (connecte a la VM remote)
- rag-dashboard = site statique (pas de Docker)

### Phase C — Scripts d'orchestration
- `scripts/deploy-codespaces.sh` : create/start/stop/ssh/tunnel/status/push-all
- `scripts/sync-workflows.sh` : export workflows n8n API

### Phase D — Fix port 8080
- Workaround webhook `/webhook/nomos-status` sur port 5678

## Decisions prises
- Docker-compose = STANDALONE (PAS dans devcontainer.json → bug SSH resolu)
- setup.sh fait `docker compose -f ... up -d` puis attend n8n
- rag-tests = remote-only (pas de n8n local)
- rag-dashboard = pas de Codespace necessaire (Vercel/GH Pages)

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

## Etat Phase 1 (inchange)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Derniere action
Fix complet : docker-compose standalone + setup.sh updated + commit + push

## Prochaine action
1. Supprimer les Codespaces casses
2. Recreer les Codespaces propres
3. Verifier SSH → Ubuntu + Docker + Claude Code
4. Phase 2 : corriger Graph et Quantitative
