# Multi-RAG Orchestrator — Tour de Controle

> Ce fichier est le point d'entree unique. Il existe en symlink dans `directives/claude.md`.
> Il structure la session en 3 phases : LIRE, UTILISER, PRODUIRE.
> **IMPORTANT** : Toute session Claude Code lit ce fichier. Il doit rester concis et a jour.

---

## PHASE 0 — CONTEXTE PERSISTANT (avant tout)

### 0.1 Resilience aux compactages de conversation
Claude Code compacte les messages anciens lors de longues sessions. Pour ne rien perdre :

1. **Lire `directives/session-state.md`** — Fichier de memoire de travail, mis a jour en continu
   pendant la session. Contient : taches en cours, decisions prises, prochaine action.
2. **Lire `directives/status.md`** — Resume de la derniere session complete (post-mortem).
3. **Lire `docs/status.json`** — Metriques live (accuracy, gaps, blockers).

**Regle** : Avant chaque action complexe, re-lire `directives/session-state.md` si
le contexte de conversation semble incomplet (post-compactage).

### 0.2 Mise a jour de session-state.md (OBLIGATOIRE)
Mettre a jour `directives/session-state.md` :
- **Au debut de session** : objectifs, etat initial
- **Apres chaque milestone** : resultat, decisions, prochaine etape
- **Apres chaque push** : reference du commit
- **Avant toute operation longue** (>5 minutes) : documenter l'intention

Format :
```markdown
# Session State — [date]
## Objectif de session : [...]
## Taches en cours : [...]
## Decisions prises : [...]
## Derniere action : [...]
## Prochaine action : [...]
## Commits : [hash1, hash2, ...]
```

### 0.3 Deux sources de verite
| Source | Role | Quand consulter |
|--------|------|-----------------|
| **VM locale** (`/home/termius/mon-ipad/`) | Etat live du code + credentials | Toujours (c'est ton env) |
| **GitHub** (`main` branch) | Checkpoint persistant | Apres compactage, ou pour verifier le dernier push |

Si doute apres compactage : `git log --oneline -5` + lire session-state.md.

---

## PHASE 1 — LIRE (dans cet ordre exact)

### 1.1 Etat actuel (TOUJOURS en premier)
```bash
cat directives/session-state.md             # Memoire de travail (si existe)
cat docs/status.json                        # Metriques live
cat directives/status.md                    # Resume derniere session
```

### 1.2 Comprendre le projet
Lire `directives/objective.md` :
- Objectif final (Multi-RAG SOTA, 4 pipelines, 1M+ questions)
- Situation actuelle (quel pipeline bloque, etat des BDD)
- Workflow IDs Docker verifies

### 1.3 Comprendre le processus
Lire `directives/workflow-process.md` :
- Boucle d'iteration : 1/1 → 5/5 → 10/10 → 200q
- Double analyse OBLIGATOIRE (node-analyzer + analyze_n8n_executions)
- Checklist d'analyse par noeud
- Regles avant tout fix

### 1.4 Reference technique des endpoints
Lire `directives/n8n-endpoints.md` UNIQUEMENT quand tu dois :
- Appeler un webhook (formats verifies, timestamps Paris a la seconde)
- Modifier un workflow via API REST
- Verifier un Workflow ID ou Webhook Path

### 1.5 References techniques supplementaires (AU BESOIN seulement)
- `technicals/architecture.md` — Architecture detaillee des 4 pipelines + 9 workflows
- `technicals/stack.md` — Stack technique complete
- `technicals/credentials.md` — Configuration des services (cles dans .env.local)
- `technicals/phases-overview.md` — Strategie 5 phases et gates
- `technicals/knowledge-base.json` — Patterns d'erreurs connus
- `mcp/README.md` — Status des 7 MCP servers

---

## PHASE 2 — UTILISER (outils et commandes)

### 2.1 MCP Servers (configures dans `.claude/settings.json`)
| MCP | Usage | Status |
|-----|-------|--------|
| `n8n` | Executer et inspecter des workflows n8n (Docker natif) | Via localhost:5678 |
| `pinecone` | Interroger le vector store (22K+ vecteurs, 3 indexes) | OK |
| `neo4j` | Interroger le graph (19K+ nodes) | OK |
| `jina-embeddings` | Embeddings Jina + Pinecone CRUD | OK |
| `supabase` | SQL queries directes | OK |
| `cohere` | Reranking (embed epuise) | Limite |
| `huggingface` | Recherche modeles/datasets | OK |

### 2.2 Commandes d'evaluation (dossier `eval/`)
| Commande | Usage |
|----------|-------|
| `python3 eval/quick-test.py --questions 1 --pipeline <cible>` | Smoke test 1 question |
| `python3 eval/quick-test.py --questions 5 --pipeline <cible>` | Test 5 questions |
| `python3 eval/iterative-eval.py --label "..."` | Eval progressive 5→10→50 |
| `python3 eval/run-eval-parallel.py --reset --label "..."` | Full eval 200q |
| `python3 eval/node-analyzer.py --execution-id <ID>` | Analyse node-par-node (diagnostics auto) |
| `python3 eval/node-analyzer.py --pipeline <cible> --last 5` | Dernieres 5 executions |
| `python3 eval/generate_status.py` | Regenerer docs/status.json |
| `python3 eval/phase_gates.py` | Verifier les gates de phase |

**IMPORTANT** : Toujours `source .env.local` avant d'executer les scripts Python.

### 2.3 Commandes d'analyse (dossier `scripts/`)
| Commande | Usage |
|----------|-------|
| `python3 scripts/analyze_n8n_executions.py --execution-id <ID>` | Analyse brute complete (JSON integral) |
| `python3 scripts/analyze_n8n_executions.py --pipeline <cible> --limit 5` | Analyse par pipeline |

### 2.4 Commandes n8n (dossier `n8n/`)
| Commande | Usage |
|----------|-------|
| `python3 n8n/sync.py` | Sync n8n → GitHub |

### 2.5 Reference complete des commandes
Voir `utilisation/commands.md` pour la liste exhaustive avec tous les arguments.

### 2.6 Modification de workflows n8n (CRITIQUE)

**n8n = source de verite. GitHub = copie.**

```
1. DIAGNOSTIQUER  → eval/node-analyzer.py + scripts/analyze_n8n_executions.py
2. FIXER          → API REST n8n (voir directives/n8n-endpoints.md)
3. VERIFIER       → eval/quick-test.py --questions 5 minimum
4. SYNC           → n8n/sync.py
5. ARCHIVER       → copier vers n8n/validated/ si 5/5 passe
6. COMMIT         → git push
```

**JAMAIS** : editer les JSON workflow dans le repo, fixer plusieurs noeuds a la fois, deployer sans 5q de verification.

---

## PHASE 3 — PRODUIRE (outputs obligatoires)

### 3.1 Apres chaque test
- Logs d'execution → `logs/` (auto-genere par les scripts)
- Diagnostics → `logs/diagnostics/`
- Copier les resultats dans `logs/tests/<Nq>/` selon le nombre de questions

### 3.2 Apres chaque fix reussi (5/5 passe)
- Sync workflow : `python3 n8n/sync.py`
- Copier workflow actuel → `snapshot/current/`
- Regenerer status : `python3 eval/generate_status.py`
- Mettre a jour `directives/session-state.md`
- **Commit + push** (IMMEDIATEMENT, ne pas attendre la fin de session)

### 3.3 Pushes reguliers (OBLIGATOIRE)
- **Push apres chaque fix reussi** (5/5 passe)
- **Push apres chaque milestone** (pipeline passe 10/10)
- **Push toutes les 30 minutes** minimum si des modifications existent
- **Push avant toute operation risquee** (modification workflow, changement de modele)

### 3.4 Comparaison avec les references (OBLIGATOIRE)
Toujours comparer les tests actuels avec les **dernieres executions confirmees comme reussies** :
- Les references sont dans `snapshot/good/` (workflows + executions JSON)
- Utiliser `scripts/analyze_n8n_executions.py --execution-id <ID>` pour comparer les donnees brutes
- Utiliser `eval/node-analyzer.py --execution-id <ID>` pour comparer les diagnostics
- NE remplacer les references dans `snapshot/good/` QUE si les nouveaux tests sont confirmes superieurs

### 3.5 Pre-push security check (OBLIGATOIRE)
Avant chaque `git push`, verifier qu'aucune cle n'est exposee :
```bash
git diff --cached | grep -i 'sk-or-\|pcsk_\|jV_zGdx\|sbp_\|hf_[A-Za-z]\{10\}\|jina_[a-f0-9]\{10\}'
```
Si un match est trouve : **NE PAS PUSHER**. Remplacer par `REDACTED` ou une reference env var.

### 3.6 En fin de session — Checklist OBLIGATOIRE (dans cet ordre)

#### Etape 1 — Outputs obligatoires (toujours)
1. **`technicals/`** — Mettre a jour architecture.md, stack.md si changements decouverts
2. **`utilisation/commands.md`** — Ajouter commandes echouees, mettre a jour commandes
3. **`snapshot/current/`** — Sync des workflows actuels depuis n8n
4. **`docs/data.json`** — Regenerer avec les resultats de la session
5. **`directives/session-state.md`** — Etat final de la session
6. **`directives/status.md`** — EN DERNIER : resume session, fichiers modifies, prochaine action

#### Etape 2 — Outputs conditionnels (si necessaire)
7. **`directives/n8n-endpoints.md`** — Si workflow IDs ou endpoints ont change
8. **`n8n/live/`** — Sync via `python3 n8n/sync.py`
9. **`snapshot/good/`** — Remplacer les references UNIQUEMENT si nouveaux tests superieurs
10. **`eval/`** — Si scripts de test ont ete modifies

#### Etape 3 — Commit final
```bash
git add -A && git commit -m "session: <date> (<sN>) - <resume>"
git push
```

### 3.7 Reinitialisation data.json (chaque session)
```bash
source .env.local
python3 scripts/analyze_n8n_executions.py --pipeline standard --limit 1
python3 scripts/analyze_n8n_executions.py --pipeline graph --limit 1
python3 scripts/analyze_n8n_executions.py --pipeline quantitative --limit 1
python3 scripts/analyze_n8n_executions.py --pipeline orchestrator --limit 1
```
Puis integrer dans `docs/data.json`.

### 3.8 Outputs dates (archives)
Tout output de session non-structurel → `outputs/` avec prefixe `JJ-mmm-description.ext`
Exemple : `14-fev-docker-fixes-analysis.md`

---

## Processus Team-Agentic (OBLIGATOIRE)

Toutes les taches complexes doivent etre executees en mode **team-agentic** :

### Principes
1. **Parallelisation** : Lancer les taches independantes en parallele via le Task tool
   - Exemple : analyse de 4 fichiers → 4 agents paralleles
   - **EXCEPTION** : Tests de pipelines n8n → TOUJOURS sequentiels (503 overload)
2. **Delegation specialisee** : Chaque sous-tache a un agent dedie
   - Agent d'analyse (Explore/Bash) : lit les executions, identifie les patterns
   - Agent de fix (Bash) : modifie le workflow via API REST
   - Agent de test (Bash) : execute les tests et reporte
3. **Coordination** : L'agent principal coordonne, ne duplique pas le travail des sous-agents
4. **Reference-based testing** : Toujours comparer avec `snapshot/good/` avant de conclure

### Optimisations
- **Background agents** : Utiliser `run_in_background: true` pour les taches longues (eval, sync)
  puis continuer avec d'autres taches et checker le resultat plus tard
- **Agent resume** : Utiliser `resume` pour reprendre un agent avec son contexte complet
  plutot que de relancer un nouveau avec le meme prompt
- **Haiku pour taches simples** : Utiliser `model: haiku` pour les taches rapides
  (lecture de fichiers, grep, git status) afin d'economiser du contexte
- **Opus pour taches complexes** : Garder opus pour l'analyse, les decisions d'architecture,
  et la planification
- **Ne pas dupliquer** : Si un agent fait une recherche, ne pas refaire la meme recherche
  dans le contexte principal

### Anti-patterns
- Ne PAS lancer 4 tests de pipelines en parallele (n8n 503)
- Ne PAS creer d'agents pour des taches triviales (un seul Read suffit)
- Ne PAS oublier de checker les resultats des background agents

---

## Gestion des Credentials (CRITIQUE)

### Principe fondamental
**`.env.local` = seule source de credentials. GitHub = ZERO credentials.**

### Regles
1. **JAMAIS** de cles API en clair dans les fichiers trackes par git
2. Les scripts Python doivent lire les credentials depuis `os.environ` ou `.env.local`
3. Les snapshots de workflows (`snapshot/workflows/`) contiennent des REDACTED
4. Le scrub automatique : `python3 /tmp/scrub_keys.py` avant chaque push si doute
5. `.claude/settings.json` et `.mcp.json` sont dans `.gitignore` — OK pour les cles

### Rotation de cles API
| Service | Type | Procedure de rotation |
|---------|------|----------------------|
| OpenRouter | Free tier, expiration frequente | 1. Generer nouvelle cle sur openrouter.ai/keys. 2. Mettre a jour `.env.local`. 3. Mettre a jour `.claude/settings.json` (jina-embeddings MCP). 4. Mettre a jour n8n workflows via API REST (LLM nodes). |
| Cohere | Trial (1000 calls/mois) | 1. Creer nouveau compte trial si epuise. 2. Mettre a jour `.env.local`. 3. Mettre a jour `.claude/settings.json` (cohere MCP). |
| Jina | Free tier (1M tokens/mois) | 1. Regenerer sur jina.ai. 2. Mettre a jour `.env.local` + `.claude/settings.json`. |
| Pinecone | Free tier | Rarement expire. Regenerer sur pinecone.io si necessaire. |
| Neo4j | Aura free tier | Password fixe. Changer dans Neo4j Aura + `.env.local` + `.claude/settings.json`. |
| Supabase | Free tier | PAT token. Regenerer sur supabase.com/dashboard. |
| HuggingFace | Free tier | Token sur huggingface.co/settings/tokens. |

### Verification des credentials
```bash
source .env.local
# Test OpenRouter
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models
# Test Jina
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $JINA_API_KEY" -H "Content-Type: application/json" -d '{"model":"jina-embeddings-v3","input":["test"],"task":"retrieval.passage"}' https://api.jina.ai/v1/embeddings
# Test n8n (via localhost)
curl -s -o /dev/null -w "%{http_code}" -H "X-N8N-API-KEY: $N8N_API_KEY" http://localhost:5678/api/v1/workflows?limit=1
```

---

## Regles d'Or

1. **UN fix par iteration** — jamais plusieurs noeuds simultanement
2. **n8n = source de verite** — editer dans n8n, sync vers GitHub
3. **Double analyse AVANT chaque fix** — node-analyzer.py + analyze_n8n_executions.py
4. **Verifier AVANT de sync** — 5/5 minimum
5. **Commit + push apres chaque fix reussi** (ne pas attendre la fin de session)
6. **`docs/status.json` est auto-genere** — ne pas editer manuellement
7. **Si 3+ regressions → REVERT immediat**
8. **Mettre a jour `technicals/` apres chaque decouverte technique**
9. **Mettre a jour `directives/status.md` en fin de session** (EN DERNIER)
10. **Toujours travailler depuis `main`**
11. **Push reguliers** — toutes les 30 minutes minimum
12. **Tests sequentiels** — ne JAMAIS tester plusieurs pipelines en parallele (503 overload)
13. **Comparer avec les references** — toujours partir des `snapshot/good/` pour evaluer
14. **ZERO credentials dans git** — pre-push check obligatoire
15. **Mettre a jour session-state.md** — apres chaque milestone et avant operations longues
16. **source .env.local** — avant tout script Python

---

## Credentials — Docker era (post-migration 2026-02-12)

> **Les cles API sont dans `.env.local` (gitignore) et dans les env vars Docker.**
> Ne PAS mettre de cles en clair dans le repo GitHub.

```bash
# n8n Docker self-hosted sur Google Cloud VM
N8N_HOST="http://localhost:5678"          # Utiliser localhost (pas l'IP publique pour l'API)
# N8N_API_KEY → voir .env.local

# Services : OpenRouter, Jina, Cohere, Pinecone, Neo4j, Supabase, HuggingFace
# Toutes les cles → voir .env.local
```

---

## Architecture — 14 dossiers

| # | Dossier | Role |
|---|---------|------|
| 1 | `directives/` | Mission control (objective, workflow-process, n8n-endpoints, status, session-state) |
| 2 | `technicals/` | Documentation technique (architecture, stack, credentials, phases, knowledge-base) |
| 3 | `eval/` | Scripts d'evaluation (quick-test, iterative-eval, node-analyzer) |
| 4 | `scripts/` | Scripts utilitaires Python |
| 5 | `n8n/` | Workflows n8n (live, validated, analysis, sync) |
| 6 | `mcp/` | Serveurs MCP et documentation (7 servers) |
| 7 | `website/` | Code source Next.js + docs site (merged from site/) |
| 9 | `datasets/` | Donnees de test (phase-1, phase-2) |
| 10 | `db/` | Database (migrations, populate, readiness) |
| 11 | `snapshot/` | Snapshots : `good/` (references OK), `current/` (session), `workflows/`, `db/` |
| 12 | `logs/` | Logs d'execution + `tests/1q/`, `tests/5q/`, `tests/10q/`, `tests/20q/` |
| 13 | `outputs/` | Archives de sessions datees |
| 14 | `docs/` | Dashboard (data.json, status.json, index.html) |

---

## Pipelines

| Pipeline | Webhook Path | DB | Target Phase 1 |
|----------|-------------|-----|----------------|
| Standard | `/webhook/rag-multi-index-v3` | Pinecone | >= 85% |
| Graph | `/webhook/ff622742-...` | Neo4j + Supabase | >= 70% |
| Quantitative | `/webhook/3e0f8010-...` | Supabase | >= 85% |
| Orchestrator | `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0` | Meta | >= 70% |
| **Overall** | | | **>= 75%** |

LLM : Modeles gratuits via OpenRouter ($0).
Embeddings : Jina embeddings v3 (free tier, 1024-dim).

## Acces

| Ressource | Acces | Note |
|-----------|-------|------|
| n8n API + MCP | LOCALHOST | `localhost:5678` (Docker self-hosted) |
| n8n Webhooks | PUBLIC IP | `34.136.180.66:5678` (pour les tests) |
| GitHub, Pinecone | DIRECT | git + HTTPS API |
| Supabase | VIA MCP + n8n | `ayqviqmxifzmhphiqfmj.supabase.co` |
| Neo4j | VIA MCP | `neo4j+s://38c949a2.databases.neo4j.io` |
