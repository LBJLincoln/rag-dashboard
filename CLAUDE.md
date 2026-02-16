# Multi-RAG Orchestrator — Tour de Controle Centrale

> **Ce repo (`mon-ipad`) est le CENTRE DE COMMANDE.**
> Il pilote 4 repos satellites depuis la VM Google Cloud via Termius.
> Toute session Claude Code commence ici. Il doit rester concis et a jour.

---

## ARCHITECTURE MULTI-REPO (5 repos)

### Vue d'ensemble
```
┌─────────────────────────────────────────────────────────────────┐
│                 GitHub (LBJLincoln) — TOUS PRIVES                │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  mon-ipad    │  rag-tests   │ rag-website  │ rag-data-ingestion │
│  CONTROLE    │  4 WF RAG    │  2 sites web │ 2 WF ingestion     │
│              │              │              │                    │
│              │  + rag-dashboard (live metrics)                   │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
    VM GCloud      Codespaces    Vercel/GH       Codespaces
    (controle)    (tests lourds)  Pages          (ingestion)
```

### Repos et responsabilites
| Repo | Role | Workflows n8n | Execution |
|------|------|--------------|-----------|
| `mon-ipad` | Tour de controle, directives, CLAUDE.md | Orchestrator + transversaux | VM (permanent) |
| `rag-tests` | Eval des 4 pipelines RAG (1q→1Mq) | Standard, Graph, Quant, Orchestrator | Codespaces |
| `rag-website` | Site business (4 secteurs, chatbots) | Aucun (consomme orchestrator) | Vercel |
| `rag-dashboard` | Dashboard technique live | Aucun (lit status.json + SSE) | Vercel/GH Pages |
| `rag-data-ingestion` | Ingestion + enrichissement BDD | Ingestion V3.1, Enrichissement V3.1 | Codespaces |

### Remotes configures (depuis ce repo)
```bash
origin           → github.com/LBJLincoln/mon-ipad.git
rag-tests        → github.com/LBJLincoln/rag-tests.git
rag-website      → github.com/LBJLincoln/rag-website.git
rag-dashboard    → github.com/LBJLincoln/rag-dashboard.git
rag-data-ingestion → github.com/LBJLincoln/rag-data-ingestion.git
```

---

## PHASE 0 — CONTEXTE PERSISTANT

### 0.1 Resilience aux compactages
1. **Lire `directives/session-state.md`** — Memoire de travail
2. **Lire `directives/status.md`** — Resume derniere session
3. **Lire `docs/status.json`** — Metriques live

**Regle** : Avant chaque action complexe, re-lire `directives/session-state.md`.

### 0.2 Mise a jour session-state.md (OBLIGATOIRE)
```markdown
# Session State — [date]
## Objectif de session : [...]
## Taches en cours : [...]
## Decisions prises : [...]
## Derniere action : [...]
## Prochaine action : [...]
## Commits : [hash1, hash2, ...]
## Repos impactes : [mon-ipad, rag-tests, ...]
```

### 0.3 Sources de verite
| Source | Role |
|--------|------|
| **VM locale** (`/home/termius/mon-ipad/`) | Etat live + credentials + controle |
| **GitHub** (5 repos prives) | Checkpoints persistants |
| **Codespaces** (ephemeres) | Execution lourde, resultats pushes vers repos |

---

## PHASE 1 — LIRE

### 1.1 Etat actuel (TOUJOURS en premier)
```bash
cat directives/session-state.md
cat docs/status.json
cat directives/status.md
```

### 1.2 Comprendre le projet
- `directives/objective.md` — Objectif final, situation actuelle
- `propositions` — Architecture multi-repo, n8n distribue

### 1.3 Comprendre le processus
- `directives/workflow-process.md` — Boucle d'iteration
- `directives/n8n-endpoints.md` — Webhooks et API REST

### 1.4 References techniques
- `technicals/architecture.md` — 4 pipelines + 9 workflows
- `technicals/stack.md` — Stack technique
- `technicals/credentials.md` — Configuration services
- `technicals/phases-overview.md` — 5 phases et gates
- `technicals/infrastructure-plan.md` — Plan d'infrastructure distribuee
- `technicals/sector-datasets.md` — 1000+ types de documents par secteur
- `directives/dataset-rationale.md` — Justification des 14 benchmarks

---

## PHASE 2 — UTILISER

### 2.1 MCP Servers
| MCP | Usage | Status |
|-----|-------|--------|
| `n8n` | Executer et inspecter workflows (Docker localhost:5678) | OK |
| `pinecone` | Vector store (22K+ vecteurs, 3 indexes) | OK |
| `neo4j` | Graph (19K+ nodes) | OK |
| `jina-embeddings` | Embeddings Jina + Pinecone CRUD | OK |
| `supabase` | SQL queries directes | OK |
| `cohere` | Reranking (embed epuise) | Limite |
| `huggingface` | Recherche modeles/datasets | OK |

### 2.2 Commandes d'evaluation
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

### 2.4 Commandes multi-repo (NOUVEAU)
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

### 2.5 Commandes Codespaces (controle distant)
```bash
# Lister les Codespaces actifs
# (necessite gh CLI — installer si absent)
# Alternative : via GitHub API
TOKEN=$(git remote get-url origin | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
curl -s -H "Authorization: token $TOKEN" "https://api.github.com/user/codespaces"

# Annuler un Codespace (arreter un test distant)
curl -s -X POST -H "Authorization: token $TOKEN" \
  "https://api.github.com/user/codespaces/<name>/stop"
```

### 2.6 Modification de workflows n8n (CRITIQUE)
```
1. DIAGNOSTIQUER  → node-analyzer.py + analyze_n8n_executions.py
2. FIXER          → API REST n8n
3. VERIFIER       → quick-test.py --questions 5 minimum
4. SYNC           → n8n/sync.py
5. ARCHIVER       → snapshot/validated/
6. COMMIT+PUSH    → origin + repos concernes
```

---

## PHASE 3 — PRODUIRE

### 3.1 Apres chaque test
- Logs → `logs/`
- Diagnostics → `logs/diagnostics/`
- Status → `docs/status.json` (auto-genere)

### 3.2 Apres chaque fix reussi (5/5 passe)
1. Sync : `python3 n8n/sync.py`
2. Snapshot : `snapshot/current/`
3. Status : `python3 eval/generate_status.py`
4. Session-state : `directives/session-state.md`
5. **Commit + push IMMEDIATEMENT** (origin + repos concernes)

### 3.3 Pushes reguliers (OBLIGATOIRE)
- Apres chaque fix reussi
- Apres chaque milestone
- **Toutes les 30 minutes** minimum
- Avant operations risquees
- **Vers TOUS les repos concernes** (pas juste origin)

### 3.4 Pre-push security check
```bash
git diff --cached | grep -i 'sk-or-\|pcsk_\|jV_zGdx\|sbp_\|hf_[A-Za-z]\{10\}\|jina_[a-f0-9]\{10\}\|ghp_'
```

### 3.5 En fin de session — Checklist
1. `technicals/` — MAJ si changements
2. `snapshot/current/` — Sync workflows
3. `docs/data.json` — Regenerer
4. `directives/session-state.md` — Etat final
5. `directives/status.md` — Resume session (EN DERNIER)
6. **Commit + push vers origin ET repos satellites impactes**

---

## Processus Team-Agentic (OBLIGATOIRE)

### Principes
1. **Parallelisation** : Taches independantes en parallele (sauf tests n8n → sequentiels)
2. **Delegation specialisee** : Agent analyse, agent fix, agent test
3. **Coordination** : L'agent principal ne duplique pas
4. **Reference-based** : Comparer avec `snapshot/good/`

### Optimisations
- `run_in_background: true` pour taches longues
- `resume` pour reprendre un agent
- `model: haiku` pour taches simples
- `model: opus` pour decisions complexes

### Architecture distribuee
- Tests legers (1-10q) → VM directement
- Tests moyens (50-200q) → VM avec queue mode
- Tests lourds (500q+) → Codespace worker via SSH tunnel
- Ingestion massive → Codespace dedie rag-data-ingestion

---

## Gestion des Credentials (CRITIQUE)

**`.env.local` = seule source. GitHub = ZERO credentials.**

### Regles
1. JAMAIS de cles en clair dans les fichiers trackes
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
| Cohere | Trial (limite) | Reranking backup |
| HuggingFace | Free tier | Modeles/datasets |

---

## Regles d'Or

1. **UN fix par iteration** — jamais plusieurs noeuds
2. **n8n = source de verite** — editer dans n8n, sync vers GitHub
3. **Double analyse AVANT chaque fix**
4. **5/5 minimum avant sync**
5. **Commit + push apres chaque fix** (tous repos concernes)
6. **`docs/status.json` auto-genere** — ne pas editer
7. **3+ regressions → REVERT**
8. **MAJ `technicals/` apres decouvertes**
9. **MAJ `directives/status.md` en fin de session**
10. **Travailler depuis `main`** (tous repos)
11. **Push reguliers** — 30 min minimum
12. **Tests sequentiels** — jamais paralleles (503)
13. **Comparer avec references** — `snapshot/good/`
14. **ZERO credentials dans git**
15. **MAJ session-state.md** — apres chaque milestone
16. **source .env.local** — avant tout script Python
17. **Push multi-repo** — origin + satellites impactes
18. **Codespaces = ephemere** — resultats pushes avant arret

---

## Infrastructure

### VM Google Cloud (permanent)
```
N8N_HOST="http://localhost:5678"
# Credentials → .env.local
```

### Pipelines
| Pipeline | Webhook Path | DB | Target Phase 1 |
|----------|-------------|-----|----------------|
| Standard | `/webhook/rag-multi-index-v3` | Pinecone | >= 85% |
| Graph | `/webhook/ff622742-...` | Neo4j + Supabase | >= 70% |
| Quantitative | `/webhook/3e0f8010-...` | Supabase | >= 85% |
| Orchestrator | `/webhook/92217bb8-...` | Meta | >= 70% |
| **Overall** | | | **>= 75%** |

### Acces
| Ressource | Acces |
|-----------|-------|
| n8n API + MCP | localhost:5678 |
| n8n Webhooks | 34.136.180.66:5678 |
| Pinecone | HTTPS API |
| Neo4j | neo4j+s://38c949a2.databases.neo4j.io |
| Supabase | ayqviqmxifzmhphiqfmj.supabase.co |

### Architecture dossiers (ce repo)
| Dossier | Role |
|---------|------|
| `directives/` | Mission control |
| `technicals/` | Documentation technique |
| `eval/` | Scripts d'evaluation |
| `scripts/` | Utilitaires Python |
| `n8n/` | Workflows (live, validated, sync) |
| `mcp/` | Serveurs MCP |
| `website/` | Code Next.js (business + dashboard) |
| `datasets/` | Donnees de test |
| `snapshot/` | References (good, current) |
| `logs/` | Logs d'execution |
| `outputs/` | Archives sessions |
| `docs/` | Dashboard data (status.json, data.json) |
