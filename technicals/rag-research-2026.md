# RAG Research 2026 — Condensed Findings

> Last updated: 2026-02-18T18:35:00Z

> Last updated: 2026-02-17
> Applies to: Multi-RAG Orchestrator (Standard, Graph, Quantitative, Orchestrator pipelines)

---

## 1. Multi-Agent RAG Patterns

### MA-RAG (arXiv:2505.20096)
- Pattern: **Specialized agents per pipeline stage** — one agent retrieves, one re-ranks, one generates.
- Key finding: Stage-level specialization reduces hallucination by 23% vs. monolithic RAG.
- Relevance: Our Orchestrator V10.1 already approximates this; formalize with explicit agent roles per n8n sub-workflow.

### A-RAG — Adaptive RAG (arXiv:2602.03442)
- Pattern: **Hierarchical retrieval tools, LLM selects which tool to invoke at runtime.**
- LLM receives tool descriptions (vector search, graph query, SQL) and picks based on query type.
- Key finding: Reduces unnecessary retrieval calls by 31% while maintaining accuracy within 2%.
- Relevance: Direct blueprint for Orchestrator's query routing logic — replace heuristic routing with LLM tool-call routing.

### RouteRAG — Per-Query Adaptive Routing
- Rule-based classifier assigns each query to the optimal pipeline:
  - Simple factual → vector (Standard RAG)
  - Multi-hop / entity-rich → graph (Graph RAG)
  - Numerical / formula → SQL (Quantitative RAG)
- Key finding: Adaptive routing alone gains +6.2% accuracy over static pipeline assignment.
- Relevance: Implement as a lightweight pre-classifier node in Orchestrator before dispatching to sub-workflows.

---

## 2. Retrieval Fusion Techniques

### RRF — Reciprocal Rank Fusion
```
Score(d) = Σ  1 / (60 + rank_i(d))
           i
```
- Fuse results from vector search + BM25 (keyword) before re-ranking.
- Key finding: +18.5% MRR over single-retrieval baseline on BEIR benchmark.
- Implementation: Add a Merge node in Standard RAG V3.4 that combines Pinecone results (semantic) with BM25 results (keyword), then RRF-score before passing to LLM.
- Cost: Zero external API calls — pure math over ranked lists.

---

## 3. GraphRAG vs Standard RAG Benchmarks

### Entity-Rich Query Performance (arXiv:2502.11371)
| Pipeline | Accuracy | Query Type |
|----------|----------|------------|
| GraphRAG | 80.0% | Entity-rich, multi-hop |
| Vector RAG | 50.83% | Same queries |

- GraphRAG wins on: relationship chains, entity disambiguation, multi-hop reasoning.
- Vector RAG wins on: semantic similarity, paraphrased factual questions.
- Combined (Graph + Vector): 85.2% on mixed benchmarks.

### Our Current State vs Targets
| Pipeline | Accuracy | Target | Status | Priority Action |
|----------|----------|--------|--------|-----------------|
| Standard | 85.5% | 85% | PASS | Add RRF fusion (+2-3%) |
| Graph | 68.7% | 70% | FAIL | Fix entity disambiguation in Neo4j |
| Quantitative | 78.3% | 85% | FAIL | Apply CompactRAG for formula queries |
| Orchestrator | 80.0% | 70% | PASS | Add RouteRAG classifier |

---

## 4. Structured Data: CompactRAG

- Pattern: **Pre-compute QA pairs offline** for structured/tabular data; store in vector index alongside raw documents.
- Process: At ingestion time, generate synthetic Q&A from tables, formulas, financial reports → embed → store in Pinecone.
- Key finding: +12% accuracy on formula/numerical queries vs. raw-document retrieval.
- Relevance: **Highest ROI fix for Quantitative pipeline (78.3% FAIL).** Ingestion V3.1 should generate QA pairs during enrichment, stored under `doc_type: compact_qa` in Pinecone metadata.

---

## 5. Reranking: Self-Hosted Fallback

When Cohere trial expires (imminent):

```bash
# Model: cross-encoder/ms-marco-MiniLM-L-6-v2
# Size: ~150MB
# Inference: ~30ms per (query, passage) pair on CPU
pip install sentence-transformers
```

```python
from sentence_transformers import CrossEncoder
model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
scores = model.predict([(query, passage) for passage in passages])
ranked = sorted(zip(passages, scores), key=lambda x: x[1], reverse=True)
```

- Deploy on Codespace (8GB RAM, no constraint) or add as a Python node in n8n via `executeCommand`.
- RAM on VM (~100MB free): too tight for local inference — use Codespace or call as microservice.

---

## 6. n8n Concurrency and Scaling

### Current VM Config
```
N8N_CONCURRENCY_PRODUCTION_LIMIT=2   # Already set — appropriate for 1 vCPU
N8N_QUEUE_MODE=true                  # Redis queue active
```

- `LIMIT=2` is correct for e2-micro. Do not raise — causes OOM swap thrash.
- For burst load: spin Codespace `rag-tests` with its own n8n + 2 workers.

### 503 Handling in n8n Webhooks
- Cause: Concurrent requests exceed LIMIT=2, n8n returns 503 temporarily.
- Fix already partially applied (TTL 15s -> 120s in `task-broker-auth.service.js`).
- Remaining gap: eval scripts must implement exponential backoff.

---

## 7. Eval Script Best Practices

### Required Pattern (currently MISSING from quick-test.py)

`quick-test.py` currently has **no retry logic** in `call_endpoint()`. A single `urllib.request.urlopen` call with a fixed timeout. On 503, it returns `{"status": "error", ...}` and moves on — no retry.

Recommended addition to `call_endpoint()`:

```python
import time

def call_endpoint(endpoint, query, timeout=60, max_retries=3):
    """Call a RAG endpoint with exponential backoff on 503."""
    payload = json.dumps({...}).encode()
    headers = {"Content-Type": "application/json"}

    for attempt in range(max_retries):
        try:
            req = request.Request(endpoint, data=payload, headers=headers, method="POST")
            start = time.time()
            with request.urlopen(req, timeout=timeout) as resp:
                # ... existing response handling ...
                pass
        except error.HTTPError as e:
            if e.code == 503 and attempt < max_retries - 1:
                wait = (2 ** attempt) * 3  # 3s, 6s, 12s
                print(f"        503 received, retrying in {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
                continue
            return {"status": "error", "latency_ms": 0, "answer": "", "error": f"HTTP {e.code}: {str(e)[:200]}"}
        except Exception as e:
            return {"status": "error", "latency_ms": 0, "answer": "", "error": str(e)[:200]}

    return {"status": "error", "latency_ms": 0, "answer": "", "error": "Max retries exceeded (503)"}
```

Also add between questions:
```python
time.sleep(3)  # Mandatory inter-call delay — prevents n8n queue saturation
```

### Volume Rules (from RAM constraint analysis)
| Volume | Where to run | Reason |
|--------|-------------|--------|
| 1-10 questions | VM directly | ~100MB RAM available |
| 50-200 questions | VM with queue mode | Redis handles burst |
| 500+ questions | Codespace `rag-tests` | 8GB RAM, no OOM risk |

**NEVER run 500+ question evals directly on VM** — will trigger OOM + swap cascade.

---

## 8. Concrete Next Steps (Prioritized)

### P0 — Fix Graph RAG (68.7% -> 70% target)
1. Diagnose entity disambiguation failures: `python3 eval/node-analyzer.py --execution-id <last-fail-id>`
2. Check Neo4j entity resolution in Graph RAG V3.3 node "Entity Extraction"
3. Add entity alias normalization (e.g., "EU" = "European Union") in Cypher queries
4. Test: `python3 eval/quick-test.py --pipelines graph --questions 5`

### P1 — Fix Quantitative RAG (78.3% -> 85% target)
1. Implement CompactRAG: add QA-pair generation to Enrichissement V3.1 workflow
2. Store pre-computed Q&A under metadata field `doc_type: compact_qa` in Pinecone
3. Modify Quantitative V2.0 to search `compact_qa` docs first, then raw documents
4. Test: `python3 eval/quick-test.py --pipelines quantitative --questions 5`

### P2 — Add exponential backoff to quick-test.py
1. Wrap `call_endpoint()` with retry loop (3 retries, backoff 3s/6s/12s)
2. Add `time.sleep(3)` between questions in `run_quick_tests()`

### P3 — RRF Fusion for Standard RAG (85.5% -> target 88%+)
1. Add BM25 retrieval node in Standard RAG V3.4 parallel to Pinecone node
2. Implement RRF merge: `Score(d) = 1/(60+rank_pinecone) + 1/(60+rank_bm25)`
3. Replace current top-k selection with RRF-ranked list
4. Test with full benchmark: `python3 eval/iterative-eval.py --label "rrf-test"`

### P4 — RouteRAG Classifier in Orchestrator
1. Add pre-classifier node: LLM prompt → classify query as factual/multi-hop/numerical
2. Route to appropriate sub-workflow webhook based on classification
3. Replace current heuristic routing

### P5 — Self-Hosted Reranker (before Cohere expires)
1. Deploy `cross-encoder/ms-marco-MiniLM-L-6-v2` on Codespace
2. Wrap as Flask microservice accessible from n8n HTTP Request node
3. Update Standard RAG and Graph RAG reranking nodes to call self-hosted endpoint

---

---

## 9. Nouveaux Papers Février 2026 (Recherche internet 2026-02-17)

### Papers publiés Jan-Fév 2026 directement pertinents

| Paper | arXiv | Finding clé |
|-------|-------|-------------|
| A-RAG: Scaling Agentic RAG via Hierarchical Retrieval Interfaces | [2602.03442](https://arxiv.org/abs/2602.03442) | 3 outils (keyword/semantic/chunk-read), outperforms monolithic RAG avec ≤ tokens |
| DeepRead: Document Structure-Aware Reasoning | [2602.05014](https://arxiv.org/abs/2602.05014) | Hiérarchie document (sections/tables) comme prior pour multi-turn retrieval |
| Agentic-R: Learning to Retrieve for Agentic Search | [2601.11888](https://arxiv.org/abs/2601.11888) | Fine-tuning retriever pour agentic multi-step search |
| Agentic RAG Survey | [2501.09136](https://arxiv.org/abs/2501.09136) | Taxonomie complète : reflection, planning, tool use, multi-agent collaboration |

### Domaine-Specific RAG (MDPI + ACL 2024)
- **RAG-Studio** (ACL EMNLP 2024) : Self-aligned training pour adapter un RAG générique à un domaine spécifique **sans données humaines** — via données synthétiques seulement. SOTA sur biomedical, finance, law.
- **Hybrid retrieval gagne 15-25% de précision** sur les requêtes domain-specific avec terminologie exacte (codes légaux, ratios financiers) vs pure dense retrieval.
- **Chunking par domaine** : Juridique → chunks 1024-2048 tokens (préserver contexte article) ; Finance → 256 tokens avec metadata structurée ; BTP → synonym expansion (DTU, CCAG, CCTP).

### Late Chunking (Jina AI, arXiv:2409.04701)
- Embed le document entier → **puis** chunker les embeddings (inverse du pipeline classique)
- **+10-12% retrieval accuracy** sur docs avec références anaphoriques (pronoms → entités antérieures)
- **Jina API supporte nativement** : `late_chunking=True` dans les paramètres d'API
- **Pas de coût LLM** (vs Contextual Retrieval d'Anthropic qui nécessite LLM call par chunk)
- Action : Ré-ingérer les 3 plus grands namespaces avec late chunking, mesurer amélioration

### RAGAS Metrics — Standard 2026 Obligatoire
La simple métrique "accuracy" est **insuffisante en 2026**. Standard enterprise :
| Métrique | Définition | Seuil enterprise |
|---------|-----------|-----------------|
| **Faithfulness** | % statements dans la réponse sourcés dans le contexte | >= 95% |
| **Context Recall** | % infos pertinentes effectivement récupérées | >= 85% |
| **Hallucination rate** | 1 - Faithfulness | <= 2% |
| **Mean latency** | Temps moyen par question | <= 2.5s |
| **Context Precision** | % docs récupérés qui sont pertinents | >= 80% |

**Action immédiate** : Ajouter RAGAS à `eval/quick-test.py` et `eval/iterative-eval.py`. Tracker faithfulness et context_recall en plus de accuracy. Ces métriques sont requises pour Phase Gate eligibility.

### B2B SaaS Landing Page — Benchmarks Conversion 2026
- Template pages : ~3.8% conversion | Custom : 11.6%+
- **Chatbot live embed dans hero : +3-4x engagement** (plus fort levier de conversion pour une plateforme RAG)
- Video testimonials : +80% conversion
- Hero sous 8 mots, headline outcome-focused
- Structure multi-stakeholder : DG/CEO (ROI) | DSI (sécurité) | Utilisateur (facilité) | Acheteur (ROI/prix)
- **ROI Calculator interactif** : input (nb docs + taille équipe) → output (temps gagné + coût évité)

### Enterprise Production Gates 2026 (Dextra Labs)
Ces seuils définissent la "production readiness" en 2026 :
```
Faithfulness     >= 95%   (actuellement non mesuré)
Hallucination    <= 2%    (actuellement non mesuré)
Helpfulness      >= 90%   (actuellement non mesuré)
Mean latency     <= 2.5s  (actuellement non mesuré)
Accuracy         >= 85%   (Standard: PASS, Quant/Graph: FAIL)
```

### Sécurité Multi-Tenant (Enterprise Critical)
- **Access control bypass** dans les vector stores = faille critique enterprise
- Solution : Document-level ACLs comme metadata dans chaque vector Pinecone
- Isolation par namespace client (actuellement 12 namespaces génériques → à segmenter par client/secteur)
- Table stakes pour tout déploiement B2B réel

---

## 10. Top 10 Actions Prioritaires (Classées par Impact)

1. **Ajouter RAGAS faithfulness + context recall** aux scripts eval (2-4h) — requis Phase Gates
2. **Late chunking Jina** `late_chunking=True` pour ré-ingestion des 3 plus grands namespaces (4-8h) → +10-12%
3. **BM25/keyword search** pour Juridique et Finance dans n8n (1-2h/pipeline) → +15-25%
4. **Query classification node** dans Orchestrator V10.1 — pattern A-RAG Feb 2026 (4-6h)
5. **Hero rag-website** outcome-focused, < 8 mots, chatbot live embed (1 jour)
6. **Confidence-gated escalation** dans Orchestrator si confiance < 0.7 → 2e pipeline (2-4h)
7. **Phase Gate progress bar** dans dashboard (4h)
8. **Progressive disclosure citations** dans chatbot (réponse d'abord, sources collapsibles) (2-4h)
9. **Feedback widget** thumbs up/down → Supabase (2-4h)
10. **ACL metadata** dans Pinecone par client/secteur (1-2 jours, ré-ingestion)

---

## References

| Paper | arXiv ID | Key Contribution |
|-------|----------|-----------------|
| MA-RAG: Multi-Agent RAG | arXiv:2505.20096 | Stage-level specialization, -23% hallucination |
| A-RAG: Adaptive RAG | arXiv:2602.03442 | LLM tool selection, -31% unnecessary calls |
| DeepRead: Document Structure-Aware | arXiv:2602.05014 | Document hierarchy priors, multi-turn evidence |
| Agentic-R: Learning to Retrieve | arXiv:2601.11888 | Retriever fine-tuning pour agentic search |
| Agentic RAG Survey | arXiv:2501.09136 | Taxonomie complète : reflection, planning, tool use |
| GraphRAG vs Vector RAG | arXiv:2502.11371 | GraphRAG 80% vs 50.83% on entity queries |
| Late Chunking | arXiv:2409.04701 | +10-12% retrieval accuracy, no LLM cost |
| RAG-Studio: Domain Adaptation | ACL EMNLP 2024 | Synthetic data pour fine-tuning domain-specific RAG |
| RRF: Reciprocal Rank Fusion | Cormack et al. | +18.5% MRR, fuse vector + BM25 |
| CompactRAG | Internal pattern | +12% on structured/numerical queries |
| RouteRAG | Internal pattern | +6.2% from adaptive routing |
