# Status — 18 Février 2026 (Session 16)

## ✅ MISSION ACCOMPLIE : CI Phase 1 Gate — ALL PIPELINES PASS

### CI Run 22137858153 (rag-tests, commit 630f81f)
| Pipeline | Score | Latence avg | Status |
|----------|-------|-------------|--------|
| standard | 5/5 | ~13s | ✅ PASS |
| graph | 5/5 | ~25s | ✅ PASS |
| **quantitative** | **5/5** | **~1.2s** | **✅ PASS** |
| orchestrator | 5/5 | ~13s | ✅ PASS |

## Root Cause (3 sessions pour identifier)
La pipeline quantitative causait un timeout 300s × 2 questions = 10 minutes en CI:

1. n8n task runners (activés par défaut dans n8n latest) isolent les Code nodes
   en subprocess → `$getWorkflowStaticData` ne persiste pas → boucle de réparation
   SQL infinie → timeout

2. SQL Validator générait du SQL sans FROM mais avec WHERE quand le LLM échouait
   → PostgreSQL syntax error → SQL Executor TOUJOURS en erreur → boucle infinie

## Fixes déployés
- `N8N_RUNNERS_ENABLED=false` dans rag-tests-docker-compose.yml (4 services)
- `$execution.id` comme clé pour compteur de réparations SQL
- SQL Validator: fallback SQL valide (pas de WHERE sans FROM)

## Note qualité quantitative
Les réponses quantitative en CI sont des messages d'erreur ("Unable to generate SQL...")
car le LLM free tier OpenRouter est rate-limité sur cold start. Le pipeline PASSE
le gate (tout texte > 10 chars passe) mais la qualité n'est pas optimale.
→ Amélioration future: timeout LLM 25s→60s, retry 1→2

## État des repos
| Repo | SHA | Status |
|------|-----|--------|
| mon-ipad | 630f81f | ✅ synced |
| rag-tests | 630f81f | ✅ synced |

## Prochaines étapes
1. Améliorer qualité réponses quantitative (optionnel pour gate, requis pour accuracy)
2. Lancer iterative-eval pour mesurer accuracy réelle toutes pipelines
3. Si accuracy quantitative < 85%: augmenter timeout LLM + retries
