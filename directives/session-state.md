# Session State — 18 Février 2026 (Session 14 — suite — Fixes Phase 1 + Nouveau Codespace)

## Objectif de session
Compléter Phase 1 : fixes graph (68.7%→70%) + quantitative (78.3%→85%).
Tester dans le nouveau Codespace `ominous-giggle` avec Docker.

## Décisions prises (session 14 — suite)

### 1. VM = Stockage permanent uniquement (CONFIRMÉ)
- n8n ARRÊTÉ (task runner TTL + RAM insuffisante)
- `N8N_RUNNERS_DISABLED=true` ajouté dans docker-compose.yml (mais insuffisant)
- Redis + PostgreSQL restent actifs

### 2. Fixes Phase 1 appliqués + validés (sans tests n8n)

#### Graph pipeline (68.7% → cible 70%)
1. ✅ `n.tenant_id IN [$tenant_id, 'default', 'benchmark'] OR n.tenant_id IS NULL` (2 noeuds)
   - **Validation Neo4j** : 19,723 nœuds avec `benchmark`, 65 avec `default`
   - Ancien filtre ne voyait que 65 nœuds sur 19,788 !
2. ✅ HyDE max_tokens: 800 → 400

#### Quantitative pipeline (78.3% → cible 85%)
1. ✅ Schema Introspection : tables complètes avec sales_data réajoutée
   - Tables : financials, balance_sheet, sales_data, products, employees,
     quarterly_revenue, orders, customers, departments, finqa_tables, convfinqa_tables
   - **Validation Supabase** : TechVision FY2023=$6.745B, GreenEnergy FY2023=$3.65B ✅
2. ✅ SQL Validator : injection tenant_id désactivée pour JOINs
3. ✅ Schema Context Builder : foreign keys + relations inter-tables
4. ✅ Supabase DB patchée directement (PostgreSQL n8n) + JSON mis à jour

### 3. Devcontainer.json créé pour Docker-in-Docker
- `.devcontainer/devcontainer.json` : docker-in-docker + python3.11 + node20
- Pushé vers tous les repos
- Nouveau Codespace `ominous-giggle-5g6g5q9vj9v434776` créé (provisioning)

## Commits session 14
| Hash | Description |
|------|-------------|
| 7d8644d | feat(codespace+phase1): script setup rag-tests + fixes graph/quantitative finaux |
| be1282a | feat(devcontainer): docker-in-docker pour Codespaces RAG tests |
| 0d4e87e | fix(quant): ajouter sales_data au schema introspection (table réelle 1152 lignes) |

## État infrastructure actuel
```
VM (34.136.180.66) :
  n8n          : STOPPED (RAM trop faible, task runner instable)
  Redis        : Up (stockage)
  PostgreSQL   : Up (stockage + workflows patchés)
  RAM disponible : ~290MB

GitHub :
  .devcontainer/devcontainer.json : ✅ (docker-in-docker feature)
  n8n/live/graph.json : ✅ (tenant_id + max_tokens fixés)
  n8n/live/quantitative.json : ✅ (schema + SQL + FK fixés)
  n8n/website/ : ✅ (9 workflows)

Codespace ominous-giggle : PROVISIONING (nouveau, avec Docker)
Codespace rag-tests ancien : ShuttingDown (remplacé)
```

## État des pipelines
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% → fix appliqué | >= 70% | FIX PENDING TEST |
| Quantitative | 78.3% → fix appliqué | >= 85% | FIX PENDING TEST |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Prochaine action (PRIORITÉ ABSOLUE — Phase 1)
1. Attendre Codespace `ominous-giggle` (Available):
   ```bash
   gh codespace list  # attendre status=Available
   ```
2. SSH + setup:
   ```bash
   gh codespace ssh -c ominous-giggle-5g6g5q9vj9v434776
   # Dans Codespace:
   docker --version  # vérifier Docker OK
   # git pull pour avoir les derniers fixes
   bash scripts/setup-codespace-rag-tests.sh
   ```
3. Tester pipelines fixés:
   ```bash
   source .env.local && python3 eval/quick-test.py --questions 5 --pipeline quantitative
   source .env.local && python3 eval/quick-test.py --questions 5 --pipeline graph
   ```
4. Si tests passent → iterative-eval.py --label "Phase1-fix-session14"
5. **Objectif** : Quantitative 78.3%→85%, Graph 68.7%→70%

## Pourquoi n8n ne peut pas tourner sur la VM
- RAM ~970MB totale, ~290MB disponible sans n8n
- n8n process + task runner : ~400MB minimum
- PostgreSQL + Redis : ~250MB déjà utilisés
- Swap : 2GB mais cause db timeouts sous forte utilisation
- Task runner TTL de 120s insuffisant avec le swap (runner démarre trop lentement)
- Solution : n8n dans Codespace (8GB RAM)

## Configuration git (CRITIQUE pour Vercel)
```
user.email = alexis.moret6@outlook.fr
user.name = LBJLincoln
```

## Sites production
- rag-website : https://nomos-ai-pied.vercel.app
- rag-dashboard : https://nomos-dashboard.vercel.app
