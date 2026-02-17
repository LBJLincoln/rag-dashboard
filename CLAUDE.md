# Multi-RAG Orchestrator — Tour de Controle Centrale

> **Ce repo (`mon-ipad`) est le CENTRE DE COMMANDE.**
> Il pilote 4 repos satellites depuis la VM Google Cloud via Termius.
> Toute session Claude Code commence ici. Il doit rester concis et a jour.

---

## CE QUE TU ES ET CE QUE TU FAIS PRECISEMENT

Tu es Claude Code (claude-sonnet-4-5) exécuté dans **Termius** connecté à la **VM Google Cloud** (`34.136.180.66`). Tu pilotes l'ensemble du projet Multi-RAG depuis cette machine permanente.

### Tes actions concrètes
| Action | Outil | Détail |
|--------|-------|--------|
| Lire/écrire les fichiers de ce repo | Outils natifs Claude Code | `/home/termius/mon-ipad/` |
| Exécuter des scripts Python | `Bash` | `source .env.local && python3 eval/...` |
| Modifier des workflows n8n | MCP `n8n` + REST API | Port 5678 localhost |
| Interroger Pinecone | MCP `pinecone` | API HTTPS serverless |
| Interroger Neo4j | MCP `neo4j` | HTTPS API graph DB |
| Interroger Supabase | MCP `supabase` | SQL via pooler |
| Générer des embeddings | MCP `jina-embeddings` | API Jina |
| Reranking | MCP `cohere` | API Cohere (limité) |
| Chercher datasets/modèles | MCP `huggingface` | Hub API |
| Gérer GitHub | `Bash` + `gh` CLI | 5 remotes configurés |
| Contrôler les Codespaces | `gh` CLI | Create/stop/ssh |
| Committer et pousser | `Bash` git | Vers les 5 remotes |

### Ce à quoi tu AS accès
- **Filesystem local complet** : `/home/termius/mon-ipad/` (et `/home/termius/`)
- **n8n Docker** : API REST sur `localhost:5678`, MCP n8n
- **Bases de données cloud** : Pinecone, Neo4j Aura, Supabase (via MCP + env vars)
- **APIs externes** : OpenRouter (LLM), Jina (embeddings), Cohere (reranking), HuggingFace
- **GitHub** : 5 repos via HTTPS + token (ghp_... dans remotes)
- **Docker** : `docker ps`, `docker logs`, accès aux containers n8n/redis/postgres
- **gh CLI** : Authentifié en LBJLincoln, scopes complets (codespace, repo, workflow)

### Ce à quoi tu N'AS PAS accès directement
- Les filesystems des Codespaces (sauf via SSH tunnel)
- L'interface web n8n (seulement API + MCP)
- Les logs en temps réel des Codespaces sans tunnel actif
- Vercel (seulement via GitHub push déclenche le déploiement)

---

## INFRASTRUCTURE RÉELLE ET PRÉCISE

### VM Google Cloud (permanent — siège de contrôle)
```
Machine    : e2-micro (Google Cloud, us-central1)
IP         : 34.136.180.66
OS         : Linux Debian 11 (Bullseye)
CPU        : 1 vCPU Intel Xeon @ 2.20GHz
RAM        : 969 MB total | ~865 MB utilisé | ~104 MB disponible
Swap       : 2047 MB total | ~1084 MB utilisé (VM souvent en swap !)
Disque     : 30 GB total | 12 GB utilisé | 17 GB libres (43% plein)
Uptime     : Permanent (pas de coupure planifiée)
```

**Contrainte critique** : RAM limitée à ~970MB. Claude Code seul consomme ~297MB. Avec n8n actif, la VM swap régulièrement. Les scripts Python lourds peuvent échouer par OOM.

### Containers Docker actifs (sur la VM)
```
CONTAINER          IMAGE                 STATUS       PORTS
n8n-n8n-1          n8nio/n8n:latest      Up (stable)  0.0.0.0:5678->5678/tcp
n8n-redis-1        redis:7-alpine        Up (healthy)  0.0.0.0:6379->6379/tcp
n8n-postgres-1     postgres:15-alpine    Up (healthy)  0.0.0.0:5432->5432/tcp
```
- **n8n** : Workflow engine, port 5678 (admin: `admin@mon-ipad.com`)
- **Redis** : Queue mode pour n8n (mode worker distribué)
- **PostgreSQL** : Base interne n8n (historique executions, credentials)
- **Fix critique appliqué** : `task-broker-auth.service.js` TTL 15s→120s (volume monté)

### n8n — État des workflows (13 actifs)
| Workflow | ID Docker | Version | Status |
|----------|-----------|---------|--------|
| Standard RAG V3.4 | `TmgyRP20N4JFd9CB` | v5, 24 nodes | ON |
| Graph RAG V3.3 | `6257AfT1l4FMC6lY` | v4, 26 nodes | ON |
| Quantitative V2.0 | `e465W7V9Q8uK6zJE` | — | ON |
| Orchestrator V10.1 | `aGsYnJY9nNCaTM82` | — | ON |
| Dashboard Status API | `KcfzvJD6yydxY9Uk` | — | ON |
| Benchmark V3.0 | `LKZO1QQY9jvBltP0` | — | ON |
| Monitoring Dashboard | `tLNh3wTty7sEprLj` | — | ON |
| Ingestion V3.1 | `15sUKy5lGL4rYW0L` | — | ON |
| Enrichissement V3.1 | `9V2UTVRbf4OJXPto` | — | ON |
| Feedback V3.1 | `F70g14jMxIGCZnFz` | — | ON |
| Dataset Ingestion | `YaHS9rVb1osRUJpE` | — | ON |

### Bases de données cloud (état au 2026-02-17)
| BDD | Plan | Contenu | Limite |
|-----|------|---------|--------|
| **Pinecone** (sota-rag-jina-1024) | Free | 10,411 vecteurs, 12 ns, dim 1024 | 100K vecteurs max |
| **Pinecone** (sota-rag-cohere-1024) | Free | 10,411 vecteurs, backup Cohere | 100K vecteurs max |
| **Pinecone** (sota-rag-phase2-graph) | Free | 1,296 vecteurs, 1 ns, e5-large | 100K vecteurs max |
| **Neo4j Aura Free** | Free | 19,788 nodes, 76,717 relations | 200K nodes / 400K rels |
| **Supabase** | Free | 40 tables, ~17,000+ lignes | 500MB storage |

### MCP Servers configurés (`.mcp.json`)
| MCP | Endpoint | Capacités | Limite |
|-----|----------|-----------|--------|
| `n8n` | localhost:5678 | Execute/inspecte workflows, liste executions, active/désactive | Aucune |
| `pinecone` | API HTTPS | Upsert, query, delete vecteurs ; gestion indexes | Free tier |
| `neo4j` | HTTPS API | Cypher queries, lecture/écriture graph | Free (200K nodes) |
| `supabase` | Pooler AWS eu-west-1:6543 | SQL SELECT/INSERT/UPDATE/DELETE | Free (500MB) |
| `jina-embeddings` | API Jina | Génère embeddings 1024-dim + Pinecone CRUD | 1M tokens/mois |
| `cohere` | API Cohere | Reranking (command-r) | Trial épuisé presque |
| `huggingface` | Hub API | Recherche modèles/datasets | Free |

### Services externes (all free tier)
| Service | Usage | Quota restant (approx) |
|---------|-------|----------------------|
| **OpenRouter** | LLM (Llama 70B, Gemma 27B, Trinity) | Free credits ($0 cost) |
| **Jina** | Embeddings-v3 primary | ~1M tokens/mois |
| **Cohere** | Reranker backup | Trial quasi-épuisé |
| **HuggingFace** | Datasets + modèles | Free |
| **GitHub** | 5 repos privés + Codespaces | 60h Codespace/mois |

### Codespaces (éphémères — exécution lourde)
```
Type        : GitHub Codespaces (Free tier)
CPU         : 2 cores
RAM         : 8 GB
Disque      : 32 GB
Limite      : 60h actives/mois (Free) — ÉPHÉMÈRES
Image       : mcr.microsoft.com/devcontainers/universal:2 (Ubuntu)
Inclus      : Python 3.11, Node.js 20, Docker-in-Docker, Claude Code CLI
```
- Tests lourds (500q+) → Codespace `rag-tests`
- Ingestion massive → Codespace `rag-data-ingestion`
- Résultats **toujours pushés vers GitHub avant arrêt**

---

## ARCHITECTURE MULTI-REPO (5 repos)

### Vue d'ensemble
```
┌─────────────────────────────────────────────────────────────────┐
│                 GitHub (LBJLincoln) — TOUS PRIVÉS               │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  mon-ipad    │  rag-tests   │ rag-website  │ rag-data-ingestion │
│  CONTROLE    │  4 WF RAG    │  site + chat │ 2 WF ingestion     │
│              │              │              │                    │
│              │  + rag-dashboard (live metrics)                  │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │              │                │
    VM GCloud      Codespaces    Vercel/GH        Codespaces
    (permanent)   (éphémères)    Pages            (éphémères)
    n8n+Redis+PG  SSH tunnel→VM  Statique         n8n+workers+PG+Redis
```

### Rôles précis par repo

#### `mon-ipad` — Tour de contrôle (CE REPO)
- **Qui l'exécute** : Claude Code sur la VM permanente, via Termius
- **Ce qu'il contient** : Directives, scripts eval, configs MCP, n8n sync, CLAUDE.md master
- **Ce qu'il fait** : Piloter les 4 autres repos, lancer tests, fixer workflows n8n, analyser résultats
- **n8n** : Permanent (13 workflows actifs sur Docker VM)
- **Git remotes** : 5 (origin + 4 satellites)
- **Directive locale** : `/home/termius/mon-ipad/CLAUDE.md` (ce fichier)
- **Directive pour agents satellites** : `directives/repos/*.md` → pushés vers chaque repo

#### `rag-tests` — Tests des 4 pipelines RAG
- **Qui l'exécute** : Agent Claude Code dans Codespace éphémère
- **Ce qu'il contient** : Scripts eval Python, datasets JSON, résultats sessions
- **Ce qu'il fait** : Exécuter les tests (quick-test.py, iterative-eval.py, run-eval-parallel.py)
- **n8n** : AUCUN local — se connecte à la VM via SSH tunnel (port forwarding 5678)
- **Dépendance** : VM doit être up + SSH tunnel actif
- **Volume de tests** : 1-10q sur VM directement, 50-200q sur Codespace, 500q+ sur Codespace
- **Directive** : `CLAUDE.md` dans le repo (poussé depuis `directives/repos/rag-tests.md`)

#### `rag-website` — Site business 4 secteurs
- **Qui l'exécute** : Agent Claude Code dans Codespace éphémère (dev) + Vercel (prod)
- **Ce qu'il contient** : Next.js 14, 4 secteurs (BTP, Industrie, Finance, Juridique), chatbots
- **Ce qu'il fait** : Déployer le site vitrine avec démos RAG intégrées
- **n8n** : Local dans Codespace (docker-compose.yml standalone : n8n + postgres)
- **Déploiement** : Push GitHub → Vercel auto-deploy
- **Directive** : `CLAUDE.md` dans le repo (poussé depuis `directives/repos/rag-website.md`)

#### `rag-dashboard` — Dashboard technique live
- **Qui l'exécute** : Statique — aucun Codespace nécessaire
- **Ce qu'il contient** : HTML/JS statique, lit `status.json` via API n8n (Dashboard Status API)
- **Ce qu'il fait** : Afficher les métriques live (accuracy, pipelines, phase gates) en read-only
- **n8n** : AUCUN — consomme uniquement le webhook `/webhook/nomos-status` de la VM
- **Déploiement** : GitHub Pages ou Vercel (statique)
- **Directive** : `CLAUDE.md` dans le repo (poussé depuis `directives/repos/rag-dashboard.md`)

#### `rag-data-ingestion` — Ingestion + enrichissement BDD
- **Qui l'exécute** : Agent Claude Code dans Codespace éphémère
- **Ce qu'il contient** : Workflows Ingestion V3.1, Enrichissement V3.1, scripts Python
- **Ce qu'il fait** : Ingérer documents → Pinecone/Neo4j/Supabase, enrichir données
- **n8n** : Local COMPLET (docker-compose : n8n + 2 workers + postgres + redis)
- **Workflow mode** : Queue mode (2 workers pour parallélisation)
- **Directive** : `CLAUDE.md` dans le repo (poussé depuis `directives/repos/rag-data-ingestion.md`)

### Remotes configurés (depuis ce repo)
```bash
origin             → github.com/LBJLincoln/mon-ipad.git
rag-tests          → github.com/LBJLincoln/rag-tests.git
rag-website        → github.com/LBJLincoln/rag-website.git
rag-dashboard      → github.com/LBJLincoln/rag-dashboard.git
rag-data-ingestion → github.com/LBJLincoln/rag-data-ingestion.git
```

---

## PHASE 0 — CONTEXTE PERSISTANT

### 0.1 Résilience aux compactages
1. **Lire `directives/session-state.md`** — Mémoire de travail
2. **Lire `directives/status.md`** — Résumé dernière session
3. **Lire `docs/status.json`** — Métriques live

**Règle** : Avant chaque action complexe, re-lire `directives/session-state.md`.

### 0.2 Mise à jour session-state.md (OBLIGATOIRE)
```markdown
# Session State — [date]
## Objectif de session : [...]
## Tâches en cours : [...]
## Décisions prises : [...]
## Dernière action : [...]
## Prochaine action : [...]
## Commits : [hash1, hash2, ...]
## Repos impactés : [mon-ipad, rag-tests, ...]
```

### 0.3 Sources de vérité
| Source | Rôle |
|--------|------|
| **VM locale** (`/home/termius/mon-ipad/`) | État live + credentials + contrôle |
| **GitHub** (5 repos privés) | Checkpoints persistants |
| **Codespaces** (éphémères) | Exécution lourde, résultats pushés vers repos |

---

## PHASE 1 — LIRE

### 1.1 État actuel (TOUJOURS en premier)
```bash
cat directives/session-state.md
cat docs/status.json
cat directives/status.md
```

### 1.2 Comprendre le projet
- `directives/objective.md` — Objectif final, situation actuelle
- `propositions` — Architecture multi-repo, n8n distribué

### 1.3 Comprendre le processus
- `directives/workflow-process.md` — Boucle d'itération
- `directives/n8n-endpoints.md` — Webhooks et API REST

### 1.4 Références techniques
- `technicals/architecture.md` — 4 pipelines + 9 workflows
- `technicals/stack.md` — Stack technique
- `technicals/credentials.md` — Configuration services
- `technicals/phases-overview.md` — 5 phases et gates
- `technicals/infrastructure-plan.md` — Plan d'infrastructure distribuée
- `technicals/sector-datasets.md` — 1000+ types de documents par secteur
- `directives/dataset-rationale.md` — Justification des 14 benchmarks
- `directives/repos/` — Directives personnalisées par repo satellite

---

## PHASE 2 — UTILISER

### 2.1 MCP Servers
| MCP | Usage | Status |
|-----|-------|--------|
| `n8n` | Exécuter et inspecter workflows (Docker localhost:5678) | OK |
| `pinecone` | Vector store (22K+ vecteurs, 3 indexes) | OK |
| `neo4j` | Graph (19K+ nodes) | OK |
| `jina-embeddings` | Embeddings Jina + Pinecone CRUD | OK |
| `supabase` | SQL queries directes | OK |
| `cohere` | Reranking (trial quasi-épuisé) | Limité |
| `huggingface` | Recherche modèles/datasets | OK |

### 2.2 Commandes d'évaluation
```bash
source .env.local  # TOUJOURS avant les scripts Python
python3 eval/quick-test.py --questions 1 --pipeline <cible>
python3 eval/quick-test.py --questions 5 --pipeline <cible>
python3 eval/iterative-eval.py --label "..."
python3 eval/run-eval-parallel.py --reset --label "..."
python3 eval/node-analyzer.py --execution-id <ID>
python3 eval/generate_status.py
python3 eval/phase_gates.py
```

### 2.3 Commandes d'analyse
```bash
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
python3 scripts/analyze_n8n_executions.py --pipeline <cible> --limit 5
```

### 2.4 Commandes multi-repo (push)
```bash
# Push vers un repo satellite
git push rag-tests main
git push rag-website main
git push rag-dashboard main
git push rag-data-ingestion main

# Push vers tous les repos
for R in origin rag-tests rag-website rag-dashboard rag-data-ingestion; do git push $R main; done

# Sync n8n workflows
python3 n8n/sync.py
```

### 2.5 Pousser les directives vers les repos satellites
```bash
# Script dédié — pousse les CLAUDE.md spécifiques vers chaque repo
bash scripts/push-directives.sh
```

### 2.6 Commandes Codespaces (contrôle distant)
```bash
# Lister les Codespaces actifs
gh codespace list

# Créer un Codespace pour un repo
gh codespace create --repo LBJLincoln/rag-tests --machine basicLinux32gb

# Se connecter SSH à un Codespace
gh codespace ssh --codespace <name>

# Arrêter un Codespace
gh codespace stop --codespace <name>

# Supprimer un Codespace
gh codespace delete --codespace <name>
```

### 2.7 SSH tunnel vers VM depuis Codespace
```bash
# Dans le Codespace rag-tests, pour accéder au n8n de la VM :
ssh -L 5678:localhost:5678 <user>@34.136.180.66 -N &
# Puis les scripts rag-tests utilisent localhost:5678 normalement
```

### 2.8 Modification de workflows n8n (CRITIQUE)
```
1. DIAGNOSTIQUER  → node-analyzer.py + analyze_n8n_executions.py
2. FIXER          → API REST n8n (ou MCP n8n)
3. VÉRIFIER       → quick-test.py --questions 5 minimum
4. SYNC           → n8n/sync.py
5. ARCHIVER       → snapshot/validated/
6. COMMIT+PUSH    → origin + repos concernés
```

---

## PHASE 3 — PRODUIRE

### 3.1 Après chaque test
- Logs → `logs/`
- Diagnostics → `logs/diagnostics/`
- Status → `docs/status.json` (auto-généré)

### 3.2 Après chaque fix réussi (5/5 passe)
1. Sync : `python3 n8n/sync.py`
2. Snapshot : `snapshot/current/`
3. Status : `python3 eval/generate_status.py`
4. Session-state : `directives/session-state.md`
5. **Commit + push IMMÉDIATEMENT** (origin + repos concernés)

### 3.3 Pushes réguliers (OBLIGATOIRE)
- Après chaque fix réussi
- Après chaque milestone
- **Toutes les 30 minutes** minimum
- Avant opérations risquées
- **Vers TOUS les repos concernés** (pas juste origin)

### 3.4 Pre-push security check
```bash
git diff --cached | grep -iE 'sk-or-|pcsk_|jV_zGdx|sbp_|hf_[A-Za-z]{10}|jina_[a-f0-9]{10}|ghp_'
```

### 3.5 En fin de session — Checklist
1. `technicals/` — MAJ si changements
2. `snapshot/current/` — Sync workflows
3. `docs/data.json` — Régénérer
4. `directives/session-state.md` — État final
5. `directives/status.md` — Résumé session (EN DERNIER)
6. **Commit + push vers origin ET repos satellites impactés**

---

## Processus Team-Agentique (OBLIGATOIRE)

### Principes
1. **Parallélisation** : Tâches indépendantes en parallèle (sauf tests n8n → séquentiels)
2. **Délégation spécialisée** : Agent analyse, agent fix, agent test
3. **Coordination** : L'agent principal ne duplique pas
4. **Reference-based** : Comparer avec `snapshot/good/`

### Optimisations
- `run_in_background: true` pour tâches longues
- `resume` pour reprendre un agent
- `model: haiku` pour tâches simples
- `model: opus` pour décisions complexes

### Architecture distribuée (par volume de tests)
| Volume | Exécution | Raison |
|--------|-----------|--------|
| 1-10 questions | VM directement | RAM suffisante |
| 50-200 questions | VM avec queue mode | Redis présent |
| 500q+ | Codespace `rag-tests` | RAM 8GB, pas de contrainte |
| Ingestion massive | Codespace `rag-data-ingestion` | n8n + 2 workers dédiés |

---

## Gestion des Credentials (CRITIQUE)

**`.env.local` = seule source. GitHub = ZÉRO credentials.**

### Règles
1. JAMAIS de clés en clair dans les fichiers trackés
2. Scripts Python → `os.environ` ou `.env.local`
3. `.claude/settings.json` et `.mcp.json` dans `.gitignore`
4. Pre-push check OBLIGATOIRE (voir section 3.4)

### Services
| Service | Type | Note |
|---------|------|------|
| OpenRouter | Free tier | LLM gratuits |
| Jina | Free tier (1M tokens/mois) | Embeddings primary |
| Pinecone | Free tier | Vector store |
| Neo4j Aura | Free tier | Graph DB |
| Supabase | Free tier | SQL DB |
| Cohere | Trial (quasi-épuisé) | Reranking backup |
| HuggingFace | Free tier | Modèles/datasets |

---

## Règles d'Or

1. **UN fix par itération** — jamais plusieurs noeuds
2. **n8n = source de vérité** — éditer dans n8n, sync vers GitHub
3. **Double analyse AVANT chaque fix**
4. **5/5 minimum avant sync**
5. **Commit + push après chaque fix** (tous repos concernés)
6. **`docs/status.json` auto-généré** — ne pas éditer
7. **3+ régressions → REVERT**
8. **MAJ `technicals/` après découvertes**
9. **MAJ `directives/status.md` en fin de session**
10. **Travailler depuis `main`** (tous repos)
11. **Push réguliers** — 30 min minimum
12. **Tests séquentiels** — jamais parallèles (503)
13. **Comparer avec références** — `snapshot/good/`
14. **ZÉRO credentials dans git**
15. **MAJ session-state.md** — après chaque milestone
16. **source .env.local** — avant tout script Python
17. **Push multi-repo** — origin + satellites impactés
18. **Codespaces = éphémère** — résultats pushés avant arrêt
19. **RAM critique** — VM a seulement ~100MB dispo, éviter scripts mémoire-intensifs en parallèle
20. **Directives repos** — MAJ `directives/repos/*.md` si changements d'architecture

---

## Infrastructure

### VM Google Cloud (permanent)
```
IP externe    : 34.136.180.66
N8N_HOST      : http://localhost:5678 (interne)
N8N_WEBHOOK   : http://34.136.180.66:5678 (externe)
Credentials   → .env.local (jamais dans git)
```

### Pipelines RAG
| Pipeline | Webhook Path | DB | Cible Phase 1 | Accuracy actuelle |
|----------|-------------|-----|----------------|-------------------|
| Standard | `/webhook/rag-multi-index-v3` | Pinecone | >= 85% | **85.5% PASS** |
| Graph | `/webhook/ff622742-...` | Neo4j + Supabase | >= 70% | **68.7% FAIL** |
| Quantitative | `/webhook/3e0f8010-...` | Supabase | >= 85% | **78.3% FAIL** |
| Orchestrator | `/webhook/92217bb8-...` | Meta | >= 70% | **80.0% PASS** |
| **Overall** | | | **>= 75%** | **78.1% PASS** |

### Accès
| Ressource | Accès |
|-----------|-------|
| n8n API + MCP | localhost:5678 |
| n8n Webhooks | 34.136.180.66:5678 |
| Pinecone | HTTPS API |
| Neo4j | https://38c949a2.databases.neo4j.io |
| Supabase | aws-1-eu-west-1.pooler.supabase.com:6543 |

### Architecture dossiers (ce repo)
| Dossier | Rôle |
|---------|------|
| `directives/` | Mission control (session-state, status, objective, process) |
| `directives/repos/` | **Directives personnalisées par repo satellite** |
| `technicals/` | Documentation technique (stack, archi, credentials, phases) |
| `eval/` | Scripts d'évaluation Python |
| `scripts/` | Utilitaires Python + scripts Bash |
| `n8n/` | Workflows (live, validated, sync) |
| `mcp/` | Serveurs MCP |
| `website/` | Code Next.js (site-business + dashboard) |
| `datasets/` | Données de test |
| `snapshot/` | Références (good, current) |
| `logs/` | Logs d'exécution |
| `outputs/` | Archives sessions |
| `docs/` | Dashboard data (status.json, data.json) |
