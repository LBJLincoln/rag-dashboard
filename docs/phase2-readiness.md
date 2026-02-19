# Phase 2 Readiness Report — Pre-Launch Checklist

> Last updated: 2026-02-20T01:30:00+01:00
> Ce document recense TOUTES les reponses, datasets et BDD preparees pour la Phase 2.
> La session suivante doit pouvoir lancer les 4 pipelines RAG en direct.

---

## 1. ETAT DES GATES PHASE 1

### Pipelines RAG — Accuracy
| Pipeline | Accuracy | Target Phase 1 | Status | Detail |
|----------|----------|----------------|--------|--------|
| Standard | **85.5%** | >= 85% | PASS | Stable depuis session 17 |
| Graph | **100%** (10/10 HF Space) | >= 70% | **PASS** | 10 questions diversifiees, 10/10 correct (session 26) |
| Quantitative | **78.3%** | >= 85% | **FAIL** | HF Space 200 OK mais OpenRouter 429 rate limit |
| Orchestrator | **80.0%** | >= 70% | PASS | Stable depuis session 17 |
| **Overall** | **85.9%** | >= 75% | **PASS** | |

### Gates Phase 1
| Gate | Condition | Status |
|------|-----------|--------|
| Overall accuracy >= 75% | 85.9% | PASS |
| Standard >= 85% | 85.5% | PASS |
| Graph >= 70% | 100% (10/10) | PASS |
| Quantitative >= 85% | 78.3% | **FAIL** |
| Orchestrator >= 70% | 80.0% | PASS |
| 3 iterations stables consecutives | Non atteint | **FAIL** |

### Bloqueur restant : Quantitative 78.3% < 85% (rate limit, pas crash)
- **Infra OK** : HF Space retourne 200 OK, 12 noeuds executent (FIX-29 a FIX-35 appliques)
- **Probleme** : OpenRouter 429 rate limit — 6 env vars partagent le meme compteur RPM Llama 70B (20 RPM)
- **Solution identifiee** : Changer LLM_SQL_MODEL vers `qwen/qwen-2.5-coder-32b-instruct:free` (pool RPM separe, HumanEval 85%)
- **Fallback chain** : Qwen Coder → DeepSeek V3 → Llama 70B (voir `technicals/infra/llm-models-and-fallbacks.md`)
- **FIX requis** : Deployer le nouveau modele sur HF Space (entrypoint.sh ou secret)

---

## 2. DATASETS PREPARES

### Phase 1 (200 questions) — PRET
| Fichier | Questions | Pipelines |
|---------|-----------|-----------|
| `datasets/phase-1/standard-orch-50x2.json` | 100 (50 standard + 50 orchestrator) | Standard, Orchestrator |
| `datasets/phase-1/graph-quant-50x2.json` | 100 (50 graph + 50 quantitative) | Graph, Quantitative |
| **Total Phase 1** | **200** | |

### Phase 2 (3,000 questions) — PRET
| Fichier | Questions | Pipelines | Datasets source |
|---------|-----------|-----------|-----------------|
| `datasets/phase-2/hf-1000.json` | 1,000 | Graph (500) + Quant (500) | musique (200), 2wikimultihopqa (300), finqa (200), tatqa (150), convfinqa (100), wikitablequestions (50) |
| `datasets/phase-2/standard-orch-1000x2.json` | 2,000 | Standard (1,000) + Orchestrator (1,000) | 13 datasets benchmark |
| **Total Phase 2** | **3,000** | |

### Datasets sectoriels (7,609 items) — TELECHARGES
| Secteur | Fichiers | Items | Taille |
|---------|----------|-------|--------|
| **Finance** | 6 (convfinqa, financebench, finqa_ragbench, sec_qa, tatqa, tatqa_ragbench) | 2,250 | 6.5 MB |
| **Juridique** | 5 (french_case_law_juri, french_case_law_cetat, cold_french_law, cail2018, hotpotqa_ragbench) | 2,500 | 13 MB |
| **BTP** | 4 (code_accord_entities, code_accord_relations, docie, ragbench_techqa) | 1,844 | 5.7 MB |
| **Industrie** | 3 (manufacturing_qa, ragbench_emanual, additive_manufacturing) | 1,015 | 1.6 MB |
| **Total secteurs** | **18 fichiers JSONL** | **7,609** | **26.8 MB** |

---

## 3. BASES DE DONNEES — ETAT

### Pinecone (Vector DB) — PRET
| Index | Dimension | Vecteurs | Namespaces | Usage |
|-------|-----------|----------|------------|-------|
| `sota-rag-jina-1024` | 1024 | 10,411 | 12 | Standard + Graph (primary) |
| `sota-rag-phase2-graph` | 1024 | 1,248 | 1 (benchmark-musique) | Graph Phase 2 |
| `sota-rag-cohere-1024` | 1024 | 10,411 | 12 | Backup (Cohere embeddings) |
| **Total** | | **22,070** | | |

#### Namespaces detail (sota-rag-jina-1024)
| Namespace | Vecteurs | Phase applicable |
|-----------|----------|-----------------|
| (default) | 639 | Phase 1 |
| benchmark-squad_v2 | 1,000 | Phase 3+ |
| benchmark-natural_questions | 1,000 | Phase 3+ |
| benchmark-narrativeqa | 1,000 | Phase 3+ |
| benchmark-hotpotqa | 1,000 | Phase 3+ |
| benchmark-popqa | 1,000 | Phase 3+ |
| benchmark-triviaqa | 1,000 | Phase 3+ |
| benchmark-msmarco | 1,000 | Phase 3+ |
| benchmark-frames | 824 | Phase 3+ |
| benchmark-pubmedqa | 500 | Phase 3+ |
| benchmark-asqa | 948 | Phase 3+ |
| benchmark-finqa | 500 | Phase 2+ |

### Neo4j (Graph DB) — PRET
| Metrique | Valeur |
|----------|--------|
| Total nodes | 19,788 |
| Total relations | 76,717 |
| Labels distincts | 20 |
| Top labels | Person (8,531), Entity (8,331), Organization (1,775), City (840) |

#### Labels par type
| Label | Count | Usage pipeline |
|-------|-------|---------------|
| Person | 8,531 | Graph RAG |
| Entity | 8,331 | Graph RAG |
| Organization | 1,775 | Graph RAG |
| City | 840 | Graph RAG |
| Technology | 139 | Graph RAG |
| Museum | 62 | Graph RAG |
| Country | 54 | Graph RAG |
| Disease | 22 | Graph RAG |
| Concept | 12 | Graph RAG |
| Rate | 4 | Quantitative |
| Molecule | 3 | Standard |
| Award | 3 | Standard |
| Law | 2 | Juridique (futur) |
| Artwork | 2 | Standard |

### Supabase (SQL DB) — PRET
| Categorie | Tables | Lignes totales | Usage pipeline |
|-----------|--------|---------------|---------------|
| **Financials** | financials (24), balance_sheet (12) | 36 | Quantitative Phase 1 |
| **Phase 2 Financial** | finqa_tables (200), tatqa_tables (150), convfinqa_tables (100) | 450 | Quantitative Phase 2 |
| **Business data** | sales_data (1,152), employees (150), products (18) | 1,320 | Quantitative |
| **Benchmarks** | benchmark_datasets (10,772) | 10,772 | Multi-pipeline |
| **Infrastructure** | 30+ tables support | ~5,000+ | System |
| **Total** | **40 tables** | **~17,600+** | |

#### Tables financieres critiques (Quantitative)
| Table | Lignes | Colonnes | Contenu |
|-------|--------|----------|---------|
| financials | 24 | 23 | TechVision Inc, GreenEnergy Corp, HealthPlus Labs — FY+quarters |
| balance_sheet | 12 | 25 | Bilans annuels + trimestriels |
| finqa_tables | 200 | 12 | Questions FinQA HuggingFace (Phase 2) |
| tatqa_tables | 150 | 12 | Questions TAT-QA HuggingFace (Phase 2) |
| convfinqa_tables | 100 | 12 | Questions ConvFinQA HuggingFace (Phase 2) |

---

## 4. WEBHOOKS ET ENDPOINTS

### Pipelines sur VM (localhost:5678) — STOCKAGE
| Pipeline | Webhook Path | Status |
|----------|-------------|--------|
| Standard RAG V3.4 | `/webhook/rag-multi-index-v3` | ON |
| Graph RAG V3.3 | `/webhook/ff622742-6d71-4e91-af71-b5c666088717` | ON |
| Quantitative V2.0 | `/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9` | ON |
| Orchestrator V10.1 | `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0` | ON |

### Pipelines sur HF Space — EXECUTION
| Pipeline | URL | Status | HTTP |
|----------|-----|--------|------|
| Standard | `https://lbjlincoln-nomos-rag-engine.hf.space/webhook/rag-multi-index-v3` | **OK** | 200 |
| Graph | `https://lbjlincoln-nomos-rag-engine.hf.space/webhook/ff622742-...` | **OK** | 200 (10/10 PASS) |
| Quantitative | `https://lbjlincoln-nomos-rag-engine.hf.space/webhook/3e0f8010-...` | **FAIL** | 500 |
| Orchestrator | `https://lbjlincoln-nomos-rag-engine.hf.space/webhook/92217bb8-...` | **Timeout** | — |

### Parametres d'appel (CRITIQUE — field name = `query`)
```json
{
  "query": "What is the revenue of TechVision Inc in FY 2023?",
  "sessionId": "eval-phase2-001"
}
```
**ATTENTION** : Le champ est `query`, PAS `question`. Voir FIX-26 dans fixes-library.md.

---

## 5. PROTOCOLE DE LANCEMENT PHASE 2

### Pre-requis (AVANT lancement)
1. [ ] Quantitative pipeline repare (actuellement 500 sur HF Space)
2. [ ] 3 iterations stables consecutives sur TOUS les pipelines
3. [ ] Full eval 200q Phase 1 passee
4. [ ] Toutes les credentials HF Space verifiees

### Sequence de lancement (session suivante)
```
1. DEMARRAGE (5 min)
   - cat directives/session-state.md
   - cat docs/status.json
   - cat technicals/knowledge-base.md (Section 0 — pre-vol checklist)
   - Verifier HF Space up : curl https://lbjlincoln-nomos-rag-engine.hf.space/healthz

2. PHASE 1 VALIDATION FINALE (30 min)
   - Test Standard 5q → confirmer 85%+
   - Test Graph 5q → confirmer 70%+
   - Test Quantitative 5q → diagnostiquer le 500
   - Test Orchestrator 5q → confirmer 70%+
   - Si Quant toujours 500 → FIX PRIORITAIRE

3. PHASE 2 LAUNCH (60 min)
   - Charger datasets/phase-2/hf-1000.json (1000q graph+quant)
   - Charger datasets/phase-2/standard-orch-1000x2.json (2000q standard+orch)
   - Lancer eval sequentiellement :
     a. Standard 1000q (estimation: ~30 min)
     b. Graph 500q (estimation: ~15 min)
     c. Quantitative 500q (estimation: ~15 min, si fix OK)
     d. Orchestrator 1000q (estimation: ~30 min)

4. MONITORING (continu)
   - Surveiller /tmp/eval-progress.json via codespace-control.sh
   - Auto-stop si 4 echecs consecutifs
   - Commit resultats intermediaires toutes les 100q

5. FIN DE SESSION
   - python3 eval/generate_status.py
   - MAJ session-state.md + status.md
   - Commit + push tous repos
```

### Commandes de lancement
```bash
# Depuis Codespace rag-tests (ou HF Space)
source .env.local

# Phase 1 validation rapide
python3 eval/quick-test.py --questions 5 --pipelines standard,graph,quantitative,orchestrator

# Phase 2 — Graph + Quant (1000q)
python3 eval/run-eval-parallel.py --dataset datasets/phase-2/hf-1000.json --label "Phase2-1000q" --reset

# Phase 2 — Standard + Orchestrator (2000q)
python3 eval/run-eval-parallel.py --dataset datasets/phase-2/standard-orch-1000x2.json --label "Phase2-std-orch-2000q" --reset
```

### Targets Phase 2
| Pipeline | Questions Phase 2 | Target Phase 2 | Note |
|----------|------------------|----------------|------|
| Standard | 1,000 | >= 80% | Relaxe vs Phase 1 (datasets plus durs) |
| Graph | 500 | >= 60% | Datasets multi-hop complexes |
| Quantitative | 500 | >= 70% | Donnees financieres HF (pas juste nos 3 companies) |
| Orchestrator | 1,000 | >= 65% | Routing sur questions diversifiees |
| **Overall** | **3,000** | **>= 70%** | |

---

## 6. RISQUES ET MITIGATIONS

| Risque | Probabilite | Impact | Mitigation |
|--------|------------|--------|------------|
| Quantitative 500 non resolu | Haute | Bloquant | Reimporter workflow + fix credentials Supabase |
| HF Space sleep pendant eval | Moyenne | Retard | Keep-alive cron */30 min actif |
| OpenRouter rate limit (429) | Moyenne | Ralentissement | Retries + neverError dans workflows |
| RAM HF Space saturee | Faible | Crash | 16GB disponibles, workflows legers |
| Neo4j Aura timeout | Faible | Echecs Graph | Retry mechanism dans workflow |
| Supabase connection pool | Faible | Echecs Quant | Pooler configure (6543) |

---

## 7. COMMITS ET TRAÇABILITÉ

### Protocole de commit pendant Phase 2
```bash
# Apres chaque batch de 100q
git add docs/ logs/
git commit -m "eval(phase2): batch N — Standard X% Graph X% Quant X% Orch X%"
git push origin main

# En fin d'eval complete
python3 eval/generate_status.py
git add docs/status.json docs/data.json
git commit -m "eval(phase2): COMPLETE — Overall X% (3000q)"
git push origin main
```

### Fichiers de workflow-process pertinents
| Fichier | Role | Consulter quand |
|---------|------|-----------------|
| `directives/workflow-process.md` | Boucle d'iteration complete | Chaque fix |
| `technicals/knowledge-base.md` (Section 0) | Pre-vol checklist | AVANT chaque test |
| `technicals/fixes-library.md` | 27 fixes documentes | AVANT chaque debug |
| `CLAUDE.md` | Regles d'or (29 regles) | Demarrage session |
| `technicals/team-agentic-process.md` | Multi-model + harness | Delegation sous-agents |

---

## 8. RESUME EXECUTIF

### Ce qui est PRET
- 3/4 pipelines passent Phase 1 (Standard 85.5%, Graph 100%, Orchestrator 80%)
- 3,000 questions Phase 2 preparees (hf-1000.json + standard-orch-1000x2.json)
- 7,609 items sectoriels telecharges (4 secteurs, 18 fichiers JSONL)
- Pinecone : 22,070 vecteurs prets (3 indexes)
- Neo4j : 19,788 nodes + 76,717 relations
- Supabase : 40 tables, ~17,600 lignes (dont finqa_tables, tatqa_tables, convfinqa_tables)
- Team-agentic multi-model deploye dans tous les repos
- 27 fixes documentes + knowledge base enrichie

### Ce qui BLOQUE
- **Quantitative pipeline** : HTTP 500 sur HF Space (1 seul bloqueur)
  - Credentials Supabase probablement mal configurees sur HF Space
  - Template SQL code pret mais pas execute (Task Runner cache VM)
  - Fix = reimporter workflow avec bonnes credentials OU utiliser Codespace

### Action immediate (session suivante)
1. Diagnostiquer et fixer le 500 Quantitative sur HF Space
2. Valider Phase 1 complete (200q, 4 pipelines)
3. Lancer Phase 2 (3,000q)
