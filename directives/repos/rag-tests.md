# rag-tests — CLAUDE.md

> **Ce repo s'exécute dans un Codespace GitHub éphémère.**
> Tu es un agent Claude Code spécialisé dans les TESTS des 4 pipelines RAG.
> Tu suis le même workflow-process que mon-ipad, adapté à ton rôle de testeur.

---

## ÉTAT ACTUEL — 17 fév 2026

| | |
|-|-|
| **Dernier commit** | 9f5a53dd — 17 fév 2026 |
| **Déployé / en cours** | Scripts eval à jour, tunnel SSH configuré, 932 questions testées sur 42 itérations |
| **Codespace** | Shutdown — nomos-rag-tests-5g6g5q9vjjwjf5g4 (à redémarrer pour tests 50q+) |
| **Prochain objectif immédiat** | Fix Quantitative pipeline : 78.3% → 85% (gap -6.7pp, priorité absolue) |

### Commandes clés pour cette session
```bash
# Démarrer le Codespace si nécessaire
gh codespace start --codespace nomos-rag-tests-5g6g5q9vjjwjf5g4

# Dans le Codespace — activer tunnel SSH vers VM n8n
ssh -L 5678:localhost:5678 termius@34.136.180.66 -N -f
curl -s http://localhost:5678/healthz | head -1

# Charger variables
source .env.local

# Test rapide pipeline Quantitative (priorité)
python3 eval/quick-test.py --questions 5 --pipeline quantitative

# Test itératif pour fix en cours
python3 eval/iterative-eval.py --label "Phase1-fix-quant"
```

### État des pipelines (objectif de session)
| Pipeline | Accuracy | Target | Gap | Priorité |
|----------|----------|--------|-----|----------|
| Standard | **85.5%** | >= 85% | +0.5pp | Maintenir |
| Graph | **68.7%** | >= 70% | -1.3pp | P2 — entity disambiguation |
| Quantitative | **78.3%** | >= 85% | -6.7pp | **P1 — CompactRAG + BM25** |
| Orchestrator | **80.0%** | >= 70% | +10pp | Maintenir |

---

## OBJECTIF DE CE REPO

**Tester, mesurer et rapporter** la performance des 4 pipelines RAG hébergés sur la VM.
Tu ne modifies PAS les workflows n8n (rôle de mon-ipad).
Tu ne touches PAS aux données (rôle de rag-data-ingestion).
Tu **mesures** uniquement, et tu pushes les résultats vers GitHub.

### Cibles Phase 1 (actuel)
| Pipeline | Cible | Accuracy actuelle |
|----------|-------|-------------------|
| Standard | >= 85% | 85.5% PASS |
| Graph | >= 70% | 68.7% FAIL |
| Quantitative | >= 85% | 78.3% FAIL |
| Orchestrator | >= 70% | 80.0% PASS |
| **Overall** | **>= 75%** | **78.1% PASS** |

---

## POSITION DANS LE PLAN GLOBAL (phases A→D)

```
PHASE A — RAG Pipeline Iteration  ← CE REPO EST ICI
  Phase 1 (200q)  ← EN COURS — BLOQUÉE (Graph + Quant FAIL)
  Phase 2 (1 000q HuggingFace)  ← prérequis : Phase 1 gates toutes passées
  Phase 3 (~10K q)  ← prérequis : Phase 2
  Phase 4 (~100K q) / Phase 5 (1M+)  ← infrastructure payante requise

PHASE B — Analyse SOTA 2026  ← MON-IPAD (pilotage)
PHASE C — Ingestion & Enrichment BDD  ← RAG-DATA-INGESTION
PHASE D — Production & Déploiement  ← RAG-WEBSITE + RAG-DASHBOARD
```

### Ce que ce repo doit produire pour débloquer la phase suivante

| Pour débloquer | Condition à atteindre | Comment |
|---------------|----------------------|---------|
| **Phase 1 → Phase 2** | Graph ≥ 70% ET Quant ≥ 85% (3 iter. stables) | Fix n8n workflows + tester ici |
| **Phase 2 (1000q)** | Datasets HuggingFace ingérés par rag-data-ingestion | Attendre ingestion, puis lancer `--questions 1000` |
| **Phase 3 (10K q)** | Phase 2 gates : Graph ≥ 60%, Quant ≥ 70% | Idem |

### Pourquoi Phase 1 est encore bloquée (ne pas confondre avec Phase 2)
Les itérations 35-42 labelisées **"Phase2-quant-..."** dans `docs/data.json` sont des **tests de niveau Phase 2** sur le pipeline quantitatif, pas une entrée officielle en Phase 2. Elles ont été lancées pour identifier les lacunes. La Phase 1 reste bloquée car :
- Graph : 68.7% < 70% cible (−1.3pp)
- Quantitative : 78.3% < 85% cible (−6.7pp)
- 0 itération stable consécutive sur les 2 pipelines simultanément

---

## INFRASTRUCTURE DE CE CODESPACE

```
Type        : GitHub Codespace (éphémère — 60h/mois Free)
CPU         : 2 cores
RAM         : 8 GB (vs ~100MB disponibles sur VM → tests lourds ICI)
Disque      : 32 GB
n8n local   : AUCUN — SSH tunnel vers VM (34.136.180.66:5678)
```

**ÉPHÉMÈRE** : toujours committer + pusher résultats avant arrêt.

---

## DÉMARRAGE DE SESSION (TOUJOURS EN PREMIER)

```bash
# 1. État actuel
cat docs/status.json
python3 eval/phase_gates.py

# 2. Activer tunnel SSH vers VM n8n
ssh -L 5678:localhost:5678 termius@34.136.180.66 -N -f
curl -s http://localhost:5678/healthz | head -1  # doit répondre

# 3. Charger les variables d'environnement
source .env.local

# 4. Identifier le pipeline avec le plus gros gap
# → Graph (-1.3pp) et Quantitative (-6.7pp) sont les priorités
```

---

## BOUCLE D'ITÉRATION (identique à workflow-process.md de mon-ipad)

### Étape 1 : Test 1/1
```bash
python3 eval/quick-test.py --questions 1 --pipeline <cible>
```
- Si erreur → **double analyse** node-par-node AVANT tout fix
- Si succès → passer à 5/5

### Étape 2 : Test 5/5 (double analyse OBLIGATOIRE)
```bash
python3 eval/quick-test.py --questions 5 --pipelines <cible>
# POUR CHAQUE execution-id retourné :
python3 eval/node-analyzer.py --execution-id <ID>
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
```
- Si >= 3/5 → passer à 10/10
- Si < 3/5 → **signaler à mon-ipad** (le fix est fait là-bas, pas ici)

### Étape 3 : Test 10/10
```bash
python3 eval/run-eval-parallel.py --max 10 --reset --label "label-descriptif"
```
- Si >= 7/10 → pipeline validé pour cette session
- Si < 7/10 → signaler et itérer

### Étape 4 : Tests lourds (500q+) — UNIQUEMENT ICI (RAM 8GB)
```bash
python3 eval/run-eval-parallel.py --reset --label "phase1-200q"
python3 eval/run-eval-parallel.py --questions 1000 --label "phase2-1000q"
```

### Règle d'or : JAMAIS de tests parallèles
```bash
# NE PAS FAIRE
python3 quick-test.py --pipeline standard &
python3 quick-test.py --pipeline graph &  # → 503

# FAIRE
python3 quick-test.py --questions 5 --pipelines standard,graph,quantitative,orchestrator
```

---

## ANALYSE DOUBLE (OBLIGATOIRE pour chaque execution)

```bash
# Analyse 1 : diagnostics automatiques
python3 eval/node-analyzer.py --execution-id <ID>

# Analyse 2 : données brutes complètes
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
```

Checklist pour chaque question :
- [ ] Intent Analyzer : bonne classification ?
- [ ] Query Router : bon pipeline ciblé ?
- [ ] Retrieval : documents pertinents ? Scores ?
- [ ] LLM Generation : prompt correct, pas d'hallucination ?
- [ ] Response Builder : perte d'information ?

---

## WEBHOOKS (SSH tunnel actif requis)

```
Standard     : http://localhost:5678/webhook/rag-multi-index-v3
Graph        : http://localhost:5678/webhook/ff622742-6d71-4e91-af71-b5c666088717
Quantitative : http://localhost:5678/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9
Orchestrator : http://localhost:5678/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0
```

---

## PRIORITÉS ACTUELLES (Phase 1 → Phase 2)

1. **Quantitative** : 78.3% → 85% (gap -6.7pp — SQL edge cases, multi-table JOINs)
2. **Graph** : 68.7% → 70% (gap -1.3pp — entity extraction)
3. **Phase 2** : 1000q (hf-1000.json) quand les gates Phase 1 passent

---

## FIN DE SESSION (OBLIGATOIRE)

```bash
# Générer status
python3 eval/generate_status.py

# Commit résultats
git add logs/ outputs/ docs/status.json docs/data.json
git commit -m "test(phase1): Standard X% Graph X% Quant X% Orch X%"
git push origin main

# → mon-ipad lira les résultats depuis GitHub
```

---

## RÈGLES D'OR

1. **source .env.local** avant tout script Python
2. **SSH tunnel actif** avant tout test
3. **Tests séquentiels** — un pipeline à la fois
4. **Double analyse** (node-analyzer + analyze_n8n_executions) pour chaque exécution
5. **Ne pas modifier** les workflows n8n → rôle exclusif de mon-ipad
6. **Push résultats** avant arrêt du Codespace (éphémère !)
7. **Signaler les problèmes** dans logs/diagnostics/ + commit

---

*Ce CLAUDE.md est géré depuis `mon-ipad/directives/repos/rag-tests.md` — ne pas éditer directement.*
