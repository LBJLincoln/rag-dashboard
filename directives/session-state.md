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

## Fixes appliqués (non testés — Codespace requis pour test)

### Graph pipeline (68.7% → cible 70%)
1. ✅ tenant_id: `IN ['default','benchmark'] OR IS NULL` (2 occurrences corrigées)
2. ✅ HyDE max_tokens: 800 → 400 (verbosité réduite)

### Quantitative pipeline (78.3% → cible 85%)
1. ✅ Schema Introspection: tables inexistantes supprimées (sales_data, kpis, companies)
   + tables réelles ajoutées (orders, customers, departments, quarterly_revenue)
2. ✅ SQL Validator: injection tenant_id désactivée pour JOINs
3. ✅ SQL Prompt: fallback `tenant_id IS NULL` ajouté
4. ✅ Schema Context Builder: foreign keys + relations inter-tables ajoutés

## 9 workflows website créés (n8n/website/)
- RAG Pipeline copies (Phase 1): standard-btp, standard-industrie, quantitative-finance, graph-juridique, orchestrator
- Ingestion secteurs (NOUVEAUX): ingestion-finance, ingestion-juridique, ingestion-btp, ingestion-industrie
- README: n8n/website/README.md

## Prochaine action (PRIORITÉ ABSOLUE — Phase 1)
1. Démarrer Codespace rag-tests:
   ```bash
   gh codespace start --codespace nomos-rag-tests-5g6g5q9vjjwjf5g4
   gh codespace ssh --codespace nomos-rag-tests-5g6g5q9vjjwjf5g4
   bash scripts/setup-codespace-rag-tests.sh
   ```
2. Tester pipelines fixés:
   ```bash
   source .env.local && python3 eval/quick-test.py --questions 5 --pipeline quantitative
   source .env.local && python3 eval/quick-test.py --questions 5 --pipeline graph
   ```
3. Si tests passent → iterative-eval.py --label "Phase1-fix-session14"
4. **Objectif** : Quantitative 78.3%→85%, Graph 68.7%→70%

## Configuration git (CRITIQUE pour Vercel)
```
user.email = alexis.moret6@outlook.fr
user.name = LBJLincoln
```

## Sites production
- rag-website : https://nomos-ai-pied.vercel.app
- rag-dashboard : https://nomos-dashboard.vercel.app
