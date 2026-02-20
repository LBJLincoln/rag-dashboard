# Graph Pipeline Failure Analysis — Complete Report

**Date:** 2026-02-20
**Status:** ANALYSIS COMPLETE

---

## EXECUTIVE SUMMARY

| Metric | Value |
|--------|-------|
| Total questions tested | 51 |
| Correct answers | 31 (60.8%) |
| Incorrect answers | **20 (39.2%)** |
| Target accuracy | 70.0% |
| **Gap to target** | **-9.2 percentage points** |

The Graph pipeline is currently **9.2pp below target**. The root cause is not data availability, but **Neo4j query specificity** — the pipeline returns narrative descriptions and generic categories instead of specific entity names and relationship types.

---

## BREAKDOWN BY DATASET

### Phase-1 (50 questions)
- **Correct:** 40/50 (80%)
- **Failures:** 10/50 (20%)
- **Status:** Phase-1 dataset is **above target** (80% > 70%)

### Musique (17 test runs of 1 question)
- **Correct:** 7/17 (41.2%)
- **Failures:** 10/17 (58.8%)
- **Status:** Musique dataset severely underperforms — **entity coverage issues**

---

## FAILURE QUALITY DISTRIBUTION

| Category | Count | Percentage | Meaning |
|----------|-------|-----------|---------|
| Complete failures (F1 < 0.1) | 15 | 75% | No relevant content in answer |
| Partial failures (F1 0.1-0.5) | 5 | 25% | Some relevant content |
| Near-correct (F1 >= 0.5) | 0 | 0% | Mostly correct answer |

**Observation:** 75% of failures are complete misses — the pipeline returns entirely wrong information, not partial information.

---

## LATENCY ANALYSIS

| Metric | Value |
|--------|-------|
| Average latency | 67.8 seconds |
| Min latency | 42.8 seconds |
| Max latency | 120.5 seconds (TIMEOUT) |
| Timeout count | 1/51 (graph-musique-5) |

**Observation:** Graph queries are slow (average 68 seconds), suggesting either complex Cypher queries or Neo4j performance issues.

---

## PHASE-1 FAILURES: DETAILED LIST

### 1. Entity Disambiguation Failures (5 questions)

These questions ask for **specific entity names** but the pipeline returns **generic descriptions or types**.

#### graph-18: "Who are the Nobel Prize laureates in the knowledge graph?"
- **Expected:** Albert Einstein, Marie Curie, Nelson Mandela
- **Got:** "Nobel Prize laureates are entities with the type 'Nobel laureate' in the knowledge graph."
- **F1 Score:** 0.0
- **Root Cause:** Query returns description instead of entity list
- **Fix Required:** Change query to `MATCH (n:Laureate)-[:WON]->(prize:NoblePrize) RETURN n.name`

#### graph-22: "Which political leaders are connected to Washington D.C.?"
- **Expected:** Franklin D. Roosevelt, Abraham Lincoln
- **Got:** "President, Senators, Representatives, cabinet members, Supreme Court Justices"
- **F1 Score:** 0.0
- **Root Cause:** Returns role categories instead of actual person names
- **Fix Required:** Return specific people connected to Washington D.C., not role types

#### graph-40: "Which diseases does vaccination protect against?"
- **Expected:** Influenza
- **Got:** "Measles, mumps, rubella, polio, diphtheria, tetanus, pertussis, hepatitis B."
- **F1 Score:** 0.0
- **Root Cause:** Vaccine-preventable diseases don't match what's in the graph
- **Fix Required:** Match the specific disease(s) actually connected in Neo4j via `PROTEGE_CONTRE`

#### graph-32: "Which entities are connected to the city of Paris?"
- **Expected:** Marie Curie, Louis Pasteur, Napoleon Bonaparte, European Space Agency, Pablo Picasso, Vincent van Gogh, Louvre Museum
- **Got:** "Eiffel Tower, Louvre Museum, Notre-Dame Cathedral, French government, Victor Hugo, Claude Monet, Pab..."
- **F1 Score:** 0.1739
- **Root Cause:** Partial correct answer — includes Louvre but missing key figures (Curie, Pasteur, Napoleon)
- **Status:** Closest to target but still missing 5 of 7 expected entities

#### graph-18: Entity Listing Subtotal
- **Pattern:** Queries return class/type/description instead of instance data
- **Common thread:** All use entity properties or relationships but don't extract the actual entity names
- **Cypher antipattern:** Likely using RETURN properties or computed values instead of `RETURN n.name`

---

### 2. Entity Relationship Failures (2 questions)

These questions ask for **relationship types** but return **narrative descriptions**.

#### graph-38: "What is the relationship between Winston Churchill and Franklin D. Roosevelt?"
- **Expected:** "wartime partnership allies"
- **Got:** "Close personal and political relationship during World War II."
- **F1 Score:** 0.1667
- **Root Cause:** Returns narrative instead of relationship label
- **Fix Required:** Return relationship type explicitly: `MATCH (churchill:Person)-[rel]->(fdr:Person) RETURN type(rel)`

#### graph-43: "What is Isaac Newton's relationship with the Royal Society?"
- **Expected:** "Newton Royal Society" (direct connection)
- **Got:** "Complex and multifaceted, spanning decades."
- **F1 Score:** 0.0
- **Root Cause:** Vague description instead of structural relationship
- **Fix Required:** Return relationship properties or type: `MATCH (newton)-[rel]-(rs:RoyalSociety) RETURN rel.type`

---

### 3. Multi-Hop Reasoning Failures (2 questions)

These questions require **traversing multiple nodes** but return **incomplete or tangential results**.

#### graph-23: "What did Charles Darwin study and where?"
- **Expected:** "University of Cambridge"
- **Got:** "Charles Darwin studied natural world, origins and evolution of species, particularly during his voya..."
- **F1 Score:** 0.0
- **Root Cause:** Returns Darwin's subject matter instead of location
- **Fix Required:** Focus the query on `DARWIN -[ETUDIE]-> LOCATION` instead of research topics

#### graph-27: "What technology preceded the Internet?"
- **Expected:** "Electricity, Telephone"
- **Got:** "The telegraph system."
- **F1 Score:** 0.0
- **Root Cause:** Returns partial answer (telegraph is one of several predecessors)
- **Fix Required:** Find all technologies connected to Internet via `PRECEDE` relationship

---

### 4. Path Traversal Failures (1 question)

These require **finding intermediate nodes** but return **facts about endpoints**.

#### graph-33: "What is the path from Albert Einstein to the University of Cambridge?"
- **Expected:** "Einstein → Princeton/Nobel Foundation, connected via Royal Society or other intermediate nodes"
- **Got:** "Einstein visited Cambridge in 1921, became visiting Fellow at Christ's College 1930-1931, worked on..."
- **F1 Score:** 0.0571
- **Root Cause:** Returns biographical facts instead of path structure
- **Fix Required:** Use shortest path: `MATCH path=shortestPath((einstein)-[*..5]-(cambridge:University)) RETURN path`

---

## MUSIQUE FAILURES: DETAILED LIST

The Musique dataset (from HuggingFace) presents a different problem: **entity coverage**.

### Failure Types

#### Missing Data (5 questions)
Questions that return "Information not available in the knowledge graph":
- **graph-musique-13:** River Thames (body of water)
- **graph-musique-14:** River Thames (body of water)
- **graph-musique-15:** River Thames (body of water)
- **graph-musique-16:** Sun's position as center of solar system
- **graph-musique-5:** Timeout (120s+)

**Root Cause:** Musique entities/relationships not ingested into Neo4j. These appear to be real facts from the Musique dataset that simply don't exist in the current graph.

#### Wrong Year (2 questions)
- **graph-musique-6:** "Margaret Knox's spouse death year" — Expected 1572, got 1586 (wrong year)
- **graph-musique-7:** "Storm year for person who fought Henry in 1183" — Expected 1191, got 1156 (wrong year)

**Root Cause:** Likely incorrect data ingestion or property mapping. The relationships exist but point to wrong years.

#### Wrong Region (1 question)
- **graph-musique-1:** "Heinrich Gross's birth place location" — Expected Senica District, got Styria, Austria

**Root Cause:** Multiple-level hierarchy issue (birth_place → parent_region vs. grandparent_region)

#### Correct Answer, Wrong Format (2 questions)
- **graph-musique-9:** "Producer of Big Jim McLain who played in True Grit" — Got John Wayne (correct actor) with full narrative
- **graph-musique-10:** "Cast of Rooster Cogburn who played in True Grit" — Got John Wayne with full narrative

**Root Cause:** Answer is semantically correct but doesn't match the expected format. F1 score 0.28-0.33 indicates partial credit.

---

## PATTERN SUMMARY: 5 ROOT CAUSES

### 1. Entity Disambiguation (5 failures = 25% of failures)

**Pattern:** Neo4j returns property descriptions or types instead of actual entity names.

**Examples:**
- Returns "entities with type Nobel laureate" instead of "Albert Einstein, Marie Curie..."
- Returns "President, Senators, Representatives" instead of "Franklin D. Roosevelt, Abraham Lincoln"

**Fix Strategy:**
1. Ensure Cypher queries use `RETURN n.name` or `RETURN [DISTINCT n.name]`
2. Avoid returning computed values or relationship properties
3. Add filtering/projection at the LLM level to extract names from narrative

**Priority:** HIGH (most failures fall here)

---

### 2. Relationship Specificity (2 failures = 10% of failures)

**Pattern:** Queries return narrative descriptions instead of structured relationship labels.

**Examples:**
- Returns "Close personal and political relationship during World War II" instead of "CONNECTE" or "ALLIES"
- Returns "Complex and multifaceted, spanning decades" instead of specific relationship type

**Fix Strategy:**
1. Explicitly return relationship types: `type(rel)` in Cypher
2. Return relationship properties if available
3. Avoid post-processing through LLM that adds narrative

**Priority:** MEDIUM (smaller subset, but clear fix)

---

### 3. Multi-Hop Completeness (2 failures = 10% of failures)

**Pattern:** Queries return early results instead of complete traversal.

**Examples:**
- Returns what Darwin studied (natural selection) instead of where (Cambridge)
- Returns one predecessor (telegraph) instead of all (electricity, telephone, telegraph)

**Fix Strategy:**
1. Adjust Cypher to traverse complete paths: `MATCH (src)-[*1..3]->(tgt) RETURN tgt.name`
2. Ensure all paths are followed, not just first result
3. Return complete lists, not single items

**Priority:** MEDIUM (requires query restructuring)

---

### 4. Musique Dataset Coverage (10 failures = 50% of failures)

**Pattern:** Mixed issues:
- 5 entities/relationships don't exist in Neo4j
- 3 exist but with wrong data
- 2 exist but in wrong format

**Fix Strategy:**
1. **For missing data:** Ingest Musique dataset into Neo4j (new task)
2. **For wrong data:** Validate ingestion; check property mapping (birth_place hierarchy, death years)
3. **For format issues:** Post-process LLM response to extract key information

**Priority:** CRITICAL (50% of failures, but requires parallel data ingestion work)

---

### 5. Latency Concerns (1 timeout = 5% of failures)

**Pattern:** Graph queries slow (average 68s, max 120s).

**Examples:**
- graph-musique-5: Timeout at 120s
- Most queries: 45-90s range

**Root Cause Hypothesis:**
- Neo4j free tier performance limitations
- Unindexed queries
- Complex traversals without optimization

**Fix Strategy:**
1. Add Neo4j indexes on frequently queried properties
2. Optimize Cypher queries (avoid full graph scans)
3. Consider query caching for common patterns

**Priority:** LOW (only 1 timeout; latency high but acceptable for now)

---

## FAILURE PATTERNS BY QUESTION TYPE

| Category | Count | Accuracy | Issue |
|----------|-------|----------|-------|
| entity_listing | 4 | 60% | Returns types instead of instances |
| entity_relationship | 2 | 50% | Returns narrative instead of labels |
| multi_hop | 2 | 50% | Incomplete traversals |
| path_traversal | 2 | 50% | Returns facts instead of paths |

**Key Insight:** All question types perform below 70%, but entity_listing is the most common failure type (40% of Phase-1 failures).

---

## RECOMMENDATIONS FOR FIX

### Phase 1: Quick Wins (0-2 hours)

1. **Entity Disambiguation (graph-18, graph-22, graph-40)**
   - Review Cypher queries in Neo4j node
   - Change `RETURN` to extract actual entity names, not types
   - Test with graph-18 (Nobel laureates) first

2. **Relationship Specificity (graph-38, graph-43)**
   - Add relationship type extraction to Cypher
   - Test with Churchill-FDR relationship

**Expected Gain:** +2-3pp accuracy (5 failures fixed = +10% of failures)

### Phase 2: Entity Coverage (Musique) (2-4 hours)

1. **Create Musique ingestion task** in separate Codespace
2. **Map Musique entities** to Neo4j schema
3. **Validate data ingestion** against known answers
4. **Re-run Musique tests**

**Expected Gain:** +5-8pp accuracy (10 Musique failures fixed = +20% of failures)

### Phase 3: Query Optimization (1-2 hours)

1. **Add Neo4j indexes** on frequently queried properties
2. **Optimize slow queries** (>90s)
3. **Test latency improvements**

**Expected Gain:** +0-1pp (mainly latency, little accuracy impact)

---

## NEXT STEPS

1. **Immediate:** Fix entity_disambiguation queries (graph-18, graph-22, graph-40)
   - Contact: Check Graph RAG V3.3 workflow nodes
   - Timeline: 30 minutes

2. **Short-term:** Fix relationship_specificity queries (graph-38, graph-43)
   - Timeline: 1 hour

3. **Parallel:** Start Musique dataset ingestion
   - Contact: Create rag-data-ingestion Codespace
   - Timeline: 2-4 hours
   - Blocker: Requires significant schema mapping work

4. **Validation:** Run Phase-1 tests after each fix
   - Success criteria: 5/5 on failing questions

---

## CONCLUSION

The Graph pipeline is **9.2pp below target** primarily due to:
- **Cypher query issues (50% of failures):** Returning descriptions instead of data
- **Data coverage gaps (50% of failures):** Musique entities not in Neo4j

The fix path is clear:
1. Fix Neo4j query specificity (2-3pp gain, 2 hours)
2. Ingest Musique dataset (5-8pp gain, 4 hours)
3. **Combined expected: +7-11pp → reaching 67-72% accuracy**

This should be sufficient to hit the 70% target, assuming Phase-1 improvements don't regress on Musique.
