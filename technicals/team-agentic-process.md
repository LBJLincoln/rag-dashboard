# Processus Team-Agentic Formel

> Last updated: 2026-02-18T22:01:57+01:00
> Definit les roles, la communication et les protocoles entre agents Claude Code
> repartis sur la VM et les Codespaces.

---

## 1. Roles

| Agent | Repo | Localisation | Role | Modele |
|-------|------|-------------|------|--------|
| **Orchestrateur** | mon-ipad | VM Google Cloud (Termius) | Pilotage, fix workflows n8n, sync, directives, analyse | `claude-opus-4-6` |
| **Testeur** | rag-tests | Codespace ephemere | Executer tests, mesurer accuracy, rapporter resultats | `claude-opus-4-6` |
| **Developpeur Web** | rag-website | Codespace ephemere + Vercel | Construire site business, integrer chatbots sectoriels | `claude-opus-4-6` |
| **Ingesteur** | rag-data-ingestion | Codespace ephemere | Telecharger datasets, ingerer dans BDD, enrichir | `claude-opus-4-6` |
| **Dashboard** | rag-dashboard | Statique (GitHub Pages/Vercel) | Afficher metriques live (read-only) | N/A |

### Hierarchie
```
Orchestrateur (mon-ipad)
  |
  +-- distribue les CLAUDE.md via push-directives.sh
  +-- fixe les workflows n8n
  +-- publie technicals/fixes-library.md
  |
  +-- Testeur (rag-tests)
  |     +-- mesure les pipelines
  |     +-- rapporte via git push
  |
  +-- Dev Web (rag-website)
  |     +-- construit le site
  |     +-- deploie via Vercel
  |
  +-- Ingesteur (rag-data-ingestion)
        +-- ingere datasets
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

## 7. Opus 4.6 Obligatoire

### Regle : tous les agents utilisent `claude-opus-4-6`

```bash
# Au demarrage de chaque session / Codespace :
bash scripts/setup-claude-opus.sh

# OU directement :
claude --model claude-opus-4-6
```

### Verification
- `.claude/settings.json` contient `"model": "claude-opus-4-6"`
- L'abonnement Max donne acces au modele Opus 4.6
- NE JAMAIS utiliser Sonnet pour le pilotage ou les decisions complexes
- Les sous-agents (Task tool) peuvent utiliser `haiku` pour taches simples (recherche rapide)

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
