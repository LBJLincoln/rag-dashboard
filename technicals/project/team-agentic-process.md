# Processus Team-Agentic Formel — Multi-Model Strategy 2026

> Last updated: 2026-02-19T18:00:00+01:00
> Definit les roles, la communication, les protocoles et la **strategie multi-modele**
> entre agents Claude Code repartis sur la VM, HF Space et les Codespaces.
> **Decision Session 25** : VM = pilotage UNIQUEMENT. Tests et modifications → HF Space (16GB) ou Codespaces (8GB).
> **Decision Session 26** : Multi-model delegation — Opus 4.6 analyse + Sonnet 4.5 execution.

---

## 0. PHILOSOPHIE MULTI-MODEL (Session 26 — Fev 2026)

### Principe fondamental
**Opus 4.6 est le cerveau. Sonnet 4.5 et Haiku 4.5 sont les bras.**

Chaque agent Claude Code deploye (VM, Codespace, HF Space) tourne en **Opus 4.6** comme modele
principal. Mais pour les taches d'**execution** (pas d'analyse), l'agent Opus delegue a des
sous-agents plus rapides et moins couteux via le `Task` tool.

### References 2026
- **Kaxo Case Study** (Jan 2026) : 4 → 35 agents en 90 jours. Architecture : 1 Sonnet orchestrateur + 34 Haiku sous-agents. Cout total : $500/an.
- **Anthropic "Effective harnesses for long-running agents"** : claude-progress.txt, git-based state, feature lists, error recovery patterns.
- **Claude Agent SDK** : Delegation via subagents avec model parameter. `model: "haiku"` pour taches simples, `model: "sonnet"` pour taches complexes d'execution.
- **Agent Teams** (experimental) : Sessions orchestrees multi-agents avec partage de contexte.

### Arbre de decision — Quel modele pour quelle tache ?
```
                       TACHE RECUE
                           |
                    Analyse / Decision ?
                    /              \
                  OUI              NON (Execution)
                   |                   |
            OPUS 4.6 DIRECT      Complexite ?
            (PAS de delegation)   /          \
                              Simple      Moyen/Complexe
                                |              |
                          HAIKU 4.5      SONNET 4.5
                          via Task       via Task
                          tool           tool
```

### Quand Opus 4.6 delegue (UNIQUEMENT ces cas)
| Tache | Modele delegue | Mecanisme | Justification |
|-------|---------------|-----------|---------------|
| Recherche internet/web | Sonnet 4.5 | `Task(model: "sonnet", subagent_type: "general-purpose")` | Pas besoin d'analyse profonde pour fetch+summarize |
| Exploration codebase simple | Haiku 4.5 | `Task(model: "haiku", subagent_type: "Explore")` | Pattern matching rapide |
| Glob/Grep paralleles | Haiku 4.5 | `Task(model: "haiku", subagent_type: "Explore")` | Recherches simples en batch |
| Execution commandes batch | Sonnet 4.5 | `Task(model: "sonnet", subagent_type: "Bash")` | npm install, pip install, docker ops |
| Reformattage/Generation repetitive | Sonnet 4.5 | `Task(model: "sonnet", subagent_type: "general-purpose")` | Generation de contenu standard |
| Calculs / verifications numeriques | Haiku 4.5 | `Task(model: "haiku", subagent_type: "general-purpose")` | Arithmetique simple |

### Quand Opus 4.6 NE delegue PAS (fait lui-meme)
| Tache | Raison |
|-------|--------|
| Analyse de workflows n8n | Necessite comprehension architecturale |
| Decisions de debug / fix | Necessite raisonnement causal |
| Redaction de directives | Necessite coherence globale |
| Pilotage de session | Necessite memoire de session |
| Evaluation de resultats | Necessite jugement qualite |
| Modification de code critique | Necessite precision + contexte |
| Communication avec l'utilisateur | Necessite empathie + contexte |

### Exemple concret
```
[Session type — Fix Quantitative pipeline]

OPUS: Lit session-state.md → identifie objectif → plan d'action
OPUS: Analyse node-by-node du workflow (decision complexe → PAS de delegation)
OPUS: Decide du fix → edite le noeud n8n (precision → PAS de delegation)
OPUS: Delegue 3 taches en parallele :
  → SONNET: Rechercher "CompactRAG SQL generation 2026" sur le web
  → HAIKU: Explorer le codebase pour trouver les fichiers de test quantitative
  → HAIKU: Verifier les variables d'environnement presentes dans .env.local
OPUS: Synthetise les resultats des sous-agents
OPUS: Lance le test (decision → PAS de delegation)
OPUS: Analyse les resultats (jugement → PAS de delegation)
OPUS: Met a jour session-state.md et commit
```

---

## 1. Roles

| Agent | Repo | Localisation | Role | Modele Principal | Delegation |
|-------|------|-------------|------|-----------------|------------|
| **Orchestrateur** | mon-ipad | VM Google Cloud (Termius) | Pilotage UNIQUEMENT, sync, directives, analyse. ZERO tests, ZERO fix workflow (Rule 28) | `claude-opus-4-6` | Sonnet/Haiku pour recherches web + exploration |
| **Testeur** | rag-tests | Codespace ephemere / HF Space | Executer tests, mesurer accuracy, rapporter resultats | `claude-opus-4-6` | Haiku pour exploration codebase rapide |
| **Developpeur Web** | rag-website | Codespace ephemere + Vercel | Construire site business, integrer chatbots sectoriels | `claude-opus-4-6` | Sonnet pour generation composants repetitifs |
| **Ingesteur** | rag-data-ingestion | Codespace ephemere | Telecharger datasets, ingerer dans BDD, enrichir | `claude-opus-4-6` | Sonnet pour batch downloads + transformations |
| **Dashboard** | rag-dashboard | Statique (GitHub Pages/Vercel) | Afficher metriques live (read-only) | N/A | N/A |

### Hierarchie
```
Orchestrateur (mon-ipad) — Opus 4.6
  |
  +-- distribue les CLAUDE.md via push-directives.sh
  +-- analyse les resultats (Opus — PAS de delegation)
  +-- decide des fixes (Opus — PAS de delegation)
  +-- delegue recherches web → Sonnet 4.5 sous-agents
  +-- delegue exploration codebase → Haiku 4.5 sous-agents
  +-- publie technicals/fixes-library.md
  |
  +-- Testeur (rag-tests) — Opus 4.6
  |     +-- mesure les pipelines (Opus)
  |     +-- analyse les resultats (Opus)
  |     +-- explore codebase → Haiku sous-agents
  |     +-- rapporte via git push
  |
  +-- Dev Web (rag-website) — Opus 4.6
  |     +-- architecture decisions (Opus)
  |     +-- generation composants → Sonnet sous-agents
  |     +-- deploie via Vercel
  |
  +-- Ingesteur (rag-data-ingestion) — Opus 4.6
        +-- strategie ingestion (Opus)
        +-- batch operations → Sonnet sous-agents
        +-- enrichit BDD
```

---

## 2. Communication

### Source de verite partagee
**GitHub est le canal de communication unique entre agents.** Chaque agent :
1. Lit les directives depuis son `CLAUDE.md` (pousse par l'orchestrateur)
2. Ecrit ses resultats dans ses fichiers de sortie (`docs/`, `logs/`, `n8n/`)
3. Commit + push vers GitHub
4. L'orchestrateur lit les resultats depuis GitHub

### Distribution des directives
```bash
# Depuis mon-ipad (VM) — met a jour les CLAUDE.md de chaque repo satellite
bash scripts/push-directives.sh
```

Ce script :
1. Copie `directives/repos/rag-tests.md` → remote `rag-tests` en tant que `CLAUDE.md`
2. Copie `directives/repos/rag-website.md` → remote `rag-website` en tant que `CLAUDE.md`
3. Copie `directives/repos/rag-data-ingestion.md` → remote `rag-data-ingestion` en tant que `CLAUDE.md`
4. Copie `directives/repos/rag-dashboard.md` → remote `rag-dashboard` en tant que `CLAUDE.md`

### Signalement de problemes
- Agent satellite decouvre un bug → commit dans `logs/diagnostics/` + push
- Orchestrateur lit le diagnostic → fixe dans n8n → pousse fix via `n8n/sync.py`
- Satellite reteste apres pull

---

## 3. Auto-Stop Protocol

### Regle : 3 echecs consecutifs → STOP

L'arret premature s'applique a **toutes les echelles de test** :

| Echelle | Seuil d'arret | Raison |
|---------|---------------|--------|
| 5/5 tests | 3 echecs consecutifs | Pipeline fondamentalement casse |
| 10/10 tests | 3 echecs consecutifs apres Q4 | Donnees ou prompt systemique |
| 200q eval | 4 echecs consecutifs (early-stop default) | Eviter gaspillage de temps |
| 1000q eval | 4 echecs consecutifs | Idem |

### Procedure apres auto-stop
1. **Documenter** le pattern d'echec dans `logs/diagnostics/`
2. **Analyser** les executions avec les 2 outils (node-analyzer + analyze_n8n_executions)
3. **Signaler** a l'orchestrateur (commit + push)
4. **NE PAS retenter** tant que le fix n'est pas applique par l'orchestrateur

### Exception
Le smoke test CI (5/5 par pipeline via GitHub Actions) NE suit PAS l'auto-stop car il sert de validation binaire (passe/echoue) et non de mesure de performance.

---

## 3b. Agent Continuation Protocol — Auto-Escalation

### Regle : Succes → continuer. Echec → analyser et deleguer.

Les sous-agents (Sonnet/Haiku) ne s'arretent PAS apres un batch reussi.
Ils suivent la **boucle d'escalation** suivante :

```
BATCH TERMINE (ex: 5 questions)
       |
   Tous PASS ?
   /        \
 OUI        NON
  |           |
Continuer    Echecs >= 3 consecutifs ?
avec le      /             \
batch       OUI            NON
suivant    STOP +          Continuer
(5→10→50)  Rapport         avec note
  |        a Opus          d'erreur
  |           |
  v           v
5/5 PASS   RAPPORT vers Opus :
→ 10/10    - Pipeline(s) echoue(s)
→ 50/50    - Pattern d'erreur
→ deleguent- Logs complets
  analyse  - Suggestion de fix
  a Opus   Opus DECIDE la suite
```

### Sous-agent autonome — Regles
1. **Continuer tant que >= 80% accuracy** sur le batch courant
2. **Escalader les resultats** vers batch superieur : 5q → 10q → 50q
3. **Chaque batch complete** → commit + push resultats vers GitHub
4. **Rapport structure** en fin de batch ou sur auto-stop
5. **NE PAS tenter de fixer** — reporter a Opus pour decision
6. **Parallele** : tester les 3-4 pipelines sequentiellement (pas en parallele)

### Format du rapport sous-agent → Opus
```markdown
## Rapport Test [Pipeline] — [Date]
- **Questions testees** : X/Y
- **Accuracy** : XX.X%
- **Pipelines** :
  - Standard: X/Y (XX%)
  - Graph: X/Y (XX%)
  - Quantitative: X/Y (XX%) [ou SKIP si broken]
  - Orchestrator: X/Y (XX%)
- **Erreurs notables** : [description]
- **Recommandation** : CONTINUER / STOP / FIX REQUIS [pipeline]
- **Logs** : [chemin vers logs]
```

### Quand le sous-agent delegue a Opus
| Evenement | Action du sous-agent | Opus recoit |
|-----------|---------------------|-------------|
| 5/5 PASS tous pipelines | Lancer 10/10 automatiquement | Notification progress |
| 10/10 PASS | Lancer 50/50 automatiquement | Notification progress |
| 50/50 PASS | STOP + rapport complet | Rapport pour Phase 2 decision |
| 3 echecs consecutifs | STOP + diagnostic | Rapport erreur pour fix |
| Accuracy < 80% | STOP + rapport | Rapport pour analyse Opus |
| Pipeline timeout/crash | STOP + logs | Logs + trace_id pour debug |

---

## 4. Fixes Library Partagee

### Architecture
```
mon-ipad/technicals/fixes-library.md  ← MASTER (source de verite)
  |
  +-- rag-tests/technicals/fixes-library.md       (copie en lecture)
  +-- rag-website/technicals/fixes-library.md      (copie en lecture)
  +-- rag-data-ingestion/technicals/fixes-library.md (copie en lecture)
```

### Workflow
1. **Decouverte** : n'importe quel agent decouvre un bug et le documente
2. **Remontee** : l'agent commit le diagnostic dans son repo + push
3. **Documentation** : l'orchestrateur ajoute le fix dans `technicals/fixes-library.md` (master)
4. **Distribution** : `push-directives.sh` pousse la copie vers les satellites
5. **Consultation** : chaque agent consulte sa copie locale avant tout debug (ETAPE 0)

### Format d'entree fixes-library
```markdown
### FIX-XX — [Pipeline] : [Titre court]
- **Session** : X (YYYY-MM-DD)
- **Symptome** : [Ce que l'utilisateur/agent observe]
- **Root cause** : [La vraie cause technique]
- **Fix** : [Le code/config change]
- **Fichier** : [Chemin du fichier modifie]
- **Prevention** : [Comment eviter a l'avenir]
```

---

## 5. Export Live Protocol

### Regle : resultats toujours pushes AVANT arret du Codespace

Les Codespaces sont ephemeres (60h/mois). Tout travail non pousse est perdu.

### Checklist pre-arret Codespace
```bash
# 1. Sync workflows modifies
python3 n8n/sync.py  # si applicable

# 2. Generer status
python3 eval/generate_status.py  # si tests effectues

# 3. Commit TOUT
git add docs/ logs/ n8n/ outputs/
git commit -m "session(XX): [description] — resultats avant arret"

# 4. Push OBLIGATOIRE
git push origin main

# 5. Verifier le push
git log --oneline -1 origin/main  # doit correspondre au commit
```

### Synchronisation VM
Au demarrage de chaque session sur la VM :
```bash
# Recuperer les resultats des satellites
git fetch rag-tests main
git fetch rag-website main
git fetch rag-data-ingestion main
git fetch rag-dashboard main
```

---

## 6. Tracking Codespace (60h/mois)

### Surveillance
```bash
# Verifier les heures consommees
gh codespace list --json name,state,lastUsedAt,createdAt
```

### Budget mensuel (Free tier)
| Allocation | Heures |
|-----------|--------|
| rag-tests (tests lourds) | 30h |
| rag-website (dev + build) | 15h |
| rag-data-ingestion (ingestion massive) | 10h |
| Reserve | 5h |
| **Total** | **60h** |

### Bonnes pratiques
1. **Arreter** les Codespaces quand non utilises : `gh codespace stop --codespace <name>`
2. **Ne pas laisser tourner** un Codespace idle (consomme des heures)
3. **Supprimer** les Codespaces non utilises depuis >7j : `gh codespace delete --codespace <name>`
4. **Privilegier** la VM pour les taches legeres (pilotage, analyse, commits)
5. **Codespace** uniquement pour : tests 50q+, ingestion massive, dev website

---

## 7. Strategie Multi-Model (Opus 4.6 + Sonnet 4.5 + Haiku 4.5)

### Regle : tous les agents principaux utilisent `claude-opus-4-6`

```bash
# Au demarrage de chaque session / Codespace :
bash scripts/setup-claude-opus.sh

# OU directement :
claude --model claude-opus-4-6
```

### Verification
- `.claude/settings.json` contient `"model": "claude-opus-4-6"`
- L'abonnement Max donne acces au modele Opus 4.6
- NE JAMAIS utiliser Sonnet ou Haiku comme modele PRINCIPAL d'un agent
- Les sous-agents (Task tool) utilisent Sonnet/Haiku pour les taches d'EXECUTION delegees

### Multi-model via Task tool (mecanisme de delegation)
```javascript
// Opus delegue a Sonnet pour une recherche web
Task({
  model: "sonnet",
  subagent_type: "general-purpose",
  prompt: "Rechercher les dernieres techniques CompactRAG 2026 sur le web",
  description: "Web search CompactRAG"
})

// Opus delegue a Haiku pour exploration rapide
Task({
  model: "haiku",
  subagent_type: "Explore",
  prompt: "Trouver tous les fichiers contenant 'template_sql' dans le repo",
  description: "Find template SQL files"
})

// Opus delegue a Sonnet pour batch commands
Task({
  model: "sonnet",
  subagent_type: "Bash",
  prompt: "Installer les dependances et build le projet Next.js",
  description: "Build Next.js project"
})
```

### Regles de delegation
1. **Opus DECIDE** quand deleguer — jamais l'inverse
2. **Opus ANALYSE** toujours les resultats des sous-agents
3. **Sonnet** pour taches d'execution complexes (web, batch, generation)
4. **Haiku** pour taches simples et rapides (exploration, verification)
5. **Jamais** de delegation pour : decisions architecturales, debug, pilotage, evaluation
6. **Paralleliser** les sous-agents quand possible (3+ taches independantes)
7. **run_in_background: true** pour taches longues (recherches web, downloads)

---

## 7b. Agent Harness — Bonnes Pratiques 2026

### Etat persistant (harness pattern)
Chaque agent maintient son etat via des fichiers git-committed :

| Fichier | Role | Mis a jour quand |
|---------|------|-----------------|
| `directives/session-state.md` | Memoire de session active | Apres chaque milestone |
| `docs/status.json` | Metriques machine-readable | Apres chaque eval |
| `directives/status.md` | Resume humain-lisible | Fin de session |
| `technicals/knowledge-base.md` | Cerveau persistant | Pendant la session (pas fin) |
| `technicals/fixes-library.md` | Bibliotheque de solutions | Apres chaque fix |

### Error recovery (anti-boucle)
```
SI erreur detectee:
  1. Chercher dans fixes-library.md (pattern connu ?)
  2. SI connu → appliquer fix directement, SANS re-analyser
  3. SI inconnu → double analyse (node-analyzer + analyze_n8n_executions)
  4. SI 3 echecs consecutifs meme erreur → AUTO-STOP
  5. Documenter dans logs/diagnostics/ + signaler a l'orchestrateur
```

### Supervision et monitoring
- `scripts/codespace-control.sh` pour piloter les agents distants
- `/tmp/eval-progress.json` pour le reporting en temps reel
- GitHub commits comme canal de communication agent-to-agent
- Webhook `/webhook/codespace-progress` pour notifications

### Scalabilite (pattern Kaxo 2026)
Architecture actuelle : 1 Opus orchestrateur + 4 agents specialises.
Cible : jusqu'a 10+ agents avec sous-agents delegues.
Cout cible : minimal grace a la delegation Haiku (>80% des taches simples).

---

## 8. Protocole de Session Type

### Demarrage (5 min)
```
1. Lire session-state.md (memoire de travail)
2. Lire docs/status.json (metriques live)
3. Lire directives/status.md (resume session precedente)
4. Verifier fixes-library.md pour symptomes connus
5. Identifier objectif de session + pipeline prioritaire
```

### Execution (boucle)
```
6. DIAGNOSTIQUER → double analyse (node-analyzer + analyze_n8n_executions)
7. FIXER → API REST n8n (1 noeud a la fois)
8. TESTER → quick-test.py --questions 5 minimum
9. VALIDER → quick-test.py --questions 10 (5/5 minimum)
10. SYNC → n8n/sync.py
11. COMMIT+PUSH → origin + repos concernes
```

### Fin de session (10 min)
```
12. Sync workflows finaux
13. Generer status (generate_status.py)
14. MAJ session-state.md
15. MAJ technicals/ si decouvertes
16. MAJ fixes-library.md si fixes
17. Commit + push TOUS repos impactes
18. MAJ directives/status.md (DERNIER)
```
