# Knowledge Base — Cerveau Persistant Multi-RAG

> Last updated: 2026-02-19T23:20:00+01:00
> **Ce document est VIVANT.** Il s'enrichit a CHAQUE session avec les solutions, patterns
> et connaissances techniques decouvertes. A lire EN PREMIER avec `fixes-library.md`.
> Objectif : ameliorer la performance de l'agent a chaque session.

---

## SECTION 0 — QUICK REFERENCE (CONSULTER AVANT TOUT TEST)

> **REGLE ABSOLUE** : Avant chaque curl/webhook test, verifier cette section.
> Ne JAMAIS deviner un webhook path, un field name, ou une methode d'auth.

### 0.1 Webhook Paths — Pipelines RAG (VM localhost:5678)

| Pipeline | Workflow ID | Webhook Path | Field Name | Methode |
|----------|-------------|--------------|------------|---------|
| **Standard** | `TmgyRP20N4JFd9CB` | `/webhook/rag-multi-index-v3` | `query` | POST |
| **Graph** | `6257AfT1l4FMC6lY` | `/webhook/ff622742-6d71-4e91-af71-b5c666088717` | `query` | POST |
| **Quantitative** | `e465W7V9Q8uK6zJE` | `/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9` | `query` | POST |
| **Orchestrator** | `aGsYnJY9nNCaTM82` | `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0` | `query` | POST |

### 0.2 Format d'appel standard

```bash
# TOUJOURS utiliser 'query' (jamais 'question')
curl -s -X POST "http://localhost:5678/webhook/<PATH>" \
  -H "Content-Type: application/json" \
  -d '{"query": "votre question ici"}'

# Avec formatage JSON
curl -s -X POST "http://localhost:5678/webhook/<PATH>" \
  -H "Content-Type: application/json" \
  -d '{"query": "votre question ici"}' | python3 -m json.tool
```

### 0.3 n8n API Authentication (VM)

```bash
# L'API publique n8n sur la VM n'a PAS de cle API configuree.
# Methode 1 : MCP n8n (prefere — mais parfois vide sous pression memoire)
# Methode 2 : PostgreSQL direct
docker exec n8n-postgres-1 psql -U n8n -d n8n -t -A -c "SELECT ..."
# Methode 3 : Si besoin API REST, creer une API key dans l'UI n8n
# JAMAIS utiliser Authorization: Bearer ou X-N8N-API-KEY sans avoir verifie que la cle existe
```

### 0.4 Protocole de pre-vol AVANT tout test

```
CHECKLIST PRE-TEST :
[ ] 1. Webhook path verifie dans Section 0.1 ci-dessus
[ ] 2. Field name = 'query' (pas 'question')
[ ] 3. Content-Type: application/json
[ ] 4. n8n est up : curl -s http://localhost:5678/healthz
[ ] 5. Workflow est actif : docker exec n8n-postgres-1 psql -U n8n -d n8n -t -A -c "SELECT active FROM workflow_entity WHERE id = '<ID>';"
```

---

## TABLE DES MATIERES

0. [Quick Reference — Pre-vol](#section-0--quick-reference-consulter-avant-tout-test)
1. [Modeles LLM — Catalogue & Comportement](#1-modeles-llm)
2. [Patterns de Resolution — Solutions Recurrentes](#2-patterns-de-resolution)
3. [n8n — Pieges & Best Practices](#3-n8n-pieges--best-practices)
4. [APIs Externes — Limites & Contournements](#4-apis-externes)
5. [Databases — Schemas & Requetes Connues](#5-databases)
6. [Evaluation — Methodologie & Interpretation](#6-evaluation)
7. [Infrastructure — Contraintes & Optimisations](#7-infrastructure)

---

## 1. MODELES LLM

### 1.1 Catalogue des modeles deployes (OpenRouter Free Tier)

| Modele | ID OpenRouter | Params | Context | Forces | Faiblesses | Rate Limit |
|--------|---------------|--------|---------|--------|------------|------------|
| **Llama 3.3 70B** | `meta-llama/llama-3.3-70b-instruct:free` | 70B | 128K | SQL generation, reasoning multi-step, planning | Rate-limit frequent (429), parfois JSON malformé | ~20 req/min |
| **Gemma 3 27B** | `google/gemma-3-27b-it:free` | 27B | 8K | Classification rapide, routing, reponses courtes | Contexte court (8K), pas ideal pour SQL complexe | ~20 req/min |
| **Trinity Large** | `arcee-ai/trinity-large-preview:free` | ~7B | 32K | Extraction entites, summaries, structured output | Raisonnement limite, pas pour SQL | ~20 req/min |

### 1.2 Modeles candidats (testes ou identifies, pas deployes)

| Modele | ID OpenRouter | Params | Context | Potentiel | Note |
|--------|---------------|--------|---------|-----------|------|
| **Qwen 3 235B** | `qwen/qwen3-235b-a22b:free` | 235B (22B actifs) | 40K | Meilleur SQL que Llama? A tester | MoE, gratuit, bon benchmark SQL |
| **Qwen 2.5 Coder 32B** | `qwen/qwen-2.5-coder-32b-instruct:free` | 32B | 32K | SQL + code generation | Specialise code, pourrait etre meilleur que Llama pour SQL |
| **DeepSeek V3** | `deepseek/deepseek-chat-v3-0324:free` | 671B MoE | 128K | Raisonnement avance | Gros modele, peut etre lent |
| **Mistral Small 3.1** | `mistralai/mistral-small-3.1-24b-instruct:free` | 24B | 128K | Bon rapport taille/qualite | Contexte long, multilingue |

### 1.3 Matrice d'assignation Workflow x Modele

| Variable Env | Modele Actuel | Role | Workflow(s) | Alternatives Testees |
|--------------|---------------|------|-------------|---------------------|
| `LLM_SQL_MODEL` | Llama 70B | SQL generation | Quantitative | gemma-3-12b (trop faible), a tester: qwen3-235b |
| `LLM_FAST_MODEL` | Gemma 27B | Classification rapide | Orchestrator, Quantitative | — |
| `LLM_INTENT_MODEL` | Llama 70B | Intent classification | Orchestrator | — |
| `LLM_PLANNER_MODEL` | Llama 70B | Task planning | Orchestrator | — |
| `LLM_AGENT_MODEL` | Llama 70B | Agent reasoning | Orchestrator | — |
| `LLM_HYDE_MODEL` | Llama 70B | HyDE queries | Standard | — |
| `LLM_EXTRACTION_MODEL` | Trinity | Entity extraction | Enrichment | — |
| `LLM_COMMUNITY_MODEL` | Trinity | Community summaries | Graph | — |
| `LLM_FALLBACK_INTENT` | Trinity | Fallback intent | Orchestrator | — |
| `LLM_FALLBACK_AGENT` | Trinity | Fallback agent | Orchestrator | — |
| `LLM_LITE_MODEL` | Gemma 27B | Lightweight tasks | General | — |
| `LLM_CHUNKING_MODEL` | Trinity | Chunking | Ingestion | — |

### 1.4 Comportements observes par modele

#### Llama 3.3 70B
- **SQL generation** : Genere du SQL correct ~80% du temps. Echoue sur :
  - Requetes multi-tables avec JOIN complexes
  - Aggregations sur periodes (FY vs Q1-Q4) — confond souvent
  - Noms d'entites avec variantes (TechVision vs TechVision Inc)
- **Rate-limit** : ~20 req/min. Au-dela → 429. Retries 3x avec 8s wait fonctionne.
- **JSON output** : Parfois genere JSON invalide (trailing comma, single quotes).
  Contournement : parser avec try/catch + regex cleanup.
- **Timeout** : 25s trop court sous charge. 60-90s recommande.

#### Gemma 3 27B
- **Classification** : Excellente pour intent detection (standard/graph/quant/orchestrator)
- **Contexte court** : 8K tokens = probleme si le schema DB est long.
  Contournement : schema statique compact dans le prompt.
- **Rapidite** : ~2x plus rapide que Llama 70B en temps de reponse.

#### Trinity Large
- **Entity extraction** : Bonne pour NER structure (personnes, orgs, lieux).
- **Summaries** : Genere des community summaries coherents pour le Graph RAG.
- **Limite** : Pas fiable pour du raisonnement complexe ou du SQL.

### 1.5 Strategies de resilience LLM

| Strategie | Implementation | Impact |
|-----------|---------------|--------|
| **Retry avec backoff** | maxTries=3, waitBetweenTries=8000ms | Elimine ~80% des 429 |
| **neverError=true** | Sur les HTTP Request nodes n8n | Empeche le crash du workflow |
| **Rotation de modeles** | Alterner Llama/Qwen/Gemma par minute | Repartit la charge rate-limit |
| **Fallback cascade** | Primary → Fallback → Template SQL | Garantit toujours une reponse |
| **Template matching** | Bypass LLM pour questions simples (single metric + company + year) | +2pp accuracy |
| **Schema statique** | Prompt inclut schema compact pre-calcule | Reduit tokens, ameliore SQL |
| **Sample data in prompt** | Inclure 3-5 lignes de donnees reelles dans le prompt | Ancre les attentes du LLM |

### 1.6 Rate-Limit OpenRouter — Ce qu'on sait

- **Limite globale** : ~20 req/min par API key (tous modeles confondus)
- **429 response** : `{"error":{"message":"Rate limit exceeded","type":"rate_limit_error"}}`
- **Headers utiles** : `x-ratelimit-remaining`, `x-ratelimit-reset`
- **Contournement** : delai 8s entre requetes quantitatives (3 calls LLM par question)
- **Impact** : Le Quantitative fait 2-3 calls LLM par question (SQL gen + validation/repair + interpretation). A 20 req/min, max ~7 questions/minute.
- **Multi-key** : Possible d'avoir plusieurs API keys OpenRouter pour multiplier le quota (pas encore fait).

---

## 2. PATTERNS DE RESOLUTION

### 2.1 Pattern : "Le fix est la mais le runtime utilise l'ancien code"
**Symptome** : Code modifie via REST API, GET confirme le changement, mais le comportement runtime ne change pas.
**Solution** : Cycle PUT → Deactivate → Activate (FIX-21).
**Lecon** : n8n cache les Code nodes compiles en memoire. Un simple PUT ne recompile pas.

### 2.2 Pattern : "[object Object]" dans une reponse
**Symptome** : L'output contient `[object Object]` au lieu de details d'erreur.
**Cause** : JavaScript concatene un objet Error avec une string.
**Solution** : `typeof obj === 'object' ? JSON.stringify(obj) : obj`
**Prevention** : Toujours serialiser avec typeof check avant concatenation string.

### 2.3 Pattern : "SQL valide mais resultat faux"
**Symptome** : Le SQL s'execute sans erreur mais retourne une mauvaise valeur.
**Cause** : Le LLM genere un WHERE qui matche le mauvais enregistrement (ex: `company_name = 'TechVision'` au lieu de `'TechVision Inc'`).
**Solution** :
- Utiliser `ILIKE '%keyword%'` au lieu de `= 'exact match'`
- Inclure des sample data rows dans le prompt LLM
- SQL templates pour les patterns connus

### 2.4 Pattern : "HuggingFace dataset introuvable"
**Symptome** : `Invalid username or password` ou 404 lors du download.
**Cause** : HF ID incorrect (namespace/nom changes).
**Solution** : Toujours verifier avec `mcp__huggingface__hf_search_datasets` AVANT d'ajouter un dataset.
**Lecon** : Les HF IDs changent souvent (redirects, renames). 6/11 etaient faux en session 25.

### 2.5 Pattern : "Workflow n8n import echoue sur fresh DB"
**Symptome** : `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed`.
**Cause** : Les workflows exportes contiennent des FK vers des entites de la source DB (shared, activeVersion, versionId).
**Solution** : Strip FK fields avant import (FIX-18).

### 2.6 Pattern : "Variable d'environnement inaccessible dans Code node"
**Symptome** : `access to env vars denied` dans un Code node n8n.
**Cause** : Task runners (n8n >= 2.7.4) isolent les Code nodes. `$env.VAR` fonctionne mais `process.env.VAR` non.
**Solution** : Utiliser `$env.VAR_NAME` (pas `process.env`). FIX-01/FIX-24.

### 2.7 Pattern : "Test passe en quick-test mais echoue en eval complete"
**Symptome** : 5/5 PASS en smoke test, mais accuracy basse en eval 50q+.
**Cause** : Quick-test utilise des questions "faciles" avec `expected_contains: ""` (vide).
L'eval complete a des expected values precises.
**Solution** : Toujours valider avec eval complete (50q minimum) avant de declarer un fix reussi.

### 2.9 Pattern : "Test webhook avec mauvais path ou field name"
**Symptome** : 404 "webhook not registered" ou VALIDATION_ERROR "query is required".
**Cause** : Webhook path tape de memoire (ou copie d'une ancienne session), ou field name incorrect (`question` au lieu de `query`).
**Solution** : TOUJOURS consulter Section 0.1 QUICK REFERENCE avant tout test.
**Frequence** : TRES ELEVEE — se reproduit presque chaque session.
**Prevention** : Ajouter un pre-flight check automatique dans les scripts eval.

### 2.11 Pattern : "n8n Task Runner execute l'ancien code malgre restart complet"
**Symptome** : Le code du Code node a ete mis a jour dans PostgreSQL (verifie via psql). n8n a ete redemarre (docker restart ou docker compose restart). Mais l'execution utilise toujours l'ANCIEN code.
**Cause** : Le Task Runner (subprocess isole, n8n >= 2.7.4) cache le code compile. Meme un redemarrage complet du container ne garantit PAS la recompilation. Le cycle PUT → Deactivate → Activate (FIX-21) ne fonctionne pas via PostgreSQL direct car il faut passer par l'API REST n8n qui n'a pas de cle API configuree sur la VM.
**Solution** : NE PLUS MODIFIER LES WORKFLOWS SUR LA VM. Modifier directement sur le HF Space n8n (16 GB RAM, API REST fonctionnelle, pas de cache issue car fresh import).
**Prevention** : Regle architecturale — VM = pilotage UNIQUEMENT. Modifications workflow = HF Space.

### 2.10 Pattern : "n8n REST API 401 — header required"
**Symptome** : `{"message":"'X-N8N-API-KEY' header required"}` lors d'appels REST API.
**Cause** : La VM n8n n'a pas de `N8N_PUBLIC_API_KEY` configuree dans Docker. L'API publique est activee (`N8N_PUBLIC_API_DISABLED=false`) mais sans cle.
**Solution** : Utiliser PostgreSQL direct (`docker exec n8n-postgres-1 psql ...`) ou MCP n8n.
**Prevention** : Section 0.3 QUICK REFERENCE — ne jamais tenter l'API REST sans verifier l'auth.

### 2.8 Pattern : "curl retourne 200 mais body vide"
**Symptome** : HTTP 200 mais pas de contenu dans la reponse.
**Cause** : n8n webhook retourne un array vide `[]` ou le workflow n'a pas de noeud Respond.
**Solution** : Verifier que le workflow a un noeud "Respond to Webhook" correctement configure.

---

## 3. N8N — PIEGES & BEST PRACTICES

### 3.1 Modification de workflows via API
```
PROCEDURE OBLIGATOIRE :
1. GET /api/v1/workflows/{id} → sauvegarder l'etat actuel
2. Modifier les nodes necessaires (1 node a la fois)
3. PUT /api/v1/workflows/{id} avec payload minimal (FIX-09)
4. POST /api/v1/workflows/{id}/deactivate
5. POST /api/v1/workflows/{id}/activate
6. Tester → 5/5 minimum
7. python3 n8n/sync.py → sauvegarder
```

### 3.2 Payload PUT minimal (n8n 2.7+)
```json
{
  "name": "...",
  "nodes": [...],
  "connections": {...},
  "settings": {
    "executionOrder": "v1",
    "callerPolicy": "workflowsFromSameOwner"
  },
  "staticData": null
}
```
Champs INTERDITS dans PUT : `id`, `createdAt`, `updatedAt`, `active`, `isArchived`, `versionCounter`, `activeVersionId`, `homeProject`, `sharedWithProjects`, `tags`.

### 3.3 n8n 2.7+ vs 2.8+ differences
| Feature | n8n 2.7.4 (VM) | n8n 2.8.3 (HF Space) |
|---------|----------------|----------------------|
| Task Runners | Toujours ON (env var ignore) | Toujours ON |
| **$env access** | **Bloque Code nodes** | **Bloque TOUS noeuds (FIX-33)** |
| Login API | `emailOrLdapLoginId` | `emailOrLdapLoginId` |
| Activation | PATCH active:true OK | Requires versionId (FIX-19) |
| Import CLI | Fonctionne (array format) | Echoue souvent (FK issues) |
| REST API | Stable | Stable apres warmup (FIX-20) |

### 3.5 $env interdit dans n8n 2.8+ (CRITIQUE — FIX-33)
```
n8n 2.8.3 Task Runner evalue TOUTES les expressions dans le sandbox.
$env est bloque pour TOUS les types de noeuds :
- Code nodes (typeVersion 2)
- HTTP Request (URL, headers, body expressions)
- Postgres nodes
- Tout noeud avec des expressions {{ }}

ERREUR RUNTIME : "access to env vars denied"
STACK : workflow-data-proxy-env-provider.js:59:27

SOLUTION : Ne JAMAIS utiliser $env dans les workflows n8n 2.8+.
Options :
1. Injecter les valeurs au moment de l'import (FIX-33, recommande)
2. Utiliser des credentials n8n (pour les secrets)
3. Hardcoder les valeurs dans le JSON du workflow

Le FIX-33 dans entrypoint.sh remplace $env.X par os.environ values
AVANT le JSON parsing, couvrant 30+ variables.
Script: fix-env-refs.py (standalone, appele depuis entrypoint.sh)
```

### 3.6 executeWorkflow retourne vide avec respondToWebhook (CRITIQUE — FIX-34)
```
Quand un workflow est appele via executeWorkflow (n8n Execute Workflow node),
et que le sub-workflow utilise respondToWebhook pour envoyer sa reponse :

PROBLEME : respondToWebhook envoie la reponse HTTP au client original
mais NE RETOURNE PAS les donnees au noeud executeWorkflow parent.
Resultat : data.main = [[]] (tableau vide).

CONSEQUENCE : Tout noeud en aval du executeWorkflow ne recoit aucun item
et ne s'execute jamais.

SOLUTION : Remplacer executeWorkflow par httpRequest POST vers le webhook
du sub-workflow. L'httpRequest recoit la reponse JSON normalement.
  - URL: http://localhost:5678/webhook/<path>
  - Method: POST
  - Body: { "query": "<task_query>" }
  - Timeout: 30000ms

REGLE : Ne JAMAIS utiliser executeWorkflow pour appeler un workflow
qui utilise respondToWebhook. Utiliser httpRequest a la place.
```

### 3.4 HTTP Request node — config recommandee
```json
{
  "timeout": 60000,
  "retry": { "maxTries": 3, "waitBetweenTries": 8000 },
  "options": { "response": { "response": { "neverError": true } } }
}
```

---

## 4. APIS EXTERNES

### 4.1 OpenRouter
- **URL** : `https://openrouter.ai/api/v1/chat/completions`
- **Auth** : `Authorization: Bearer sk-or-v1-...`
- **Rate limit** : ~20 req/min (free tier)
- **Erreurs courantes** :
  - 429 : Rate limit → retry avec backoff 8s
  - 400 : JSON parsing failed → verifier le body
  - 502/503 : Serveur temporairement indisponible → retry
- **Quota** : Illimite en requetes/jour, mais rate-limited par minute

### 4.2 Jina AI
- **Embeddings** : `https://api.jina.ai/v1/embeddings` (model: `jina-embeddings-v3`, dim 1024)
- **Reranker** : `https://api.jina.ai/v1/rerank` (model: `jina-reranker-v2-base-multilingual`)
- **Quota** : 10M tokens/mois (free)
- **Erreur courante** : `trailing comma` dans le JSON body (FIX-04)

### 4.3 Cohere
- **Reranker** : `https://api.cohere.ai/v1/rerank`
- **Status** : Trial QUASI-EPUISE. 2 keys, les deux proches de l'expiration.
- **Alternative** : Jina reranker est le primary maintenant.

### 4.4 Pinecone
- **Index primary** : `sota-rag-jina-1024` (dim=1024, free tier, 10,411 vecteurs)
- **Erreur courante** : Dimension mismatch si on envoie des vecteurs Cohere (1536d) vers un index Jina (1024d) (FIX-12)
- **Namespaces** : 12 ns actifs (squad, hotpotqa, musique, etc.)

### 4.5 Neo4j Aura
- **URL API** : `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2`
- **Auth** : Basic (neo4j:password)
- **PIEGE** : Le protocole bolt:// ne fonctionne PAS via HTTP Request n8n. Toujours HTTPS API (FIX-07).
- **Contenu** : 19,788 nodes, 76,717 relations

### 4.6 Supabase
- **URL** : `https://ayqviqmxifzmhphiqfmj.supabase.co`
- **Tables cles** : financials (24 rows), balance_sheet (12), sales_data (1152), employees (150), products (18)
- **Entreprises** : TechVision Inc, GreenEnergy Corp, HealthPlus Labs
- **Periodes** : FY 2020-2023, Q1-Q4 2023

### 4.7 HuggingFace
- **Datasets** : `trust_remote_code` deprecie dans les versions recentes de la lib `datasets`
- **Loading scripts** : Certains datasets (legalbench, eurlex, financial_phrasebank) utilisent des loading scripts depreciees → ne peuvent plus etre telecharges
- **Solution** : Chercher des alternatives Parquet-based (ex: galileo-ai/ragbench)

---

## 5. DATABASES

### 5.1 Schema Supabase — Quantitative Pipeline
```sql
-- Entreprises et periodes disponibles
SELECT DISTINCT company_name, fiscal_year, period FROM financials ORDER BY company_name, fiscal_year, period;
-- Resultat : 3 companies x (4 FY + 4 Q) = 24 rows

-- Colonnes financials les plus requetees
-- revenue, net_income, gross_profit, operating_income, research_development, diluted_eps, basic_eps

-- SQL pattern le plus fiable
SELECT metric FROM financials
WHERE company_name ILIKE '%keyword%' AND fiscal_year = YYYY AND period = 'FY'
LIMIT 1;
```

### 5.2 Neo4j — Entites Graph RAG
```cypher
// Types de noeuds
MATCH (n) RETURN DISTINCT labels(n), count(n) ORDER BY count(n) DESC;
// __Entity__ (7628), __Community__ (6143), Document (3176), Chunk (2841)

// Relations
MATCH ()-[r]->() RETURN type(r), count(r) ORDER BY count(r) DESC;
// RELATED_TO (57,000+), IN_COMMUNITY, HAS_ENTITY, etc.
```

### 5.3 Pinecone — Namespaces
```
sota-rag-jina-1024 : 10,411 vecteurs
  Namespaces: squad, hotpotqa, musique, nq, finqa, cuad, covidqa,
              pubmedqa, techqa, tatqa, emanual, doqa
```

---

## 6. EVALUATION

### 6.1 Interpretation des resultats
- **5/5 PASS en quick-test** ≠ pipeline OK. Les smoke questions sont faciles.
- **Accuracy evaluation** : Comparer `response` avec `expected_answer` via fuzzy matching.
- **Quantitative** : Les expected values sont des nombres precis. Meme une reponse "presque correcte" (mauvaise entreprise, mauvaise periode) est un FAIL.
- **Graph** : Les reponses sont souvent des phrases. Le matching cherche des keywords.

### 6.2 Causes de faux negatifs
- OpenRouter 429 → timeout → "Unable to generate SQL" → FAIL (pas une vraie erreur pipeline)
- n8n 503 transitoire → timeout → FAIL
- Matching trop strict (ex: "6.7 billion" vs "6,745,000,000")

### 6.3 Delais recommandes entre questions
| Pipeline | Delai | Raison |
|----------|-------|--------|
| Standard | 3s | Pas de LLM OpenRouter |
| Graph | 5s | 1 call LLM (community synthesis) |
| Quantitative | 8-10s | 2-3 calls LLM (SQL gen + interpretation + repair) |
| Orchestrator | 5s | 1-2 calls LLM (routing + delegation) |

---

## 7. INFRASTRUCTURE

### 7.1 VM Google Cloud — Contraintes
- **RAM** : 969 MB total, ~100 MB libre. Claude Code = ~280 MB. n8n = ~215 MB. Task runner = ~38 MB.
- **REGLE** : Jamais de tests lourds sur la VM. Pilotage UNIQUEMENT.
- **Swap** : ~1 GB utilise en permanence. Les operations memoire-intensives sont lentes.
- **Disque** : 30 GB, 17 GB libres. Les datasets sectoriels font ~27 MB total — OK.
- **PIEGE RECURRENT** : Les anciennes sessions Claude Code restent en memoire (PID zombie). Au demarrage de session : `ps aux | grep claude | grep -v grep` et killer les anciens PID. Chaque session = ~280 MB.
- **Nettoyage RAM** : `sync && echo 3 | sudo tee /proc/sys/vm/drop_caches` libere 20-50 MB de cache filesystem.

### 7.2 Session Claude Code — Limites
- **Duree max** : 2h par session pour conserver l'efficacite (eviter context overflow)
- **A 1h45** : finaliser les taches en cours, push, MAJ session-state.md et status.md
- **Avant /compact** : TOUJOURS s'assurer que tous les fichiers technicals/ sont a jour et pushes dans GitHub

### 7.2 HF Space — Capacites
- **RAM** : 16 GB (cpu-basic, $0)
- **n8n** : 2.8.3 (latest), SQLite, Redis
- **Limitation** : HF proxy casse les POST body pour /rest/ et /api/ (FIX-15)
- **Webhooks** : Fonctionnent normalement (Standard, Graph OK ; Quantitative 500 car manque Supabase data)

### 7.3 Codespaces — Quand les utiliser
| Scenario | Ou executer |
|----------|-------------|
| Quick-test 1-5q | HF Space (webhooks) |
| Eval 50q | Codespace rag-tests |
| Eval 200q+ | Codespace rag-tests (nohup) |
| Ingestion massive | Codespace rag-data-ingestion |
| Pilotage / monitoring | VM (ce repo) |

---

## HISTORIQUE DES AJOUTS

| Session | Ajouts | Date |
|---------|--------|------|
| 25 | Creation du document, modeles LLM, 8 patterns, APIs, schemas | 2026-02-19 |
| 27 | $env interdit tous noeuds (3.5), executeWorkflow vide (3.6) | 2026-02-19 |

---

> **REGLE** : Mettre a jour ce fichier IMMEDIATEMENT apres chaque decouverte technique.
> Pas en fin de session. PENDANT la session, des que la solution est confirmee.
