# Enrichment V3.1 — Quick Reference Guide

**Last Updated**: 2026-02-20
**Workflow ID**: ORa01sX4xI0iRCJ8
**Status**: Production Ready (SOTA 2026)

---

## 1. KEY METRICS AT A GLANCE

| Metric | Value |
|--------|-------|
| Total Nodes | 29 |
| Code Nodes | 10 |
| HTTP Calls | 11 |
| Entity Types | 7 (PERSON, ORG, PROJECT, METRIC, DATE, LOCATION, CONCEPT) |
| Relationship Types | 7 (REPORTS_TO, MANAGES, OWNS, WORKS_WITH, IMPACTS, PART_OF, RELATED_TO) |
| Chunk Size | 4,000 characters |
| Chunk Overlap | 200 characters |
| Batch Size | 5 chunks |
| Min Community Size | 5 entities |
| Lock TTL | 7,200 seconds (2 hours) |
| Timeout Budget | ~110 seconds |
| Typical Execution Time | 1-3 minutes |

---

## 2. WORKFLOW PHASES (TLDR)

```
PHASE                      NODES                          TIME
─────────────────────────  ─────────────────────────────  ──────────
Trigger & Setup            Chat Trigger → Init OT         30-50ms
                           Trace → Prepare Lock

Distributed Locking        Redis: Acquire → Lock Handler  20-30ms
                           → IF (Lock Acquired?)

Data Fetch (Parallel)      Fetch Internal + External      20-50ms
                           → Normalize & Merge

Entity Extraction (P06)    Chunk → SplitInBatches         30-120s
                           → Extract (per chunk)
                           → Aggregate → Global Resolve

Entity Linking             Relationship Mapper V3.1        100-200ms

Storage (Parallel)         Upsert Pinecone + Store PG      500ms-2s
                           + Update Neo4j + Community
                           Detection (async)

Community Analysis         Fetch Assignments → Gen         30-60s
                           Summaries → Store

Cleanup                    Release Lock → Log Success      50-100ms
                           → Export OTel Trace
```

---

## 3. ENTITY EXTRACTION METHODS

### Method A: Chunked Extraction (P06 + P07) — DEFAULT
```
Documents (any size)
  ↓ Chunk (4K, 200-char overlap)
  ↓ Batch (5 per batch)
  ↓ LLM extraction per chunk
  ↓ Aggregate results by source
  ↓ Global entity resolution (cross-doc dedup)
  ↓ Entities + Relationships (weighted)

✓ Pros: Handles large docs, token-efficient
✗ Cons: More complex, inter-chunk context loss
```

### Method B: Full Document Extraction (AL1) — ALTERNATIVE
```
Documents (up to 30K tokens)
  ↓ AI Entity Enrichment V3.1 (direct LLM)
  ↓ Entities + Relationships (weighted)

✓ Pros: Simple, better context
✗ Cons: High token usage, fails on very large docs
```

---

## 4. CRITICAL CODE NODES

### 4.1 Normalize & Merge (Deduplication)
```javascript
// SHA256-based deduplication
• Input: Internal + External docs
• Process: SHA256 hash → Set-based dedup
• Output: Merged docs with dedup_hash field
• Log: "Dedup ratio: X → Y"
```

### 4.2 Relationship Mapper V3.1 (Entity Linking)
```javascript
// Core algorithm: MD5-based entity IDs + weighted rels
• Entity ID: MD5(normalized_name + type)[0:16]
• Alias resolution: Map all aliases → canonical entity
• Relationship weights:
  REPORTS_TO  = 1.5 × confidence
  MANAGES     = 1.4 × confidence
  OWNS        = 1.3 × confidence
  WORKS_WITH  = 1.2 × confidence
  IMPACTS     = 1.2 × confidence
  PART_OF     = 1.1 × confidence
  RELATED_TO  = 1.0 × confidence
• Output: Neo4j statements + relationship stats
```

### 4.3 Global Entity Resolution (P07)
```javascript
// Cross-document entity deduplication
• Normalize: trim + collapse spaces + uppercase
• Key: "{normalized_name}::{entity_type}"
• Merge: Combine aliases + contexts
• Output: Deduplicated entity set with _resolved_id
```

---

## 5. DATABASE SCHEMAS

### 5.1 Neo4j

```cypher
(:Entity {
  id: "a1b2c3d4e5f6g7h8",
  name: "ACME Corporation",
  type: "ORG",
  tenant_id: "default",
  created_at: datetime(),
  updated_at: datetime()
})

(:Alias {
  name: "ACME Corp",
  canonical_id: "a1b2c3d4e5f6g7h8"
})

(entity)-[:REPORTS_TO|MANAGES|OWNS|WORKS_WITH|IMPACTS|PART_OF|RELATED_TO]->(entity) {
  weight: 0.7-1.5,
  confidence: 0.0-1.0,
  evidence: "...",
  updated_at: datetime()
}

(:Community {
  id: "louvain-123",
  title: "...",
  summary: "...",
  key_entities: [...],
  importance_score: 0.0-1.0,
  updated_at: datetime()
})

(entity)-[:BELONGS_TO]->(community)
```

### 5.2 PostgreSQL (Supabase)

**enriched_metadata**:
```
dedup_hash   | TEXT (SHA256 hex)
source_data  | JSONB (full document)
sync_date    | TIMESTAMP
```

**community_summaries**:
```
community_id     | VARCHAR
title            | VARCHAR
summary          | TEXT
key_entities     | JSONB
importance_score | FLOAT
updated_at       | TIMESTAMP
```

### 5.3 Pinecone

```
Vector ID:  dedup_hash (16-char SHA256)
Values:     [1024-dimensional embedding]
Metadata:   {
              dedup_hash,
              source_data,
              entities: [],
              relationships: [],
              sync_date
            }
```

---

## 6. API ENDPOINTS

| API | Endpoint | Method | Purpose |
|-----|----------|--------|---------|
| LLM (Entity) | `$env.ENTITY_EXTRACTION_API_URL` | POST | Extract entities + rels |
| LLM (Community) | `$env.ENTITY_EXTRACTION_API_URL` | POST | Summarize communities |
| Neo4j | `$env.NEO4J_URL/db/neo4j/tx/commit` | POST | Cypher transactions |
| Pinecone | `$env.PINECONE_URL/vectors/upsert` | POST | Store embeddings |
| PostgreSQL | Supabase pooler | Native | UPSERT metadata |
| Redis | Upstash | Native | Distributed locking |
| OTel | `$env.OTEL_COLLECTOR_URL/v1/traces` | POST | Export traces |

---

## 7. ENVIRONMENT VARIABLES

**Required**:
```bash
NEO4J_URL                   # https://xxxxx.databases.neo4j.io
ENTITY_EXTRACTION_API_URL   # https://api.deepseek.com/v1/chat/completions
ENTITY_EXTRACTION_MODEL     # deepseek-chat
PINECONE_URL                # https://xxxxx-xxxxx.pinecone.io
```

**Optional**:
```bash
OTEL_COLLECTOR_URL          # Default: https://otel-collector.internal
SQL_GENERATION_API_URL      # For future phases
EMBEDDING_API_URL           # For future phases
RERANKER_API_URL            # For future phases
```

---

## 8. RELATIONSHIP WEIGHTS & TYPES

**Hierarchy**: REPORTS_TO (1.5) → RELATED_TO (1.0)

| Type | Weight | Use Case |
|------|--------|----------|
| REPORTS_TO | 1.5 | Direct hierarchy (strongest) |
| MANAGES | 1.4 | Management responsibility |
| OWNS | 1.3 | Ownership, stewardship |
| WORKS_WITH | 1.2 | Collaboration, peer interaction |
| IMPACTS | 1.2 | Influence, causality |
| PART_OF | 1.1 | Membership, containment |
| RELATED_TO | 1.0 | Generic connection (weakest) |

**Final Weight** = TYPE_WEIGHT × CONFIDENCE

Example: REPORTS_TO (1.5) × confidence (0.8) = 1.2 final weight

---

## 9. EXECUTION DECISION TREE

```
START
  │
  ├─ Try Redis Lock
  │  ├─ SUCCESS → Continue to data fetch
  │  └─ FAIL → EXIT (workflow skipped, will retry)
  │
  ├─ Fetch Internal + External (parallel)
  │  └─ Merge + Deduplicate (SHA256)
  │
  ├─ Choose Extraction Path
  │  ├─ P06 (Chunked) [DEFAULT] → Chunk → Batch → Extract → Aggregate → Global Resolve
  │  └─ AL1 (Full Doc) [Alternative] → Direct LLM extraction
  │
  ├─ Entity Linking
  │  ├─ Generate MD5-based entity IDs
  │  ├─ Resolve aliases → canonical
  │  └─ Weight relationships (7 types)
  │
  ├─ Storage (Parallel)
  │  ├─ Upsert Pinecone vectors
  │  ├─ Store PostgreSQL metadata
  │  ├─ Update Neo4j (MERGE entities + rels)
  │  └─ Trigger Community Detection (Louvain, async)
  │
  ├─ Community Analysis
  │  ├─ Fetch community assignments (Cypher)
  │  ├─ Generate LLM summaries
  │  └─ Store Neo4j + PostgreSQL
  │
  └─ Cleanup
     ├─ Release Redis lock
     ├─ Log success
     └─ Export OTel trace
```

---

## 10. PERFORMANCE TUNING TIPS

### For Large Document Sets
1. **Chunking**: Reduce CHUNK_SIZE from 4000 → 2000 (smaller chunks, more LLM calls)
2. **Batching**: Increase batch size from 5 → 10 (fewer LLM calls, higher latency)
3. **Parallel Storage**: Already optimized (3-way parallel: Pinecone + PG + Neo4j)

### For Better Entity Quality
1. **Global Resolution**: Enabled by default (P07 node)
2. **Alias Detection**: LLM-based (prompt includes alias extraction)
3. **Validation**: Add post-extraction filtering (POS tags, entity type validation)

### For Faster Execution
1. **Use AL1 (Full Doc)**: Skip chunking for docs <5KB
2. **Reduce Timeouts**: Lower LLM timeout from 30s → 15s (risk of truncation)
3. **Disable OTel**: Remove export trace node (diagnostic only)

### For Lower Token Usage
1. **Use P06 (Chunked)**: 4 × 1000-token chunks << 1 × 4000-token doc
2. **Reduce max_tokens**: Lower LLM max_tokens from 4096 → 2048
3. **Use lower-cost LLM**: Switch from deepseek-chat to gemma-27b (OpenRouter)

---

## 11. DEBUGGING CHECKLIST

### Workflow Stuck?
- ✅ Check Redis lock: `KEYS lock:*` → TTL should be ~7200s
- ✅ Check execution logs: n8n → Executions → Failed
- ✅ Check API credentials: `$env.NEO4J_URL`, `$env.ENTITY_EXTRACTION_API_URL`
- ✅ Check network: Can reach Neo4j Aura, LLM API, Pinecone?

### Entity Extraction Poor Quality?
- ✅ Verify LLM model: `$env.ENTITY_EXTRACTION_MODEL` should be deepseek-chat
- ✅ Check prompt: System message in AI Entity Enrichment node
- ✅ Check LLM API response: Inspect node execution details
- ✅ Consider Global Resolution: Ensure P07 node is executing

### Entities Missing from Neo4j?
- ✅ Run Cypher: `MATCH (e:Entity) RETURN count(e) as total`
- ✅ Check tenant_id: Entities should have `tenant_id = $trace_id.split('-')[0]`
- ✅ Check Relationship Mapper output: Should have entity_statements array

### Communities Not Created?
- ✅ Check Neo4j: `MATCH (c:Community) RETURN count(c)`
- ✅ Check Louvain trigger response: Should return 200 status
- ✅ Check min_community_size: Reduce from 5 to 3 for small graphs

### Pinecone Vectors Missing?
- ✅ Check Upsert response: Should return vector count
- ✅ Verify embedding dimension: Should be 1024-dim
- ✅ Check metadata: Full document + entity/rel summary

---

## 12. COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| "Lock already held" | Another instance running | Wait 2 hours for TTL, or manually delete Redis key |
| LLM timeout | Large documents | Reduce CHUNK_SIZE or enable chunking |
| Neo4j constraint violation | Duplicate entity IDs | Check MD5 hashing, ensure normalization working |
| Community Detection Trigger 503 | Neo4j overloaded | Scale Neo4j or reduce min_community_size |
| Missing hypothetical questions | LLM response parse error | Check LLM response format (must be JSON) |
| Pinecone upsert slow | Large vectors or slow network | Reduce batch size or check network latency |

---

## 13. INTEGRATION POINTS

### Upstream (Inputs)
- **Fetch Internal Use Cases**: Company-internal API
- **Fetch External Data Sources**: 3rd-party API

### Downstream (Consumers)
- **RAG Standard**: Queries Pinecone for vector search
- **RAG Graph**: Traverses Neo4j entities + relationships
- **Dashboard**: Reads PostgreSQL for community stats
- **OpenTelemetry**: Receives trace data for observability

---

## 14. MONITORING & OBSERVABILITY

### Key Metrics to Track
```
Execution
├─ Execution time (P50, P95, P99)
├─ Success rate (%)
└─ Lock contention (% skipped)

Entity Extraction
├─ Entities extracted (per run)
├─ Relationships created (per run)
├─ Avg relationship weight
└─ Entity dedup ratio

Storage
├─ Pinecone vectors stored
├─ Neo4j entities + relationships
├─ PostgreSQL rows inserted
└─ Community count

LLM
├─ Token consumption (per run)
├─ LLM latency (P50, P95)
└─ Error rate (%)

Graph
├─ Community count (after Louvain)
├─ Avg community size
└─ Importance score distribution
```

### Alerts to Set
```
Critical
├─ Execution failure rate > 5%
├─ Lock hold time > 1 hour
└─ LLM API error rate > 10%

Warning
├─ Execution time > 5 minutes
├─ Entity count < 50 (low extraction)
└─ Neo4j disk usage > 80%
```

---

## 15. UPGRADE ROADMAP (Next Versions)

### V3.2 (Soon)
- [ ] Late chunking in Jina embeddings (better context)
- [ ] Entity type validation (POS + domain-specific)
- [ ] Relationship confidence calibration (cross-check with prior)

### V4.0 (Future)
- [ ] Temporal entity tracking (versioning)
- [ ] Domain-specific entity/relationship types (finance: BROKER_OF, etc.)
- [ ] Dynamic community summaries (update on graph changes)
- [ ] Multi-language support (French, German, Spanish)
- [ ] Streaming entity extraction (websocket results)

### SOTA 2026 Targets
- Late Chunking (DeepRead paper: 2602.05014)
- Structure-Aware Reasoning (hierarchical chunking)
- Domain Adaptation (sector-specific synthetic data)
- A-RAG Blueprint (agentic hierarchical retrieval)

---

## 16. QUICK COMMAND REFERENCE

### Neo4j Queries
```cypher
# Count entities
MATCH (e:Entity) RETURN count(e) as total

# Count relationships
MATCH ()-[r]->() RETURN type(r) as type, count(r) as count

# List entities by type
MATCH (e:Entity) WHERE e.type = 'ORG' RETURN e.name, count(*) as count

# Find entity communities
MATCH (e:Entity)-[:BELONGS_TO]->(c:Community) WHERE e.name = 'ACME Corp'
RETURN c.id, c.title, c.summary

# Get community members
MATCH (e:Entity)-[:BELONGS_TO]->(c:Community) WHERE c.id = 'louvain-123'
RETURN e.name, e.type

# Relationship weights
MATCH ()-[r]->() RETURN type(r) as type, avg(r.weight) as avg_weight, count(r) as count
```

### PostgreSQL Queries
```sql
-- Count enriched documents
SELECT COUNT(*) FROM enriched_metadata;

-- List communities
SELECT community_id, title, importance_score FROM community_summaries ORDER BY importance_score DESC;

-- Get key entities for community
SELECT key_entities FROM community_summaries WHERE community_id = 'louvain-123';
```

### Redis Commands
```bash
# Check lock status
KEYS "lock:*"
TTL "lock:enrichment:daily"
GET "lock:enrichment:daily"

# Clear stuck lock (if needed)
DEL "lock:enrichment:daily"
```

---

## 17. TESTING & VALIDATION

### Quick Test (5 minutes)
```bash
# Manually trigger workflow
curl -X POST http://localhost:5678/webhook/enrichment-v3.1 \
  -H "Content-Type: application/json" \
  -d '{"test": true, "doc_count": 5}'

# Check lock
redis-cli GET "lock:enrichment:daily"

# Verify Neo4j
cypher "MATCH (e:Entity) RETURN count(e)"
```

### Full Test (30 minutes)
```bash
# Submit 50 documents
# Monitor execution
# Verify outputs:
#   - Pinecone vectors ✓
#   - Neo4j entities + relationships ✓
#   - PostgreSQL metadata ✓
#   - Communities created ✓
```

### Load Test (2 hours)
```bash
# Submit 500 documents
# Monitor:
#   - Memory usage
#   - Neo4j query latency
#   - LLM token consumption
#   - Execution time
```

---

## 18. COST ANALYSIS

**Per 1,000-document run** (estimate):
- LLM tokens: ~10K tokens @ $0.01-0.10/1M = ~$0.0001-0.001
- Pinecone vectors: Included in free tier (100K limit)
- Neo4j: Included in free tier (200K nodes)
- PostgreSQL: Included in free tier (500MB)
- Redis: ~0.1MB per lock, negligible
- **Total: <$0.01 per run** (free tier viable)

**At scale** (100K documents/month):
- LLM: ~1M tokens @ $0.01/1M = ~$10/month
- Databases: May need paid tier (~$100-200/month)
- **Total: ~$110-210/month** (production estimate)

---

## 19. SUPPORT & REFERENCES

**Documentation**:
- Full analysis: `enrichment-workflow-analysis.md`
- Visual diagrams: `enrichment-node-diagram.md`
- Knowledge base: `knowledge-base.md` (patterns, solutions)
- Fixes library: `fixes-library.md` (known issues + solutions)

**Papers & Research**:
- A-RAG (Agentic): arXiv 2602.03442
- DeepRead (Structure-Aware): arXiv 2602.05014
- Late Chunking: arXiv 2409.04701

**Tools**:
- n8n UI: http://localhost:5678 (admin@mon-ipad.com)
- Neo4j Browser: https://38c949a2.databases.neo4j.io
- Pinecone Dashboard: https://app.pinecone.io

---

## 20. VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| V3.1 | 2026-02-07 | Chunked extraction (P06) + Global resolution (P07) + Louvain communities |
| V3.0 | 2026-01-25 | Entity extraction + relationship mapping (baseline) |
| V2.0 | 2026-01-15 | Basic enrichment (POC) |

---

**Last Updated**: 2026-02-20T20:35:00+01:00
**For questions**: See knowledge-base.md (Section 0) + fixes-library.md
**For issues**: Check enrichment-workflow-analysis.md (Section 13)

