# Enrichment V3.1 Workflow — Complete Technical Analysis

**Source**: `/home/termius/mon-ipad/n8n/live/enrichment.json`
**Workflow Name**: TEST - SOTA 2026 - Enrichissement V3.1
**Workflow ID**: ORa01sX4xI0iRCJ8
**Last Updated**: 2026-02-07T04:35:35.559Z
**Version**: 37

---

## 1. NODE INVENTORY — All 29 Nodes

### 1.1 Node List (by execution order)

| # | Node Name | Type | Category | Purpose |
|---|-----------|------|----------|---------|
| 1 | When chat message received | `@n8n/n8n-nodes-langchain.chatTrigger` | Trigger | Webhook trigger (chat-based) |
| 2 | Init OT Trace | `n8n-nodes-base.code` | Utility | Initialize OpenTelemetry tracing |
| 3 | Prepare Lock | `n8n-nodes-base.code` | Utility | Prepare distributed lock config |
| 4 | Redis: Acquire Lock | `n8n-nodes-base.redis` | Locking | Distributed lock (prevent overlap) |
| 5 | Lock Result Handler | `n8n-nodes-base.code` | Utility | Check lock acquisition status |
| 6 | Lock Acquired? | `n8n-nodes-base.if` | Conditional | Branching gate (acquired vs. failed) |
| 7 | Fetch Internal Use Cases | `n8n-nodes-base.httpRequest` | Data Fetch | HTTP fetch from internal API |
| 8 | Fetch External Data Sources | `n8n-nodes-base.httpRequest` | Data Fetch | HTTP fetch from external API |
| 9 | Normalize & Merge | `n8n-nodes-base.code` | Data Processing | Deduplication + hash-based merge |
| 10 | Chunk Documents for Entity Extraction | `n8n-nodes-base.code` | Data Processing | P06: Split docs into 4K chunks (200 overlap) |
| 11 | SplitInBatches - Entity Chunks | `n8n-nodes-base.splitInBatches` | Batching | Batch chunks (5 per batch) |
| 12 | Extract Entities Per Chunk | `n8n-nodes-base.httpRequest` | AI Processing | P06: LLM entity extraction (per chunk) |
| 13 | Aggregate Entity Results | `n8n-nodes-base.code` | Data Processing | P06: Combine chunk results |
| 14 | Global Entity Resolution | `n8n-nodes-base.code` | Data Processing | P07: Cross-doc entity dedup |
| 15 | AI Entity Enrichment V3.1 (Enhanced) | `n8n-nodes-base.httpRequest` | AI Processing | Alt path: Full-doc entity extraction |
| 16 | Relationship Mapper V3.1 (Entity Linking) | `n8n-nodes-base.code` | AI Processing | Entity linking + weight relationships |
| 17 | Upsert Vectors Pinecone | `n8n-nodes-base.httpRequest` | Vector DB | Store embeddings + metadata |
| 18 | Store Metadata Postgres | `n8n-nodes-base.postgres` | SQL DB | Store enriched metadata |
| 19 | Update Graph Neo4j | `n8n-nodes-base.httpRequest` | Graph DB | Create/update entities + relationships |
| 20 | Community Detection Trigger (Async) | `n8n-nodes-base.httpRequest` | Graph Analysis | Trigger Louvain clustering (async) |
| 21 | Fetch Community Assignments | `n8n-nodes-base.httpRequest` | Graph Query | Retrieve community memberships |
| 22 | Generate Community Summaries | `n8n-nodes-base.httpRequest` | AI Processing | LLM-generated community summaries |
| 23 | Store Community Summaries Neo4j | `n8n-nodes-base.httpRequest` | Graph DB | Store summaries to Neo4j |
| 24 | Store Community Summaries Postgres | `n8n-nodes-base.postgres` | SQL DB | Store summaries to Postgres |
| 25 | Prepare Lock Release | `n8n-nodes-base.code` | Utility | Prepare lock cleanup |
| 26 | Redis: Release Lock | `n8n-nodes-base.redis` | Locking | Release distributed lock |
| 27 | Log Success | `n8n-nodes-base.code` | Utility | Log completion |
| 28 | Export Trace to OpenTelemetry | `n8n-nodes-base.httpRequest` | Observability | Export trace metrics |
| 29 | 📋 Configuration SOTA 2026 | `n8n-nodes-base.stickyNote` | Documentation | Configuration notes (not executable) |

---

## 2. WORKFLOW FLOW & CONNECTIONS

### 2.1 Main Execution Path (Diagram)

```
When chat message received
  ↓
Init OT Trace
  ↓
Prepare Lock
  ↓
Redis: Acquire Lock
  ↓
Lock Result Handler
  ↓
Lock Acquired? (IF)
  ├→ YES: Fetch Internal Use Cases ────┐
  │       ↓                             │
  │       Normalize & Merge             │ (parallel)
  │       ↑                             │
  └───→ Fetch External Data Sources ───┘

         ↓
         Chunk Documents for Entity Extraction
         ↓
         SplitInBatches - Entity Chunks (batch 5)
         ↓
         Extract Entities Per Chunk (loop back)
         ↓
         Aggregate Entity Results
         ↓
         Global Entity Resolution (P07)
         ↓
         Relationship Mapper V3.1 (Entity Linking)
         ↓
         ├→ Upsert Vectors Pinecone ────┐
         ├→ Store Metadata Postgres      ├→ Community Detection Trigger
         └→ Update Graph Neo4j ─────────┘
                    ↓
         Fetch Community Assignments
         ↓
         Generate Community Summaries
         ↓
         ├→ Store Community Summaries Neo4j ─┐
         └→ Store Community Summaries Postgres ├→ Prepare Lock Release
                                              ↓
                                       Redis: Release Lock
                                              ↓
                                           Log Success
                                              ↓
                                    Export Trace to OpenTelemetry
```

### 2.2 Alternate Path (AL1)

**AI Entity Enrichment V3.1 (Enhanced)** → **Relationship Mapper V3.1** forms an alternative path that processes full documents directly (not chunked).

---

## 3. JAVASCRIPT CODE NODES — Detailed Analysis

### 3.1 Init OT Trace (Code Node #1)

**Purpose**: Initialize OpenTelemetry tracing for observability

```javascript
// Init OpenTelemetry trace for enrichment workflow
// Shield #9: OTEL Resilience
const traceId = `tr-enrich-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

return {
  trace_id: traceId,
  span_context: 'enrichment-parent',
  timestamp: new Date().toISOString(),
  status: 'STARTED'
};
```

**Output**: Generates unique trace ID (format: `tr-enrich-{timestamp}-{random}`)

---

### 3.2 Prepare Lock (Code Node #2)

**Purpose**: Prepare distributed lock configuration for cron job

```javascript
// P0/P1: Distributed Lock for Cron Job - Prevent Overlap
const jobId = `enrichment-${new Date().toISOString().split('T')[0]}`;
const lockKey = 'lock:enrichment:daily';
const ttlSeconds = 7200; // 2 hours max
const workerId = `worker-${$execution.id}`;

return {
  lockKey,
  jobId,
  workerId,
  ttlSeconds,
  trace_id: $node['Init OT Trace'].json.trace_id,
  action: 'ACQUIRE'
};
```

**Output**: Lock configuration (TTL: 2 hours, key-based)

---

### 3.3 Lock Result Handler (Code Node #3)

**Purpose**: Evaluate lock acquisition result, decide on workflow continuation

```javascript
// Handle lock acquisition result
const lockData = $node['Prepare Lock'].json;
const redisResult = $json;

const lockAcquired = redisResult === 'OK' || redisResult === true || redisResult?.result === 'OK';

if (!lockAcquired) {
  console.warn('ENRICHMENT_LOCK_FAILED: Another instance running', {
    lockKey: lockData.lockKey,
    trace_id: lockData.trace_id
  });

  return {
    ...lockData,
    lockAcquired: false,
    status: 'SKIPPED',
    reason: 'Lock already held - enrichment in progress'
  };
}

return {
  ...lockData,
  lockAcquired: true,
  status: 'PROCESSING',
  lockValue: lockData.workerId
};
```

**Output**: Lock status (acquired=true/false)

---

### 3.4 Normalize & Merge (Code Node #4)

**Purpose**: Merge internal + external data sources with SHA256-based deduplication

```javascript
// Normalize & Merge with Hash Deduplication - HARDENED
const crypto = require('crypto');
const internal = $items('Fetch Internal Use Cases') || [];
const external = $items('Fetch External Data Sources') || [];

const seen = new Set();
const merged = [...internal, ...external]
  .filter(item => {
    if (!item.json) return false;
    const content = JSON.stringify(item.json);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  })
  .map(item => ({
    json: {
      ...item.json,
      enriched: false,
      source_sync_date: new Date().toISOString(),
      dedup_hash: crypto.createHash('sha256').update(JSON.stringify(item.json)).digest('hex')
    }
  }));

console.log(`Deduplication: ${internal.length + external.length} -> ${merged.length}`);
return merged;
```

**Features**:
- SHA256-based deduplication
- Tracks source sync date
- Logs dedup ratio

---

### 3.5 Chunk Documents for Entity Extraction (Code Node #5 — P06)

**Purpose**: Split documents into overlapping chunks (4000 chars, 200 char overlap)

```javascript
// P06 SOTA 2026: Chunk-level Entity Extraction
const crypto = require('crypto');
const items = $input.all();
const CHUNK_SIZE = 4000;
const CHUNK_OVERLAP = 200;
const chunks = [];

for (const item of items) {
  const content = JSON.stringify(item.json);
  const sourceId = item.json.dedup_hash || crypto.createHash('sha256')
    .update(content).digest('hex').substring(0, 16);

  if (content.length <= CHUNK_SIZE) {
    chunks.push({
      json: {
        _chunk_index: 0,
        _chunk_total: 1,
        _chunk_content: content,
        _source_id: sourceId,
        _original: item.json
      }
    });
  } else {
    let start = 0;
    let chunkIdx = 0;
    const totalChunks = Math.ceil((content.length - CHUNK_OVERLAP) / (CHUNK_SIZE - CHUNK_OVERLAP));
    while (start < content.length) {
      const end = Math.min(start + CHUNK_SIZE, content.length);
      chunks.push({
        json: {
          _chunk_index: chunkIdx,
          _chunk_total: totalChunks,
          _chunk_content: content.substring(start, end),
          _source_id: sourceId,
          _original: item.json
        }
      });
      start += CHUNK_SIZE - CHUNK_OVERLAP;
      chunkIdx++;
    }
  }
}

console.log('P06: Split ' + items.length + ' documents into ' + chunks.length + ' chunks');
return chunks;
```

**Parameters**: CHUNK_SIZE=4000, CHUNK_OVERLAP=200

---

### 3.6 Aggregate Entity Results (Code Node #6 — P06)

**Purpose**: Merge entity extraction results across all chunks from same document

```javascript
// P06: Aggregate entity extraction results from all chunks
const allItems = $input.all();
const bySource = {};

for (const item of allItems) {
  const data = item.json;
  const sourceId = data._source_id || 'unknown';

  if (!bySource[sourceId]) {
    bySource[sourceId] = {
      entities: [],
      relationships: [],
      hypothetical_questions: [],
      key_facts: [],
      _original: data._original
    };
  }

  let extracted = {};
  try {
    extracted = JSON.parse(data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : '{}');
  } catch (e) {
    continue;
  }

  bySource[sourceId].entities.push(...(extracted.entities || []));
  bySource[sourceId].relationships.push(...(extracted.relationships || []));
  bySource[sourceId].hypothetical_questions.push(...(extracted.hypothetical_questions || []));
  bySource[sourceId].key_facts.push(...(extracted.key_facts || []));
}

const results = Object.entries(bySource).map(function([sourceId, data]) {
  return {
    json: {
      _source_id: sourceId,
      _original: data._original,
      choices: [{ message: { content: JSON.stringify({
        entities: data.entities,
        relationships: data.relationships,
        hypothetical_questions: [...new Set(data.hypothetical_questions)].slice(0, 5),
        key_facts: [...new Set(data.key_facts)]
      })}}]
    }
  };
});

console.log('P06: Aggregated from ' + allItems.length + ' chunks into ' + results.length + ' source groups');
return results;
```

**Features**:
- Groups by source document
- Deduplicates questions/facts
- Preserves original metadata

---

### 3.7 Global Entity Resolution (Code Node #7 — P07)

**Purpose**: Cross-document entity deduplication and normalization

```javascript
// P07 SOTA 2026: Global Entity Resolution
const crypto = require('crypto');
const items = $input.all();
const allEntities = [];
const allRelationships = [];

for (const item of items) {
  let extracted = {};
  try {
    const content = item.json.choices && item.json.choices[0] && item.json.choices[0].message
      ? item.json.choices[0].message.content : '{}';
    extracted = JSON.parse(content);
  } catch (e) { continue; }
  allEntities.push(...(extracted.entities || []));
  allRelationships.push(...(extracted.relationships || []));
}

const normalize = (name) => name.trim().replace(/\s+/g, ' ').toUpperCase();
const entityIndex = new Map();
const resolved = [];

for (const entity of allEntities) {
  const norm = normalize(entity.name);
  const key = norm + '::' + entity.type;

  if (entityIndex.has(key)) {
    const existing = entityIndex.get(key);
    if (entity.aliases) {
      existing.aliases = [...new Set([...(existing.aliases || []), ...entity.aliases])];
    }
    if (entity.context && !(existing.context || '').includes(entity.context)) {
      existing.context = (existing.context || '') + '; ' + entity.context;
    }
  } else {
    const resolvedEntity = {
      name: entity.name,
      type: entity.type,
      aliases: entity.aliases || [],
      context: entity.context || '',
      _resolved_id: crypto.createHash('sha256').update(key).digest('hex').substring(0, 16)
    };
    entityIndex.set(key, resolvedEntity);
    resolved.push(resolvedEntity);
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        entityIndex.set(normalize(alias) + '::' + entity.type, resolvedEntity);
      }
    }
  }
}

const relSet = new Set();
const resolvedRels = allRelationships.filter(function(rel) {
  const key = normalize(rel.source) + '::' + rel.type + '::' + normalize(rel.target);
  if (relSet.has(key)) return false;
  relSet.add(key);
  return true;
});

console.log('P07: Resolved ' + allEntities.length + ' entities -> ' + resolved.length + ' unique');
return {
  json: {
    choices: [{
      message: {
        content: JSON.stringify({
          entities: resolved,
          relationships: resolvedRels,
          hypothetical_questions: [],
          key_facts: [],
          _resolution_stats: {
            entities_before: allEntities.length,
            entities_after: resolved.length,
            relationships_before: allRelationships.length,
            relationships_after: resolvedRels.length
          }
        })
      }
    }]
  }
};
```

**Algorithm**:
- Normalize names (trim + uppercase)
- Key = `{name}::{type}`
- Merge aliases + contexts
- Deduplicate relationships

---

### 3.8 Relationship Mapper V3.1 (Entity Linking) (Code Node #8)

**Purpose**: Entity linking, relationship weighting, Neo4j statement generation

```javascript
// V3.1: Relationship Mapper with Entity Linking + Weighted Relations
const crypto = require('crypto');
const aiData = $node['AI Entity Enrichment V3.1 (Enhanced)'].json;

let extracted = {};
try {
  extracted = JSON.parse(aiData.choices?.[0]?.message?.content || '{}');
} catch (e) {
  extracted = { entities: [], relationships: [] };
}

const entities = extracted.entities || [];
const relationships = extracted.relationships || [];
const tenantId = $node['Lock Result Handler']?.json?.trace_id?.split('-')[0] || 'default';

// === V3.1: ENTITY LINKING ===
const normalizeEntityName = (name) => {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .toUpperCase();
};

const entityMap = new Map();
const processedEntities = [];

for (const entity of entities) {
  const normalizedName = normalizeEntityName(entity.name);
  const entityId = crypto.createHash('md5')
    .update(normalizedName + entity.type).digest('hex').substring(0, 16);

  // Check for existing similar entity
  let canonicalId = entityId;
  let isAlias = false;

  // Check aliases
  if (entity.aliases && entity.aliases.length > 0) {
    for (const alias of entity.aliases) {
      const aliasNorm = normalizeEntityName(alias);
      if (entityMap.has(aliasNorm)) {
        canonicalId = entityMap.get(aliasNorm).id;
        isAlias = true;
        break;
      }
    }
  }

  if (!isAlias) {
    entityMap.set(normalizedName, { id: entityId, name: entity.name });

    // Also map aliases
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        entityMap.set(normalizeEntityName(alias), { id: entityId, name: entity.name });
      }
    }
  }

  processedEntities.push({
    id: entityId,
    canonical_id: canonicalId,
    name: entity.name,
    normalized_name: normalizedName,
    type: entity.type,
    aliases: entity.aliases || [],
    context: entity.context || '',
    is_alias: isAlias,
    tenant_id: tenantId
  });
}

// === V3.1: WEIGHTED RELATIONSHIPS ===
const processedRelationships = relationships.map((rel, idx) => {
  const sourceNorm = normalizeEntityName(rel.source);
  const targetNorm = normalizeEntityName(rel.target);

  const sourceEntity = entityMap.get(sourceNorm);
  const targetEntity = entityMap.get(targetNorm);

  if (!sourceEntity || !targetEntity) {
    return null; // Skip if entities not found
  }

  // Relationship weight based on type and confidence
  const TYPE_WEIGHTS = {
    'REPORTS_TO': 1.5,
    'MANAGES': 1.4,
    'OWNS': 1.3,
    'WORKS_WITH': 1.2,
    'IMPACTS': 1.2,
    'PART_OF': 1.1,
    'RELATED_TO': 1.0
  };

  const baseWeight = TYPE_WEIGHTS[rel.type.toUpperCase()] || 1.0;
  const confidence = rel.confidence || 0.7;
  const finalWeight = baseWeight * confidence;

  return {
    source_id: sourceEntity.id,
    source_name: rel.source,
    target_id: targetEntity.id,
    target_name: rel.target,
    type: rel.type.toUpperCase().replace(/[^A-Z_]/g, '_'),
    weight: Math.round(finalWeight * 100) / 100,
    confidence: confidence,
    evidence: rel.evidence || '',
    tenant_id: tenantId
  };
}).filter(r => r !== null);

// === GENERATE NEO4J STATEMENTS ===
// Entity statements with MERGE on canonical_id
const entityStatements = processedEntities
  .filter(e => !e.is_alias) // Only create canonical entities
  .map((entity, idx) => ({
    statement: `
      MERGE (e:Entity {id: $id_${idx}})
      ON CREATE SET
        e.name = $name_${idx},
        e.type = $type_${idx},
        e.tenant_id = $tenant_${idx},
        e.created_at = datetime()
      ON MATCH SET
        e.updated_at = datetime()
      WITH e
      UNWIND $aliases_${idx} as alias
      MERGE (a:Alias {name: alias, canonical_id: $id_${idx}})
    `,
    parameters: {
      [`id_${idx}`]: entity.id,
      [`name_${idx}`]: entity.name,
      [`type_${idx}`]: entity.type,
      [`tenant_${idx}`]: entity.tenant_id,
      [`aliases_${idx}`]: entity.aliases
    }
  }));

// Relationship statements with weights
const relationshipStatements = processedRelationships.map((rel, idx) => ({
  statement: `
    MATCH (a:Entity {id: $source_id_${idx}})
    MATCH (b:Entity {id: $target_id_${idx}})
    MERGE (a)-[r:${rel.type}]->(b)
    SET r.weight = $weight_${idx},
        r.confidence = $conf_${idx},
        r.evidence = $evidence_${idx},
        r.updated_at = datetime()
  `,
  parameters: {
    [`source_id_${idx}`]: rel.source_id,
    [`target_id_${idx}`]: rel.target_id,
    [`weight_${idx}`]: rel.weight,
    [`conf_${idx}`]: rel.confidence,
    [`evidence_${idx}`]: rel.evidence
  }
}));

return {
  entity_statements: entityStatements,
  relationship_statements: relationshipStatements,

  // V3.1 Stats
  total_entities: processedEntities.length,
  canonical_entities: processedEntities.filter(e => !e.is_alias).length,
  alias_count: processedEntities.filter(e => e.is_alias).length,
  total_relationships: processedRelationships.length,
  avg_relationship_weight: processedRelationships.length > 0
    ? Math.round(processedRelationships.reduce((sum, r) => sum + r.weight, 0)
        / processedRelationships.length * 100) / 100
    : 0,

  // Pass through for downstream
  hypothetical_questions: extracted.hypothetical_questions || [],
  key_facts: extracted.key_facts || []
};
```

**Features**:
- MD5-based entity IDs (16 chars)
- Alias resolution to canonical entities
- 7 relationship types with weights:
  - REPORTS_TO: 1.5x (highest)
  - MANAGES: 1.4x
  - OWNS: 1.3x
  - WORKS_WITH, IMPACTS: 1.2x
  - PART_OF: 1.1x
  - RELATED_TO: 1.0x (lowest)
- Generates Neo4j MERGE statements with parameters

---

### 3.9 Prepare Lock Release (Code Node #9)

**Purpose**: Prepare lock release operation

```javascript
// Prepare lock release
const lockData = $node['Lock Result Handler'].json;

return {
  lockKey: lockData.lockKey,
  lockValue: lockData.lockValue,
  trace_id: lockData.trace_id
};
```

---

### 3.10 Log Success (Code Node #10)

**Purpose**: Log workflow completion

```javascript
// Log success
return {
  status: 'SUCCESS',
  trace_id: $node['Lock Result Handler'].json.trace_id,
  timestamp: new Date().toISOString()
};
```

---

## 4. API CALLS & EXTERNAL INTEGRATIONS

### 4.1 Entity Extraction API

**Node**: AI Entity Enrichment V3.1 (Enhanced) + Extract Entities Per Chunk

**Endpoint**: `$env.ENTITY_EXTRACTION_API_URL` (default: `https://api.deepseek.com/v1/chat/completions`)

**Method**: POST

**Model**: `$env.ENTITY_EXTRACTION_MODEL` (default: `deepseek-chat`)

**System Prompt** (truncated):
```
Tu es un expert en extraction d'entites et relations avec validation.

=== TYPES D'ENTITES ===
PERSON: Noms de personnes
ORG: Organisations, entreprises
PROJECT: Projets, initiatives
METRIC: KPIs, mesures
DATE: Dates, periodes
LOCATION: Lieux, regions
CONCEPT: Concepts metier

=== TYPES DE RELATIONS ===
REPORTS_TO: Hierarchie
MANAGES: Management
WORKS_WITH: Collaboration
OWNS: Propriete
PART_OF: Appartenance
IMPACTS: Influence
RELATED_TO: Relation generique

=== V3.1: VALIDATION ===
1. Entites avec noms normalises (majuscules pour acronymes)
2. Relations avec CONFIDENCE (0-1)
3. Detecte ALIAS potentiels
```

**Request Body Structure**:
```json
{
  "model": "deepseek-chat",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "[document or chunk]"}
  ],
  "temperature": 0.1,
  "response_format": {"type": "json_object"},
  "max_tokens": 4096
}
```

**Response Structure**:
```json
{
  "choices": [{
    "message": {
      "content": {
        "entities": [
          {"name": string, "type": string, "aliases": [string], "context": string}
        ],
        "relationships": [
          {"source": string, "type": string, "target": string, "confidence": 0-1, "evidence": string}
        ],
        "hypothetical_questions": [string, string, string],
        "key_facts": [string]
      }
    }
  }]
}
```

---

### 4.2 Neo4j Graph Database

**Node**: Update Graph Neo4j + Fetch Community Assignments + Generate Community Summaries + Store Community Summaries Neo4j

**Endpoint**: `{{ $env.NEO4J_URL }}/db/neo4j/tx/commit`

**Authentication**: HTTP Basic Auth (Neo4j Aura credentials)

**Method**: POST

**Cypher Operations**:

#### a) Entity Creation (MERGE with Aliases)
```cypher
MERGE (e:Entity {id: $id_${idx}})
ON CREATE SET
  e.name = $name_${idx},
  e.type = $type_${idx},
  e.tenant_id = $tenant_${idx},
  e.created_at = datetime()
ON MATCH SET
  e.updated_at = datetime()
WITH e
UNWIND $aliases_${idx} as alias
MERGE (a:Alias {name: alias, canonical_id: $id_${idx}})
```

#### b) Relationship Creation (Weighted)
```cypher
MATCH (a:Entity {id: $source_id_${idx}})
MATCH (b:Entity {id: $target_id_${idx}})
MERGE (a)-[r:${rel.type}]->(b)
SET r.weight = $weight_${idx},
    r.confidence = $conf_${idx},
    r.evidence = $evidence_${idx},
    r.updated_at = datetime()
```

#### c) Community Assignment Query
```cypher
MATCH (e:Entity)-[:BELONGS_TO]->(c:Community)
WHERE c.algorithm = 'louvain'
RETURN c.id as community_id,
       c.label as community_label,
       collect({name: e.name, type: e.type}) as members
ORDER BY size(members) DESC
LIMIT 50
```

#### d) Community Summary Storage
```cypher
MERGE (c:Community {id: $community_id})
SET c.title = $title,
    c.summary = $summary,
    c.key_entities = $key_entities,
    c.importance_score = $importance_score,
    c.updated_at = datetime()
```

---

### 4.3 Pinecone Vector Database

**Node**: Upsert Vectors Pinecone

**Endpoint**: `{{ $env.PINECONE_URL }}/vectors/upsert`

**Method**: POST

**Authentication**: HTTP Header Auth (Pinecone API Key)

**Request Body**:
```json
{
  "vectors": [{
    "id": "{{ $json.dedup_hash }}",
    "values": [... embedding array ...],
    "metadata": { ... enriched document metadata ... }
  }]
}
```

**Timeout**: 15 seconds

---

### 4.4 PostgreSQL / Supabase

**Nodes**:
- Store Metadata Postgres
- Store Community Summaries Postgres

**Database**: Supabase PostgreSQL

**Tables**:
1. **enriched_metadata**: Stores dedup_hash, source_data, sync_date
2. **community_summaries**: Stores community_id, title, summary, key_entities, importance_score, updated_at

**Operation**: UPSERT (insert or update)

---

### 4.5 Community Detection (Async)

**Node**: Community Detection Trigger (Async)

**Endpoint**: `{{ $env.NEO4J_URL }}/community-detection/trigger`

**Method**: POST

**Request Body**:
```json
{
  "algorithm": "louvain",
  "min_community_size": 5,
  "tenant_id": "{{ trace_id.split('-')[0] }}"
}
```

**Algorithm**: Louvain (modularity optimization)
**Min Community Size**: 5 entities

---

### 4.6 OpenTelemetry (Tracing)

**Node**: Export Trace to OpenTelemetry

**Endpoint**: `{{ $env.OTEL_COLLECTOR_URL || 'https://otel-collector.internal' }}/v1/traces`

**Method**: POST

**Body**:
```json
{
  "traceId": "{{ trace_id }}",
  "spanName": "enrichment_complete",
  "status": "{{ status }}",
  "timestamp": "{{ timestamp }}"
}
```

---

## 5. ENTITY EXTRACTION METHOD — V3.1

### 5.1 Two Extraction Strategies

#### Strategy A: Chunked Extraction (P06 + P07)
```
Documents → Chunk (4K, overlap 200)
          → SplitInBatches (5 per batch)
          → Extract Entities Per Chunk (LLM)
          → Aggregate Entity Results (per source)
          → Global Entity Resolution (cross-doc)
          → Relationship Mapper
```

**Advantage**: Handles large documents, reduces LLM token usage per request

**Path**: Chunk Documents → SplitInBatches → Extract Entities Per Chunk → Aggregate → Global Resolution → Relationship Mapper

#### Strategy B: Full-Document Extraction (AL1)
```
Documents → AI Entity Enrichment V3.1 (full doc, 30K tokens)
          → Relationship Mapper
```

**Advantage**: Better context, simpler flow

**Path**: AI Entity Enrichment → Relationship Mapper

---

### 5.2 Entity Normalization (V3.1)

**Normalization Rules** (in Relationship Mapper):
1. **Trim whitespace**: `name.trim()`
2. **Collapse spaces**: `.replace(/\s+/g, ' ')`
3. **Normalize quotes**: `.replace(/['']/g, "'")`
4. **Uppercase**: `.toUpperCase()`

**Entity ID Generation**:
- Hash function: MD5
- Input: `normalized_name + entity_type`
- Output length: 16 hex characters
- Example: MD5("ACME CORP::ORG").substring(0, 16)

**Alias Handling**:
- All aliases map to canonical entity ID
- Canonical entity is first occurrence
- Alias nodes created separately in Neo4j

---

## 6. GRAPH ENRICHMENT — Neo4j Operations

### 6.1 Entity Model

```cypher
:Entity {
  id: "a1b2c3d4e5f6g7h8",  // MD5(normalized_name + type)[0:16]
  name: "ACME Corporation",
  type: "ORG",              // PERSON, ORG, PROJECT, METRIC, DATE, LOCATION, CONCEPT
  tenant_id: "default",
  created_at: datetime(),
  updated_at: datetime()
}
```

### 6.2 Alias Model

```cypher
:Alias {
  name: "ACME Corp",
  canonical_id: "a1b2c3d4e5f6g7h8"
}
```

### 6.3 Relationship Model

```cypher
(source:Entity)-[r:RELATIONSHIP_TYPE]->(target:Entity) {
  r.weight: 1.0-1.5,      // Type * confidence
  r.confidence: 0.0-1.0,
  r.evidence: "...",
  r.updated_at: datetime()
}
```

**Relationship Types** (with weights):
- REPORTS_TO (1.5x)
- MANAGES (1.4x)
- OWNS (1.3x)
- WORKS_WITH (1.2x)
- IMPACTS (1.2x)
- PART_OF (1.1x)
- RELATED_TO (1.0x)

### 6.4 Community Model

```cypher
:Community {
  id: "community-louvain-123",
  algorithm: "louvain",
  title: "Financial Services Executives",
  summary: "Leadership team focused on banking operations...",
  key_entities: ["John Smith", "Sarah Johnson", "..."],
  importance_score: 0.95,
  updated_at: datetime()
}

(entity:Entity)-[:BELONGS_TO]->(community:Community)
```

---

## 7. COMMUNITY DETECTION & CLUSTERING

### 7.1 Algorithm

**Algorithm**: Louvain (modularity-based clustering)

**Parameters**:
- Min community size: 5 entities
- Async execution (non-blocking)
- Tenant-based isolation

### 7.2 Community Summary Generation

**LLM Prompt**:
```
Tu es un expert en analyse de communautes dans un graphe de connaissances.
Pour chaque communaute, genere:
1. Un titre descriptif (max 10 mots)
2. Un resume de 2-3 phrases
3. Les entites cles (max 5)
4. Les relations dominantes
5. importance_score (0.0-1.0)
```

**Output Format**:
```json
{
  "title": "Community Title",
  "summary": "2-3 sentences explaining theme",
  "key_entities": ["entity1", "entity2", "..."],
  "dominant_relations": ["MANAGES", "WORKS_WITH"],
  "importance_score": 0.85
}
```

---

## 8. DOCUMENT ENRICHMENT PIPELINE

### 8.1 Input Processing

**Data Flow**:
```
Internal Use Cases (HTTP)
  ↓
  Normalize & Merge (dedup + hash)
  ↓
External Data Sources (HTTP)
  ↓
  Documents with metadata + dedup_hash
```

**Deduplication**: SHA256-based, removes exact duplicates

**Metadata Added**:
- `enriched: false` (initial)
- `source_sync_date: ISO8601`
- `dedup_hash: SHA256 hex`

### 8.2 Entity Extraction (Dual Path)

**Path A (Chunked)**:
- Documents split into 4K chunks (200 overlap)
- Each chunk → LLM extraction → per-chunk results
- Results aggregated by source
- Global resolution across all sources
- Final entity set

**Path B (Full Document)**:
- Entire document → LLM extraction (up to 30K tokens)
- Direct entity results
- (Simpler but less scalable)

### 8.3 Graph Construction

**Neo4j Operations**:
1. **MERGE entities** with canonical IDs
2. **CREATE aliases** for alternative names
3. **MERGE relationships** with weights
4. **Trigger Louvain** for community detection
5. **Store community** metadata

### 8.4 Vector Storage

**Pinecone**:
- Vector ID: `dedup_hash` (document unique identifier)
- Vector values: Embedding array (1024-dim)
- Metadata: Full enriched document + entity/relationship summaries

### 8.5 SQL Storage

**Postgres Tables**:

**enriched_metadata**:
| Column | Type |
|--------|------|
| dedup_hash | UUID |
| source_data | JSONB |
| sync_date | TIMESTAMP |

**community_summaries**:
| Column | Type |
|--------|------|
| community_id | VARCHAR |
| title | VARCHAR |
| summary | TEXT |
| key_entities | JSONB |
| importance_score | FLOAT |
| updated_at | TIMESTAMP |

---

## 9. RESILIENCY FEATURES

### 9.1 Distributed Locking

**Lock Manager**: Redis
- Key: `lock:enrichment:daily`
- TTL: 2 hours (7200 seconds)
- Worker ID: `worker-{execution_id}`
- Prevents concurrent enrichment runs

### 9.2 OpenTelemetry Tracing

**Trace Init**:
```
trace_id = "tr-enrich-{timestamp}-{random}"
span_context = "enrichment-parent"
```

**Export Endpoint**: OTEL Collector

### 9.3 Error Handling

- **Fetch nodes**: `onError: continueErrorOutput` (graceful degradation)
- **HTTP requests**: `retryOnFail: true, maxTries: 3, waitBetweenTries: 2000ms`
- **Conditional gating**: Lock Acquired? (IF node prevents execution on lock failure)

### 9.4 Execution Order

- `saveExecutionProgress: true` (checkpoint after each node)
- `saveManualExecutions: true` (audit trail)

---

## 10. PERFORMANCE CHARACTERISTICS

### 10.1 Timeouts

| Operation | Timeout |
|-----------|---------|
| Fetch Internal Use Cases | 15s |
| Fetch External Data Sources | 20s |
| AI Entity Enrichment | 30s |
| Extract Entities Per Chunk | 30s |
| Neo4j Transactions | 15s |
| Pinecone Upsert | 15s |
| Community Detection Trigger | 5s |

### 10.2 Batch Sizes

- Entity chunk batching: 5 per batch
- Document merging: All (dedup-filtered)
- Community size threshold: min 5 entities

### 10.3 Rate Limiting

- No explicit rate limiting configured
- LLM API retry (3 attempts, 2s between)
- HTTP timeouts per operation type

---

## 11. CONFIGURATION REQUIREMENTS

### 11.1 Environment Variables

**Required**:
```
NEO4J_URL                    # Neo4j Aura endpoint
ENTITY_EXTRACTION_API_URL    # DeepSeek or OpenAI endpoint
ENTITY_EXTRACTION_MODEL      # LLM model (deepseek-chat)
PINECONE_URL                 # Pinecone API endpoint
OTEL_COLLECTOR_URL           # OpenTelemetry collector
```

**Optional**:
```
SQL_GENERATION_API_URL       # For future SQL gen integration
EMBEDDING_API_URL            # For future embedding integration
RERANKER_API_URL             # For future reranking integration
```

### 11.2 Credentials

**Redis Upstash**: Distributed locking
**Pinecone API Key**: Vector storage
**Neo4j Aura**: Graph database
**Supabase PostgreSQL**: Metadata storage
**OpenAI/DeepSeek API Key**: Entity extraction LLM
**HTTP Header Auth**: Internal API + External API keys

---

## 12. COMPARISON WITH V3.0 (Changes in V3.1)

| Aspect | V3.0 | V3.1 |
|--------|------|------|
| Entity Extraction | Single pass | Chunked (4K) + global resolution |
| Entity IDs | Random | MD5(name + type)[0:16] |
| Entity Linking | Basic | Full cross-document resolution with aliases |
| Relationship Weights | Confidence only | Confidence × TYPE_WEIGHT |
| Relationship Types | 5 | 7 (added IMPACTS, RELATED_TO) |
| Community Detection | Optional | Built-in (Louvain, async) |
| Community Summaries | None | LLM-generated summaries |
| Alias Handling | Not tracked | Full alias → canonical mapping |
| Tenant Isolation | None | trace_id-based tenant_id |
| Hypothetical Questions | None | Extracted + deduplicated |
| Key Facts | None | Extracted per document |

---

## 13. KNOWN LIMITATIONS & TODO

### 13.1 Limitations

1. **Vector Embeddings**: Not generated in this workflow (external)
   - Pinecone upsert receives embedding from upstream
   - No embedding model configured locally

2. **Community Detection Async**:
   - Non-blocking but workflow continues
   - No wait for completion
   - Community summaries generated may lag behind entity creation

3. **Entity Extraction Context**:
   - Chunk strategy (4K) may lose inter-chunk context
   - Overlap (200 chars) helps but incomplete solution

4. **LLM Hallucinations**:
   - No validation of LLM outputs (entities, relationships)
   - Confidence scores from LLM may not be calibrated

5. **Scalability**:
   - Chunking + batching for large docs
   - No streaming of results
   - Full aggregation in memory

### 13.2 Future Improvements (SOTA 2026 Roadmap)

1. **Late Chunking**: Use late_chunking=True in Jina embeddings
2. **Entity Validation**: Post-extraction filtering (POS tagging, entity type validation)
3. **Relationship Refinement**: Cross-document relationship consolidation
4. **Community Dynamic Summary**: Update summaries as graph evolves
5. **Temporal Entity Tracking**: Track entity changes over time
6. **Domain-Specific Taxonomy**: Custom entity types per sector

---

## 14. INTEGRATION POINTS

### 14.1 Upstream (Input)

**Fetch Internal Use Cases**: Internal API (company-specific endpoint)
**Fetch External Data Sources**: External provider API (configurable)

### 14.2 Downstream (Output)

1. **Pinecone**: Vector search for RAG
2. **Neo4j**: Graph exploration, traversals
3. **Postgres**: Metadata queries, reporting
4. **OpenTelemetry**: Observability + tracing

### 14.3 Related Workflows

- **Ingestion V3.1**: Feeds documents into enrichment
- **RAG Standard**: Consumes enriched vectors + graph
- **RAG Graph**: Uses Neo4j entities + relationships

---

## 15. QUICK REFERENCE

### 15.1 Node Count by Type

| Type | Count |
|------|-------|
| Code | 10 |
| HTTP Request | 8 |
| Redis | 2 |
| PostgreSQL | 2 |
| Conditional (IF) | 1 |
| SplitInBatches | 1 |
| ChatTrigger | 1 |
| Sticky Note | 1 |
| **TOTAL** | **29** |

### 15.2 API Calls Summary

| API | Calls | Method |
|-----|-------|--------|
| LLM (Entity Extraction) | 2 | POST (JSON) |
| LLM (Community Summary) | 1 | POST (JSON) |
| Neo4j | 3 | POST (Cypher) |
| Pinecone | 1 | POST (vectors) |
| PostgreSQL | 2 | INSERT/UPSERT |
| Redis | 2 | GET/SET/DEL |
| OpenTelemetry | 1 | POST (traces) |
| HTTP Fetch | 2 | GET (internal/external) |
| **TOTAL** | **15** | |

### 15.3 Key Algorithms

| Algorithm | Location | Purpose |
|-----------|----------|---------|
| SHA256 | Normalize & Merge | Document deduplication |
| MD5 | Relationship Mapper | Entity ID generation |
| Louvain | Community Detection | Graph clustering |
| Entity Linking | Relationship Mapper | Canonical name resolution |
| Relationship Weighting | Relationship Mapper | Importance scoring |

---

## SUMMARY

The **Enrichment V3.1** workflow is a sophisticated, multi-stage document enrichment pipeline with:

✅ **Dual entity extraction**: Chunked (P06) + cross-document resolution (P07)
✅ **Weighted knowledge graphs**: Neo4j with confidence scores + relationship types
✅ **Vector + graph + SQL storage**: Pinecone + Neo4j + Postgres
✅ **Community detection**: Async Louvain clustering with LLM summaries
✅ **Distributed locking**: Redis-based cron protection
✅ **Observability**: OpenTelemetry tracing end-to-end
✅ **7 relationship types** with weights: REPORTS_TO (1.5) to RELATED_TO (1.0)
✅ **29 nodes** orchestrating complex AI/graph operations
✅ **Resilient**: Retry logic, graceful error handling, execution checkpoints

**Key Innovation**: Entity linking + global resolution (P07) enables cross-document entity deduplication before graph storage, improving graph quality significantly.

