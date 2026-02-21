# Neo4j Data Quality Analysis — Session 35

> Last updated: 2026-02-21T15:45:00+01:00

## Executive Summary

The Neo4j graph has **19,788 nodes and 76,769 relationships**, but **98.27% of relationships are generic "CONNECTE"** type with no semantic meaning. This is the root cause of **Graph pipeline at 0% accuracy on Phase 2**.

**Critical Issues:**
1. **No semantic relationship types** — All edges are "CONNECTE" (75,442/76,769 = 98.27%)
2. **Entity ambiguity** — "Plankton" is a biological organism, not SpongeBob character
3. **Broken entity linking** — Movie/show titles categorized as "Person" nodes (e.g., "The SpongeBob SquarePants Movie" is labeled Person, not Entity)
4. **Shallow semantic depth** — Even with 4 semantic relationship types (A_CREE, UTILISE, ETEND, ETUDIE), they're rare and inconsistent

---

## Detailed Findings

### 1. Relationship Type Distribution

| Type | Count | % of Total | Status |
|------|-------|-----------|--------|
| **CONNECTE** (generic) | 75,442 | **98.27%** | ❌ USELESS FOR REASONING |
| SOUS_ENSEMBLE_DE | 554 | 0.72% | ✓ Semantic |
| A_CREE (created by) | 497 | 0.65% | ✓ Semantic |
| UTILISE (uses) | 99 | 0.13% | ✓ Semantic |
| ETEND (extends) | 66 | 0.09% | ✓ Semantic |
| CIBLE (targets) | 52 | 0.07% | ✓ Semantic |
| ETUDIE (studies) | 38 | 0.05% | ✓ Semantic |
| CAUSE_PAR (caused by) | 7 | 0.01% | ✓ Semantic |
| PROTEGE_CONTRE (protects against) | 6 | 0.01% | ✓ Semantic |
| VISE_A_LIMITER (aims to limit) | 4 | 0.005% | ✓ Semantic |
| EXPOSE_A (exposed at) | 4 | 0.005% | ✓ Semantic |

**Problem**: The 1.73% semantic relationships are insufficient for multi-hop reasoning. Graph RAG requires dense semantic knowledge (e.g., VOICED_BY, DIRECTED_BY, WRITTEN_BY, PRODUCED_BY, etc.).

---

### 2. Node Label Distribution

| Label | Count | Status |
|-------|-------|--------|
| Person | 8,531 | Mixed (persons + fictional characters + movies) |
| Entity | 8,331 | Generic catch-all category |
| Organization | 1,775 | OK |
| City | 840 | OK |
| Technology | 139 | OK |
| Museum | 62 | OK |
| Country | 54 | OK |
| Disease | 22 | OK |
| Concept | 12 | OK |
| Other (10 types) | 22 | OK |

**Problem**: Person and Entity categories are too broad and conflate different entity types (e.g., SpongeBob fictional character, Tom Kenny actor, movie titles all lumped together).

---

### 3. SpongeBob Data Sample — Evidence of Disambiguation Failure

The database contains **8 SpongeBob/Plankton-related entities with wrong categorizations**:

```cypher
MATCH (n) WHERE toLower(n.name) CONTAINS "spongebob" OR toLower(n.name) CONTAINS "plankton"
RETURN labels(n)[0], n.name, n.description[0:100]
```

Results show:

| Name | Label | Problem |
|------|-------|---------|
| "The SpongeBob SquarePants Movie" | **Person** ❌ | Should be Entity (Movie) |
| "The SpongeBob Movie: Sponge Out of Water" | Entity | Correct |
| "List of SpongeBob SquarePants episodes" | Entity | Correct |
| "List of SpongeBob SquarePants cast members" | Entity | Correct (cast list) |
| "SpongeBob" | Entity | Correct |
| **"Plankton"** | Entity ❌ | **Biological organism** — NOT SpongeBob character |
| "SpongeBob SquarePants (season 1)" | **Person** ❌ | Should be Entity (TV Season) |
| "SpongeBob SquarePants" | **Person** ❌ | Ambiguous: Show? Character? |

**Key failure**: "Plankton" is correctly classified as an entity but its **description is biological** ("diverse collection of organisms that live in the water column"), NOT Mr. Plankton from SpongeBob. This entity is **incorrectly linked to SpongeBob entities through generic CONNECTE relationships**.

---

### 4. Semantic Relationship Samples

The few semantic relationships that exist show quality:

#### A_CREE (created by) — Good examples
```
Michelangelo A_CREE Plafond Chapelle Sixtine
Albert Einstein A_CREE Theory of Relativity
Nikola Tesla A_CREE Electricity
William Shakespeare A_CREE Macbeth
```

#### UTILISE (uses) — Only 99 instances
- Technology UTILISE Technology
- Person UTILISE Technology
- Organization UTILISE Technology

#### ETEND (extends) — Only 66 instances
- Technology ETEND Technology
- Entity ETEND City (rare/incorrect type combination)

**Problem**: Semantic relationships exist but are **1/75 of generic CONNECTE** relationships. The ingestion pipeline doesn't extract semantic types effectively.

---

### 5. Root Causes of 0% Graph Pipeline Accuracy

The Graph RAG pipeline on Phase 2 achieves **0% accuracy** because:

1. **Graph traversal useless** — All CONNECTE edges are semantically empty
   - Question: "Who voiced SpongeBob?"
   - Expected: SpongeBob --VOICED_BY--> Tom Kenny
   - Actual: SpongeBob --CONNECTE--> [noise]

2. **Entity disambiguation broken** — Multiple "Plankton" entities with wrong descriptions
   - Biological Plankton conflated with Mr. Plankton (character)
   - No way to disambiguate in the knowledge graph

3. **No reasoning support** — Multi-hop queries fail
   - Q: "What movies did the actor who voiced SpongeBob appear in?"
   - Expected: SpongeBob --VOICED_BY--> Tom Kenny --APPEARED_IN--> [Movies]
   - Actual: SpongeBob --CONNECTE--> [...] (useless)

4. **LLM can't compensate** — Even Llama 70B (FIX-38) can't extract answers from noise
   - The graph provides no useful signal for ranking/reasoning
   - Context retrieved is semantically unrelated

---

## Re-ingestion Strategy (Priority 1)

### Phase 1: Entity Disambiguation
```
1. Add fine-grained entity labels:
   - :Person:Actor
   - :Person:Fictional_Character
   - :Entity:Movie
   - :Entity:TV_Show
   - :Entity:Biological_Organism (for "Plankton" organism)

2. Add identifier fields:
   - dbpedia_uri (for disambiguation)
   - wikidata_id (for reference)
   - entity_type_confidence (0-1 score)

3. Deduplication:
   - Merge duplicate "Plankton" entities with context
   - Add `source_doc_id` to track which document introduced the entity
```

### Phase 2: Semantic Relationship Extraction

Add **20+ semantic relationship types** to replace generic CONNECTE:

**For Media/Entertainment:**
- VOICED_BY, DIRECTED_BY, WRITTEN_BY, PRODUCED_BY, APPEARED_IN, FEATURED_IN

**For Science/Tech:**
- INVENTED_BY, DISCOVERED_BY, DEVELOPED_BY, RESEARCHED_BY, PUBLISHED_BY

**For Organization/Business:**
- FOUNDED_BY, LED_BY, ACQUIRED_BY, PARTNERED_WITH, EMPLOYED_BY

**For Domain-specific:**
- TREATS_CONDITION, CAUSED_BY, DERIVED_FROM, VARIANT_OF, SYNONYM_OF

### Phase 3: Knowledge Graph Enrichment

```cypher
# Add properties to relationships
MATCH ()-[r:CONNECTE]->()
SET r.relationship_type = "GENERIC"
SET r.confidence_score = 0.1
SET r.extraction_method = "coref_resolved"
```

---

## Implementation Plan

### Step 1: Data Export & Analysis (30 min)
```bash
python3 scripts/neo4j-data-export.py \
  --output /tmp/neo4j-export.json \
  --format graph_ml
```

### Step 2: Re-ingestion Pipeline (Codespace, 2-4 hours)
```bash
# In rag-data-ingestion Codespace:
cd /tmp
python3 eval/re-ingest-graph.py \
  --dataset musique,2wikimultihopqa \
  --semantic-extraction \
  --deduplication \
  --output /tmp/neo4j-import.csv
```

### Step 3: Import to Neo4j (30 min)
```bash
neo4j-admin database import full \
  --from-file /tmp/neo4j-import.csv \
  neo4j
```

### Step 4: Validation (30 min)
```bash
# Run diagnostic queries again
python3 scripts/neo4j-validation.py \
  --expected-semantics 20+ \
  --expected-connecte-ratio <10%
```

### Step 5: Phase 2 Re-test (1-2 hours)
```bash
# Re-run Graph pipeline
python3 eval/quick-test.py \
  --pipeline graph \
  --questions 50 \
  --force
```

---

## Data Quality Metrics (Target)

| Metric | Current | Target |
|--------|---------|--------|
| % semantic relationships | 1.73% | **>= 50%** |
| % generic CONNECTE | 98.27% | **<= 30%** |
| Unique relationship types | 11 | **>= 20** |
| Entity label specificity | 3 (Person/Entity/Org) | **>= 12** |
| Graph RAG accuracy (Phase 2) | 0% | **>= 60%** |
| Avg path length (reasoning) | N/A | **2-4 hops** |

---

## Timeline & Effort

| Task | Duration | Blocker? |
|------|----------|----------|
| Export & analyze | 30 min | No |
| Codespace re-ingestion | 2-4 hours | No |
| Neo4j import | 30 min | No |
| Validation & fix bugs | 1 hour | No |
| Re-test Phase 2 | 1-2 hours | Yes (bottleneck) |
| **Total** | **5-8 hours** | Critical for Phase 2 |

---

## Fallback Strategy (if re-ingestion fails)

1. **Reduce CONNECTE edges** — Delete 90% of generic relationships, keep only A_CREE/SOUS_ENSEMBLE_DE
2. **Switch to dense retrieval** — Use Pinecone only for multi-hop questions, skip Neo4j
3. **Fine-tune extraction** — Retrain entity linking model with labeled data
4. **Use LLM for relation extraction** — Llama 70B to generate semantic types from CONNECTE edges (post-hoc enrichment)

---

## Files & Queries Reference

**Diagnostic queries used:**
- `/home/termius/mon-ipad/technicals/debug/neo4j-data-quality-analysis.md` (this file)

**Related scripts:**
- `scripts/neo4j-data-export.py` (to create)
- `scripts/neo4j-validation.py` (to create)
- `eval/re-ingest-graph.py` (to create)

**Neo4j Schema (for reference):**
- 22 node labels (Person, Entity, Organization, City, etc.)
- 11 relationship types (CONNECTE, A_CREE, UTILISE, etc.)
- 19,788 nodes, 76,769 relationships

---

## Decision Required

**Q: Proceed with re-ingestion?**
- **PRO**: Fix Graph pipeline root cause, potentially +60% accuracy on Phase 2
- **CON**: 5-8 hour effort, must allocate Codespace + computation
- **Alternative**: Accept 0% Graph accuracy for Phase 2, focus on Standard + Quantitative

**Recommendation**: Proceed. Graph is a key differentiator for the product. Better to fix now than ship broken.

---

## Next Steps (Session 36+)

1. [ ] Create Codespace for `rag-data-ingestion`
2. [ ] Build semantic extraction pipeline (Python + NER + LLM relation extraction)
3. [ ] Re-ingest Phase 2 graph datasets (musique, 2wikimultihopqa)
4. [ ] Validate & fix disambiguation
5. [ ] Re-test Graph pipeline on Phase 2
6. [ ] Update fixes-library.md with re-ingestion process
