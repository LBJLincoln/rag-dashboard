# Session State — 17 Février 2026 (Session 14 — Opus 4.6 + VM→Codespace migration)

## Objectif de session
Migration architecture : VM Google Cloud passe en mode STOCKAGE UNIQUEMENT.
n8n arrêté sur VM. Tout le calcul délégué aux Codespaces GitHub.
Opus 4.6 obligatoire dans tous les repos.

## Décisions prises (session 14)

### 1. VM = Stockage permanent uniquement
- n8n ARRÊTÉ sur la VM (`docker compose stop n8n`)
- Redis + PostgreSQL restent (stockage historique)
- Codespaces font tout le calcul
- Si Codespace crashe → résultats préservés GitHub (push automatique avant arrêt)

### 2. n8n LOCAL dans chaque Codespace
- `rag-tests` : docker-compose.yml pushé (n8n-main + 3 workers + redis + postgres)
- `rag-data-ingestion` : docker-compose.yml déjà en place (2 workers)
- Workflows importés depuis `n8n/current/` via sync.py au démarrage Codespace

### 3. claude-opus-4-6 PARTOUT
- `.claude/settings.json` : `"model": "claude-opus-4-6"` ✅
- `.env.local` : `ANTHROPIC_MODEL=claude-opus-4-6` ✅
- `scripts/setup-claude-opus.sh` : script déploiement Opus dans tout Codespace ✅
- `directives/repos/*.md` (4 repos) : header Opus 4.6 ajouté ✅
- `CLAUDE.md` : mis à jour avec nouvelle architecture ✅

## Commits session 14
| Hash | Description |
|------|-------------|
| d480212 | feat(opus+n8n): Opus 4.6 mandatory + n8n local Codespace pour rag-tests |
| (en cours) | feat(vm): arrêt n8n VM, architecture VM=stockage |

## État infrastructure actuel
```
VM (34.136.180.66) :
  n8n          : STOPPED
  Redis        : Up (stockage)
  PostgreSQL   : Up (stockage)
  RAM disponible : ~230MB (était ~100MB avec n8n actif)

GitHub (source de vérité) :
  docker-compose.yml dans rag-tests : ✅ (3 workers)
  docker-compose.yml dans rag-data-ingestion : ✅ (2 workers)
```

## État des pipelines (inchangé — tests non lancés cette session)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Prochaine action (PRIORITÉ ABSOLUE — Phase 1)
1. Créer/démarrer Codespace rag-tests
2. `docker compose up -d` (n8n LOCAL 3 workers)
3. `bash scripts/setup-claude-opus.sh`
4. Importer workflows n8n depuis `n8n/current/`
5. **Fixer Quantitative** : 78.3% → 85% (CompactRAG + BM25, gap -6.7pp)
6. **Fixer Graph** : 68.7% → 70% (entity disambiguation, gap -1.3pp)

## Configuration git (CRITIQUE pour Vercel)
```
user.email = alexis.moret6@outlook.fr
user.name = LBJLincoln
```

## Sites production
- rag-website : https://nomos-ai-pied.vercel.app
- rag-dashboard : https://nomos-dashboard.vercel.app
