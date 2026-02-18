# Session State — 18 Février 2026 (Session 17)

## Objectif de session
Améliorer graph (68.7%→70%) + quantitative (78.3%→85%) + préparer Phase 2 + créer bibliothèque de fixes + audit complet repo.

## Résultats Session 17

### Pipeline Graph ✅ FIXED
- **Symptôme** : skip_graph=true silencieux → pipeline ne queryait jamais Neo4j
- **Root cause** : `Shield #4: Neo4j Guardian Traversal` URL = `bolt://localhost:7687` (Bolt protocol, incompatible avec HTTP Request node)
- **Fix** : URL → `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2` + Basic auth header
- **Test** : 5/5 PASS (27-79s par question, traversal Neo4j actif confirmé)
- **Fichier** : `n8n/live/graph.json`

### Pipeline Quantitative 🟡 PARTIELLEMENT FIXÉ
- **Symptôme** : HTTP 500 immédiat sur toutes requêtes
- **Root cause** : Live workflow n8n = 0 nodes (workflow cassé) + credential postgres ID `zEr7jPswZNv6lWKu` inexistante
- **Fix appliqué** :
  1. Workflow restauré depuis disque (25 nodes) via PUT API ✅
  2. Credential remappée dans `n8n/live/quantitative.json` : `zEr7jPswZNv6lWKu` → `USU8ngVzsUbED3mn` (Supabase Postgres Pooler) ✅
  3. Push vers n8n Docker VM : ❌ BLOQUÉ (VM n8n instable — DB timeouts récurrents, CPU 252%)
- **État** : Fichier JSON corrigé sur disque. Sera utilisé au prochain CI run. Push VM en attente stabilisation.
- **Action suivante** : Au début session 18, re-pousser `n8n/live/quantitative.json` vers n8n Docker via API quand stabilisé.

### Bibliothèque de Fixes ✅ CRÉÉE
- `technicals/fixes-library.md` — 233 lignes, 12 fixes documentés (sessions 7-17)
- `directives/workflow-process.md` — ETAPE 0 ajoutée (consulter fixes-library avant debug)
- `directives/repos/rag-tests.md` — ETAPE 0 + règle 1 ajoutées
- `directives/repos/rag-data-ingestion.md` — ETAPE 0 + règle 1 ajoutées
- `directives/repos/rag-website.md` — ETAPE 0 + règle 1 ajoutées

### Audit et mise à jour docs ✅
- `CLAUDE.md` : n8n containers section corrigée, Phase 1 gates, fixes-library en mandatory outputs, règle 21
- `directives/n8n-endpoints.md` : 4 nouveaux pièges ajoutés (bolt, workflow vide, PUT 400, N8N_RUNNERS), date 18/02
- `directives/objective.md` : Session 17 documentée, prochaines actions mises à jour
- 6 fichiers obsolètes supprimés (session 16)

## Commits session 17
| Hash | Description |
|------|-------------|
| cab38e2 | chore(session-16-end): audit + fix CLAUDE.md + delete 6 obsolete files |
| (à venir) | feat(session-17): graph fix + quant credential + fixes-library + docs audit |

## Infrastructure
```
VM (34.136.180.66) :
  n8n : Up mais instable (DB timeouts, CPU ~250%) — workflows via fichiers JSON
  Tests : GitHub Actions (2-8GB RAM, Docker natif, workflow files = source of truth)

rag-tests CI last run : 22137858153 — ALL 4 PIPELINES 5/5 PASS ✅
```

## Prochaine action (Session 18)
1. **Re-pousser quantitative.json** vers n8n VM quand stabilisé (credential fix déjà dans fichier)
2. **Lancer iterative-eval** sur les 2 pipelines fixes : graph + quantitative
3. **Mesurer accuracy réelle** : graph (cible 70%) + quantitative (cible 85%)
4. **Si gates passées** : lancer Phase 2 avec `datasets/phase-2/hf-1000.json`

## Accuracy actuelle (docs/status.json)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | 85% | ✅ PASS |
| Graph | 68.7% | 70% | ❌ (fix appliqué, retestar) |
| Quantitative | 78.3% | 85% | ❌ (fix appliqué, retestar) |
| Orchestrator | 80.0% | 70% | ✅ PASS |
| **Overall** | **78.1%** | **75%** | **✅ PASS** |
