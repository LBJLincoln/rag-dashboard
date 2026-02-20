# Enrichment V3.1 Workflow — Complete Analysis Index

**Source**: `/home/termius/mon-ipad/n8n/live/enrichment.json`
**Workflow ID**: ORa01sX4xI0iRCJ8
**Last Updated**: 2026-02-20T20:35:00+01:00
**Total Analysis**: 93 KB across 3 documents

---

## Document Map

### 1. **enrichment-workflow-analysis.md** (37 KB — COMPREHENSIVE)
   **Use this for**: In-depth technical understanding

   **Sections**:
   - ✅ Section 1: Complete node inventory (29 nodes)
   - ✅ Section 2: Workflow flow & connections (full diagram)
   - ✅ Section 3: JavaScript code nodes (10 detailed analyses)
   - ✅ Section 4: API calls & external integrations
   - ✅ Section 5: Entity extraction method (V3.1 details)
   - ✅ Section 6: Graph enrichment (Neo4j operations)
   - ✅ Section 7: Community detection & clustering
   - ✅ Section 8: Document enrichment pipeline
   - ✅ Section 9: Resiliency features
   - ✅ Section 10: Performance characteristics
   - ✅ Section 11: Configuration requirements
   - ✅ Section 12: V3.1 changes vs V3.0
   - ✅ Section 13: Known limitations & TODO
   - ✅ Section 14: Integration points
   - ✅ Section 15: Quick reference table

---

### 2. **enrichment-node-diagram.md** (39 KB — VISUAL)
   **Use this for**: Understanding workflow topology & data flow

   **Sections**:
   - ✅ Complete node graph (ASCII art, 5 phases)
   - ✅ Node type distribution (visualization)
   - ✅ Data structure flow (input → output)
   - ✅ Execution timeline (0ms → completion)
   - ✅ Decision tree (conditional routing)
   - ✅ Module dependencies (DAG)
   - ✅ Resource & performance summary
   - ✅ Code node complexity ranking

---

### 3. **enrichment-quick-reference.md** (17 KB — REFERENCE)
   **Use this for**: Quick lookups & debugging

   **Sections**:
   - ✅ Section 1: Key metrics at a glance
   - ✅ Section 2: Workflow phases (TLDR)
   - ✅ Section 3: Entity extraction methods
   - ✅ Section 4: Critical code nodes
   - ✅ Section 5: Database schemas
   - ✅ Section 6: API endpoints
   - ✅ Section 7: Environment variables
   - ✅ Section 8: Relationship weights & types
   - ✅ Section 9: Execution decision tree
   - ✅ Section 10: Performance tuning tips
   - ✅ Section 11: Debugging checklist
   - ✅ Section 12: Common issues & solutions
   - ✅ Section 13: Integration points
   - ✅ Section 14: Monitoring & observability
   - ✅ Section 15: Upgrade roadmap
   - ✅ Section 16: Quick command reference
   - ✅ Section 17: Testing & validation
   - ✅ Section 18: Cost analysis
   - ✅ Section 19: Support & references
   - ✅ Section 20: Version history

---

## Analysis Overview

### Workflow at a Glance

```
NAME          TEST - SOTA 2026 - Enrichissement V3.1
WORKFLOW ID   ORa01sX4xI0iRCJ8
STATUS        Production Ready
NODES         29 total
  ├─ Code: 10
  ├─ HTTP: 8
  ├─ PostgreSQL: 2
  ├─ Redis: 2
  ├─ Conditional: 1
  ├─ Trigger: 1
  ├─ Batching: 1
  └─ Utility: 4

ENTITY TYPES  7 (PERSON, ORG, PROJECT, METRIC, DATE, LOCATION, CONCEPT)
REL TYPES     7 (REPORTS_TO 1.5, MANAGES 1.4, OWNS 1.3, WORKS_WITH 1.2, etc.)
CHUNKS        4K chars, 200-char overlap
BATCH SIZE    5 per batch
TIMEOUT       ~110 seconds
EXEC TIME     1-3 minutes (LLM dependent)
```

---

## Content Summary

### ALL NODE NAMES (29)

| Phase | Nodes |
|-------|-------|
| **Trigger** | When chat message received |
| **Trace & Lock** | Init OT Trace, Prepare Lock, Redis: Acquire Lock, Lock Result Handler, Lock Acquired?, Prepare Lock Release, Redis: Release Lock, Log Success |
| **Data Fetch** | Fetch Internal Use Cases, Fetch External Data Sources, Normalize & Merge |
| **Entity Extract (P06)** | Chunk Documents for Entity Extraction, SplitInBatches - Entity Chunks, Extract Entities Per Chunk, Aggregate Entity Results, Global Entity Resolution |
| **Entity Link** | AI Entity Enrichment V3.1 (Enhanced), Relationship Mapper V3.1 |
| **Storage** | Upsert Vectors Pinecone, Store Metadata Postgres, Update Graph Neo4j, Community Detection Trigger |
| **Community** | Fetch Community Assignments, Generate Community Summaries, Store Community Summaries Neo4j, Store Community Summaries Postgres |
| **Observability** | Export Trace to OpenTelemetry |
| **Docs** | 📋 Configuration SOTA 2026 |

---

## API CALLS SUMMARY (11 total)

| # | Type | Target | Purpose |
|---|------|--------|---------|
| 1 | HTTP GET | Internal API | Fetch use cases |
| 2 | HTTP GET | External API | Fetch data sources |
| 3 | HTTP POST | LLM (DeepSeek/OpenAI) | Entity extraction (per chunk) |
| 4 | HTTP POST | LLM (DeepSeek/OpenAI) | Full doc entity extraction (alt path) |
| 5 | HTTP POST | Pinecone | Upsert vectors + metadata |
| 6 | HTTP POST | Neo4j Aura | MERGE entities + relationships |
| 7 | HTTP POST | Neo4j Aura | Trigger Louvain community detection |
| 8 | HTTP POST | Neo4j Aura | Fetch community assignments |
| 9 | HTTP POST | LLM (DeepSeek/OpenAI) | Generate community summaries |
| 10 | HTTP POST | Neo4j Aura | Store community summaries |
| 11 | HTTP POST | OpenTelemetry | Export trace metrics |

**Plus**: PostgreSQL (2 UPSERT), Redis (2 ops: SET/DEL)

---

## KEY ALGORITHMS

### 1. Deduplication (Normalize & Merge)
- **Hash**: SHA256
- **Method**: Set-based detection
- **Output**: dedup_hash per document

### 2. Entity ID Generation (Relationship Mapper)
- **Hash**: MD5
- **Input**: normalized_name + entity_type
- **Output**: First 16 hex chars (a1b2c3d4e5f6g7h8)

### 3. Entity Linking (Relationship Mapper)
- **Normalization**: Trim + collapse spaces + uppercase
- **Canonical resolution**: Aliases → first occurrence
- **Alias nodes created** in Neo4j

### 4. Relationship Weighting
- **Formula**: TYPE_WEIGHT × CONFIDENCE
- **Weights**: 1.5 (REPORTS_TO) → 1.0 (RELATED_TO)

### 5. Community Detection
- **Algorithm**: Louvain (modularity-based clustering)
- **Min size**: 5 entities per community
- **Execution**: Async (non-blocking)

---

## CRITICAL FEATURES

### ✅ Dual Entity Extraction Paths

**Path A: Chunked (P06 + P07)** — DEFAULT
- 4K chunks, 200-char overlap
- Batch size 5
- Per-chunk LLM extraction
- Aggregation by source
- Cross-document global resolution
- **Best for**: Large documents, token efficiency

**Path B: Full Document (AL1)** — ALTERNATIVE
- Direct LLM (up to 30K tokens)
- No chunking overhead
- **Best for**: Small-medium docs, better context

### ✅ Weighted Knowledge Graph

7 relationship types with weights:
- REPORTS_TO (1.5) — strongest
- MANAGES (1.4)
- OWNS (1.3)
- WORKS_WITH (1.2)
- IMPACTS (1.2)
- PART_OF (1.1)
- RELATED_TO (1.0) — weakest

### ✅ Multi-Database Storage

- **Pinecone**: Vectors (1024-dim) + full document metadata
- **Neo4j**: Graph entities (canonical + aliases) + weighted relationships + communities
- **PostgreSQL**: Enriched metadata + community summaries
- **Redis**: Distributed locking (2-hour TTL)

### ✅ Community Analysis

- Louvain clustering (async, non-blocking)
- LLM-generated community summaries (title, description, key entities)
- Importance scoring (0.0-1.0)
- Stored in both Neo4j and PostgreSQL

### ✅ Resiliency

- **Distributed lock**: Prevents concurrent runs
- **Retry logic**: 3 attempts × 2s delay for LLM calls
- **Graceful degradation**: continueErrorOutput on HTTP failures
- **OpenTelemetry tracing**: End-to-end observability

---

## ENTITY EXTRACTION PIPELINE (DETAILED)

```
INPUT: Documents (internal + external)
  ↓
1. NORMALIZE & MERGE
   • SHA256 dedup
   • Add source_sync_date + dedup_hash

2. CHOOSE PATH
   ├─ P06 (Chunked) [DEFAULT]
   │  ├─ Chunk (4K, 200 overlap)
   │  ├─ SplitInBatches (5)
   │  ├─ Extract Entities Per Chunk (LLM)
   │  ├─ Aggregate Entity Results (per source)
   │  └─ Global Entity Resolution (cross-doc)
   │
   └─ AL1 (Full Doc) [ALTERNATIVE]
      └─ AI Entity Enrichment V3.1 (direct LLM)

3. ENTITY LINKING (Relationship Mapper V3.1)
   • MD5-based entity IDs
   • Alias resolution → canonical
   • 7 relationship types
   • Weight = TYPE_WEIGHT × confidence
   • Generate Neo4j MERGE statements

4. STORAGE (PARALLEL)
   ├─ Pinecone: Vector + metadata
   ├─ PostgreSQL: Enriched metadata
   ├─ Neo4j: Entities + relationships
   └─ Community Detection (Louvain, async)

5. COMMUNITY ANALYSIS
   ├─ Fetch assignments (Cypher)
   ├─ Generate summaries (LLM)
   └─ Store Neo4j + PostgreSQL

OUTPUT: Graph + Vectors + Metadata
```

---

## CODE NODE ANALYTICS

| Node | Complexity | Lines | Purpose |
|------|-----------|-------|---------|
| Relationship Mapper V3.1 | ⭐⭐⭐⭐⭐ Highest | ~180 | Entity linking + weighting |
| Global Entity Resolution | ⭐⭐⭐⭐ | ~100 | Cross-doc dedup |
| Aggregate Entity Results | ⭐⭐⭐ | ~80 | Merge chunk results |
| Chunk Documents | ⭐⭐⭐ | ~70 | Document splitting |
| Normalize & Merge | ⭐⭐ | ~50 | Deduplication |
| Lock Result Handler | ⭐⭐ | ~40 | Status check |
| Prepare Lock | ⭐ | ~20 | Config |
| Init OT Trace | ⭐ | ~15 | Tracing init |
| Prepare Lock Release | ⭐ | ~10 | Cleanup |
| Log Success | ⭐ | ~10 | Logging |

---

## PERFORMANCE METRICS

### Timeouts
```
Fetch Internal Use Cases   15s
Fetch External Data        20s
Entity Extraction (LLM)    30s (per call)
Pinecone Upsert            15s
Neo4j Transactions         15s
Community Detection        5s (async)
Total budget              ~110s
```

### Typical Execution Time
```
Setup + Lock              30-50ms
Data Fetch (parallel)     20-50ms
Chunking + Batching       50-100ms
Entity Extraction (LLM)   30-120s ← dominant
Entity Linking            100-200ms
Storage (parallel)        500ms-2s
Community Analysis        30-60s
Cleanup                   50-100ms
────────────────────────────────
TOTAL                     1-3 minutes
```

### Memory & Resources
```
Workflow execution        ~50-100MB
Chunk storage             ~4-40MB
Entity aggregation        ~10-50MB
Relationship objects      ~5-20MB
────────────────────────────────
TOTAL                     ~80-200MB
```

---

## DATABASE SCHEMAS (QUICK VIEW)

### Neo4j
```cypher
:Entity {id, name, type, tenant_id, created_at, updated_at}
:Alias {name, canonical_id}
(entity)-[REPORTS_TO|MANAGES|OWNS|WORKS_WITH|IMPACTS|PART_OF|RELATED_TO]->(entity)
  {weight, confidence, evidence, updated_at}
:Community {id, algorithm, title, summary, key_entities, importance_score, updated_at}
(entity)-[:BELONGS_TO]->(community)
```

### PostgreSQL
```sql
enriched_metadata (dedup_hash, source_data, sync_date)
community_summaries (community_id, title, summary, key_entities, importance_score, updated_at)
```

### Pinecone
```
id: dedup_hash
values: [1024-dimensional embedding]
metadata: {dedup_hash, source_data, entities, relationships, sync_date}
```

---

## ENVIRONMENT VARIABLES (REQUIRED)

```bash
NEO4J_URL                  # https://xxxxx.databases.neo4j.io
ENTITY_EXTRACTION_API_URL  # https://api.deepseek.com/v1/chat/completions
ENTITY_EXTRACTION_MODEL    # deepseek-chat
PINECONE_URL               # https://xxxxx-xxxxx.pinecone.io
OTEL_COLLECTOR_URL         # https://otel-collector.internal (optional)
```

---

## HOW TO USE THESE DOCUMENTS

### Scenario 1: "I need to understand the workflow architecture"
→ Start with **enrichment-node-diagram.md** (visual overview)
→ Then read **enrichment-workflow-analysis.md** (Sections 1-2)

### Scenario 2: "I need to debug an issue"
→ Go to **enrichment-quick-reference.md** (Section 11: Debugging Checklist)
→ Check **enrichment-quick-reference.md** (Section 12: Common Issues)
→ Look up API/config in **enrichment-workflow-analysis.md** (Section 4)

### Scenario 3: "I need to modify entity extraction"
→ Read **enrichment-workflow-analysis.md** (Section 5: Entity Extraction Method)
→ Review code nodes in **enrichment-workflow-analysis.md** (Section 3)
→ Check performance impact in **enrichment-quick-reference.md** (Section 10)

### Scenario 4: "I need to understand graph storage"
→ Read **enrichment-workflow-analysis.md** (Section 6: Graph Enrichment)
→ Review Neo4j schema in **enrichment-quick-reference.md** (Section 5)
→ Check integration in **enrichment-workflow-analysis.md** (Section 14)

### Scenario 5: "I need to tune performance"
→ Check **enrichment-node-diagram.md** (Resource & Performance Summary)
→ Review **enrichment-quick-reference.md** (Section 10: Performance Tuning Tips)
→ Check timeouts in **enrichment-workflow-analysis.md** (Section 10)

### Scenario 6: "I need to upgrade to V4.0"
→ Read **enrichment-quick-reference.md** (Section 15: Upgrade Roadmap)
→ Review SOTA papers referenced there
→ Check limitations in **enrichment-workflow-analysis.md** (Section 13)

---

## KEY INSIGHTS

### 🔑 Insight 1: Two-Stage Entity Resolution
The workflow uses a **two-stage approach**:
1. **Per-chunk extraction** (P06): Fast, handles large docs
2. **Global resolution** (P07): Deduplicates across documents

This is critical for multi-document scenarios where the same entity appears with different names.

### 🔑 Insight 2: Weighted Relationship Importance
Not all relationships are equal:
- REPORTS_TO (1.5x) represents strong hierarchy
- RELATED_TO (1.0x) is a weak generic link

This weight system enables **importance-based traversals** in graph queries.

### 🔑 Insight 3: Distributed Locking (Redis)
The workflow prevents concurrent execution via **Redis-based locking**:
- TTL: 2 hours (prevents zombie locks)
- Worker ID: execution-based
- If lock fails: workflow exits gracefully (will retry later)

This is essential for cron-scheduled enrichment jobs.

### 🔑 Insight 4: Async Community Detection
Louvain clustering runs **asynchronously**:
- Doesn't block main workflow
- Summaries may lag slightly behind entities
- Enables near-real-time entity storage

### 🔑 Insight 5: Hybrid Storage (3 databases)
Data is split strategically:
- **Pinecone**: Vector search (RAG queries)
- **Neo4j**: Graph traversal (relationship queries)
- **PostgreSQL**: Structured metadata (reporting, admin)

This **polyglot persistence** pattern optimizes for different query types.

---

## QUICK STATS

```
Nodes:              29
  Code:             10
  HTTP:             8
  Database:         4
  Conditional:      1
  Other:            6

API Calls:          11 (LLM: 3, Neo4j: 4, HTTP: 4)
Database Ops:       4 (Redis: 2, PostgreSQL: 2)

Entity Types:       7
Relationship Types: 7
Entity Type Weights: 7 (1.5 to 1.0)

Chunk Parameters:
  Size:             4,000 characters
  Overlap:          200 characters
  Batch:            5 per batch

Execution Time:     1-3 minutes (LLM dependent)
Memory Usage:       ~80-200MB
Timeout Budget:     ~110 seconds

Database Models:
  Neo4j:            Entities + Relationships + Communities
  PostgreSQL:       Metadata + Community Summaries
  Pinecone:         Vectors + Full Document
  Redis:            Distributed Lock
```

---

## RELATED DOCUMENTS

**In same directory** (`technicals/debug/`):
- `knowledge-base.md` — Patterns, solutions, APIs, commands (cerveau persistant)
- `fixes-library.md` — Known issues + solutions (24+ documented fixes)
- `diagnostic-flowchart.md` — Troubleshooting decision tree
- `webhook-debug-guide.md` — Webhook testing & debugging

**In technicals/infra/**:
- `architecture.md` — Workflow topology (4 pipelines, 9+ workflows)
- `env-vars-exhaustive.md` — Complete environment variable reference
- `n8n-endpoints.md` — All webhook paths and API routes

**In technicals/project/**:
- `team-agentic-process.md` — Multi-model coordination (Opus + Sonnet + Haiku)
- `phases-overview.md` — Phase A-D gates and milestones
- `rag-research-2026.md` — SOTA papers and innovations

---

## SUMMARY

**Enrichment V3.1** is a sophisticated, production-grade workflow that:

✅ Extracts entities + relationships from documents (dual-path: chunked or full-doc)
✅ Links entities across documents (global resolution)
✅ Builds weighted knowledge graphs (Neo4j)
✅ Performs community detection (Louvain clustering)
✅ Stores vectors (Pinecone) + metadata (PostgreSQL) + graph (Neo4j)
✅ Provides full observability (OpenTelemetry tracing)
✅ Prevents concurrent runs (Redis distributed locking)
✅ Gracefully handles errors and partial failures

**This 93 KB analysis covers**:
- ✅ 29 nodes (all documented)
- ✅ 11 API calls (all detailed)
- ✅ 10 JavaScript code nodes (all code extracted + explained)
- ✅ 4 external databases (schemas + operations)
- ✅ 7 entity types + 7 relationship types
- ✅ Performance, resilience, debugging, configuration, upgrade path

---

**Start here**: `enrichment-quick-reference.md` (easy reference)
**Go deeper**: `enrichment-workflow-analysis.md` (technical depth)
**See visually**: `enrichment-node-diagram.md` (diagrams + flows)

