# RAG Research 2026 — Condensed Findings

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

## References

| Paper | arXiv ID | Key Contribution |
|-------|----------|-----------------|
| MA-RAG: Multi-Agent RAG | arXiv:2505.20096 | Stage-level specialization, -23% hallucination |
| A-RAG: Adaptive RAG | arXiv:2602.03442 | LLM tool selection, -31% unnecessary calls |
| GraphRAG vs Vector RAG | arXiv:2502.11371 | GraphRAG 80% vs 50.83% on entity queries |
| RRF: Reciprocal Rank Fusion | Cormack et al. (classic) | +18.5% MRR, fuse vector + BM25 |
| CompactRAG | Internal pattern | +12% on structured/numerical queries |
| RouteRAG | Internal pattern | +6.2% from adaptive routing |
