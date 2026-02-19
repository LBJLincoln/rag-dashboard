# LLM Models & Fallback Architecture — OpenRouter Free Tier

> Last updated: 2026-02-20T00:30:00+01:00

> **Ce document est la reference unique pour les modeles LLM et leurs fallbacks.**
> Il couvre les limites de l'API, les modeles deployes, les alternatives testees, et la strategie de resilience.

---

## 1. RATE LIMITS OPENROUTER (Free Tier, fevrier 2026)

### Limites par compte

| Limite | Sans credits ($0) | Avec credits ($10+) |
|--------|-------------------|---------------------|
| **Requetes/minute (RPM)** | 20 RPM | **20 RPM** (inchange) |
| **Requetes/jour (RPD)** | 50 RPD | **1,000 RPD** |
| **Requetes/seconde (RPS)** | ~1 RPS | $1 = 1 RPS (max 500) |

**IMPORTANT** : Le RPM est un plafond dur. Acheter des credits ne l'augmente PAS.
Seul le RPD (par jour) est augmente.

### Limites par modele

Chaque modele `:free` a son propre compteur RPM. Utiliser 3 modeles en rotation
donne effectivement 60 RPM combines (3 x 20 RPM).

**Exception** : DeepSeek V3 0324 pourrait etre limite a 10 RPM (source non confirmee).

### Impact sur nos pipelines

| Pipeline | Calls LLM/question | RPM necessaire | Risque 429 |
|----------|---------------------|----------------|------------|
| Standard | 1 (HyDE) | 1/question | Faible |
| Graph | 1 (community synthesis) | 1/question | Faible |
| Quantitative | 2-3 (SQL gen + validation + interpretation) | 3/question | **ELEVE** |
| Orchestrator | 1-2 (intent + delegation) | 2/question | Moyen |

A 20 RPM, le Quantitative peut traiter max **7 questions/minute** (20/3).
Avec rotation 3 modeles : **20 questions/minute**.

---

## 2. MODELES DEPLOYES (en production)

### Modeles actifs (OpenRouter Free Tier)

| Variable Env | Modele ID | Params | Context | Role | Rate Limit |
|--------------|-----------|--------|---------|------|------------|
| `LLM_SQL_MODEL` | `meta-llama/llama-3.3-70b-instruct:free` | 70B | 128K | SQL generation | 20 RPM |
| `LLM_FAST_MODEL` | `google/gemma-3-27b-it:free` | 27B | 8K | Classification rapide | 20 RPM |
| `LLM_INTENT_MODEL` | Llama 70B | 70B | 128K | Intent classification | 20 RPM |
| `LLM_PLANNER_MODEL` | Llama 70B | 70B | 128K | Task planning | 20 RPM |
| `LLM_AGENT_MODEL` | Llama 70B | 70B | 128K | Agent reasoning | 20 RPM |
| `LLM_HYDE_MODEL` | Llama 70B | 70B | 128K | HyDE queries | 20 RPM |
| `LLM_EXTRACTION_MODEL` | `arcee-ai/trinity-large-preview:free` | ~7B | 32K | Entity extraction | 20 RPM |
| `LLM_COMMUNITY_MODEL` | Trinity | ~7B | 32K | Community summaries | 20 RPM |
| `LLM_LITE_MODEL` | `google/gemma-3-27b-it:free` | 27B | 8K | Lightweight tasks | 20 RPM |

**Probleme** : 6 variables pointent vers Llama 70B → toutes partagent le MEME compteur RPM de 20.
Quand le Quantitative fait 3 calls Llama + le Standard fait 1 call Llama = 4 calls/question
→ rate limit atteint apres 5 questions en parallele.

---

## 3. MODELES ALTERNATIFS (testes ou identifies)

### Classement pour SQL generation

| Rang | Modele | ID OpenRouter | Params | SQL capability | Note |
|------|--------|---------------|--------|---------------|------|
| 1 | **Qwen 2.5 Coder 32B** | `qwen/qwen-2.5-coder-32b-instruct:free` | 32B | **Excellent** (HumanEval ~85%) | Specialise code, meilleur que Llama pour SQL |
| 2 | **DeepSeek V3 0324** | `deepseek/deepseek-chat-v3-0324:free` | 685B MoE | **Tres bon** | Raisonnement complexe, peut-etre 10 RPM |
| 3 | **Qwen3 235B** | `qwen/qwen3-235b-a22b:free` | 235B (22B actifs) | **Bon** | MoE, bon benchmark SQL, thinking mode |
| 4 | **Mistral Small 3.1** | `mistralai/mistral-small-3.1-24b-instruct:free` | 24B | Correct | Multilingue, function calling, pas specialise SQL |
| 5 | **Llama 3.3 70B** | `meta-llama/llama-3.3-70b-instruct:free` | 70B | Correct | Actuel, 80% accuracy SQL |

### Nouveaux modeles a surveiller (fevrier 2026)

| Modele | ID | Interet |
|--------|-----|---------|
| Llama 4 Scout | `meta-llama/llama-4-scout:free` | 512K context, nouveau |
| DeepSeek R1 | `deepseek/deepseek-r1:free` | Chain-of-thought pour SQL planning |
| Qwen3 Coder | `qwen/qwen3-coder:free` | 480B MoE, code specialist |
| Devstral 2 | `mistralai/devstral-2:free` | 262K context, code specialist |

---

## 4. STRATEGIE DE FALLBACK (RECOMMANDEE)

### Architecture de fallback par pipeline

```
QUANTITATIVE PIPELINE — SQL Generation
  Primary   : qwen/qwen-2.5-coder-32b-instruct:free   (HumanEval 85%)
  Fallback 1: deepseek/deepseek-chat-v3-0324:free      (685B MoE)
  Fallback 2: meta-llama/llama-3.3-70b-instruct:free   (actuel)
  Fallback 3: Template SQL (bypass LLM)

ORCHESTRATOR — Intent Classification
  Primary   : google/gemma-3-27b-it:free               (rapide, 8K context)
  Fallback 1: meta-llama/llama-3.3-70b-instruct:free   (plus lent)
  Fallback 2: arcee-ai/trinity-large-preview:free       (petit mais fonctionnel)

STANDARD — HyDE Generation
  Primary   : meta-llama/llama-3.3-70b-instruct:free   (bon pour HyDE)
  Fallback 1: qwen/qwen3-235b-a22b:free                (meilleur raisonnement)

GRAPH — Community Synthesis
  Primary   : arcee-ai/trinity-large-preview:free       (rapide, suffisant)
  Fallback 1: google/gemma-3-27b-it:free                (backup)
```

### Implementation dans entrypoint.sh

```bash
# Variables de fallback (ajoutees dans entrypoint.sh)
export LLM_SQL_MODEL="${LLM_SQL_MODEL:-qwen/qwen-2.5-coder-32b-instruct:free}"
export LLM_SQL_FALLBACK1="${LLM_SQL_FALLBACK1:-deepseek/deepseek-chat-v3-0324:free}"
export LLM_SQL_FALLBACK2="${LLM_SQL_FALLBACK2:-meta-llama/llama-3.3-70b-instruct:free}"
```

### Implementation dans le workflow n8n (Text-to-SQL Generator)

```javascript
// Dans le Code node du Text-to-SQL Generator :
const models = [
  $env.LLM_SQL_MODEL || 'qwen/qwen-2.5-coder-32b-instruct:free',
  $env.LLM_SQL_FALLBACK1 || 'deepseek/deepseek-chat-v3-0324:free',
  $env.LLM_SQL_FALLBACK2 || 'meta-llama/llama-3.3-70b-instruct:free',
];

for (const model of models) {
  try {
    const response = await callOpenRouter(model, prompt);
    if (response.status === 429) continue; // Try next model
    return response;
  } catch (e) {
    if (e.status === 429) continue;
    throw e;
  }
}
// Si tous les modeles echouent : fallback template SQL
return generateTemplateSql(query, schema);
```

---

## 5. STRATEGIES DE RESILIENCE

| Strategie | Effectivite | Complexite | Impact RPM |
|-----------|-------------|------------|------------|
| **Rotation de modeles** (3 modeles) | 3x RPM effectif | Faible | 60 RPM |
| **Acheter $10 credits** | RPD 50→1000 | Trivial | RPM inchange |
| **BYOK (Bring Your Own Key)** | Illimite pour le modele | Moyen | Depend du provider |
| **Retry avec backoff** | ~80% des 429 resolus | Deja fait | — |
| **Template SQL fallback** | Bypass LLM | Deja fait | 0 RPM |
| **neverError=true** | Empeche crash workflow | Deja fait | — |
| **Delai 8s entre questions** | Evite rate limit | Deja fait | — |

### Recommandations prioritaires

1. **IMMEDIAT** : Changer `LLM_SQL_MODEL` de Llama 70B vers Qwen 2.5 Coder 32B
   - Meilleur pour SQL (HumanEval 85% vs ~70%)
   - Pool RPM separe → pas de conflit avec les autres pipelines

2. **COURT TERME** : Implementer rotation 3 modeles dans le Code node Quantitative
   - 60 RPM combines
   - Zero downtime sur 429

3. **MOYEN TERME** : Acheter $10 credits OpenRouter
   - RPD 50→1000
   - Permet des eval runs de 200+ questions/jour

---

## 6. URLS ET CONFIGURATION

### URL de base OpenRouter
```
https://openrouter.ai/api/v1/chat/completions
```
**PIEGE** : L'URL DOIT inclure `/chat/completions`. Sans ca, retourne HTML (FIX-35).

### Headers requis
```
Authorization: Bearer sk-or-v1-...
Content-Type: application/json
HTTP-Referer: https://nomos-ai.com  (optionnel, pour analytics)
X-Title: Nomos-RAG  (optionnel)
```

### Body format
```json
{
  "model": "qwen/qwen-2.5-coder-32b-instruct:free",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "Generate SQL for: ..."}
  ],
  "temperature": 0.1,
  "max_tokens": 1024
}
```

### Detection et gestion des 429
```javascript
// Response body quand 429 :
// {"error":{"message":"Rate limit exceeded","type":"rate_limit_error"}}
// Headers utiles :
// x-ratelimit-remaining: 0
// x-ratelimit-reset: 1708300000 (unix timestamp)
// Retry-After: 3 (secondes)
```

---

## SOURCES

- [OpenRouter API Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [OpenRouter Free Models Collection](https://openrouter.ai/collections/free-models)
- [OpenRouter BYOK](https://openrouter.ai/docs/use-cases/byok)
- [BIRD SQL Benchmark](https://bird-bench.github.io/)
- [CostGoat 31 Free Models](https://costgoat.com/pricing/openrouter-free-models)
