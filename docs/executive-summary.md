# EXECUTIVE SUMMARY — Nomos AI Multi-RAG Orchestrator

> Last updated: 2026-02-20T01:00:00+01:00
> **Ce fichier DOIT etre consulte et mis a jour a CHAQUE session.**
> Il est la reference unique pour comprendre tout le projet en langage clair.

---

## TABLE DES MATIERES

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Architecture complete](#2-architecture-complete)
3. [Les 7 repos GitHub — Roles et contenus](#3-les-7-repos-github)
4. [Infrastructure et machines](#4-infrastructure-et-machines)
5. [Les 4 pipelines RAG — Comment ca marche](#5-les-4-pipelines-rag)
6. [Bases de donnees — Etat et contenu](#6-bases-de-donnees)
7. [Credentials et acces](#7-credentials-et-acces)
8. [Boucle de travail — Etape par etape](#8-boucle-de-travail)
9. [Commandes executees dans chaque session](#9-commandes-executees)
10. [Fichiers modifies — Inventaire complet](#10-fichiers-modifies)
11. [Etat actuel et metriques](#11-etat-actuel)
12. [Prochaines etapes](#12-prochaines-etapes)
13. [Glossaire](#13-glossaire)

---

## 1. VUE D'ENSEMBLE DU PROJET

### Qu'est-ce que Nomos AI ?
Nomos AI est un **systeme d'intelligence artificielle qui repond a des questions complexes** en cherchant dans plusieurs bases de donnees simultanement. Il utilise 4 methodes de recherche differentes (appelees "pipelines") et un orchestrateur qui choisit la meilleure methode pour chaque question.

### Objectif final
Construire un moteur de reponse capable de traiter **1 million+ de questions** dans 4 secteurs d'activite (BTP, Industrie, Finance, Juridique) avec une precision de **85%+** et un temps de reponse de **moins de 2.5 secondes**.

### Ou en est-on ?
- **Phase 1** (200 questions de test) : 3 pipelines sur 4 passent leurs objectifs
- **Phase 2** (3,000 questions) : En preparation, datasets prets
- **Bloqueur restant** : Le pipeline Quantitative fonctionne (200 OK) mais est rate-limited par OpenRouter (429 Too Many Requests). Solution identifiee : rotation de modeles LLM.

### Chiffres cles
| Metrique | Valeur |
|----------|--------|
| Questions testees a ce jour | 932 |
| Precision globale | 85.9% |
| Vecteurs dans Pinecone | 22,070 |
| Entites dans Neo4j | 19,788 |
| Lignes dans Supabase | ~17,600 |
| Datasets sectoriels telecharges | 7,609 items |
| Commits depuis le debut | 100+ |
| Sessions Claude Code | 27 |

---

## 2. ARCHITECTURE COMPLETE

### Schema global
```
                    UTILISATEUR (iPad / Termius)
                           |
                    Terminal SSH connecte a
                           |
              VM GOOGLE CLOUD (34.136.180.66)
              Machine permanente e2-micro
              970 MB RAM | 30 GB disque
                           |
         +-----------------+-----------------+
         |                                   |
    CLAUDE CODE CLI                    n8n (Docker)
    Modele: Opus 4.6                   Port 5678
    Tour de controle                   9 workflows actifs
    Repo: mon-ipad                     Webhooks ouverts
         |                                   |
         +-----------------------------------+
                           |
         +-----------------+-----------------+
         |                 |                 |
    PINECONE          NEO4J AURA        SUPABASE
    Vector DB          Graph DB          SQL DB
    22K vecteurs       19K nodes         40 tables
    3 indexes          76K relations     17K lignes
         |                 |                 |
         +-----------------+-----------------+
                           |
                     OPENROUTER
                     LLM gratuits
                     Llama 70B + Gemma 27B
```

### Flux d'une question (de A a Z)
```
1. L'utilisateur pose une question (ex: "Quel est le chiffre d'affaires de TechVision en 2023 ?")
2. La question arrive via webhook HTTP POST sur n8n
3. n8n analyse l'intention (quel type de question ?)
4. n8n route vers le bon pipeline :
   - Standard → recherche dans Pinecone (texte)
   - Graph → recherche dans Neo4j (entites et relations)
   - Quantitative → genere du SQL et interroge Supabase (chiffres)
   - Orchestrator → combine les 3 ci-dessus
5. Le pipeline recupere les informations pertinentes
6. Un LLM (Llama 70B via OpenRouter) formule la reponse
7. La reponse est renvoyee a l'utilisateur avec les sources
```

---

## 3. LES 7 REPOS GITHUB

Tous les repos sont **prives** sous le compte `LBJLincoln`.

### Tableau recapitulatif
| # | Repo | Role | Ou ca tourne | Contenu principal |
|---|------|------|-------------|-------------------|
| 1 | **mon-ipad** | Tour de controle | VM Google Cloud | Directives, scripts eval, configs MCP, CLAUDE.md master |
| 2 | **rag-tests** | Tests des 4 pipelines | Codespace / HF Space | Scripts Python de test, resultats JSON |
| 3 | **rag-website** | Site vitrine ETI | Vercel (prod) | Next.js 14, 4 secteurs, chatbots |
| 4 | **rag-dashboard** | Dashboard metriques | GitHub Pages / Vercel | HTML/JS statique, graphiques live |
| 5 | **rag-data-ingestion** | Ingestion donnees | Codespace | Scripts download, workflows ingestion |
| 6 | **rag-pme-connectors** | Site PME connecteurs | Vercel | Next.js 14, 12 connecteurs apps |
| 7 | **rag-pme-usecases** | Site PME use cases | Vercel | Next.js 14, 200 cas d'usage |

### Relations entre repos
```
mon-ipad (PILOTE)
   |
   |-- distribue les CLAUDE.md personnalises a chaque repo
   |-- fixe les workflows n8n
   |-- analyse les resultats des autres repos
   |
   +-- rag-tests : MESURE la performance → rapporte via git push
   +-- rag-website : CONSTRUIT le site → deploie via Vercel
   +-- rag-data-ingestion : INGERE les donnees → Pinecone/Neo4j/Supabase
   +-- rag-dashboard : AFFICHE les metriques (lecture seule)
   +-- rag-pme-connectors : Site PME (statique)
   +-- rag-pme-usecases : Site PME (statique)
```

### Fichiers cles dans mon-ipad (tour de controle)
| Dossier | Contenu | Fichiers importants |
|---------|---------|---------------------|
| `directives/` | Memoire de session, status | `session-state.md`, `status.md`, `workflow-process.md` |
| `directives/repos/` | CLAUDE.md pour chaque satellite | `rag-tests.md`, `rag-website.md`, `rag-data-ingestion.md`, `rag-dashboard.md` |
| `technicals/` | Documentation technique (4 sous-dossiers: debug/, infra/, project/, data/) | `debug/knowledge-base.md`, `debug/fixes-library.md`, `project/team-agentic-process.md`, `infra/architecture.md` |
| `eval/` | Scripts Python d'evaluation | `quick-test.py`, `iterative-eval.py`, `run-eval-parallel.py` |
| `scripts/` | Utilitaires | `push-directives.sh`, `codespace-control.sh`, `download-sectors.py` |
| `n8n/live/` | Workflows n8n (JSON) | `standard.json`, `graph.json`, `quantitative.json`, `orchestrator.json` |
| `datasets/` | Questions de test | `phase-1/*.json`, `phase-2/*.json`, `sectors/**/*.jsonl` |
| `docs/` | Dashboard + readiness | `status.json`, `data.json`, `phase2-readiness.md`, **ce fichier** |
| `snapshot/` | References de workflows valides | `current/`, `good/` |
| `logs/` | Logs d'execution | `diagnostics/` |

---

## 4. INFRASTRUCTURE ET MACHINES

### VM Google Cloud (permanente — siege de controle)
| Element | Detail |
|---------|--------|
| **IP** | 34.136.180.66 |
| **OS** | Debian 11 (Bullseye) |
| **CPU** | 1 vCPU Intel Xeon @ 2.20GHz |
| **RAM** | 970 MB total (~100 MB disponibles) |
| **Disque** | 30 GB (12 GB utilises) |
| **Acces** | SSH via Termius (iPad) |
| **Docker** | n8n + Redis + PostgreSQL |
| **Usage** | PILOTAGE UNIQUEMENT — pas de tests, pas de modifications workflow |

### HF Space (execution — 16 GB RAM, gratuit)
| Element | Detail |
|---------|--------|
| **URL** | https://lbjlincoln-nomos-rag-engine.hf.space |
| **RAM** | 16 GB (cpu-basic) |
| **n8n** | Version 2.8.3 (latest) |
| **DB interne** | SQLite + Redis |
| **Usage** | Execution des pipelines RAG pour les tests |
| **Workflows** | 9 importes. **3/4 pipelines fonctionnels** (Standard 100%, Graph 100%, Orchestrator 100%). Quantitative: infra OK mais OpenRouter 429 rate limit |

### Codespaces GitHub (ephemeres — 60h/mois)
| Element | Detail |
|---------|--------|
| **CPU** | 2 cores |
| **RAM** | 8 GB |
| **Disque** | 32 GB |
| **Usage** | Tests lourds (500q+), ingestion massive, dev website |
| **IMPORTANT** | Toujours push vers GitHub AVANT arret (travail perdu sinon) |

### Vercel (production — sites web)
| Site | URL | Status |
|------|-----|--------|
| ETI (4 secteurs) | nomos-ai-pied.vercel.app | Live |
| PME Connecteurs | nomos-pme-connectors-alexis-morets-projects.vercel.app | Live |
| PME Use Cases | nomos-pme-usecases-alexis-morets-projects.vercel.app | Live |
| Dashboard | nomos-dashboard-alexis-morets-projects.vercel.app | Live |

---

## 5. LES 4 PIPELINES RAG

### Comment chaque pipeline fonctionne

#### Pipeline Standard (recherche textuelle)
```
Question → Genere une question hypothetique (HyDE)
         → Cherche dans Pinecone (10K+ vecteurs)
         → Reranking Jina (trie par pertinence)
         → LLM genere la reponse avec les sources
```
- **Base de donnees** : Pinecone `sota-rag-jina-1024` (10,411 vecteurs)
- **Precision** : 85.5%
- **Webhook** : `/webhook/rag-multi-index-v3`

#### Pipeline Graph (entites et relations)
```
Question → Extrait les entites (personnes, lieux, organisations)
         → Cherche dans Neo4j (19K entites, 76K relations)
         → Recupere les sous-graphes pertinents
         → LLM synthetise les relations trouvees
```
- **Base de donnees** : Neo4j Aura (19,788 nodes, 76,717 relations)
- **Precision** : 100% (10/10 sur HF Space)
- **Webhook** : `/webhook/ff622742-6d71-4e91-af71-b5c666088717`

#### Pipeline Quantitative (chiffres et tableaux)
```
Question → Analyse l'intention financiere
         → Genere du SQL via LLM (ou template matching)
         → Execute le SQL dans Supabase
         → LLM interprete les resultats
```
- **Base de donnees** : Supabase (financials, balance_sheet, sales_data, etc.)
- **Precision** : 78.3% (sur VM) — HF Space: 200 OK mais OpenRouter 429 rate limit
- **Webhook** : `/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9`
- **Probleme actuel** : OpenRouter 429 rate limit (20 RPM par modele). Les 6 pipelines partagent le meme compteur RPM Llama 70B. Solution: changer vers Qwen 2.5 Coder 32B (pool RPM separe) + rotation 3 modeles. Voir `technicals/infra/llm-models-and-fallbacks.md`

#### Pipeline Orchestrator (combine les 3)
```
Question → Classifie l'intention (standard/graph/quantitative/multi)
         → Planifie les sous-taches
         → Execute chaque sous-tache via le pipeline appropriate
         → Aggrege les resultats
```
- **Base de donnees** : Toutes (Pinecone + Neo4j + Supabase)
- **Precision** : 80.0%
- **Webhook** : `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0`

### Parametres d'appel (identiques pour les 4)
```bash
curl -X POST "https://lbjlincoln-nomos-rag-engine.hf.space/webhook/<path>" \
  -H "Content-Type: application/json" \
  -d '{"query": "Votre question ici", "sessionId": "optionnel"}'
```
**ATTENTION** : Le champ est `query` (PAS `question`).

---

## 6. BASES DE DONNEES

### Pinecone (recherche vectorielle)
Pinecone stocke les textes transformes en vecteurs numeriques (1024 dimensions).
Quand une question est posee, elle est aussi transformee en vecteur, et Pinecone
trouve les textes les plus proches mathematiquement.

| Index | Vecteurs | Usage |
|-------|----------|-------|
| `sota-rag-jina-1024` | 10,411 | Pipeline Standard + Graph |
| `sota-rag-phase2-graph` | 1,248 | Graph enrichi (musique dataset) |
| `sota-rag-cohere-1024` | 10,411 | Backup (ancien systeme) |

### Neo4j (graphe de connaissances)
Neo4j stocke les entites (personnes, lieux, organisations) et leurs relations.
Exemple : "Alexander Fleming" → DECOUVRIT → "Penicilline" → TRAITE → "Infections"

| Element | Nombre |
|---------|--------|
| Personnes | 8,531 |
| Entites generiques | 8,331 |
| Organisations | 1,775 |
| Villes | 840 |
| Relations totales | 76,717 |

### Supabase (base SQL)
Supabase stocke les donnees structurees (tableaux, chiffres, listes).

| Table | Lignes | Contenu |
|-------|--------|---------|
| financials | 24 | Chiffres d'affaires TechVision, GreenEnergy, HealthPlus |
| balance_sheet | 12 | Bilans comptables |
| sales_data | 1,152 | Ventes detaillees |
| employees | 150 | Effectifs |
| finqa_tables | 200 | Questions financieres HuggingFace (Phase 2) |
| tatqa_tables | 150 | Questions tableaux HuggingFace (Phase 2) |
| convfinqa_tables | 100 | Questions conversationnelles financieres (Phase 2) |
| benchmark_datasets | 10,772 | Donnees de benchmark |
| + 32 autres tables | ~5,000+ | Infrastructure, logs, feedback |

---

## 7. CREDENTIALS ET ACCES

### Ou sont stockees les credentials
| Emplacement | Contenu | Securite |
|-------------|---------|----------|
| `.env.local` (VM) | Toutes les cles API | Gitignore (JAMAIS dans GitHub) |
| `.claude/settings.json` (VM) | Config MCP servers | Gitignore |
| Docker env vars | Variables n8n | Container local |
| HF Space secrets | Variables HF | Interface HuggingFace |
| Fichiers source : `infra/credentials.md`, `technicals/credentials.md` | Documentation (pas les vraies cles) | Repo prive |

### Services connectes
| Service | Usage | Plan | Limite |
|---------|-------|------|--------|
| OpenRouter | LLM (Llama 70B, Gemma 27B) | Free | $0 illimite |
| Jina AI | Embeddings + Reranking | Free | 1M tokens/mois |
| Pinecone | Vector DB | Free | 100K vecteurs |
| Neo4j Aura | Graph DB | Free | 200K nodes |
| Supabase | SQL DB | Free | 500 MB |
| Cohere | Reranking (backup) | Trial | Quasi-epuise |
| HuggingFace | Datasets + HF Space | Free | 60h Codespace/mois |
| GitHub | 7 repos prives | Free | Illimite |
| Vercel | 4 sites deployes | Free | Illimite |

### MCP Servers (outils connectes a Claude Code)
Claude Code utilise 7 "MCP Servers" pour interagir directement avec les services :

| MCP | Capacites | Empreinte RAM |
|-----|-----------|---------------|
| n8n | Executer/inspecter les workflows | ~2 MB |
| pinecone | Chercher/ajouter des vecteurs | ~1.4 MB |
| neo4j | Requetes Cypher sur le graphe | ~2.5 MB |
| supabase | Requetes SQL directes | ~1 MB |
| jina-embeddings | Generer des embeddings | ~0.7 MB |
| cohere | Reranking de resultats | ~0.6 MB |
| huggingface | Chercher des modeles/datasets | ~0.8 MB |

---

## 8. BOUCLE DE TRAVAIL — ETAPE PAR ETAPE

### Demarrage de chaque session (5 minutes)
```
ETAPE 1 : Lire l'etat precedent
  → cat directives/session-state.md     (memoire de travail)
  → cat docs/status.json                (metriques)
  → cat directives/status.md            (resume session precedente)
  → cat technicals/debug/knowledge-base.md    (cerveau persistant)

ETAPE 2 : Verifier les fixes connus
  → cat technicals/debug/fixes-library.md     (35 bugs deja resolus)

ETAPE 3 : Identifier l'objectif de session
  → Quel pipeline a le plus gros ecart par rapport a sa cible ?
  → Quelles taches sont en cours depuis la session precedente ?
```

### Boucle d'iteration (quand on fixe un pipeline)
```
     +--> DIAGNOSTIQUER (double analyse obligatoire)
     |        |
     |        v
     |    FIXER (1 seul changement a la fois)
     |        |
     |        v
     |    TESTER (minimum 5 questions)
     |        |
     |        v
     |    PASSE ?
     |    /       \
     |  OUI       NON
     |   |         |
     |   v         +---> retour a DIAGNOSTIQUER
     |  SYNC + COMMIT + PUSH
     |   |
     +---+  (iteration suivante si necessaire)
```

### Fin de chaque session (10 minutes)
```
ETAPE 1 : Sync les workflows modifies
  → python3 n8n/sync.py

ETAPE 2 : Generer les metriques
  → python3 eval/generate_status.py

ETAPE 3 : Mettre a jour les fichiers d'etat
  → directives/session-state.md
  → directives/status.md
  → technicals/knowledge-base.md (si decouvertes)
  → technicals/fixes-library.md (si fixes)
  → docs/executive-summary.md (CE FICHIER)

ETAPE 4 : Commit + Push (TOUS les repos impactes)
  → git add <fichiers>
  → git commit -m "description"
  → git push origin main
  → bash scripts/push-directives.sh (si CLAUDE.md modifies)
```

---

## 9. COMMANDES EXECUTEES DANS CHAQUE SESSION

### Commandes de pilotage (VM — tour de controle)
```bash
# --- Demarrage ---
cat directives/session-state.md          # Lire l'etat
cat docs/status.json                      # Lire les metriques
source .env.local                         # Charger les variables d'environnement

# --- Tests rapides (sur HF Space) ---
curl -X POST "https://lbjlincoln-nomos-rag-engine.hf.space/webhook/rag-multi-index-v3" \
  -H "Content-Type: application/json" -d '{"query":"...","sessionId":"..."}'

# --- Diagnostics ---
python3 eval/quick-test.py --questions 5 --pipeline standard
python3 eval/node-analyzer.py --execution-id <ID>
python3 scripts/analyze_n8n_executions.py --execution-id <ID>

# --- Sync et generation ---
python3 n8n/sync.py                       # Sync les workflows
python3 eval/generate_status.py           # Generer status.json

# --- Git (push multi-repo) ---
git add <fichiers>
git commit -m "description"
git push origin main
bash scripts/push-directives.sh           # Push CLAUDE.md vers satellites

# --- Pilotage Codespaces ---
gh codespace list                         # Lister les Codespaces
gh codespace start --codespace <name>     # Demarrer un Codespace
scripts/codespace-control.sh launch <cs>  # Lancer un test distant
scripts/codespace-control.sh status <cs>  # Voir la progression
scripts/codespace-control.sh stream <cs>  # Stream live des logs

# --- Docker VM ---
docker ps                                 # Voir les containers
docker logs n8n-n8n-1 --tail 50           # Logs n8n
docker compose restart n8n                # Redemarrer n8n (rare)
```

### Commandes dans rag-tests (Codespace)
```bash
bash scripts/setup-claude-opus.sh         # Configurer Opus 4.6
docker compose up -d                      # Demarrer n8n local (3 workers)
source .env.local                         # Charger variables
python3 eval/quick-test.py --questions 5 --pipeline quantitative
python3 eval/iterative-eval.py --label "Phase1-fix"
python3 eval/run-eval-parallel.py --reset --label "phase1-200q"
git add docs/ logs/ && git push origin main
```

### Commandes dans rag-website (Codespace)
```bash
npm install && npm run dev                # Dev local (port 3000)
npm run build                             # Build pour prod
git push origin main                      # Deploy Vercel auto
```

### Commandes dans rag-data-ingestion (Codespace)
```bash
docker compose up -d                      # n8n + 2 workers
source .env.local
python3 scripts/download-sector-datasets.py --sector finance
python3 scripts/trigger-ingestion.py --dataset financebench --workers 2
git push origin main
```

---

## 10. FICHIERS MODIFIES — INVENTAIRE COMPLET

### Fichiers critiques (modifies regulierement)
| Fichier | Role | Modifie a chaque session ? |
|---------|------|---------------------------|
| `CLAUDE.md` | Directives globales (29 regles, architecture) | Souvent |
| `directives/session-state.md` | Memoire de travail active | **TOUJOURS** |
| `directives/status.md` | Resume de la derniere session | **TOUJOURS** (en dernier) |
| `technicals/debug/knowledge-base.md` | Cerveau persistant (patterns, solutions) | Souvent |
| `technicals/debug/fixes-library.md` | 35 bugs documentes | Apres chaque fix |
| `docs/status.json` | Metriques machine-readable (auto-genere) | Apres chaque eval |
| `docs/data.json` | Donnees de toutes les iterations | Apres chaque eval |
| `docs/executive-summary.md` | **CE FICHIER** | **TOUJOURS** |
| `docs/phase2-readiness.md` | Checklist pre-lancement Phase 2 | Avant Phase 2 |

### Fichiers de configuration (modifies rarement)
| Fichier | Role |
|---------|------|
| `technicals/infra/architecture.md` | Architecture des 4 pipelines + 9 workflows |
| `technicals/project/team-agentic-process.md` | Strategie multi-model (Opus+Sonnet+Haiku) |
| `technicals/project/phases-overview.md` | Plan des 5 phases (200q → 1M+) |
| `technicals/infra/env-vars-exhaustive.md` | 33 variables d'environnement documentees |
| `technicals/data/sector-datasets.md` | 1000+ types de documents par secteur |

**Note** : `technicals/` est organise en 4 sous-dossiers: `debug/`, `infra/`, `project/`, `data/`
| `directives/workflow-process.md` | Boucle d'iteration detaillee |
| `directives/n8n-endpoints.md` | Webhooks et API REST |
| `directives/objective.md` | Objectif final du projet |

### Fichiers par repo satellite
| Repo | Fichier principal | Pousse depuis |
|------|-------------------|---------------|
| rag-tests | `CLAUDE.md` | `directives/repos/rag-tests.md` |
| rag-website | `CLAUDE.md` | `directives/repos/rag-website.md` |
| rag-data-ingestion | `CLAUDE.md` | `directives/repos/rag-data-ingestion.md` |
| rag-dashboard | `CLAUDE.md` | `directives/repos/rag-dashboard.md` |

### Fichiers de workflows n8n (JSON)
| Fichier | Pipeline |
|---------|----------|
| `n8n/live/standard.json` | Standard RAG V3.4 |
| `n8n/live/graph.json` | Graph RAG V3.3 |
| `n8n/live/quantitative.json` | Quantitative V2.0 |
| `n8n/live/quantitative-v2-template-fix.json` | Quantitative avec template SQL |
| `n8n/live/orchestrator.json` | Orchestrator V10.1 |
| `n8n/live/ingestion.json` | Ingestion V3.1 |
| `n8n/live/enrichment.json` | Enrichissement V3.1 |

---

## 11. ETAT ACTUEL ET METRIQUES

### Phase 1 — Accuracy (19 fevrier 2026)
| Pipeline | Precision | Objectif | Status | Ecart |
|----------|-----------|----------|--------|-------|
| Standard | **85.5%** | >= 85% | PASSE | +0.5pp |
| Graph | **100%** (10/10) | >= 70% | **PASSE** | +30pp |
| Quantitative | **78.3%** | >= 85% | **ECHOUE** | -6.7pp |
| Orchestrator | **80.0%** | >= 70% | PASSE | +10pp |
| **Global** | **85.9%** | >= 75% | **PASSE** | +10.9pp |

### Bloqueur restant : Quantitative (rate limit, pas crash)
- Le pipeline fonctionne (HTTP 200 OK sur HF Space) — FIX-29 a FIX-35 appliques
- Infra OK: 12 noeuds s'executent correctement, credentials configurees
- Probleme: OpenRouter 429 rate limit — 6 env vars pointent vers le meme Llama 70B (20 RPM partage)
- Solution identifiee: Changer LLM_SQL_MODEL vers Qwen 2.5 Coder 32B (pool RPM separe, HumanEval 85%)
- Details complets: `technicals/infra/llm-models-and-fallbacks.md`

### Datasets Phase 2 (prets)
| Dataset | Questions | Status |
|---------|-----------|--------|
| Graph + Quant (hf-1000.json) | 1,000 | PRET |
| Standard + Orch (standard-orch-1000x2.json) | 2,000 | PRET |
| Secteur Finance (6 fichiers JSONL) | 2,250 | TELECHARGE |
| Secteur Juridique (5 fichiers JSONL) | 2,500 | TELECHARGE |
| Secteur BTP (4 fichiers JSONL) | 1,844 | TELECHARGE |
| Secteur Industrie (3 fichiers JSONL) | 1,015 | TELECHARGE |

### Fixes documentes (35 au total)
Les 35 bugs deja resolus sont dans `technicals/debug/fixes-library.md`.
Les plus importants :
- FIX-21 : n8n Code node cache (Task Runner)
- FIX-22 : OpenRouter rate limiting (429)
- FIX-26 : Webhook path/field name incorrects
- FIX-27 : n8n REST API sans cle API

### Tests de concurrence (session 27)
| Config | Pipelines | Concurrency | Standard | Graph | Orchestrator |
|--------|-----------|-------------|----------|-------|--------------|
| Baseline | 3 | 1 | 100% (9s) | 100% (18s) | 100% (14s) |
| Moderate | 3 | 3 | 100% (23s) | 90% (26s) | 70% (35s) |
| Stress | 3 | 5 | 100% (29s) | 90% (44s) | 0% AUTO-STOP |

**Limites de concurrence recommandees** :
- Standard : jusqu'a 5 questions simultanees (rock solid)
- Graph : jusqu'a 3 questions simultanees (leger degrade au-dela)
- Orchestrator : 1 question a la fois (degrade sous charge car delegue aux sous-pipelines)
- Quantitative : non teste (rate limited)

### Fixes session 27 (FIX-29 a FIX-35)
| Fix | Description |
|-----|-------------|
| FIX-29 | Quant postgres→REST API, Orch bitwiseHash, 16 env vars, JWT key |
| FIX-30 | PostgreSQL local pour Orchestrator, HTTP v4.3, continueOnFail |
| FIX-31 | Live diagnostic server (diag-server.py) + improved error tracking |
| FIX-32 | Quant $env Code nodes + Standard sub-workflow return |
| FIX-33 | $env replace ALL refs at import time (n8n 2.8 blocks ALL) |
| FIX-34 | Orchestrator: executeWorkflow → httpRequest (sub-wf return vide) |
| FIX-35 | Quantitative: OPENROUTER_BASE_URL manquait /chat/completions |

---

## 12. PROCHAINES ETAPES

### Session 28 (prochaine)
1. **Deployer Qwen 2.5 Coder 32B comme LLM_SQL_MODEL sur HF Space** (pool RPM separe)
2. **Implementer rotation 3 modeles dans le Code node Quantitative** (60 RPM combines)
3. **Valider Phase 1** : full eval 200q sur les 4 pipelines (3 iterations stables)

### Phase 2 → Phase 3
- Phase 2 : 3,000 questions → objectifs relaxes (Graph >= 60%, Quant >= 70%)
- Phase 3 : ~10,000 questions → objectifs encore relaxes
- Phase 4 : ~100K questions (infrastructure payante requise)
- Phase 5 : 1M+ questions (production)

### Strategie multi-model
- **Opus 4.6** : Cerveau — analyse, decisions, pilotage (modele principal)
- **Sonnet 4.5** : Bras — recherches web, batch commands (delegue quand pertinent)
- **Haiku 4.5** : Sprint — exploration codebase rapide (delegue pour recherches simples)
- Opus decide QUAND deleguer. Jamais l'inverse.

---

## 13. GLOSSAIRE

| Terme | Signification |
|-------|---------------|
| **RAG** | Retrieval-Augmented Generation — generer des reponses en cherchant d'abord dans une base de donnees |
| **Pipeline** | Enchainement d'etapes pour traiter une question (intent → search → LLM → response) |
| **Webhook** | URL HTTP qui recoit les questions (POST) et renvoie les reponses |
| **n8n** | Outil no-code pour construire des workflows (les pipelines RAG sont des workflows n8n) |
| **Pinecone** | Base de donnees vectorielle (cherche par similarite mathematique) |
| **Neo4j** | Base de donnees graphe (cherche par entites et relations) |
| **Supabase** | Base de donnees SQL (cherche par requetes structurees) |
| **OpenRouter** | Passerelle vers des LLM gratuits (Llama 70B, Gemma 27B) |
| **LLM** | Large Language Model — intelligence artificielle qui genere du texte |
| **Embedding** | Representation numerique d'un texte (vecteur de 1024 nombres) |
| **Jina** | Service qui transforme du texte en embeddings (gratuit, 1M tokens/mois) |
| **HyDE** | Hypothetical Document Embedding — technique pour ameliorer la recherche |
| **Reranking** | Trier les resultats par pertinence apres la recherche initiale |
| **MCP** | Model Context Protocol — permet a Claude Code de parler directement aux services |
| **HF Space** | Machine gratuite sur HuggingFace (16 GB RAM) qui fait tourner n8n |
| **Codespace** | Machine virtuelle ephemere GitHub (8 GB RAM, 60h/mois gratuit) |
| **Vercel** | Service de deploiement automatique pour les sites web (gratuit) |
| **Task Runner** | Composant n8n qui execute les noeuds Code dans un processus separe |
| **Template SQL** | SQL pre-calcule pour des questions connues (bypass le LLM) |

---

*Ce document est maintenu dans `mon-ipad/docs/executive-summary.md`.*
*Mis a jour obligatoirement a chaque session par l'agent Claude Code.*
