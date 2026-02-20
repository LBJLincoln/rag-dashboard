# Ingestion V4.0 Upgrade Script

> **Created:** 2026-02-20 (Session 31)
> **Status:** ✅ Tested and working
> **Workflow:** Ingestion V3.1 → V4.0 (28→30 nodes)

## Quick Start

```bash
# Run the upgrade
python3 /home/termius/mon-ipad/scripts/upgrade-ingestion-v4.py

# Expected output:
# - Backup created at n8n/validated/ingestion-v3.1-backup.json
# - Upgraded workflow at n8n/live/ingestion.json
# - Summary of 6 SOTA improvements applied
```

## What It Does

The script automatically applies 6 SOTA 2026 improvements to the Ingestion workflow:

1. **Late Chunking** (A) — Jina embeddings v3 with `late_chunking: true`
2. **Sector Router** (B) — NEW node for domain-specific chunking
3. **CompactRAG QA** (C) — Enhanced QA pairs (3→5 for finance/industry)
4. **Enhanced Metadata** (D) — Adds sector, language, doc_type, semantic_tags
5. **French NER** (E) — NEW node for entity extraction
6. **BM25 French** (F) — French stop words + sector term weighting

## Input/Output

**Input:**
- `/home/termius/mon-ipad/n8n/live/ingestion.json` (V3.1 workflow, 28 nodes)

**Output:**
- `/home/termius/mon-ipad/n8n/live/ingestion.json` (V4.0 workflow, 30 nodes)
- `/home/termius/mon-ipad/n8n/validated/ingestion-v3.1-backup.json` (backup)

## Safety Features

- ✅ Automatically creates backup before modifying
- ✅ Validates node existence before modification
- ✅ Logs warnings if nodes not found (continues anyway)
- ✅ Preserves all existing nodes and connections
- ✅ Generates unique IDs for new nodes

## Testing the Upgraded Workflow

### 1. Import to n8n HF Space

**CRITICAL:** Do NOT import to VM n8n (Task Runner cache issue + RAM limit).

```bash
# Go to HF Space n8n
# https://lbjlincoln-nomos-rag-engine.hf.space

# Workflows → Import from File
# Upload: /home/termius/mon-ipad/n8n/live/ingestion.json
```

### 2. Verify Node Connections

After import, manually verify connections for NEW nodes:

- **Sector-Aware Router V4:** Should be between `PII Fortress` → `Semantic Chunker`
- **French NER Extractor V4:** Should be after `Chunk Validator & Enricher V4`

### 3. Test with Sample Documents

```bash
# Test with 1 document per sector
curl -X POST https://lbjlincoln-nomos-rag-engine.hf.space/webhook/<ID> \
  -H "Content-Type: application/json" \
  -d '{
    "Records": [{
      "s3": {
        "bucket": {"name": "test"},
        "object": {"key": "finance/test-ifrs-report.pdf"}
      }
    }]
  }'
```

Test documents:
- Finance: IFRS report, balance sheet
- Legal: Contract, court decision
- BTP: DTU spec, building permit
- Industry: SOP manual, ISO procedure

### 4. Validate Metadata in Pinecone

```python
import pinecone

index = pinecone.Index("sota-rag-jina-1024")

results = index.query(
    vector=[0.1] * 1024,
    top_k=1,
    include_metadata=True
)

metadata = results['matches'][0]['metadata']

# Verify V4 fields
assert 'sector' in metadata  # NEW
assert 'language' in metadata  # NEW
assert 'doc_type' in metadata  # NEW
assert 'semantic_tags' in metadata  # NEW
assert 'entities' in metadata  # NEW
assert 'ner_version' in metadata  # NEW
assert 'bm25_version' in metadata  # NEW

print("✅ V4.0 metadata validated")
```

## Expected Improvements

| Improvement | Expected Gain | Reference |
|-------------|---------------|-----------|
| Late Chunking | +5-8% | arXiv:2409.04701 |
| Sector Router | +8-12% | DeepRead arXiv:2602.05014 |
| CompactRAG QA | +10% | RAG-Studio ACL EMNLP 2024 |
| Enhanced Metadata | +5-10% | General best practice |
| French NER | +10-15% | Entity-aware retrieval |
| BM25 French | +8-12% | Hybrid retrieval |

**Combined (optimistic):** +12-18% on Phase 2 benchmarks (1,000 questions).

## Rollback

If V4.0 causes issues, restore V3.1 from backup:

```bash
cp /home/termius/mon-ipad/n8n/validated/ingestion-v3.1-backup.json \
   /home/termius/mon-ipad/n8n/live/ingestion.json

# Import to n8n HF Space
# (same import process as above)
```

## Technical Details

### A. Late Chunking

**Modified node:** `Generate Embeddings V3.1 (Contextual)` → `V4.0 (Late Chunking)`

**Changes:**
```json
{
  "model": "jina-embeddings-v3",
  "input": [...],
  "late_chunking": true,        // NEW
  "task": "retrieval.passage",  // NEW
  "dimensions": 1024
}
```

**How it works:**
1. Jina v3 encodes entire document at token level
2. Chunks AFTER encoding (preserves cross-chunk context)
3. Improves embeddings by ~5-8% on long documents

### B. Sector-Aware Router

**New node:** `Sector-Aware Router V4` (Code node, 150 lines)

**Detects sector:**
- BTP: DTU, CCTP, PLU, RE2020, RT2012
- Finance: IFRS, Bale, COREP, MiFID, AMF
- Legal: Article, Loi, Décret, Cour, RGPD
- Industry: ISO, AMDEC, FDS, HACCP, SOP

**Sets chunking strategy:**
```javascript
{
  finance: { chunk_size: 256, preserve_tables: true },
  legal: { chunk_size: 700, preserve_structure: true },
  btp: { chunk_size: 1024, group_by: 'building_codes' },
  industry: { chunk_size: 512, preserve_hierarchy: true },
  general: { chunk_size: 500 }
}
```

### C. CompactRAG QA Pairs

**Modified node:** `Q&A Enricher` → `V4.0 (CompactRAG)`

**Changes:**
- Finance/Industry: 3→5 atomic QA pairs per chunk
- Includes numerical reasoning questions for tables
- Stores with `doc_type: "compact_qa"` metadata

### D. Enhanced Metadata

**Modified node:** `Chunk Validator & Enricher V4`

**Added functions:**
```javascript
detectSector(content, filename)     // BTP|Finance|Legal|Industry|General
detectLanguage(content)             // fr|en
classifyDocType(filename, content)  // contract|regulation|report|...
extractSemanticTags(content, sector) // Top 5 keywords
```

**New metadata fields:**
```json
{
  "sector": "finance",
  "language": "fr",
  "doc_type": "financial_report",
  "semantic_tags": ["bilan", "resultat", "tresorerie", "actif", "passif"],
  "metadata_version": "v4.0"
}
```

### E. French NER Extractor

**New node:** `French NER Extractor V4` (Code node, 120 lines)

**Regex patterns:**
- Legal entities: `Cour de cassation|Conseil d'État|CNIL|AMF|ACPR`
- Companies: `[Name] SA|SAS|SARL|SCA|SCM|EURL|SCI`
- Organizations: `Ministère|Direction|Agence de [Name]`
- Locations: Paris, Lyon, Marseille, Toulouse, etc.
- Dates: `1er janvier 2026`
- Amounts: `1 234,56 €`
- Persons: `M.|Mme|Dr.|Professeur [Name]`

**Output:**
```json
{
  "entities": {
    "persons": ["Jean Dupont"],
    "organizations": ["BNP Paribas SA", "Ministère de l'Économie"],
    "legal_entities": ["Cour de cassation", "CNIL"],
    "locations": ["Paris", "Lyon"],
    "dates": ["1er janvier 2026"],
    "amounts": ["1 234,56 €"]
  },
  "entity_count": 12,
  "has_entities": true,
  "ner_version": "v4.0"
}
```

### F. BM25 French Improvements

**Modified/Created node:** `BM25 Sparse Vector Generator V4`

**French stop words (48):**
```javascript
['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
 'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', ...]
```

**Sector term weighting:**
- Legal terms in juridique sector: **×1.5 boost**
- Finance terms in finance sector: **×1.5 boost**

**Tokenization:**
- Handles French contractions: `l'article` → `l article`
- Preserves accents: `éèêàç`
- Respects compound words

**Output:** Top 100 terms per chunk (sparse vector for hybrid retrieval).

## Documentation

Full details in:
- `/home/termius/mon-ipad/docs/ingestion-v4-upgrade-summary.md`

## Support

Issues or questions:
1. Check `docs/ingestion-v4-upgrade-summary.md`
2. Review `technicals/project/rag-research-2026.md` (research papers)
3. Consult `technicals/debug/fixes-library.md` (common issues)

---

**Last updated:** 2026-02-20T22:10:00+01:00
