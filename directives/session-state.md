# Session State — 17 Février 2026 (Session 12 → vérification complète + orchestration next session)

## Objectif de session
Session 12 : Correction urgente CPU VM + export Codespace rag-website + lecture nouveaux docs GitHub.

## Actions Session 12 (17 fév 2026)

### CPU Fix URGENT ✅
- **Problème** : Load average 7.82 sur 1 vCPU — `nextjs-website.service` (systemd user) tournait en permanence sur la VM
- **Processus tués** : npm exec next start / node next start (PIDs 274348, 274420, 274885)
- **Cause racine** : Service systemd user `nextjs-website.service` relançait le process après chaque kill
- **Fix** : `systemctl --user stop nextjs-website.service && systemctl --user disable nextjs-website.service`
- **Résultat** : Load average 0.59 (vs 7.82 avant) ✅
- **Note** : Next.js appartient au Codespace rag-website, PAS à la VM permanente

### Git sync ✅
- Commit local (diagnostics + n8n live) : `9c04352`
- Pull GitHub origin (fichier "new mardi17feb26" créé par user) : rebased + merged
- Push origin + rag-website : `769ee23` → synchro complète

### Codespace rag-website ✅
- Démarré via SSH : `nomos-rag-website-jr7q9gr69qqfqp6r` → Status: Available
- Code à jour sur rag-website GitHub remote (push `769ee23`)

### Nouveaux documents lus (GitHub uniquement)
1. **`new mardi17feb26`** : Modifications website + dashboard
   - Evals en direct, visuelles, gamifiées, interactives sur website ET dashboard
   - Description business = chatbot sectoriel connecté aux données enterprise → réponses sourcées + artefacts visuels
   - Kimi-code sur VM → vidéos use-case business pour les 4 secteurs
   - Style Apple MacBook Pro pour les 4 cases sectorielles
   - Dashboard : fenêtre glissante élégante, tests multi-repos, multi-instances n8n
2. **`am26`** : Architecture globale dashboard live
   - Executive summary transparent + phases/metrics + questions/réponses browsables
   - Gaming style pour progression itérations
   - Mode dark/light (Apple style toggle)
   - Terminal-style Q&A avec scores F1, temps, LLM utilisé
3. **`am7`** : Améliorations majeures structure
   - 1000 types de documents, 10 datasets techniques + 10 datasets recherche par secteur
   - Kimi Code installé sur VM (`/home/termius/.local/bin/kimi`) → à utiliser pour vidéos
   - Site business vs technique (potentiellement dupliquer)
   - Architecture de test parallèle à étudier

## État CPU/RAM VM (fin session)
- Load average : **0.59** (corrigé de 7.82)
- RAM : 757MB used / 970MB total (swap ~895MB)
- Swap élevé : normal avec 2 instances claude + n8n actif

## Livraisons Session 12 — Team-Agentic (17 fév 2026, 16h00-17h00)

### 10 agents parallèles lancés
| Agent | Résultat |
|-------|----------|
| Explore website | Audit 25 composants, 2441 LOC, architecture complète |
| Plan Apple redesign | Plan 20 fichiers, Apple MacBook B2B spec |
| UX B2B research | Brief FR/secteur, ROI chiffrés, EU AI Act 2025 |
| RAG 2026 research | arXiv papers, RouteRAG, RRF +18.5% MRR, GraphRAG 80% vs 50.83% |
| Dashboard gaming spec | SSE 500ms, XP 7 niveaux, react-window spec |
| Website implementation | ✅ 5 fichiers modifiés/créés |
| Dashboard implementation | ✅ 4 fichiers (PhaseExplorer 447L, QuestionViewer 432L, AccuracyTrend 438L) |
| Save research + commit | ✅ commit fa1093e |
| Kimi test | En attente résultat |
| Datasets 4 secteurs | En attente résultat |

### Commit principal : 2e5ac45
- 13 fichiers, 4066 insertions, 408 suppressions
- Pushé → origin + rag-website (Vercel deploy auto)

### Fichiers créés/modifiés
WEBSITE:
- Hero.tsx: titre enterprise statique, CTA anchor #secteurs
- SectorCard.tsx: ROI toujours visibles, Apple style
- CaseStudy.tsx: 3 cas clients FR (nouveau)
- Header.tsx: dark/light toggle
- globals.css: light mode complet

DASHBOARD:
- PhaseExplorer.tsx: gates animés, 5 phases collapsibles
- QuestionViewer.tsx: gaming log, streak, filtre
- AccuracyTrend.tsx: SVG pur, hover crosshair (nouveau)
- dashboard/page.tsx: sections toujours visibles

EVAL:
- quick-test.py: retry 503 exponentiel + sleep 3s

DOCS (technicals/):
- rag-research-2026.md
- website-redesign-plan.md

DOCS (directives/):
- ux-design-brief.md (brief design B2B français)

DOCS (docs/):
- eval-dashboard-spec.md (spec SSE gaming)

### Prochaines actions prioritaires
1. **Vercel build** : Vérifier que le déploiement rag-website réussit (TypeScript errors?)
2. **react-window** : Installer `npm install react-window` dans rag-website pour dashboard spec
3. **Datasets** : Attendre résultat agent a095c4a, sauvegarder dans technicals/
4. **Kimi** : Attendre résultat agent aabceb1
5. **Graph RAG fix** : Entity disambiguation Neo4j → de 68.7% vers 70% (objectif Phase 1)
6. **Quantitative fix** : CompactRAG pattern → de 78.3% vers 85% (objectif Phase 1)
7. **RouteRAG** : Ajouter classificateur query dans Orchestrator V10.1
8. **SSE 500ms** : Implémenter /api/eval/stream selon eval-dashboard-spec.md

## Architecture finale (DEFINITIVE)

### Principe Codespaces
- `devcontainer.json` = image-based UNIQUEMENT (PAS de dockerComposeFile)
- `docker-compose.yml` = fichier STANDALONE, démarré par `setup.sh` via `docker compose up -d`
- Évite que SSH atterrisse dans le mauvais container (bug précédent)

### Distribution par repo
| Repo | Exécution | n8n | Docker compose | Workflows |
|------|-----------|-----|---------------|-----------|
| **mon-ipad** | VM GCP e2-micro | Permanent (13 actifs) | Déjà en place | 4 RAG + 9 support |
| **rag-website** | Codespace | Local (démarré par setup.sh) | n8n + PG | Sectoriels |
| **rag-tests** | Codespace | Remote (VM via SSH tunnel) | Aucun | Aucun local |
| **rag-data-ingestion** | Codespace | Local (démarré par setup.sh) | n8n + 2 workers + PG + Redis | Ingestion V3.1 + Enrichissement V3.1 |
| **rag-dashboard** | Vercel / GH Pages | Aucun | Aucun | Aucun (read-only) |

## Tâches complétées cette session

### Phase A — Session 11b (Codespaces architecture)
- ✅ Token GitHub mis à jour sur les 5 remotes
- ✅ 4 devcontainer configs image-based
- ✅ docker-compose.yml standalone pour rag-website et rag-data-ingestion
- ✅ setup.sh démarre docker-compose + attend n8n + importe workflows + installe Claude Code
- ✅ scripts/deploy-codespaces.sh et scripts/sync-workflows.sh

### Phase B — Refactoring directives (17 fév)
- ✅ CLAUDE.md entièrement réécrit :
  - Section "CE QUE TU ES ET CE QUE TU FAIS PRÉCISÉMENT"
  - Section "INFRASTRUCTURE RÉELLE ET PRÉCISE" (VM specs, Docker, MCP, BDD, limites)
  - Rôles précis par repo avec directives/repos/ référencés
  - 20 règles d'or (dont RAM critique, directives repos)
- ✅ directives/repos/rag-tests.md (workflow-process adapté testeur)
- ✅ directives/repos/rag-website.md (objectif sectoriel, 20 datasets, recherche 2026)
- ✅ directives/repos/rag-data-ingestion.md (recherche papiers 2026 obligatoire, Ingestion V4)
- ✅ directives/repos/rag-dashboard.md (statique, read-only)
- ✅ scripts/push-directives.sh (push CLAUDE.md vers chaque repo satellite)
- ✅ directives/status.md mis à jour (session 11b + refactoring)

## Décisions prises
- Chaque repo a sa directive personnelle dans directives/repos/
- directives/repos/*.md = source → poussé comme CLAUDE.md dans chaque repo satellite
- rag-website : part de mon-ipad Phase 2, BDD SÉPARÉES, datasets sectoriels
- rag-data-ingestion : recherche papiers 2026 OBLIGATOIRE avant développement
- rag-tests : SSH tunnel vers VM, pas de n8n local
- rag-dashboard : statique, pas de Codespace

## État des workflows (VM)
| Workflow | ID | Active |
|----------|-----|--------|
| Orchestrator V10.1 | aGsYnJY9nNCaTM82 | ON |
| Standard RAG V3.4 | TmgyRP20N4JFd9CB | ON |
| Graph RAG V3.3 | 6257AfT1l4FMC6lY | ON |
| Quantitative V2.0 | e465W7V9Q8uK6zJE | ON |
| Dashboard Status API | KcfzvJD6yydxY9Uk | ON |
| Benchmark V3.0 | LKZO1QQY9jvBltP0 | ON |
| Monitoring Dashboard | tLNh3wTty7sEprLj | ON |
| Ingestion V3.1 | 15sUKy5lGL4rYW0L | ON |
| Enrichissement V3.1 | 9V2UTVRbf4OJXPto | ON |
| Feedback V3.1 | F70g14jMxIGCZnFz | ON |
| Dataset Ingestion | YaHS9rVb1osRUJpE | ON |

## État Phase 1 (inchangé)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) |
| Orchestrator | 80.0% | >= 70% | PASS |
| **Overall** | **78.1%** | **>= 75%** | **PASS** |

## Dernière action
Refactoring complet directives — CLAUDE.md + directives/repos/ (4 fichiers) + push-directives.sh

## Vérification Session 12 — État final ✅

### Infrastructure validée
- **VM** : Load 0.42, RAM 789MB/969MB, Swap 1175MB (normal) ✅
- **Docker** : n8n + redis + postgres — tous running ✅
- **n8n** : 13 workflows actifs ✅
- **Pinecone** : 4 indexes accessibles (sota-rag-jina-1024, sota-rag, sota-rag-cohere-1024, sota-rag-phase2-graph) ✅
- **Neo4j** : 19,788 nodes — accessible ✅
- **Supabase** : REST API accessible (table documents) ✅

### Sites de production
- **rag-website** : https://nomos-ai-pied.vercel.app — HTTP 200 ✅
- **rag-dashboard** : https://nomos-dashboard.vercel.app — HTTP 200 ✅
- **n8n externe** : http://34.136.180.66:5678/healthz — HTTP 200 ✅

### Codespaces
- `nomos-rag-website-jr7q9gr69qqfqp6r` — waked, Available ✅
- `nomos-rag-tests-5g6g5q9vjjwjf5g4` — waked, Starting ✅
- devcontainer.json image-based (universal:2) configuré ✅
- setup.sh : n8n + workflows importés (rag-website) / VM connectivity check (rag-tests) ✅

### Git sync (5 repos) — tous à 9ba942d ✅
- origin, rag-tests, rag-website, rag-dashboard, rag-data-ingestion : en sync

### Scripts créés
- `scripts/wake-codespaces.sh` : dashboard de démarrage rapide + wake Codespaces ✅

### Ce qui N'a PAS été fait (datasets)
- Les datasets HF ne sont PAS téléchargés (recherche seulement, pas d'ingestion)
- Tier 1 à ingérer la prochaine fois : jurisprudence, legi, financebench, ragbench, bsard

## Session 13 — Fixes pipelines + sécurité (17 fév 2026)

### Audit repo (agent a6ca5d6) ✅
- 13 incohérences corrigées : IDs workflows, Pinecone dim 1536→1024, Neo4j 76717, 11→13 workflows
- Commit 609f1e4

### Graph RAG fix (agent a587b8e) ✅
- Root cause : URL Neo4j `bolt://localhost:7687` invalide pour Neo4j Aura HTTPS
- Fix #1 : URL → `https://38c949a2.databases.neo4j.io/db/neo4j/query/v2`
- Fix #2 : HyDE temperature 0.7→0.1, max_tokens 800→400
- Graph v5 → v6
- RÉSULTAT : Neo4j maintenant appelé (latence 62s vs 40s) ✅ — vérification iterative-eval en attente

### Quantitative fix (agent aed7acb) ✅
- Root cause : `employees` table utilise `company_id` (pas `company_name`)
- Fix : SQL system prompt corrigé avec company_id + growth_rate formule
- Quantitative v7 → v9 (v8 cassé JS syntax, revert + safe fix)
- RÉSULTAT : fix appliqué — vérification iterative-eval en attente

### SSE Stream ✅
- `website/src/app/api/eval/stream/route.ts` : SSE endpoint 500ms polling
- `website/src/hooks/useSSEStream.ts` : client hook auto-reconnect

### Website + Dashboard ✅
- Apple B2B redesign : Hero, BentoGrid, HowItWorks, SectorCard, DashboardCTA, VideoModal
- Dashboard live : XPProgressionBar, FeedStatusBar, MilestoneNotification, QuestionRow, VirtualizedFeedList
- evalStore.ts (Zustand) + useEvalStream.ts

### SÉCURITÉ — Fuite secrets (résolu) ⚠️
- Commit c2c9c30 avait exposé : OpenRouter `sk-or-v1-fa3d327f...`, Pinecone `pcsk_6GzVdD_...`, Jina `jina_f134...`
- Cause : n8n/sync.py enregistre les diffs des paramètres (incluant clés API) dans docs/data.json
- Fix appliqué : redaction Python (6d66662) + push 5 remotes ✅
- ACTION REQUISE : Faire tourner les clés (OpenRouter, Pinecone, Jina) — clés exposées dans git history
- TODO : Patcher sync.py pour redacter les valeurs credentials avant écriture

### Commits Session 13
- 609f1e4 : fixes audit (11→13 workflows, IDs, dim)
- c2c9c30 : fixes pipelines Graph + Quant + SSE (contient secrets — remplacés en 6d66662)
- 6d66662 : redaction secrets data.json (SECURITY FIX)
- e3e7685 : website Apple redesign + dashboard live components

## État Phase 1 (après fixes — avant vérification)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASS ✅ |
| Graph | 68.7% | >= 70% | FAIL (-1.3pp) — fix appliqué, à vérifier |
| Quantitative | 78.3% | >= 85% | FAIL (-6.7pp) — fix appliqué, à vérifier |
| Orchestrator | 80.0% | >= 70% | PASS ✅ |
| **Overall** | **78.1%** | **>= 75%** | **PASS** ✅ |

## Codespaces
- `nomos-rag-website-jr7q9gr69qqfqp6r` — Shutdown (auto-sleep après 30min)
- `nomos-rag-tests-5g6g5q9vjjwjf5g4` — Shutdown (auto-sleep)
- Dashboard `nomos-status` webhook : non répondu → données potentiellement stale

## Prochaine action
1. **URGENT** : Rotater les clés API (OpenRouter, Pinecone, Jina) — git history exposé
2. **URGENT** : Patcher `n8n/sync.py` pour redacter credentials dans les diffs
3. **Graph RAG** : Lancer iterative-eval pour vérifier 68.7% → ≥70%
4. **Quantitative** : Lancer iterative-eval pour vérifier 78.3% → ≥85%
5. **Dashboard nomos-status** : Vérifier et corriger le webhook

## Dernière action
Redaction secrets docs/data.json + push 5 remotes → 6d66662 + e3e7685

## Repos impactés
- mon-ipad (origin) — tous commits
- rag-website — website/dashboard
- rag-tests, rag-dashboard, rag-data-ingestion — poussés (sync)

Workaround kimi: echo '{"mcpServers":{}}' > /tmp/empty-mcp.json && kimi --quiet --mcp-config-file /tmp/empty-mcp.json -p 'prompt'
