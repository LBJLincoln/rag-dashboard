# Fixes Library — Multi-RAG Orchestrator

> Last updated: 2026-02-19T12:30:00+01:00

> **Bibliotheque permanente de tous les bugs resolus.** A consulter EN PREMIER avant tout debug.
> Mise a jour obligatoire apres chaque fix reussi. Session courante : Session 24 (2026-02-19).

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
| 13 | HF Space | Docker python3 manquant (node:20-bookworm-slim) | 24 | CRITIQUE |
| 14 | HF Space | n8n import:workflow format array vs objet | 24 | CRITIQUE |
| 15 | HF Space | HF proxy casse POST body pour /rest/ et /api/ | 24 | IMPORTANT |
| 16 | HF Space | n8n import:workflow toujours inactive + activation REST echoue | 24 | RESOLU par FIX-18 |
| 17 | HF Space | n8n 2.x login API emailOrLdapLoginId (pas email) | 24 | IMPORTANT |
| 18 | HF Space | SQLITE FK constraint — shared/activeVersion refs VM entities | 24 | CRITIQUE |
| 19 | HF Space | n8n 2.8+ activation requires publish (versionId) | 24 | CRITIQUE |
| 20 | HF Space | REST API not ready after healthz (timing) | 24 | IMPORTANT |
| 21 | n8n Infrastructure | Code node cache — PUT + Activate cycle obligatoire | 25 | CRITIQUE |
| 22 | Quantitative Pipeline | OpenRouter 429 rate-limit — retries + neverError + error serialization | 25 | CRITIQUE |
| 23 | Datasets | HuggingFace dataset IDs incorrects (6/11 faux) | 25 | IMPORTANT |
| 24 | n8n Infrastructure | N8N_RUNNERS_ENABLED deprecie dans n8n 2.7.4+ (toujours actif) | 25 | IMPORTANT |

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
| Task runner isolation | $getWorkflowStaticData ne persiste pas | Verifier N8N_RUNNERS_ENABLED=false (< 2.7 only) |
| Bolt protocol | Graph skip_graph=true silencieux | Verifier URL Neo4j = https:// |
| PUT 400 | "additional properties" | Utiliser payload minimal (FIX-09) |
| SQL sans FROM | "Unexpected token WHERE" | Verifier fallbacks SQL Validator |
| LLM rate-limit | "Unable to generate SQL" ou [object Object] | FIX-22: retries+neverError+typeof check |
| Pinecone dim mismatch | 400 on upsert | Verifier index = sota-rag-jina-1024 |
| Code node cache stale | Fixes presents dans JSON mais runtime ancien | FIX-21: PUT → Deactivate → Activate |
| HF dataset ID faux | "Invalid username or password" ou 404 | FIX-23: verifier avec hf_search_datasets |
| N8N_RUNNERS_ENABLED ignore | Log "Remove this env var" | FIX-24: deprecie n8n >= 2.7.4 |

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

---

### FIX-13 — Docker python3 manquant (node:20-bookworm-slim)
**Session** : 24 (2026-02-19)
**Composant** : HF Space Dockerfile
**Symptome** : Entrypoint utilise `python3 -c "..."` pour generer les credentials JSON et parser les reponses. `node:20-bookworm-slim` n'inclut PAS python3. Les commandes python echouent silencieusement (|| echo fallback).
**Cause racine** : Image Docker `node:20-bookworm-slim` minimaliste, pas de Python pre-installe.
**Fix** : Ajouter `python3` dans apt-get install du Dockerfile :
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates redis-server nginx python3 \
    && rm -rf /var/lib/apt/lists/*
```
**Impact** : TOUTES les operations Python dans l'entrypoint echouaient (credentials, cookie parsing, activation).

### FIX-14 — n8n import:workflow format array vs objet
**Session** : 24 (2026-02-19)
**Composant** : HF Space entrypoint
**Symptome** : `n8n import:workflow --input=file.json` echoue avec `workflows.map is not a function` quand le fichier contient un seul workflow (objet JSON `{...}`).
**Cause racine** : n8n 1.76.1 `import:workflow` attend un ARRAY `[{...}]`, pas un objet unique.
**Fix** : Merger tous les workflows en un seul array JSON avant import :
```python
all_wfs = []
for f in glob.glob('/app/n8n-workflows/*.json'):
    wf = json.load(open(f))
    all_wfs.append(wf)
json.dump(all_wfs, open('/tmp/all-workflows.json','w'))
```
Puis : `n8n import:workflow --input=/tmp/all-workflows.json`
**Note** : Avec n8n 2.8.3 (latest), l'import echoue aussi avec un message generique. Le format des workflows exportes depuis n8n 2.7.4 (VM) semble incompatible avec l'import CLI. Solution alternative : import via REST API depuis localhost apres demarrage n8n.

### FIX-15 — HF proxy casse POST body
**Session** : 24 (2026-02-19)
**Composant** : HuggingFace Spaces proxy
**Symptome** : Toute requete POST externe vers `/rest/` ou `/api/` retourne `Failed to parse request body`. Les webhooks `/webhook/` fonctionnent normalement.
**Cause racine** : Le proxy HuggingFace (nginx front) modifie/corrompt le body des requetes POST pour certains paths. C'est une limitation infrastructure HF, pas un bug n8n.
**Contournement** : Toute configuration POST (owner setup, login, activation) doit etre faite depuis LOCALHOST dans l'entrypoint, pas depuis l'exterieur.
**Impact** : REST API POST ne peut PAS etre utilisee depuis l'exterieur. Seuls les webhooks (GET+POST) fonctionnent.

### FIX-16 — n8n import:workflow toujours inactive + activation REST echoue (BLOQUANT)
**Session** : 24 (2026-02-19)
**Composant** : HF Space workflow activation
**Symptome** : `n8n import:workflow` importe les workflows comme INACTIFS (active=0), meme si le JSON a `active:true`. La commande affiche "Deactivating workflow X. Remember to activate later." L'activation via REST API PATCH echoue avec `Cannot read properties of undefined (reading 'description')`.
**Cause racine (n8n 1.76.1)** :
1. `import:workflow` force `active=0` par design
2. PATCH `/rest/workflows/{id}` avec `{"active":true}` echoue car n8n attend le workflow complet
3. PATCH avec le workflow complet (GET puis PATCH) echoue car certains node types ne sont pas resolus (`@n8n/n8n-nodes-langchain.chatTrigger` non installe), ce qui fait que `nodeType.description` est undefined
4. SQLite hack (`UPDATE workflow_entity SET active=1`) met le flag mais n8n ne registre PAS les webhooks pour les workflows actives par modification directe DB
**Cause racine (n8n 2.8.3 latest)** :
1. `import:workflow` echoue completement — format JSON des workflows exportes depuis n8n 2.7.4 (VM) incompatible avec le CLI import de n8n 2.8.3
2. Erreur generique sans details
**Etat actuel** : HF Space RUNNING avec n8n 2.8.3, 12 credentials OK, 0 workflows (import echoue)
**Solutions a tester (session 25)** :
1. **REST API import** : Apres demarrage n8n, utiliser `POST /rest/workflows` via localhost (cookie jar auth) pour creer les workflows un par un, puis activer. Pas de probleme de format CLI.
2. **Re-export workflows** : Depuis le n8n VM (2.7.4), exporter via `n8n export:workflow --all --output=/tmp/export.json` pour avoir un format compatible, puis copier vers HF Space
3. **Public API** : Utiliser l'API publique n8n `/api/v1/workflows` avec API key auth
4. **Installer @n8n/n8n-nodes-langchain** : `npm install -g @n8n/n8n-nodes-langchain` dans le Dockerfile pour resoudre les node types manquants

### FIX-17 — n8n 2.x login API change
**Session** : 24 (2026-02-19)
**Composant** : n8n REST API
**Symptome** : Login via `POST /rest/login` avec `{"email":"...","password":"..."}` retourne erreur `{"code":"invalid_type","path":["emailOrLdapLoginId"]}`.
**Cause racine** : n8n 2.x a renomme le champ `email` en `emailOrLdapLoginId` dans le body de login.
**Fix** :
```bash
# n8n 1.x
curl -d '{"email":"admin@mon-ipad.com","password":"..."}'
# n8n 2.x
curl -d '{"emailOrLdapLoginId":"admin@mon-ipad.com","password":"..."}'
```

---

### FIX-18 — SQLITE FK constraint: shared/activeVersion references VM entities
**Session** : 24 (2026-02-19)
**Composant** : HF Space n8n import:workflow (n8n 2.8.3)
**Symptome** : `n8n import:workflow` echoue avec `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`. Les credentials s'importent (12/12) mais 0 workflows.
**Cause racine** : Les workflow JSONs exportes depuis la VM (n8n 2.7.4) contiennent des champs FK-dependants :
- `shared` → reference `projectId` (JV7MbqBbWPTstXIo) et `userId` (215767e0-...) de la VM
- `activeVersion` → reference un historique de versions inexistant
- `activeVersionId` → FK vers `workflow_version` table
- `versionId` → FK vers version history

Dans la fresh DB du HF Space, ces entites n'existent pas → FK constraint violation.
**Fix** : Nettoyer les JSONs avant import — supprimer `shared`, `activeVersion`, `activeVersionId`, `versionId`, `versionCounter`.
```python
FK_FIELDS = ['shared', 'activeVersion', 'activeVersionId', 'versionId', 'versionCounter']
for field in FK_FIELDS:
    if field in wf:
        del wf[field]
```
**Verifie** : 9/9 workflows imported + activated (push 84d713a)
**REGLE** : Tout export n8n destine a un import CLI sur une fresh DB DOIT etre nettoye des FK fields.
**Fichier impacte** : `/tmp/hf-space-fix/entrypoint.sh` (HF Space repo)

---

### FIX-19 — n8n 2.8+ activation requires publish (versionId)
**Session** : 24 (2026-02-19)
**Composant** : HF Space n8n activation (n8n 2.8.3)
**Symptome** : `PATCH /rest/workflows/{id}` avec `active: true` retourne 200 mais `active` reste `false`. `POST /rest/workflows/{id}/activate` retourne 400 : `{"code":"invalid_type","path":["versionId"],"message":"Required"}`.
**Cause racine** : n8n 2.8+ a un systeme de versioning/publishing. Les workflows doivent etre "publies" (creant un `activeVersionId`) avant d'etre actives. Le PATCH `active:true` echoue silencieusement sans version publiee.
**Fix** : Utiliser `POST /rest/workflows/{id}/activate` avec le `versionId` du workflow (le draft version). L'endpoint publie ET active en une seule operation.
```python
# GET workflow pour obtenir versionId
wf = api_call('GET', f'/rest/workflows/{wf_id}')
version_id = wf['data']['versionId']
# POST /activate avec versionId
api_call('POST', f'/rest/workflows/{wf_id}/activate', {'versionId': version_id})
```
**Ordre critique** : Les orchestrators qui referent des sub-workflows doivent etre actives EN DERNIER.
**Verifie** : 9/9 workflows actives (push 5d5e6f0)
**Fichier impacte** : `/tmp/hf-space-fix/entrypoint.sh` (HF Space repo)

---

### FIX-20 — REST API not ready after healthz (n8n 2.8+ timing)
**Session** : 24 (2026-02-19)
**Composant** : HF Space n8n REST API
**Symptome** : `POST /rest/owner/setup` retourne `Cannot POST /rest/owner/setup` (Express 404) alors que `GET /healthz` retourne 200.
**Cause racine** : n8n 2.8.3 enregistre `/healthz` avant les routes `/rest/`. Un `sleep 3` apres healthz ne suffit pas.
**Fix** : Attendre que `GET /rest/settings` retourne 200 ou 401 (preuve que les routes REST sont enregistrees), avec retry.
```bash
for i in $(seq 1 30); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5678/rest/settings")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then break; fi
    sleep 2
done
```
**Verifie** : Owner setup + login reussissent au premier essai (push 371d23a)
**Fichier impacte** : `/tmp/hf-space-fix/entrypoint.sh` (HF Space repo)

---

### FIX-21 — n8n Code node cache invalidation (PUT + Activate cycle)
**Session** : 25 (2026-02-19)
**Composant** : n8n REST API + Task Runner
**Symptome** : Apres modification d'un Code node via `PUT /api/v1/workflows/{id}`, les changements sont presents dans le JSON (GET confirme), mais le runtime continue d'executer l'ANCIEN code. Exemple : `[object Object]` au lieu de `JSON.stringify($json.error)`.
**Cause racine** : n8n charge les workflows en memoire au demarrage. Un `PUT` ecrit dans PostgreSQL mais n'invalide PAS le cache en memoire du task runner. Meme un `docker compose restart n8n` ne suffit pas toujours car n8n relit la version DB au startup, mais le task runner peut conserver du code compile.
**Fix** : Apres tout PUT de Code nodes, effectuer un cycle PUT + Activate :
```bash
# 1. PUT le workflow modifie (sans champ 'active')
curl -X PUT -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" \
  -d @workflow.json "http://localhost:5678/api/v1/workflows/<ID>"

# 2. Desactiver (force deregistration des webhooks)
curl -X POST -H "X-N8N-API-KEY: $KEY" \
  "http://localhost:5678/api/v1/workflows/<ID>/deactivate"

# 3. Reactiver (force recompilation des Code nodes)
curl -X POST -H "X-N8N-API-KEY: $KEY" \
  "http://localhost:5678/api/v1/workflows/<ID>/activate"
```
**REGLE** : Un simple PUT ne suffit JAMAIS pour les Code nodes. Toujours faire PUT → Deactivate → Activate.
**Verifie** : Execution 2029 confirme les fixes actifs en runtime apres le cycle.
**Fichier impacte** : Tous les workflows avec des Code nodes modifies via API

---

### FIX-22 — OpenRouter 429 rate-limit dans Quantitative pipeline
**Session** : 25 (2026-02-19)
**Pipeline** : Quantitative
**Symptome** : `Unable to generate SQL query for this question. Error: [object Object]` — l'erreur apparait quand OpenRouter retourne HTTP 429 (rate-limit) ou 400 (JSON parsing failed) pour les modeles gratuits.
**Cause racine** : Les HTTP Request nodes (Text-to-SQL Generator, SQL Repair LLM) avaient :
- Timeout 25s (trop court pour modeles gratuits rate-limited)
- Retries 1 (insuffisant)
- `continueOnFail=false` (crash le workflow)
- SQL Validator ne verifie pas `$json.error` avant de parser `$json.choices`
- Response Formatter concatene `$json.error` (objet) avec string → `[object Object]`
**Fix** (4 modifications) :
```yaml
# 1. Text-to-SQL Generator + SQL Repair LLM : HTTP Request
timeout: 25000 → 60000
retry: maxTries 1 → 3, waitBetweenTries 5000ms
options.neverError: true
options.response.response.neverError: true

# 2. SQL Validator (Shield #1) : Code node — ajout early return
if ($json.error) {
  return {
    validated_sql: "SELECT 'LLM_RATE_LIMITED' as error_message LIMIT 1",
    validation_status: 'FAILED',
    validation_error: 'LLM_ERROR'
  };
}

# 3. Response Formatter : Code node — serialisation propre
interpretation = '...Error: ' + (typeof $json.error === 'object'
  ? JSON.stringify($json.error) : ($json.error || 'unknown'));

# 4. Prepare SQL Request : modele google/gemma-3-12b-it:free → $env.LLM_SQL_MODEL
```
**Verifie** : Execution 2029 — erreurs LLM correctement serialisees (pas de [object Object]).
**Note** : Ce fix ameliore la resilience mais ne resout PAS le probleme de fond (LLM rate-limit). Pour atteindre 85%, il faut des modeles avec quota suffisant ou ajouter des delais entre requetes.
**Fichier impacte** : `n8n/live/quantitative.json` — 4 nodes modifies

---

### FIX-23 — HuggingFace dataset IDs incorrects
**Session** : 25 (2026-02-19)
**Composant** : `datasets/scripts/download-sectors.py`
**Symptome** : 6 datasets sur 11 retournent `Invalid username or password` ou 404 car les HF IDs sont faux.
**Cause racine** : IDs mal orthographies ou namespaces inexistants dans download-sectors.py.
**Fix** : Corrections des IDs :
```python
# FINANCE
"sec_qa":              "jkung2003/sec-qa"      → "zefang-liu/secqa"
"financial_phrasebank": "takala/financial_phrasebank" → OK mais config requise: "sentences_allagree"

# JURIDIQUE
"eurlex":   "EurLex/eurlex"    → "NLP-AUEB/eurlex" (config: "eurlex57k")
"cail2018": "thunlp/cail2018"  → "china-ai-law-challenge/cail2018"

# BTP
"code_accord": "GT4SD/code-accord" → "ACCORD-NLP/CODE-ACCORD-Entities" + "ACCORD-NLP/CODE-ACCORD-Relations"
"ragbench_btp": "rungalileo/ragbench" → "galileo-ai/ragbench" (config: "techqa")
"docie": "Sygil/DocIE" → "sercetexam9/docie_test"

# INDUSTRIE
"manufacturing_qa": "thesven/manufacturing-qa-gpt4o" → "karthiyayani/manufacturing-qa-v1"
"ragbench": "rungalileo/ragbench" → "galileo-ai/ragbench" (config: "emanual")
```
**REGLE** : Toujours verifier l'existence d'un dataset HF avec `mcp__huggingface__hf_search_datasets` AVANT de l'ajouter au script.
**Fichier impacte** : `datasets/scripts/download-sectors.py`

---

### FIX-24 — N8N_RUNNERS_ENABLED deprecie dans n8n 2.7.4+
**Session** : 25 (2026-02-19)
**Composant** : n8n Docker configuration
**Symptome** : Au demarrage n8n 2.7.4, le log affiche : `N8N_RUNNERS_ENABLED -> Remove this environment variable; it is no longer needed.` Les task runners sont toujours actifs malgre `N8N_RUNNERS_ENABLED=false`.
**Cause racine** : A partir de n8n 2.7.4, les task runners sont TOUJOURS actifs. La variable `N8N_RUNNERS_ENABLED` est depreciee et ignoree. Les Code nodes s'executent TOUJOURS dans un subprocess isole (JS Task Runner).
**Impact sur FIX-01** : FIX-01 (`N8N_RUNNERS_ENABLED=false`) reste VALIDE pour les versions de n8n < 2.7 (utilisees dans rag-tests Codespace). Pour la VM (n8n 2.7.4), cette variable est ignoree.
**Contournement VM** : Utiliser FIX-05 (Task Broker TTL 15s→120s) pour eviter les expirations de tokens sur la VM lente. Les task runners ne peuvent pas etre desactives.
**REGLE** : Pour n8n >= 2.7.4, ne PAS compter sur N8N_RUNNERS_ENABLED. Les Code nodes tournent toujours en isolation. `$getWorkflowStaticData` peut ne pas fonctionner comme attendu entre iterations.
**Fichier impacte** : `/home/termius/n8n/docker-compose.yml` (variable presente mais ignoree)
