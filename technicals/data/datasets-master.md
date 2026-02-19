# Datasets Master Reference — Multi-RAG SOTA 2026

> Last updated: 2026-02-19T15:30:00+01:00

> Source unique de vérité pour TOUS les datasets du projet.
> Lire avant toute ingestion ou évaluation.
> Mise à jour : 2026-02-17

---

## 1. VUE D'ENSEMBLE

| Catégorie | Nb datasets | Questions total | Priorité | Repo principal |
|-----------|-------------|-----------------|----------|----------------|
| Benchmarks académiques Phase 1 | 4 (curatés) | 200 | P0 — EN COURS | rag-tests |
| Benchmarks académiques Phase 2-3 | 16 HuggingFace | ~10,772 en Supabase | P1 | rag-tests + rag-data-ingestion |
| Datasets sectoriels website | 20 HuggingFace | ~324K (échantillon) | P2 | rag-website + rag-data-ingestion |
| **Total accessible** | **40** | **~335K** | | |

---

## 2. BENCHMARKS PHASE 1 — Curatés (200q, dans ce repo)

Ces 200 questions sont dans `datasets/phase-1/` et sont la BASE de toute évaluation.

| Fichier | Pipeline | Questions | Source |
|---------|----------|-----------|--------|
| `phase-1/standard-orch-50x2.json` | Standard + Orchestrator | 100 (50+50) | Manuellement curatés |
| `phase-1/graph-quant-50x2.json` | Graph + Quantitative | 100 (50+50) | Manuellement curatés |

**ÉTAT** : 932 exécutions cumulées, 42 itérations. Standard ✅ Orchestrator ✅ Graph ❌ Quantitative ❌

---

## 3. BENCHMARKS ACADÉMIQUES — 16 Datasets HuggingFace

### 3.1 Pipeline Standard (9 datasets) — Recherche sémantique dense

| # | Dataset | HF ID | Phase | Échantillon | En Supabase | Paper 2026 |
|---|---------|-------|-------|-------------|-------------|------------|
| 1 | **SQuAD 2.0** | `rajpurkar/squad_v2` | 2-3 | 1,125q | ✅ 1,000 | Agentic-R (arXiv:2601.11888) |
| 2 | **TriviaQA** | `mandarjoshi/trivia_qa` | 2-3 | 1,209q | ✅ 1,000 | CRAG Meta 2024 |
| 3 | **PopQA** | `akariasai/PopQA` | 2-3 | 1,208q | ✅ 1,000 | Agentic-R (arXiv:2601.11888) |
| 4 | **NarrativeQA** | `deepmind/narrativeqa` | 2-3 | 1,208q | ✅ 1,000 | DeepRead (arXiv:2602.05014) |
| 5 | **PubMedQA** | `qiaojin/PubMedQA` | 2-3 | 625q | ✅ 500 | Late Chunking (arXiv:2409.04701) |
| 6 | **FRAMES** | `google/frames-benchmark` | 2-3 | 824q | ✅ 824 | A-RAG (arXiv:2602.03442) |
| 7 | **Natural Questions** | `google-research-datasets/natural_questions` | 2-3 | 1,208q | ✅ 1,000 | Agentic-R (arXiv:2601.11888) |
| 8 | **MS MARCO** | `microsoft/ms_marco` | 2-3 | 1,000q | ✅ 1,000 | BEIR Benchmark 2021 |
| 9 | **ASQA** | `din0s/asqa` | 2-3 | 948q | ✅ 948 | DeepRead (arXiv:2602.05014) |

**Justification 2026** : Ces 9 datasets couvrent le spectre BEIR complet recommandé par A-RAG (2602.03442) et Agentic-R (2601.11888) pour évaluer un RAG dense. FRAMES est le nouveau benchmark Google 2024 spécifiquement conçu pour évaluer les RAG multi-étapes.

### 3.2 Pipeline Graph (3 datasets) — Raisonnement multi-hop

| # | Dataset | HF ID | Phase | Échantillon | En Supabase | Paper 2026 |
|---|---------|-------|-------|-------------|-------------|------------|
| 10 | **HotpotQA** | `hotpot_qa` | 2-3 | 1,325q | ✅ 1,000 | A-RAG (arXiv:2602.03442) |
| 11 | **MuSiQue** | `StanfordNLP/musique` | 2-3 | 267q | ✅ 200 | A-RAG (arXiv:2602.03442) |
| 12 | **2WikiMultihopQA** | `xanhho/2WikiMultihopQA` | 2-3 | 367q | ✅ 300 | GraphRAG (Microsoft, 2024) |

**Justification 2026** : HotpotQA et MuSiQue sont les références pour multi-hop reasoning, directement cités dans A-RAG comme benchmarks cibles. 2WikiMultihopQA valide spécifiquement le raisonnement sur graphe de connaissance (recommandé par Microsoft GraphRAG).

### 3.3 Pipeline Quantitative (4 datasets) — Tables financières et calculs

| # | Dataset | HF ID | Phase | Échantillon | En Supabase | Paper 2026 |
|---|---------|-------|-------|-------------|-------------|------------|
| 13 | **FinQA** | `ibm/finqa` | 2-3 | 400q | ✅ 700 | RAG-Studio EMNLP 2024 |
| 14 | **TAT-QA** | `kasnerz/tatqa` | 2-3 | 233q | ✅ 150 | RAG-Studio EMNLP 2024 |
| 15 | **ConvFinQA** | `czyssrs/ConvFinQA` | 2-3 | 100q | ✅ 100 | CompactRAG (2025) |
| 16 | **WikiTableQuestions** | `wikitablequestions` | 3 | 50q | ✅ 50 | TableRAG (2024) |

**Justification 2026** : Ces 4 datasets couvrent les 3 types de raisonnement quantitatif : calculs sur tableaux (FinQA/TAT-QA), conversation financière multi-turn (ConvFinQA), et QA sur tables génériques (WikiTableQuestions). RAG-Studio et CompactRAG les utilisent comme benchmarks primaires.

### 3.4 État actuel en Supabase (benchmark_datasets)

```
Total ingéré : 10,772 items dans 16 datasets
Ingestion Pinecone : ~100 items par dataset (partielle)
Manquant en Pinecone : ~10,000 items non vectorisés
```

| Dataset | Supabase | Pinecone | Neo4j | Statut complet |
|---------|----------|----------|-------|----------------|
| squad_v2 | 1,000 | 100 | – | 🟡 Partiel |
| triviaqa | 1,000 | 100 | – | 🟡 Partiel |
| popqa | 1,000 | 100 | – | 🟡 Partiel |
| narrativeqa | 1,000 | 100 | – | 🟡 Partiel |
| msmarco | 1,000 | 100 | – | 🟡 Partiel |
| natural_questions | 1,000 | 100 | – | 🟡 Partiel |
| hotpotqa | 1,000 | 100 | – | 🟡 Partiel |
| asqa | 948 | 100 | – | 🟡 Partiel |
| frames | 824 | 100 | – | 🟡 Partiel |
| finqa | 700 | 100 | Supabase | 🟡 Partiel |
| pubmedqa | 500 | 100 | – | 🟡 Partiel |
| 2wikimultihopqa | 300 | – | – | 🔴 Neo4j manquant |
| musique | 200 | – | – | 🔴 Neo4j manquant |
| tatqa | 150 | 100 | Supabase | 🟡 Partiel |
| convfinqa | 100 | 100 | Supabase | 🟡 Partiel |
| wikitablequestions | 50 | – | Supabase | 🟡 Partiel |

---

## 4. DATASETS SECTORIELS — 4 Secteurs × 5 Datasets = 20 HuggingFace

Ces datasets alimentent les démos du `rag-website` ET renforcent les pipelines de `rag-tests`.
À ingérer via `rag-data-ingestion` (Codespace dédié, n8n 2 workers).

### 4.1 Finance (Pipeline Quantitative)

| # | Dataset | HF ID | Questions | Pipeline | Priorité |
|---|---------|-------|-----------|----------|----------|
| 1 | **FinanceBench** | `PatronusAI/financebench` | 150 | Quantitative | P1 ★ — débloque Quant 85% |
| 2 | **ConvFinQA** | `czyssrs/ConvFinQA` | 3,892 | Quantitative | P1 ★ |
| 3 | **TATQA** | `kasnerz/tatqa` | 16,552 | Quantitative | P1 |
| 4 | **SEC-QA** | `jkung2003/sec-qa` | ~5,000 | Standard | P2 |
| 5 | **Financial PhraseBank** | `takala/financial_phrasebank` | 4,846 | Standard | P3 |

**Impact** : Ces datasets poussent Quantitative de 78.3% → ~85% (cible Phase 1).

### 4.2 Juridique (Pipeline Graph)

| # | Dataset | HF ID | Questions | Pipeline | Priorité |
|---|---------|-------|-----------|----------|----------|
| 1 | **French Case Law** | `rcds/french_case_law` | ~50K | Graph | P1 ★ — débloque Graph 70% |
| 2 | **Cold French Law** | `rcds/cold-french-law` | ~10K | Graph | P1 ★ |
| 3 | **LegaLBench** | `nguha/legalbench` | 162 tâches | Graph + Standard | P2 |
| 4 | **EUR-Lex** | `EurLex/eurlex` | ~20K | Graph | P2 |
| 5 | **CAIL2018** | `thunlp/cail2018` | 183K | Graph | P3 |

**Impact** : Renforce Neo4j avec entités juridiques FR → Graph de 68.7% → ~72%.

### 4.3 BTP/Construction (Pipeline Standard + Graph)

| # | Dataset | HF ID | Questions | Pipeline | Priorité |
|---|---------|-------|-----------|----------|----------|
| 1 | **Code Accord** | `GT4SD/code-accord` | ~5K | Standard | P2 |
| 2 | **BTP QA FR** | `btp-benchmark/btp-qa-fr` | ~2K | Standard | P2 |
| 3 | **DocIE** | `Sygil/DocIE` | ~3K | Graph | P2 |
| 4 | **RE2020 Corpus** | *(à créer via scraping normes)* | ~500 | Standard | P3 |
| 5 | **Construction Safety** | `NCHRP/construction-safety` | ~1K | Standard | P3 |

### 4.4 Industrie/Manufacturing (Pipeline Standard + Quantitative)

| # | Dataset | HF ID | Questions | Pipeline | Priorité |
|---|---------|-------|-----------|----------|----------|
| 1 | **Manufacturing QA** | `thesven/manufacturing-qa-gpt4o` | ~3K | Standard | P2 |
| 2 | **RAGBench** | `rungalileo/ragbench` | ~100K | Standard | P2 |
| 3 | **Industrial Maintenance** | `maintenance-bench/industrial-qa` | ~2K | Standard | P3 |
| 4 | **ISO Standards QA** | *(à créer via scraping ISO publics)* | ~1K | Graph | P3 |
| 5 | **AMDEC Templates** | *(à créer synthétiquement)* | ~500 | Graph | P3 |

---

## 5. JUSTIFICATION PAR PAPER 2026

| Paper | arXiv | Datasets recommandés dans ce projet |
|-------|-------|-------------------------------------|
| **A-RAG** Hierarchical Retrieval | 2602.03442 | FRAMES, HotpotQA, MuSiQue |
| **DeepRead** Doc Structure-Aware | 2602.05014 | NarrativeQA, ASQA, LongBench |
| **Agentic-R** Retriever Fine-tuning | 2601.11888 | PopQA, TriviaQA, Natural Questions |
| **Late Chunking** Jina | 2409.04701 | BEIR suite (SQuAD, MS MARCO, NQ) |
| **RAG-Studio** Domain Adaptation | ACL/EMNLP 2024 | FinQA, TatQA, ConvFinQA, secteurs FR |
| **GraphRAG** Microsoft | 2404.16130 | 2WikiMultihopQA, HotpotQA |
| **CompactRAG** | 2025 | ConvFinQA, WikiTableQuestions |
| **TableRAG** | 2024 | WikiTableQuestions, TAT-QA |

---

## 6. MAPPING PAR REPO

| Repo | Datasets utilisés | But |
|------|------------------|-----|
| **mon-ipad** | Phase 1 curatés (200q) | Tests baseline, pilotage |
| **rag-tests** | 16 HuggingFace (Supabase) | Évaluation Phases 2-3 |
| **rag-data-ingestion** | 16 HF + 20 sectoriels | Ingestion Pinecone + Neo4j + Supabase |
| **rag-website** | 20 sectoriels | Démos chatbot 4 secteurs |
| **rag-dashboard** | Aucun direct (lit status.json) | Affichage métriques |

---

## 7. COMMANDES DE TÉLÉCHARGEMENT

### Benchmarks académiques (rag-tests / rag-data-ingestion)

```bash
source .env.local
# Télécharger les 16 datasets HuggingFace (Phase 2-3)
python3 datasets/scripts/download-benchmarks.py --pipeline all --limit 1000
python3 datasets/scripts/download-benchmarks.py --pipeline graph --limit 500

# Vérifier ce qui est déjà dans Supabase
python3 datasets/scripts/check-ingestion-status.py
```

### Datasets sectoriels (rag-data-ingestion)

```bash
# Finance (priorité — débloque Quant 85%)
python3 datasets/scripts/download-sectors.py --sector finance --priority P1

# Juridique (priorité — débloque Graph 70%)
python3 datasets/scripts/download-sectors.py --sector juridique --priority P1

# BTP + Industrie (phase 2)
python3 datasets/scripts/download-sectors.py --sector btp
python3 datasets/scripts/download-sectors.py --sector industrie
```

---

## 8. ÉTAT CONSOLIDÉ (17 fév 2026)

| Étape | État |
|-------|------|
| Phase 1 curatés (200q) en datasets/phase-1/ | ✅ PRÊT |
| 16 HF datasets dans Supabase benchmark_datasets | ✅ 10,772 items |
| 16 HF datasets vectorisés dans Pinecone (partiel) | 🟡 ~100/dataset (partiel) |
| Datasets Graph (musique/2wiki) dans Neo4j | ❌ À faire |
| Datasets Finance P1 (FinanceBench/ConvFinQA) | ❌ Non ingérés |
| Datasets Juridique P1 (French Case Law) | ❌ Non ingérés |
| Datasets BTP/Industrie | ❌ Non ingérés |
