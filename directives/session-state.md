# Session State — 18 Février 2026 (Session 15 — Fixes CI GitHub Actions)

## Objectif de session
Faire fonctionner les tests Phase 1 via GitHub Actions.
Fix quantitative (78.3%→85%) et graph (68.7%→70%) validés via tests CI.

## Décisions prises (session 15)

### 1. GitHub Actions = seule solution viable pour tests
- VM RAM trop limitée pour n8n + task runner
- Codespace SSH proxy = Alpine Linux, pas de Docker
- devcontainer nécessite VS Code/web UI, pas SSH
- GitHub Actions donne Docker natif + 8GB RAM ✅

### 2. Bugs CI corrigés (session 15)

#### Bug 1: n8n API auth (résolu ✅)
- Problème: fresh n8n DB ne reconnaît pas le JWT stocké
- Fix: `N8N_GLOBAL_ADMIN_API_KEY=rag-tests-ci-api-key-2026` dans docker-compose
- Résultat: import workflows fonctionne maintenant

#### Bug 2: Service name (résolu ✅)
- Problème: docker-compose utilise `n8n-main` mais workflow cherchait `n8n`
- Fix: test-phase1.yml corrigé avec `n8n-main`

#### Bug 3: Supabase credentials manquants (résolu ✅)
- Problème: fresh n8n DB n'a pas les credentials Postgres pour quantitative/graph
- Fix: créer credentials via API n8n après démarrage, patcher IDs dans workflow JSONs
- Script: `scripts/patch_workflow_credentials.py`
- Secret ajouté: `SUPABASE_PASSWORD` dans rag-tests repo

#### Bug 4: YAML invalide (résolu ✅)
- Problème: Python multi-ligne dans `run: |` cassait le YAML parser GitHub
- Fix: tout Python sur une ligne OU dans scripts/*.py séparés
- Erreur: "while scanning a simple key... import json, sys"

#### Bug 5: workflow_dispatch non reconnu (résolu ✅)
- Problème: YAML invalide → GitHub ne reconnaissait pas le trigger
- Fix: YAML corrigé, em dash `—` retiré du nom (→ `-`)

### 3. État actuel
- Run #22124535460 en cours (quantitative, 3 questions, ~3-4 min)
- Tous les secrets GitHub configurés ✅

## Commits session 15
| Hash | Description |
|------|-------------|
| 054da16 | fix(ci): fix n8n auth + add Supabase credentials for GitHub Actions |
| 437c846 | fix(ci): force GitHub Actions re-index |
| aab8950 | fix(ci): fix YAML syntax — move Python code out of run blocks |

## État infrastructure actuel
```
VM (34.136.180.66) :
  n8n          : STOPPED (RAM insuffisante)
  Redis        : Up (stockage)
  PostgreSQL   : Up (stockage + workflows)
  RAM disponible : ~290MB sans n8n

GitHub rag-tests secrets :
  JINA_API_KEY          ✅
  N8N_API_KEY           ✅ (JWT, ignoré — on utilise static key)
  NEO4J_URI             ✅
  OPENROUTER_API_KEY    ✅
  PINECONE_API_KEY      ✅
  PINECONE_HOST         ✅
  SUPABASE_API_KEY      ✅
  SUPABASE_PASSWORD     ✅ (nouveau)
  SUPABASE_URL          ✅

GitHub Actions CI :
  N8N_GLOBAL_ADMIN_API_KEY = rag-tests-ci-api-key-2026 (static, dans docker-compose)
  Workers : 3 (standard, graph, quantitative)
  Credentials : créés via API après démarrage + JSONs patchés automatiquement
```

## État des pipelines
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% → fix appliqué | >= 70% | TEST EN COURS |
| Quantitative | 78.3% → fix appliqué | >= 85% | TEST EN COURS |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Prochaine action (après résultat CI)
Si tests passent :
1. Déclencher test pour `graph` (3 questions)
2. Si graph passe : déclencher `all` avec 10 questions
3. Si tout passe : déclencher mode `full` avec iterative-eval
4. Résultats → commits dans rag-tests → push tous repos

Si tests échouent :
1. Télécharger artifacts (logs)
2. `gh run view --log-failed <run-id> --repo LBJLincoln/rag-tests`
3. Analyser erreur et corriger

## Commande de surveillance
```bash
gh run list --repo LBJLincoln/rag-tests --limit 3
gh run view --log-failed 22124535460 --repo LBJLincoln/rag-tests 2>&1 | head -50
```
