# Enrichment V3.1 — Node Topology & Data Flow Diagram

## Complete Node Graph (ASCII)

```
╔════════════════════════════════════════════════════════════════════════════╗
║                    ENRICHMENT V3.1 WORKFLOW TOPOLOGY                       ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ TRIGGER & SETUP PHASE                                                       │
├─────────────────────────────────────────────────────────────────────────────┤

[Chat Trigger] ──────────────────────────────────────────────┐
                                                             │
                                                    ╔═════════╩═════════╗
                                                    ║ Init OT Trace    ║ (Code #1)
                                                    ║ Generate traceID ║
                                                    ╚════════╤═════════╝
                                                             │
                                                    ╔═════════╩═════════╗
                                                    ║ Prepare Lock     ║ (Code #2)
                                                    ║ ttl=2h, key=lock ║
                                                    ╚════════╤═════════╝
                                                             │
                                                    ╔═════════╩═════════╗
                                                    ║ Redis:Acquire    ║ (Redis)
                                                    ║ SET lock.key     ║
                                                    ╚════════╤═════════╝
                                                             │
                                                    ╔═════════╩═════════╗
                                                    ║ Lock Result      ║ (Code #3)
                                                    ║ Check: acquired? ║
                                                    ╚════════╤═════════╝
                                                             │
                                                    ╔═════════╩════════════╗
                                                    ║ IF: Lock Acquired?   ║
                                                    ║ NO → EXIT (SKIP)     ║
                                                    ║ YES → CONTINUE       ║
                                                    ╚═════════╤════════════╝
                                                              │
└──────────────────────────────────────────────────────────────┼──────────────┘

┌──────────────────────────────────────────────────────────────┼──────────────┐
│ DATA FETCH PHASE (Parallel)                                  │              │
├──────────────────────────────────────────────────────────────┼──────────────┤

                                                              YES
                                                              │
                                          ╔═════════════════════════╗
                                          ║ Fetch Internal Use Cases║ (HTTP #1)
                                          ║ GET /cas-usage          ║
                                          ║ timeout=15s             ║
                                          ╚════════╤════════════════╝
                                                   │
                                 ┌─────────────────┼──────────────┐
                                 │                 │              │
                         [Internal Data]    [Normalize & Merge]   │ (Code #4)
                                 │          (dedup + SHA256)      │
                                 │                 │              │
                                 │          ╌──────┘              │
                                 │          │                     │
                    ╌────────────────────────┼─────────────────────┘
                    │                        │
                    │           ╔════════════════════╗
                    │           ║ Fetch External Data║ (HTTP #2)
                    │           ║ GET /api/docs      ║
                    │           ║ timeout=20s        ║
                    │           ╚═════╤══════════════╝
                    │                 │
                    │         [External Data]
                    │                 │
                    │                 │
                    └─────────────────┤
                                      │
                          ╔═══════════╩════════════════╗
                          ║ Normalize & Merge (Code #4)║
                          ║ • SHA256 dedup             ║
                          ║ • Add source_sync_date     ║
                          ║ • Add dedup_hash           ║
                          ╚═════════╤══════════════════╝
                                    │
                      [Merged, deduplicated docs]
                                    │
└────────────────────────────────────┼─────────────────────────────────────────┘

┌────────────────────────────────────┼──────────────────────────────────────────┐
│ ENTITY EXTRACTION PHASE (Dual Path)│                                          │
├────────────────────────────────────┼──────────────────────────────────────────┤

                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
         ╔══════════╩═══════════╗      ╔═══════════╩═════════╗
         ║ CHUNKED PATH (P06)  ║      ║ FULL DOC PATH (AL1) ║
         ║ ────────────────────║      ║ ────────────────────║
         ║                     ║      ║                     ║
         │  [Chunk Documents]  │      │  [Full Document]    │
         │   (Code #5)         │      │                     │
         │   4K chunks, 200 ovr│      │                     │
         └──────┬──────────────┘      │                     │
                │                      │                     │
         ┌──────┴──────────┐          │                     │
         │ SplitInBatches  │          │                     │
         │ Batch size: 5   │          │                     │
         └────────┬────────┘          │                     │
                  │                    │                     │
         ┌────────┴──────────┐        │                     │
         │  Extract Entities │        │  AI Entity          │
         │  Per Chunk        │        │  Enrichment V3.1    │
         │  (HTTP #3)        │        │  (HTTP #4)          │
         │  LLM per chunk    │        │  LLM full doc       │
         └────────┬──────────┘        │  timeout=30s        │
                  │                    │                     │
         ┌────────┴──────────┐        │  [Entities,         │
         │  Aggregate Entity │        │   Relationships,    │
         │  Results          │        │   Hypotheticals,    │
         │  (Code #6)        │        │   Key Facts]        │
         │  • Group by source│        │                     │
         │  • Dedup Q+Facts  │        └──────┬──────────────┘
         └────────┬──────────┘               │
                  │                          │
         ┌────────┴──────────┐              │
         │  Global Entity    │<─────────────┘
         │  Resolution       │
         │  (Code #7 — P07)  │
         │  • Cross-doc dedup│
         │  • Normalize names│
         │  • Merge aliases  │
         │  • Dedup rels     │
         └────────┬──────────┘
                  │
      [Resolved entities + relationships]
                  │
└────────────────────┼────────────────────────────────────────────────────────┘

┌────────────────────┼───────────────────────────────────────────────────────┐
│ ENTITY LINKING PHASE                                                        │
├────────────────────┼───────────────────────────────────────────────────────┤

                     │
         ╔═══════════╩════════════════════════════════════╗
         ║ Relationship Mapper V3.1 (Code #8)             ║
         ║ ─────────────────────────────────────────────  ║
         ║ • MD5-based entity IDs (normalized name+type)  ║
         ║ • Entity linking (aliases → canonical)         ║
         ║ • Relationship weighting:                      ║
         ║   REPORTS_TO (1.5) > MANAGES (1.4)            ║
         ║   OWNS (1.3) > WORKS_WITH/IMPACTS (1.2)       ║
         ║   PART_OF (1.1) > RELATED_TO (1.0)            ║
         ║ • Generate Neo4j MERGE statements             ║
         ║ • Compute avg_relationship_weight             ║
         ╚═════════╤════════════════════════════════════╝
                   │
       [Entity statements + Relationship statements]
                   │
                   │
    ┌──────────────┼──────────────┬────────────────────┐
    │              │              │                    │
    │              │              │                    │
    ↓              ↓              ↓                    ↓

┌─────────────────┐ ┌──────────────────┐ ┌─────────────┐ ┌──────────────────┐
│ Upsert Vectors  │ │ Store Metadata   │ │Update Graph │ │Community Detection│
│ Pinecone        │ │ Postgres         │ │ Neo4j       │ │Trigger (Async)   │
│ (HTTP #5)       │ │ (Postgres #1)    │ │(HTTP #6)    │ │(HTTP #7)         │
│                 │ │                  │ │            │ │                  │
│ POST /vectors   │ │enriched_metadata │ │MERGE Entity│ │algorithm=louvain │
│ upsert          │ │table             │ │MERGE Rels  │ │min_size=5        │
│ id=dedup_hash   │ │                  │ │            │ │async (no wait)   │
│ values=[embed]  │ │                  │ │            │ │                  │
│ metadata={..}   │ │                  │ │            │ │                  │
│ timeout=15s     │ │                  │ │timeout=15s │ │timeout=5s        │
└────────┬────────┘ └────────┬─────────┘ └────────┬───┘ └──────────┬───────┘
         │                   │                    │              │
         └───────────────────┼────────────────────┴──────────────┘
                             │
└─────────────────────────────┼───────────────────────────────────────────────┘

┌─────────────────────────────┼───────────────────────────────────────────────┐
│ COMMUNITY ANALYSIS PHASE                                                     │
├─────────────────────────────┼───────────────────────────────────────────────┤

                              │
                    ╔═════════╩══════════════════════╗
                    ║ Fetch Community Assignments    ║
                    ║ (HTTP #8)                      ║
                    ║ Cypher: MATCH Entity-[BELONGS]║
                    ║         ->(Community)          ║
                    ║ WHERE algo='louvain'           ║
                    ║ LIMIT 50                       ║
                    ╚═════════╤══════════════════════╝
                              │
                   [Community assignments]
                              │
                    ╔═════════╩══════════════════════╗
                    ║ Generate Community Summaries   ║
                    ║ (HTTP #9)                      ║
                    ║ LLM: Input communities         ║
                    ║      Output: title, summary,   ║
                    ║             key_entities,     ║
                    ║             importance_score  ║
                    ║ timeout=30s                    ║
                    ╚═════════╤══════════════════════╝
                              │
          [Community summaries with metadata]
                              │
              ┌───────────────┴────────────────┐
              │                                │
    ╔═════════╩════════════╗       ╔══════════╩═══════════╗
    ║ Store Community      ║       ║ Store Community      ║
    ║ Summaries Neo4j      ║       ║ Summaries Postgres   ║
    ║ (HTTP #10)           ║       ║ (Postgres #2)        ║
    ║                      ║       ║                      ║
    ║ MERGE Community      ║       ║ UPSERT              ║
    ║ {id, title, summary} ║       ║ community_summaries  ║
    ║ timeout=15s          ║       ║ table                ║
    ╚═════════╤════════════╝       ╚══════════╤═══════════╝
              │                                │
              └────────────────┬───────────────┘
                               │
└──────────────────────────────┼───────────────────────────────────────────────┘

┌──────────────────────────────┼───────────────────────────────────────────────┐
│ CLEANUP & COMPLETION PHASE   │                                               │
├──────────────────────────────┼───────────────────────────────────────────────┤

                               │
                      ╔════════╩═════════════════╗
                      ║ Prepare Lock Release     ║
                      ║ (Code #9)                ║
                      ║ Return {lockKey, ...}    ║
                      ╚════════╤═════════════════╝
                               │
                      ╔════════╩═════════════════╗
                      ║ Redis: Release Lock      ║
                      ║ (Redis #2)               ║
                      ║ DELETE lock:enrichment   ║
                      ║ :daily                   ║
                      ╚════════╤═════════════════╝
                               │
                      ╔════════╩═════════════════╗
                      ║ Log Success              ║
                      ║ (Code #10)               ║
                      ║ status=SUCCESS           ║
                      ║ timestamp=now            ║
                      ╚════════╤═════════════════╝
                               │
                      ╔════════╩═════════════════════════════╗
                      ║ Export Trace to OpenTelemetry        ║
                      ║ (HTTP #11)                           ║
                      ║ POST /v1/traces                      ║
                      ║ traceId, spanName, status, timestamp ║
                      ║ timeout=5s                           ║
                      ╚════════╤═════════════════════════════╝
                               │
                      [WORKFLOW COMPLETE]
                               ✓

└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Node Type Distribution

```
┌─────────────────────────────────────────────────────────────┐
│ NODE TYPE BREAKDOWN (29 total)                              │
├─────────────────────────────────────────────────────────────┤

Code Nodes (10)
  ├─ Init OT Trace
  ├─ Prepare Lock
  ├─ Lock Result Handler
  ├─ Normalize & Merge
  ├─ Chunk Documents for Entity Extraction
  ├─ Aggregate Entity Results
  ├─ Global Entity Resolution
  ├─ Relationship Mapper V3.1
  ├─ Prepare Lock Release
  └─ Log Success

HTTP Request Nodes (8)
  ├─ Fetch Internal Use Cases
  ├─ Fetch External Data Sources
  ├─ AI Entity Enrichment V3.1
  ├─ Extract Entities Per Chunk
  ├─ Upsert Vectors Pinecone
  ├─ Update Graph Neo4j
  ├─ Community Detection Trigger
  ├─ Fetch Community Assignments
  ├─ Generate Community Summaries
  ├─ Store Community Summaries Neo4j
  └─ Export Trace to OpenTelemetry

PostgreSQL Nodes (2)
  ├─ Store Metadata Postgres
  └─ Store Community Summaries Postgres

Redis Nodes (2)
  ├─ Redis: Acquire Lock
  └─ Redis: Release Lock

Utility Nodes (7)
  ├─ When chat message received (ChatTrigger)
  ├─ Lock Acquired? (IF conditional)
  ├─ SplitInBatches - Entity Chunks
  └─ 📋 Configuration SOTA 2026 (StickyNote)
```

---

## Data Structure Flow

```
INPUT
├─ Internal Use Cases JSON
│  └─ [{ id, name, description, metadata }, ...]
│
└─ External Data Sources JSON
   └─ [{ id, url, content, timestamp }, ...]

AFTER Normalize & Merge
├─ Merged documents (deduplicated)
├─ Fields added:
│  ├─ enriched: false
│  ├─ source_sync_date: ISO8601
│  └─ dedup_hash: SHA256
│
└─ [{ ...doc, dedup_hash: "abc123...", source_sync_date: "2026-02-20..." }, ...]

AFTER Chunking (P06)
├─ Chunks with metadata:
│  ├─ _chunk_index: 0
│  ├─ _chunk_total: N
│  ├─ _chunk_content: "4000-char substring"
│  ├─ _source_id: "abc123..." (dedup_hash)
│  └─ _original: { ...full original doc }
│
└─ [chunk_1, chunk_2, ..., chunk_N]

AFTER Entity Extraction (LLM)
├─ LLM Response:
│  ├─ entities: [
│  │  ├─ { name: "John Smith", type: "PERSON", aliases: [...], context: "..." }
│  │  └─ { name: "ACME Corp", type: "ORG", aliases: [...], context: "..." }
│  │  └─ ...
│  ├─ relationships: [
│  │  ├─ { source: "John Smith", type: "MANAGES", target: "ACME Corp", confidence: 0.95, evidence: "..." }
│  │  └─ ...
│  ├─ hypothetical_questions: ["Q1", "Q2", "Q3"]
│  └─ key_facts: ["F1", "F2", ...]
│
└─ Per chunk

AFTER Global Entity Resolution (P07)
├─ Cross-document deduplicated entities:
│  ├─ name: "John Smith"
│  ├─ type: "PERSON"
│  ├─ aliases: ["J. Smith", "John M. Smith"]
│  ├─ context: "CEO of ACME Corp; MBA from Stanford"
│  ├─ _resolved_id: "a1b2c3d4..." (SHA256[0:16])
│  └─ ...
│
└─ All unique entities across all documents

AFTER Entity Linking & Relationship Mapping (Code #8)
├─ Entity Statements (Neo4j MERGE):
│  ├─ MERGE (e:Entity {id: "a1b2c3..."})
│  ├─ SET e.name, e.type, e.tenant_id, e.created_at
│  ├─ MERGE (a:Alias {name: "J. Smith", canonical_id: "a1b2c3..."})
│  └─ ...
│
├─ Relationship Statements (Neo4j MERGE):
│  ├─ MATCH (a:Entity {id: "a1b..."}) MATCH (b:Entity {id: "c3d..."})
│  ├─ MERGE (a)-[r:MANAGES]->(b)
│  ├─ SET r.weight = 1.33, r.confidence = 0.95, r.evidence = "..."
│  └─ ...
│
└─ Stats:
   ├─ total_entities: 145
   ├─ canonical_entities: 140
   ├─ alias_count: 5
   ├─ total_relationships: 312
   └─ avg_relationship_weight: 1.18

STORAGE OUTPUTS
├─ Pinecone Vector Store:
│  ├─ Vector ID: "abc123def456..." (dedup_hash)
│  ├─ Values: [0.123, -0.456, ..., 0.789] (1024-dim)
│  └─ Metadata: { full doc + entity/rel summary }
│
├─ Neo4j Graph Database:
│  ├─ Entity nodes: 140 canonical
│  ├─ Alias nodes: 5
│  ├─ Relationship edges: 312
│  └─ Community nodes: Louvain-detected clusters
│
├─ PostgreSQL enriched_metadata:
│  ├─ dedup_hash: "abc123def456..."
│  ├─ source_data: { full document JSON }
│  ├─ sync_date: "2026-02-20T10:30:00Z"
│  └─ ...
│
└─ PostgreSQL community_summaries:
   ├─ community_id: "louvain-123"
   ├─ title: "Financial Services Executives"
   ├─ summary: "Leadership team focused on banking operations..."
   ├─ key_entities: ["John Smith", "Sarah Johnson", ...]
   ├─ importance_score: 0.95
   └─ updated_at: "2026-02-20T10:30:00Z"
```

---

## Execution Timeline

```
Time    Phase              Node Active              Status
────    ─────────────────  ─────────────────────────────────────────────
0ms     Trigger            When chat message       Webhook triggered
                           received
5ms     Setup              Init OT Trace           Generate trace ID
10ms    Setup              Prepare Lock            Create lock config
15ms    Lock               Redis: Acquire Lock     Acquire TTL lock
20ms    Setup              Lock Result Handler     Check lock status
25ms    Conditional        Lock Acquired?          Route: YES/NO

        [If lock failed, exit here]

30ms    Data Fetch         Fetch Internal Use Cases (parallel start)
        (parallel)         Fetch External Data     (parallel start)
                           Sources

50ms                       Fetch Internal Use Cases (complete)
60ms                       Fetch External Data     (complete)

65ms    Merge              Normalize & Merge       Dedup + SHA256 hash
70ms    Chunking           Chunk Documents for     Split into 4K chunks
        (P06)              Entity Extraction       (200-char overlap)
75ms    Batching           SplitInBatches          Batch: 5 per group
                           Entity Chunks
80ms    LLM Extraction     Extract Entities        Batch 1: LLM call
        (loop)             Per Chunk               timeout=30s
110ms                      Extract Entities        Batch 2: LLM call
                           Per Chunk               timeout=30s
        ...
        [Continue batches until all chunks processed]

        Aggregation        Aggregate Entity        Merge chunk results
        (P06)              Results                 per source

        Resolution         Global Entity           Cross-doc dedup
        (P07)              Resolution              + normalize

        Entity Linking     Relationship Mapper     Canonical IDs,
        & Mapping          V3.1                    MD5 hashes,
                                                   weighted rels

        Storage            Upsert Vectors          Parallel start ─┐
        (parallel)         Pinecone                                 │
                           Store Metadata          Parallel start ──┤
                           Postgres                                 │
                           Update Graph Neo4j      Parallel start ──┤
                           Community Detection     Async trigger ───┤
                           Trigger                                  │
        Completion         [All store operations complete] ────────┘

        Community          Fetch Community         Query Neo4j
        Analysis           Assignments             for communities

                           Generate Community      LLM summaries
                           Summaries               timeout=30s

                           Store Community         Neo4j + Postgres
                           Summaries               (parallel)

        Cleanup            Prepare Lock Release    Prep cleanup
                           Redis: Release Lock     DELETE lock
                           Log Success             Log completion
                           Export Trace to OTel    Send metrics

[Workflow Complete - Total Time: Variable (LLM dependent, typically 5-10min)]
```

---

## Decision Tree

```
                           ┌─ ENRICHMENT WORKFLOW START ─┐
                           │                               │
                           ▼
                    ┌──────────────────┐
                    │ Try Lock Acquire  │
                    └──────┬───────────┘
                           │
                   ┌───────┴────────┐
                   │                │
              SUCCESS           FAILURE
                   │                │
                   ▼                ▼
            ┌──────────────┐   ┌────────────┐
            │ Lock OK      │   │ Lock Failed│
            │ Continue...  │   │ → EXIT     │
            └──────┬───────┘   │ Skip work  │
                   │           │ (requeue)  │
                   ▼           └────────────┘
            Fetch & Normalize
                   │
                   ▼
            ┌──────────────────────┐
            │ Choose Extraction    │
            │ Strategy             │
            └──┬──────────────────┬┘
               │                  │
         CHUNKED (P06)      FULL DOC (AL1)
         [Default]           [Alt path]
               │                  │
               ▼                  ▼
         Chunk → Batch      Direct LLM
         → Batch LLM        Extraction
         → Aggregate
         → Global Resolve
               │                  │
               └────────┬─────────┘
                        ▼
             ┌──────────────────────┐
             │ Entity Linking       │
             │ & Relationship Map   │
             └────────┬─────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │ Parallel Storage           │
         ├────┬────┬────┬───────────┐ │
         │    │    │    │           │ │
         ▼    ▼    ▼    ▼           ▼ │
       Pinec Neo4j PG Comm.Detect OTel │
       one         Trigger             │
         │    │    │    │           │ │
         └────┴────┴────┴───────────┘ │
                      │                │
                      ▼                │
         ┌──────────────────────┐      │
         │ Community Analysis   │      │
         │ (Louvain clustering)│      │
         └────────┬────────────┘      │
                  │                    │
                  ▼                    │
         ┌──────────────────────┐      │
         │ Gen Summaries (LLM)  │      │
         └────────┬────────────┘      │
                  │                    │
                  ▼                    │
         ┌──────────────────────┐      │
         │ Store Summaries      │      │
         │ (Neo4j + PG)         │      │
         └────────┬────────────┘      │
                  │                    │
                  └────────┬───────────┘
                           ▼
                  ┌──────────────────┐
                  │ Release Lock     │
                  │ Log + Export OTel│
                  └────────┬─────────┘
                           ▼
                    [WORKFLOW COMPLETE]
```

---

## Module Dependencies

```
Triggers
  └─ Chat Trigger (Webhook)

Utility/Setup
  ├─ Init OT Trace
  ├─ Prepare Lock
  ├─ Lock Result Handler
  └─ Prepare Lock Release

Locking (Redis)
  ├─ Redis: Acquire Lock
  └─ Redis: Release Lock

Data Operations
  ├─ Fetch Internal Use Cases (HTTP)
  ├─ Fetch External Data Sources (HTTP)
  └─ Normalize & Merge (Code)

Entity Extraction (LLM)
  ├─ Chunk Documents for Entity Extraction (Code, P06)
  ├─ SplitInBatches (Entity Chunks)
  ├─ Extract Entities Per Chunk (HTTP)
  ├─ Aggregate Entity Results (Code, P06)
  ├─ Global Entity Resolution (Code, P07)
  ├─ AI Entity Enrichment V3.1 (HTTP, Alt path)
  └─ Relationship Mapper V3.1 (Code)

Storage Layer
  ├─ Upsert Vectors Pinecone (HTTP)
  ├─ Store Metadata Postgres (PostgreSQL)
  ├─ Update Graph Neo4j (HTTP/Cypher)
  └─ Community Detection Trigger (HTTP)

Community Analysis
  ├─ Fetch Community Assignments (HTTP/Cypher)
  ├─ Generate Community Summaries (HTTP/LLM)
  ├─ Store Community Summaries Neo4j (HTTP)
  └─ Store Community Summaries Postgres (PostgreSQL)

Observability
  ├─ Log Success (Code)
  └─ Export Trace to OpenTelemetry (HTTP)
```

---

## Resource & Performance Summary

```
┌──────────────────────────────────────────────────────┐
│ RESOURCE USAGE ESTIMATES                             │
├──────────────────────────────────────────────────────┤

Memory (Estimated)
├─ Workflow execution: ~50-100MB
├─ Chunk storage (4K * N): ~4-40MB (depending on doc count)
├─ Entity aggregation: ~10-50MB
├─ Relationship objects: ~5-20MB
└─ Total: ~80-200MB for typical run

Network I/O
├─ Fetch operations: 2 HTTP calls
├─ Entity extraction: 2-10 HTTP calls (LLM)
├─ Neo4j operations: 3 HTTP calls
├─ Pinecone upsert: 1 HTTP call
├─ Community detection: 1 HTTP call
├─ Community summaries: 1 HTTP call
└─ Total: 10-17 HTTP calls per execution

Database Operations
├─ Redis: 2 SET/DEL operations
├─ PostgreSQL: 2 UPSERT operations
├─ Neo4j: 3 Cypher transactions
└─ Pinecone: 1 vector upsert

LLM Token Consumption
├─ Entity extraction: ~1K-4K tokens per chunk
├─ Community summaries: ~500-2K tokens per community
└─ Typical run: 5K-15K tokens total

Timeout Configuration
├─ HTTP Fetch: 15-20 seconds
├─ LLM Entity Extraction: 30 seconds (2 calls)
├─ Neo4j Transactions: 15 seconds (3 calls)
├─ Pinecone Upsert: 15 seconds
├─ Community Detection: 5 seconds (async)
└─ Total timeout budget: ~110 seconds per execution

Execution Time (Typical)
├─ Setup + Lock: 30-50ms
├─ Fetch operations: 20-50ms (parallel)
├─ Chunking + Batching: 50-100ms
├─ Entity extraction (LLM): 30-120 seconds (per LLM latency)
├─ Entity linking: 100-200ms
├─ Storage operations: 500ms-2s (parallel)
├─ Community analysis: 30-60 seconds
├─ Cleanup: 50-100ms
└─ Total: 1-3 minutes (LLM dependent)

Error Recovery
├─ Fetch: continueErrorOutput (graceful)
├─ HTTP requests: retryOnFail (3 attempts, 2s between)
├─ Lock: IF conditional skip
└─ Overall: Partial failure tolerance
```

---

## Code Node Complexity Ranking

```
COMPLEXITY RANKING

Highest Complexity
1. Relationship Mapper V3.1 (Entity Linking)
   ├─ MD5 hashing
   ├─ Entity ID generation
   ├─ Alias resolution
   ├─ Relationship weighting (7 types)
   ├─ Neo4j statement generation
   └─ ~180 lines of JS

2. Global Entity Resolution (P07)
   ├─ Cross-document dedup
   ├─ Normalization
   ├─ Entity index building
   ├─ Relationship dedup
   └─ ~100 lines of JS

3. Aggregate Entity Results (P06)
   ├─ Chunk grouping by source
   ├─ LLM response parsing
   ├─ Multi-field collection
   ├─ Deduplication
   └─ ~80 lines of JS

4. Chunk Documents for Entity Extraction (P06)
   ├─ Document splitting
   ├─ Overlap calculation
   ├─ Chunk indexing
   ├─ Metadata tracking
   └─ ~70 lines of JS

5. Normalize & Merge
   ├─ SHA256 hashing
   ├─ Deduplication
   ├─ Metadata addition
   └─ ~50 lines of JS

Medium Complexity
6. Lock Result Handler
   ├─ Lock status evaluation
   ├─ Conditional logging
   └─ ~40 lines of JS

7. Prepare Lock
   └─ ~20 lines of JS

8. Init OT Trace
   └─ ~15 lines of JS

Low Complexity
9. Prepare Lock Release
   └─ ~10 lines of JS

10. Log Success
    └─ ~10 lines of JS
```

