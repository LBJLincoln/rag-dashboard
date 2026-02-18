# Fixes Library — Multi-RAG Orchestrator

> **Bibliotheque permanente de tous les bugs resolus.** A consulter EN PREMIER avant tout debug.
> Mise a jour obligatoire apres chaque fix reussi. Session courante : Session 17 (2026-02-18).

---

## INDEX PAR CATEGORIE

| # | Categorie | Probleme | Session | Impact |
|---|-----------|----------|---------|--------|
| 01 | n8n Infrastructure | Task Runner isolation brise $getWorkflowStaticData | 16 | CRITIQUE |
| 02 | n8n Infrastructure | SQL Error Handler boucle infinie (compteur $execution.id) | 16 | CRITIQUE |
| 03 | n8n SQL | SQL Validator fallback SQL sans FROM (syntax error PostgreSQL) | 16 | CRITIQUE |
| 04 | n8n Embedding | Jina JSON trailing comma (standard pipeline) | 8 | CRITIQUE |
| 05 | n8n Auth | Task Broker TTL 15s→120s (n8n grant token expiry) | 8 | CRITIQUE |
| 06 | n8n Credentials | Credentials inexistantes apres migration cloud→Docker | 15 | CRITIQUE |
| 07 | Graph Pipeline | Neo4j URL bolt://localhost → HTTPS API (Shield #4) | 17 | CRITIQUE |
| 08 | Quantitative Pipeline | Credential postgres inexistante (live workflow vide) | 17 | CRITIQUE |
| 09 | n8n API | PUT workflow rejette champs read-only (400 error) | 17 | IMPORTANT |
| 10 | CI/CD | n8n runners isolation → timeout 300s×2q = CI fail | 16 | CRITIQUE |
| 11 | Graph Pipeline | Init & ACL multi-format (orchestrator support) | 14 | IMPORTANT |
| 12 | Pinecone | Migration Cohere 1536d → Jina 1024d (index mismatch) | 7 | CRITIQUE |

---

## FIXES DETAILLES

### FIX-01 — N8N_RUNNERS_ENABLED=false (Task Runner Isolation)
**Session** : 16 (2026-02-18)
**Pipeline** : Quantitative CI
**Symptome** : `$getWorkflowStaticData('global')` ne persiste pas entre iterations de boucle. Compteur reset a 0 a chaque passage → boucle de reparation infinie → EXECUTIONS_TIMEOUT 300s.
**Root cause** : `n8n latest` active les task runners par defaut (`N8N_RUNNERS_ENABLED=true`). Les Code nodes s'executent dans un subprocess isole. `$getWorkflowStaticData` ecrit dans le subprocess mais le processus principal ne voit pas les changements.
**Fix** : `N8N_RUNNERS_ENABLED=false` dans docker-compose pour tous les services n8n.
```yaml
# rag-tests-docker-compose.yml — 4 services n8n
- N8N_RUNNERS_ENABLED=false
```
**Verifie** : CI run 22137858153 — 5/5 PASS.
**Fichier impacte** : `rag-tests-docker-compose.yml` (dans repo rag-tests)

---

### FIX-02 — SQL Error Handler counter via $execution.id
**Session** : 16 (2026-02-18)
**Pipeline** : Quantitative
**Symptome** : Boucle infinie de reparation SQL meme apres FIX-01.
**Root cause** : Cle du compteur = `trace_id` qui valait `undefined` dans le contexte d'erreur → `staticData['undefined']` partage entre executions → compteur jamais reset → MAX_REPAIRS jamais atteint.
**Fix** : Utiliser `$execution.id` comme cle unique par execution.
```javascript
const execId = ($execution && $execution.id) ? $execution.id : ('fallback_' + Date.now());
const retryKey = 'repair_' + execId;
const currentCount = (staticData[retryKey] || 0) + 1;
staticData[retryKey] = currentCount;
if (currentCount > MAX_REPAIRS) {
  delete staticData[retryKey];
  return [{ json: { needs_repair: false, retry_exhausted: true } }];
}
```
**Fichier impacte** : `n8n/live/quantitative.json` — node "SQL Error Handler (Self-Healing)"

---

### FIX-03 — SQL Validator fallback SQL sans FROM
**Session** : 16 (2026-02-18)
**Pipeline** : Quantitative
**Symptome** : SQL Executor TOUJOURS en erreur meme avec SQL "simple". `Unexpected token WHERE`.
**Root cause** : Quand le LLM timeout/rate-limit, SQL Validator genere un fallback : `SELECT 'error' as status WHERE tenant_id = 'ci' LIMIT 1`. PostgreSQL reject : pas de clause FROM → syntax error → SQL Executor port[1] error → declenche boucle reparation.
**Fix** : Retirer `WHERE tenant_id = '...'` de tous les fallbacks SELECT literals (4 patterns).
```javascript
// AVANT (casse)
"SELECT 'SQL_GENERATION_ERROR: ...' as error_message WHERE tenant_id = 'ci' LIMIT 1"
// APRES (correct)
"SELECT 'SQL_GENERATION_ERROR: ...' as error_message, 'error' as status LIMIT 1"
```
**Fichier impacte** : `n8n/live/quantitative.json` — node "SQL Validator (Shield #1)"

---

### FIX-04 — Jina Embedding JSON Trailing Comma
**Session** : 8 (2026-02-12)
**Pipeline** : Standard + Graph
**Symptome** : `SyntaxError: Unexpected token` dans le noeud Jina embedding apres migration Cohere→Jina.
**Root cause** : Le JSON body envoye a Jina avait une trailing comma : `{"texts": [...],}` → JSON invalide.
**Fix** : Retirer la virgule trailing du body JSON dans le noeud HTTP Request Jina.
**Fichier impacte** : `n8n/live/standard.json` et `graph.json` — noeud Jina embedding

---

### FIX-05 — Task Broker TTL 15s→120s
**Session** : 8 (2026-02-12)
**Symptome** : n8n s'arrete avec `Grant token expired` apres quelques secondes d'inactivite sur la VM lente (970MB RAM, swap frequent).
**Root cause** : `task-broker-auth.service.js` a un TTL de 15s pour les grant tokens. La VM swap si peu de RAM → les workers mettent plus de 15s a repondre → tokens expires → n8n crash.
**Fix** : Monter un patch via Docker volume : TTL 15s→120s dans le fichier source n8n.
```yaml
# docker-compose.yml
volumes:
  - ./patches/task-broker-auth.service.js:/usr/local/lib/node_modules/n8n/node_modules/...
```
**Fichier impacte** : `n8n/patches/task-broker-auth.service.js` (volume monte)

---

### FIX-06 — Credentials manquantes apres migration Cloud→Docker
**Session** : 15 (2026-02-16)
**Symptome** : 12/13 workflows en erreur `Credential with ID "xxx" does not exist`.
**Root cause** : Migration n8n Cloud → n8n Docker self-hosted. Les credentials Cloud ne sont PAS migrees automatiquement. Chaque workflow reference des IDs d'anciennes credentials Cloud inexistantes dans Docker.
**Fix** :
1. Creer les credentials dans n8n Docker via API ou UI
2. Re-mapper tous les workflows via script Python : parcourir chaque node, remplacer les vieux IDs par les nouveaux.
```python
# Pattern fix credentials
for node in wf['nodes']:
    if 'credentials' in node:
        for cred_type, cred_ref in node['credentials'].items():
            if cred_ref['id'] == OLD_CRED_ID:
                cred_ref['id'] = NEW_CRED_ID
                cred_ref['name'] = NEW_CRED_NAME
```
**Credentials creees** : `Supabase Postgres (Pooler)` (ID: `USU8ngVzsUbED3mn`), Redis (`CWih07lwPxfwFeY6`)
**Fichier impacte** : Tous les workflows n8n — mappes via script

---

### FIX-07 — Neo4j URL bolt://localhost → HTTPS API
**Session** : 17 (2026-02-18)
**Pipeline** : Graph
**Symptome** : Graph RAG a 68.7% malgre 19,788 nodes dans Neo4j. Le pipeline "passe" mais n'utilise jamais le graphe.
**Root cause** : `Shield #4: Neo4j Guardian Traversal` configure avec `url: "bolt://localhost:7687"`. n8n HTTP Request node ne parle pas le protocole Bolt binaire → erreur silencieuse → `Validate Neo4j Results` retourne `skip_graph: true` → pipeline fallback sur Pinecone uniquement.
**Fix** : Changer l'URL vers l'API HTTP Neo4j Aura + ajouter Basic auth header.
```
url: https://38c949a2.databases.neo4j.io/db/neo4j/query/v2
Authorization: Basic <base64(neo4j:PASSWORD)>
```
**Fix via n8n API** : Payload minimal requis (name + nodes + connections + settings uniquement).
**Fichier impacte** : `n8n/live/graph.json` — node "Shield #4: Neo4j Guardian Traversal"

---

### FIX-08 — Quantitative live workflow vide (0 nodes)
**Session** : 17 (2026-02-18)
**Pipeline** : Quantitative
**Symptome** : HTTP 500 sur toutes les requetes quantitative. `Schema Introspection: Credential does not exist`.
**Root cause** : Le workflow live dans n8n avait 0 nodes (workflow casse/vide). La version sur disque (`n8n/live/quantitative.json`) avait 25 nodes depuis 2026-02-10 mais referençait credential `zEr7jPswZNv6lWKu` inexistante.
**Fix en 2 etapes** :
1. Re-pousser le fichier disque vers n8n via PUT API (restaurer les 25 nodes)
2. Mapper les credentials postgres vers l'ID correct existant dans ce n8n Docker
**Payload PUT minimal** : `{name, nodes, connections, settings, staticData}` (rejette `isArchived`, `versionCounter`, `activeVersionId`)
**Fichier impacte** : `n8n/live/quantitative.json`

---

### FIX-09 — n8n API PUT 400 "additional properties"
**Session** : 17 (2026-02-18)
**API** : `PUT /api/v1/workflows/{id}`
**Symptome** : `400: request/body must NOT have additional properties` lors du PUT workflow.
**Root cause** : Le body PUT inclut des champs read-only que n8n refuse : `isArchived`, `versionCounter`, `activeVersionId`, `homeProject`, `sharedWithProjects`, `tags`.
**Fix** : Utiliser un payload minimal :
```python
clean = {
    'name': wf['name'],
    'nodes': wf['nodes'],
    'connections': wf['connections'],
    'settings': {k: v for k, v in wf.get('settings', {}).items()
                 if k in {'executionOrder', 'callerPolicy', 'saveManualExecutions', 'saveExecutionProgress'}},
    'staticData': wf.get('staticData')
}
```
**Note** : Les anciens champs a filtrer : `id`, `createdAt`, `updatedAt`, `active`. Les nouveaux aussi : `isArchived`, `versionCounter`, `activeVersionId`, `homeProject`, `sharedWithProjects`.

---

### FIX-10 — CI Timeout quantitative (300s × 2q = 10min)
**Session** : 16 (2026-02-18)
**Pipeline** : Quantitative CI (GitHub Actions)
**Symptome** : CI job timeout a 10 minutes. Quantitative 0/2.
**Root cause** : Combinaison FIX-01 + FIX-03 : boucle infinie de reparation SQL (FIX-01) + SQL toujours en erreur (FIX-03) → chaque question attend le timeout 300s de n8n.
**Fix** : Appliquer FIX-01 + FIX-02 + FIX-03 ensemble.
**CI file** : `rag-tests-docker-compose.yml`

---

### FIX-11 — Init & ACL multi-format (support orchestrateur)
**Session** : 14 (2026-02-15)
**Pipelines** : Quantitative + Graph
**Symptome** : Pipelines echouent quand appeles via l'orchestrateur (format d'entree different).
**Root cause** : Init & ACL ne supportait que le format webhook direct (`body.query`). L'orchestrateur envoie `task_query` ou `current_task.query`.
**Fix** : Init & ACL hardened V2.2 — 5 sources de query supportees :
```javascript
// Priorite 1: Direct query (webhook/chat)
// Priorite 2: chatInput
// Priorite 3: task_query (orchestrateur)
// Priorite 4: current_task.query
// Priorite 5: query object (stringify)
```
**Fichier impacte** : `n8n/live/quantitative.json` et `graph.json` — node "Init & ACL"

---

### FIX-12 — Migration Cohere 1536d → Jina 1024d
**Session** : 7 (2026-02-11)
**Symptome** : Pinecone rejet des vecteurs (dimension mismatch).
**Root cause** : Index Pinecone cree avec Cohere 1536 dimensions. Migration vers Jina embeddings-v3 = 1024 dimensions → incompatibles.
**Fix** : Creer nouveau index `sota-rag-jina-1024` (dim=1024). Reingerer 10,411 vecteurs. Mettre a jour tous les workflows.
**Index actuel** : `sota-rag-jina-1024` (primary), `sota-rag-cohere-1024` (backup/archive)

---

## PIEGES RECURRENTS (a verifier en premier)

| Piege | Symptome | Verification rapide |
|-------|----------|---------------------|
| Credential manquante | HTTP 500 / "Credential does not exist" | `curl n8n/api/v1/credentials` |
| Workflow vide (0 nodes) | HTTP 500 immediat | `analyze_n8n_executions.py --limit 1` |
| Task runner isolation | $getWorkflowStaticData ne persiste pas | Verifier N8N_RUNNERS_ENABLED=false |
| Bolt protocol | Graph skip_graph=true silencieux | Verifier URL Neo4j = https:// |
| PUT 400 | "additional properties" | Utiliser payload minimal (FIX-09) |
| SQL sans FROM | "Unexpected token WHERE" | Verifier fallbacks SQL Validator |
| LLM rate-limit | "Unable to generate SQL" en CI | Timeout LLM 25s→60s |
| Pinecone dim mismatch | 400 on upsert | Verifier index = sota-rag-jina-1024 |

---

## PROCEDURE DE DEBUG RAPIDE

```
1. Consulter cette bibliotheque → symptome connu ?
2. python3 eval/quick-test.py --questions 1 --pipeline <target>
3. python3 scripts/analyze_n8n_executions.py --pipeline <target> --limit 1
4. Identifier le node en erreur → chercher dans INDEX
5. Appliquer le fix → tester 5/5 → commit + push
6. Documenter le nouveau fix ici si nouveau
```
