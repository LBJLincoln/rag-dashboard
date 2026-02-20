# Ingestion V3.1 Workflow - Comprehensive Analysis

**Last Updated:** 2026-02-20
**Workflow ID:** nh1D4Up0wBZhuQbp
**Status:** Active
**Total Nodes:** 28

---

## Executive Summary

The **Ingestion V3.1** workflow is a sophisticated, multi-stage document processing pipeline that transforms raw files (PDF, DOCX, XLSX, etc.) into enriched, embedded vectors stored in Pinecone and PostgreSQL.

**Key Characteristics:**
- **Adaptive chunking** by content type (narrative, technical, tabular, legal)
- **Hybrid vector search** (dense embeddings + BM25 sparse vectors)
- **Distributed locking** to prevent duplicate processing
- **Contextual enrichment** (P01 pattern: LLM-generated headers)
- **PII protection** via regex-based redaction
- **Comprehensive versioning** with obsolescence tracking
- **28 nodes** organized into 7 execution stages

---

## 1. Node Inventory (By Type)

### Code Nodes (11)
1. **Init Lock & Trace** - Hash object key, generate trace ID
2. **Lock Result Handler** - Check lock acquisition
3. **MIME Type Detector** - Map file type → strategy + quality score
4. **PII Fortress** - Regex-based PII detection & redaction
5. **Chunk Validator & Enricher V4** - Validate + enrich chunks with metadata
6. **Q&A Enricher** - Add hypothetical questions to metadata
7. **Prepare Vectors V3.1 (Contextual)** - Format vectors for Pinecone
8. **Prepare Lock Release** - Extract lock data for cleanup
9. **Prepare Contextual Prompts** - Format chunks for LLM context
10. **Aggregate Contextual Chunks** - Merge contextual headers back
11. **BM25 Sparse Vector Generator** - Create sparse vectors for hybrid search

### HTTP Request Nodes (7)
1. **OCR Extraction** → Unstructured.io (text/table/image extraction)
2. **Semantic Chunker V3.1 (Adaptive)** → LLM API (adaptive chunking)
3. **Q&A Generator** → LLM API (generate hypothetical questions)
4. **Generate Embeddings V3.1 (Contextual)** → Embedding API (dense vectors)
5. **Pinecone Upsert** → Pinecone (store vectors)
6. **Export Trace OTEL** → OpenTelemetry Collector (telemetry)
7. **Contextual LLM Call** → LLM API (generate context headers)

### Database Nodes (4)
1. **Redis: Acquire Lock** - Set distributed lock (TTL: 3600s)
2. **Redis: Release Lock** - Delete lock key
3. **Version Manager** - PostgreSQL: mark old chunks obsolete
4. **Postgres Store** - PostgreSQL: insert chunk data

### Other Nodes (6)
1. **S3 Event Webhook** - Trigger point
2. **Lock Acquired?** - Conditional routing (IF node)
3. **Return Skip Response** - Webhook response for duplicates
4. **Error Handler** - Error trigger
5. **Split Chunks for Context** - Batch processing for P01
6. **Configuration NOTA 2026** - Sticky note (documentation)

---

## 2. Execution Flow (7 Stages)

### STAGE 0: TRIGGER
```
S3 Event Webhook
└─ Receives: objectKey, bucket, s3_url, tenant_id
```

### STAGE 1: INITIALIZATION & LOCKING
```
Init Lock & Trace
├─ Hash: SHA256(objectKey)[0:32]
├─ Generate: trace_id = tr-ingest-{timestamp}-{random}
├─ Extract: file_extension from objectKey
└─ Create: trace context for observability
   ↓
Redis: Acquire Lock
├─ Key: lock:ingestion:{hash}
├─ Value: worker-{execution_id}
├─ TTL: 3600 seconds
└─ Purpose: Prevent duplicate processing
   ↓
Lock Result Handler
└─ Check: lockAcquired (true/false)
   ↓
Lock Acquired? [IF CONDITION]
├─ TRUE → Continue to MIME detection
└─ FALSE → Return Skip Response (DUPLICATE status)
```

### STAGE 2: DOCUMENT TYPE & EXTRACTION
```
MIME Type Detector
├─ Map: ext → type (XLSX, PDF, WORD, POWERPOINT, TEXT)
├─ Quality scores:
│  ├─ EXCEL (xlsx/xls): 0.95
│  ├─ PDF: 0.90
│  ├─ WORD (docx): 0.85
│  ├─ POWERPOINT (pptx): 0.70
│  ├─ TEXT (txt/md): 0.60-0.65
│  └─ HTML: 0.55
├─ Chunking methods: semantic, tabular, slide
└─ Extraction strategies: hi_res (PDF/DOCX), fast (TEXT), tabular (EXCEL)
   ↓
OCR Extraction [Unstructured.io API]
├─ Endpoint: https://api.unstructured.io/general/v0/general
├─ Input: S3 URL
├─ Output: { text, tables[], images[] }
├─ Strategies: hi_res, fast, tabular
├─ Features: pdf_infer_table_structure, extract_image_block_types
└─ Timeout: 90 seconds
   ↓
PII Fortress
├─ Patterns:
│  ├─ EMAIL: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}
│  ├─ PHONE_FR: (?:0|\+33)[1-9](?:[\s.-]?[0-9]{2}){4}
│  ├─ IBAN: [A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}
│  └─ CREDIT_CARD: [0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}
├─ Replacements:
│  ├─ [EMAIL_REDACTED]
│  ├─ [PHONE_REDACTED]
│  ├─ [IBAN_REDACTED]
│  └─ [CC_REDACTED]
└─ Output: { processed_content, pii_detected[], pii_count }
```

### STAGE 3: CHUNKING & ENRICHMENT
```
Semantic Chunker V3.1 (Adaptive) [LLM-based]
├─ Model: $env.CHUNKING_MODEL (default: deepseek-chat)
├─ Temperature: 0.1 (deterministic)
├─ Max tokens: 4000
├─ Response format: JSON object
├─ Content-type strategies:
│  ├─ NARRATIVE: 300-500 words, break at subject changes
│  ├─ TECHNICAL: 200-400 words, break at section boundaries
│  ├─ TABULAR: Keep tables intact, group rows
│  └─ LEGAL: 500-800 words, never split clauses
└─ Output: { content_type, chunks[{ content, topic, start_index }] }
   ↓
Chunk Validator & Enricher V4
├─ Validation:
│  ├─ MIN_CHUNK_SIZE: 50 characters
│  ├─ MAX_CHUNK_SIZE: 3000 characters
│  └─ Chunk must be non-empty and coherent
├─ Fallback: RecursiveCharacterTextSplitter if LLM fails
│  ├─ CHUNK_SIZE: 800 chars
│  ├─ OVERLAP: 200 chars
│  └─ SEPARATORS: [\n\n, \n, . , ! , ? , ; , , , space]
├─ Post-validation:
│  ├─ Split oversized chunks at sentence boundary
│  └─ Merge undersized chunks with previous
└─ Enrichment: Add 25+ metadata fields per chunk
   ├─ id, content, topic, section
   ├─ parent_id, parent_filename, document_title, document_type
   ├─ chunk_index, total_chunks, quality_score, version
   ├─ is_obsolete, chunk_method, tenant_id, trace_id, pii_count
   └─ created_at, contextual_content, contextual_prefix
   ↓
Version Manager [PostgreSQL]
├─ UPDATE documents SET is_obsolete = true
├─ WHERE parent_filename = $1 AND tenant_id = $2
├─ AND is_obsolete = false
└─ Purpose: Mark old versions obsolete on re-ingestion
   ↓
Q&A Generator [LLM-based]
├─ Model: $env.QA_MODEL (default: deepseek-chat)
├─ Temperature: 0.3
├─ Generate: 3 hypothetical questions per chunk
└─ Output: { questions: ["Q1?", "Q2?", "Q3?"] }
   ↓
Q&A Enricher
└─ Add hypothetical_questions[] to chunk metadata
```

### STAGE 4: CONTEXTUAL RETRIEVAL (P01 Pattern)
```
Prepare Contextual Prompts
└─ Format: 1 chunk per item for batching
   ↓
Split Chunks for Context [SplitInBatches]
└─ Adaptive batch size
   ↓
Contextual LLM Call [LLM-based]
├─ Model: $env.CONTEXTUAL_RETRIEVAL_MODEL
├─ Generate: contextual_prefix (header) for each chunk
├─ Captures: surrounding context, previous sections
└─ Purpose: Better semantic representation
   ↓
Aggregate Contextual Chunks
└─ Merge contextual headers back to main chunk data
   ├─ contextual_content = chunk.content + contextual_prefix
   └─ Ready for embedding
```

### STAGE 5: EMBEDDINGS & HYBRID SEARCH
```
Generate Embeddings V3.1 (Contextual)
├─ API: $env.EMBEDDING_API_URL (default: openai)
├─ Model: $env.EMBEDDING_MODEL (default: text-embedding-3-small)
│  └─ Alternatives: Jina (1024-dim), all-MiniLM-L6-v2 (384-dim)
├─ Input: contextual_content (chunk + contextual_prefix)
├─ Batch: Max 100 chunks per request
├─ Retry: 3 attempts, 2s between
├─ Timeout: 30 seconds
└─ Output: { data: [{ embedding: [...], index: 0 }] }
   ↓
Prepare Vectors V3.1 (Contextual)
├─ Create vector objects:
│  ├─ id: chunk.id
│  ├─ values: embedding array (1536-dim or 1024-dim)
│  └─ metadata: { content, contextual_content, document, Q&A, quality_score, ... }
├─ Max 100 chunks per execution
└─ Output: { vectors: [...], trace_id, chunk_count }
   ↓
BM25 Sparse Vector Generator [PATCH P02]
├─ Algorithm: Client-side BM25 scoring
├─ Parameters:
│  ├─ K1 = 1.2 (term frequency saturation)
│  └─ B = 0.75 (length normalization)
├─ Tokenizer: French + English stop words
├─ Process:
│  1. Tokenize chunk
│  2. Remove stop words
│  3. Calculate term frequencies
│  4. Apply BM25 formula
│  5. Hash to sparse vector indices
├─ Output: { indices: [...], values: [...] }
└─ Purpose: +30-50% recall in hybrid search
```

### STAGE 6: STORAGE
```
Pinecone Upsert
├─ Endpoint: $env.PINECONE_URL/vectors/upsert
├─ Vectors:
│  ├─ Dense: 1536-dim (or 1024-dim) OpenAI embedding
│  └─ Sparse: BM25 hashed term frequencies
├─ Metadata: Full JSON { content, contextual_content, document, Q&A, quality_score, ... }
├─ Supports: Pinecone hybrid search
└─ Timeout: 30 seconds
   ↓
Postgres Store
├─ Table: documents
├─ Fields: id, content, parent_id, parent_filename, quality_score, version, is_obsolete, chunk_method, tenant_id, created_at, ...
├─ Indexes: parent_filename, tenant_id, is_obsolete
└─ Purpose: Metadata persistence + versioning
```

### STAGE 7: CLEANUP & OBSERVABILITY
```
Prepare Lock Release
└─ Extract: lockKey, lockValue
   ↓
Redis: Release Lock
├─ DELETE lockKey
└─ TTL expiration: 3600 seconds (automatic cleanup fallback)
   ↓
Export Trace OTEL
├─ Endpoint: $env.OTEL_COLLECTOR_URL/export
├─ Data: { trace_id, span_name, status }
└─ Purpose: Observability + debugging
```

---

## 3. API Integrations

| Service | Endpoint | Method | Node | Purpose | Timeout |
|---------|----------|--------|------|---------|---------|
| **Unstructured.io** | `https://api.unstructured.io/general/v0/general` | POST | OCR Extraction | Extract text/tables/images | 90s |
| **LLM (Chunking)** | `$env.LLM_API_URL` | POST | Semantic Chunker V3.1 | Adaptive semantic chunking | 60s |
| **LLM (Q&A)** | `$env.LLM_API_URL` | POST | Q&A Generator | Generate hypothetical questions | 30s |
| **LLM (Context)** | `$env.CONTEXTUAL_RETRIEVAL_API_URL` | POST | Contextual LLM Call | Generate context headers (P01) | varies |
| **Embedding API** | `$env.EMBEDDING_API_URL` | POST | Generate Embeddings V3.1 | Dense embeddings | 30s |
| **Pinecone** | `$env.PINECONE_URL/vectors/upsert` | POST | Pinecone Upsert | Store vectors + metadata | 30s |
| **PostgreSQL** | Internal | SQL | Version Manager, Postgres Store | Store chunk metadata | — |
| **Redis** | Internal | SET/DELETE | Acquire Lock, Release Lock | Distributed locking | — |
| **OpenTelemetry** | `$env.OTEL_COLLECTOR_URL/export` | POST | Export Trace OTEL | Telemetry export | — |

---

## 4. Chunking Strategy

### Primary: Adaptive LLM-based (Semantic Chunker V3.1)

**Model:** `$env.CHUNKING_MODEL` (default: `deepseek-chat`)
- Alternatives: Llama 70B, Gemma 27B
- Temperature: 0.1 (deterministic)
- Max tokens: 4000
- Response format: JSON object

**Content-Type Specific Rules:**

| Type | Chunk Size | Split Point | Example |
|------|-----------|-------------|---------|
| **NARRATIVE** | 300-500 words | Subject/tone changes | Research papers, articles |
| **TECHNICAL** | 200-400 words | Section boundaries | API docs, code comments |
| **TABULAR** | N/A (keep intact) | Row grouping | Spreadsheets, data tables |
| **LEGAL** | 500-800 words | Never split clauses | Contracts, ToS, policies |

### Fallback: RecursiveCharacterTextSplitter

**Activation:** When LLM chunking fails or returns invalid chunks

**Parameters:**
- CHUNK_SIZE: 800 characters
- OVERLAP: 200 characters
- SEPARATORS: `['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ']`

**Algorithm:**
1. Start with largest separator
2. Split when chunk > CHUNK_SIZE
3. Add OVERLAP from previous chunk end
4. Try next smaller separator if needed
5. Return valid chunks

### Validation & Enrichment

**Validation:**
- MIN_CHUNK_SIZE: 50 characters
- MAX_CHUNK_SIZE: 3000 characters

**Post-Processing:**
- **Oversized (> 3000 chars):** Split at nearest sentence boundary (last `. ` before midpoint)
- **Undersized (< 50 chars):** Merge with previous chunk

**Enrichment:** Each chunk receives 25+ metadata fields:
- `id`, `content`, `contextual_content`, `contextual_prefix`
- `topic`, `section`, `chunk_index`, `total_chunks`
- `parent_id`, `parent_filename`, `document_title`, `document_type`
- `quality_score`, `version`, `is_obsolete`, `chunk_method`
- `tenant_id`, `trace_id`, `pii_count`, `created_at`

**Quality Scores by Document Type:**
```
EXCEL (xlsx/xls): 0.95
PDF: 0.90
CSV: 0.90
WORD (docx): 0.85
WORD (doc): 0.80
POWERPOINT (pptx): 0.70
POWERPOINT (ppt): 0.65
Markdown (md): 0.65
TEXT (txt): 0.60
HTML: 0.55
UNKNOWN: 0.50
```

---

## 5. Embedding & Vectorization

### Dense Embeddings (Generate Embeddings V3.1 - Contextual)

**API:** `$env.EMBEDDING_API_URL` (default: OpenAI)
- Alternative APIs: Jina AI, local models

**Model:** `$env.EMBEDDING_MODEL` (default: `text-embedding-3-small`)
- OpenAI default: 1536-dimensional
- Jina alternative: 1024-dimensional
- Local alternative: 384-dimensional

**Input:** `contextual_content`
- Chunk text + contextual prefix (P01 pattern)
- Better semantic representation with surrounding context

**Batch Processing:**
- Max 100 chunks per execution
- Retry: 3 attempts with 2s wait
- Timeout: 30 seconds

### Sparse Vectors (BM25 - PATCH P02)

**Purpose:** Hybrid search improvement (+30-50% recall)

**Algorithm:** Client-side BM25 scoring
- K1 = 1.2 (term frequency saturation)
- B = 0.75 (length normalization)

**Tokenizer:**
- French stop words: le, la, les, un, une, des, de, du, au, ...
- English stop words: the, a, an, and, or, but, ...
- Lowercase + whitespace split

**Process:**
1. Tokenize chunk text
2. Remove stop words
3. Calculate term frequencies
4. Apply BM25 formula
5. Hash terms to sparse vector indices
6. Create Pinecone-compatible sparse vector

**Result:** Sparse vectors combined with dense for Pinecone hybrid search

### Vector Metadata

**Content:**
- `content`: Original chunk (first 1000 chars)
- `contextual_content`: Chunk + context (first 1500 chars)
- `contextual_prefix`: Context header (P01)

**Document:**
- `parent_id`: Document hash
- `parent_filename`: Source file path
- `document_title`: Extracted title
- `document_type`: MIME type
- `section`: Document section name

**Chunk-Level:**
- `chunk_index`: Position in document
- `total_chunks`: Total chunks in document
- `topic`: Auto-detected topic
- `hypothetical_questions`: [Q1, Q2, Q3]

**Quality & ACL:**
- `quality_score`: MIME-based (0.5-0.95)
- `tenant_id`: Multi-tenancy
- `allowed_groups`: ACL ["default", "admin"]
- `version`: Document version

**Timestamps:**
- `ingested_at`: ISO 8601
- `pii_count`: Redacted items count

---

## 6. Metadata Extraction & Storage

### Document-Level (MIME Type Detector)

| Field | Source | Example |
|-------|--------|---------|
| `parent_id` | SHA256(objectKey)[0:32] | `a3f4b2c1...` |
| `parent_filename` | S3 objectKey | `sector/finance/report_2026.pdf` |
| `document_title` | Filename without extension | `report_2026` |
| `document_type` | MIME detection | `PDF`, `WORD`, `EXCEL` |
| `quality_score` | MIME-based | 0.90 (PDF) |
| `file_extension` | Extracted from filename | `pdf`, `docx`, `xlsx` |
| `bucket` | S3 bucket name | `documents` |
| `s3_url` | Full S3 URL | `s3://documents/sector/finance/...` |
| `tenant_id` | Multi-tenancy identifier | `default`, `tenant-123` |
| `trace_id` | Unique trace ID | `tr-ingest-1708944000000-abc123def` |
| `timestamp` | ISO 8601 creation | `2026-02-20T14:00:00Z` |

### Chunk-Level (Chunk Validator & Enricher V4)

**Core Fields:**
- `id`: `{parent_hash}-chunk-{index}`
- `content`: Validated chunk text (50-3000 chars)
- `contextual_content`: Content + P01 prefix (for embedding)
- `contextual_prefix`: LLM-generated context
- `topic`: Detected topic/subject
- `section`: Document section name

**Hierarchy Fields:**
- `parent_id`: Links to document
- `parent_filename`: Source document path
- `document_title`: Parent title
- `document_type`: MIME type
- `total_chunks`: Total chunks in document

**Quality Fields:**
- `quality_score`: Inherited from document (0.5-0.95)
- `version`: Document version number
- `is_obsolete`: Boolean (false for new)
- `chunk_method`: `"llm_semantic"` or `"recursive_fallback"`
- `pii_count`: Count of redacted items

**Multi-Tenancy:**
- `tenant_id`: Tenant identifier
- `allowed_groups`: ACL list

**Timestamps:**
- `created_at`: ISO 8601 chunk creation
- `trace_id`: For debugging

### Q&A Metadata (Q&A Generator)

```json
{
  "hypothetical_questions": [
    "What is the main topic discussed here?",
    "How does this section relate to previous content?",
    "What are the key takeaways?"
  ]
}
```

### PII Detection Metadata (PII Fortress)

```json
{
  "pii_detected": [
    { "type": "EMAIL", "count": 3 },
    { "type": "PHONE_FR", "count": 1 },
    { "type": "IBAN", "count": 0 },
    { "type": "CREDIT_CARD", "count": 0 }
  ],
  "pii_count": 4
}
```

### Storage Locations

**Pinecone Vector Store:**
- Primary: Dense embeddings (1536-dim or 1024-dim)
- Secondary: Sparse BM25 vectors
- Metadata: Full JSON chunk + contextual + Q&A
- Query: Hybrid search (dense + sparse combined)

**PostgreSQL documents Table:**
- Columns: id, content, parent_id, parent_filename, summary_context, quality_score, version, is_obsolete, chunk_method, tenant_id, created_at, superseded_by
- Indexes: parent_filename, tenant_id, is_obsolete
- Audit: Old versions kept with is_obsolete=true

### Versioning Strategy

**Version Manager** (PostgreSQL UPDATE):
1. When new version of document is ingested:
   - Set `is_obsolete = true` on old chunks
   - Set `obsoleted_at = NOW()`
   - Set `superseded_by = new_parent_id`
2. Keep old versions for audit trail
3. Queries filter: `WHERE is_obsolete = false`

---

## 7. Batch Processing & Execution

### Document Processing

**Input:** S3 Event with `objectKey`
**Output:** All chunks for that document

**Flow:**
1. Webhook receives single document trigger
2. Lock acquired for objectKey (distributed)
3. Single document extracted (OCR)
4. Single document chunked (adaptive)
5. All chunks enriched + validated
6. All chunks embedded + vectorized
7. All chunks stored (Pinecone + PostgreSQL)
8. Lock released

### Chunk Batch Processing

**Split Chunks for Context (SplitInBatches):**
- Batches chunks for P01 contextual processing
- Each batch → Contextual LLM Call
- Results aggregated back

**Embedding Batch (Generate Embeddings V3.1):**
- Max 100 chunks per HTTP request
- If document > 100 chunks: Multiple API calls
- Retry logic: 3 attempts, 2s between retries

**Pinecone Upsert Batch:**
- All vectors in single upsert call
- Supports hybrid vectors (dense + sparse)
- Metadata: Full JSON attached

### Concurrency & Locking

**Distributed Lock (Redis):**
- Key: `lock:ingestion:{sha256(objectKey)}`
- Value: `worker-{execution_id}`
- TTL: 3600 seconds (1 hour)
- Purpose: Prevent duplicate processing if S3 event fires multiple times
- Release: Upon completion or timeout

**Sequential Constraint:**
- Within single workflow: Sequential (no parallel stages)
- Multiple documents: Can run in parallel (separate locks)

### Idempotency

**Duplicate Detection:**
- Redis lock prevents duplicate webhook processing
- If lock already set → Return skip response
- If lock TTL expires → Another worker can process

**Version Management:**
- Old chunks marked obsolete on re-ingestion
- `superseded_by` pointer tracks lineage
- Queries filter to latest (`is_obsolete = false`)

### Error Handling

**HTTP Requests:** Chain-continued on error
- `retryOnFail: true`
- `maxTries: 3`
- `waitBetweenTries: 2000ms`

**Lock Acquisition Failure:**
- Return skip response (DUPLICATE status)
- No further processing

**Chunking Failure:**
- Fallback to RecursiveCharacterTextSplitter
- Continue with fallback chunks

**Embedding Failure:**
- Retry 3 times
- If still fails: Chain-continued (skip embedding)
- Vectors stored with empty embedding array

### Performance Characteristics

**Document Size → Chunk Count:**
- Small (< 10 pages): 5-20 chunks
- Medium (10-50 pages): 20-100 chunks
- Large (50-200 pages): 100-500 chunks

**Processing Time per Document:**
- OCR Extraction: 10-90 seconds
- LLM Chunking: 10-60 seconds
- LLM Q&A: 5-30 seconds
- Embeddings: 5-30 seconds (batch)
- **Total: ~30-210 seconds per document**

**Throughput:**
- Single webhook execution: 1 document
- Multiple webhooks: Parallel (separate locks)
- With 3 workers: ~200-400 docs/hour possible

---

## 8. Configuration & Environment Variables

### LLM Models
- `$env.CHUNKING_MODEL` (default: `deepseek-chat`)
- `$env.QA_MODEL` (default: `deepseek-chat`)
- `$env.CONTEXTUAL_RETRIEVAL_MODEL`

### APIs
- `$env.LLM_API_URL` (default: OpenAI)
- `$env.EMBEDDING_API_URL` (default: OpenAI)
- `$env.CONTEXTUAL_RETRIEVAL_API_URL` (default: DeepSeek)

### Storage
- `$env.PINECONE_URL` - Pinecone endpoint
- `$env.EMBEDDING_MODEL` (default: `text-embedding-3-small`)

### Observability
- `$env.OTEL_COLLECTOR_URL` (default: internal)

---

## 9. Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Adaptive chunking by content type** | Narrative vs. legal vs. tabular documents require different strategies |
| **Fallback to RecursiveCharacterTextSplitter** | Handles LLM failures gracefully, ensures deterministic output |
| **Contextual embeddings (P01 pattern)** | Surrounding context improves semantic similarity matching |
| **Hybrid vectors (dense + BM25 sparse)** | +30-50% recall improvement vs. dense-only search |
| **Distributed locking (Redis)** | Prevents duplicate processing in distributed environments |
| **Version management with obsolescence** | Audit trail + compliance while filtering to latest |
| **PII redaction (regex-based)** | Fast, deterministic, no LLM dependency for sensitive data |
| **PostgreSQL versioning** | Document history preserved, queries filter to `is_obsolete=false` |
| **Pinecone metadata storage** | Rich metadata supports filtering, faceted search, quality scoring |

---

## 10. Known Limitations & Future Improvements

### Current Limitations
1. **Max 100 chunks per embedding batch** - Documents > 100 chunks need multiple API calls
2. **Single-document processing** - Webhook triggers one document at a time
3. **Linear PII detection** - Regex-based, may miss complex patterns
4. **No OCR confidence scoring** - Unstructured.io results not scored

### Recommended Improvements (Phase 4+)
1. Implement chunking size tuning based on downstream task
2. Add OCR confidence scoring
3. Support for multi-document batch ingestion
4. Implement semantic deduplication across documents
5. Add entity recognition + extraction
6. Support for incremental document updates (delta ingestion)

---

## Appendix: Node Connection Map

```
S3 Event Webhook
    ↓
Init Lock & Trace
    ↓
Redis: Acquire Lock
    ↓
Lock Result Handler
    ↓
Lock Acquired? ──FALSE──→ Return Skip Response
    ↓ TRUE
MIME Type Detector
    ↓
OCR Extraction
    ↓
PII Fortress
    ↓
Semantic Chunker V3.1
    ↓
Chunk Validator & Enricher V4
    ├──→ Prepare Contextual Prompts
    │       ↓
    │   Split Chunks for Context
    │       ↓
    │   Contextual LLM Call
    │       ↓
    │   Aggregate Contextual Chunks
    │       ↓
    └──→ Version Manager
            ↓
        Q&A Generator
            ↓
        Q&A Enricher
            ↓
        Generate Embeddings V3.1
            ↓
        Prepare Vectors V3.1
            ├──→ BM25 Sparse Vector Generator
            │       ↓
            └──→ Pinecone Upsert
                    ↓
                Postgres Store
                    ├──→ Prepare Lock Release
                    │       ↓
                    │   Redis: Release Lock
                    │       ↓
                    └──→ Export Trace OTEL
```

---

**End of Analysis**
