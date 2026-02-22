# Database Scripts & Migrations

> Last updated: 2026-02-22

This directory contains database setup, migration, and population scripts for the Multi-RAG project.

## Directory Structure

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `migrations/` | SQL schema definitions | Tables for documents, financials, community summaries |
| `populate/` | Data ingestion scripts | Python scripts to populate Pinecone, Neo4j, Supabase |
| `readiness/` | Phase gate validation | JSON files checking data readiness for each phase |

## Key Files

### Root
- **analyze_db.py** — Supabase database analysis tool. Shows tables, schemas, row counts.

### migrations/
- **supabase-core.sql** — Core tables (documents, chunks, metadata)
- **financial-tables.sql** — Phase 1 financial data tables
- **phase2-financial-tables.sql** — Phase 2 extended financial tables
- **community-summaries.sql** — Graph RAG community summary table
- **create-documents-table.sql** — Basic documents table DDL

### populate/
- **all.py** — Master ingestion script (runs all populators)
- **pinecone.py** — Populate Pinecone vector indexes
- **neo4j.py** — Populate Neo4j graph database (Phase 1)
- **phase2_neo4j.py** — Extended Neo4j ingestion (Phase 2)
- **phase2_supabase.py** — Phase 2 Supabase tables
- **phase2_ingest_all.py** — Master Phase 2 ingestion
- **setup_embeddings.py** — Generate embeddings for documents
- **migrate_to_jina.py** — Re-embed all docs with Jina embeddings
- **migrate_to_cohere.py** — Re-embed with Cohere (backup)
- **push-datasets.py** — Upload datasets to Pinecone/Neo4j/Supabase

### readiness/
- **phase-1.json** — Phase 1 data requirements checklist
- **phase-2.json** — Phase 2 data requirements checklist
- **phase-2-verification.json** — Actual Phase 2 data verification results
- **phase-2-analysis-report.md** — Detailed Phase 2 readiness analysis
- **phase-3/4/5.json** — Future phase requirements

## Current State (2026-02-22)

| Database | Records | Status |
|----------|---------|--------|
| Pinecone (sota-rag-jina-1024) | 10,411 vectors | Phase 1 complete |
| Pinecone (sota-rag-phase2-graph) | 1,296 vectors | Phase 2 partial |
| Neo4j Aura | 19,788 nodes / 76,717 rels | Phase 1 complete |
| Supabase | 40 tables, ~17K rows | Phase 1 complete |

## Common Tasks

```bash
# Analyze Supabase schema
SUPABASE_PASSWORD=xxx python3 db/analyze_db.py

# Populate all Phase 1 databases
cd db/populate
python3 all.py

# Populate Phase 2 databases
python3 phase2_ingest_all.py

# Migrate to Jina embeddings
python3 migrate_to_jina.py

# Check Phase 2 readiness
cat ../readiness/phase-2-verification.json
```

## Notes

- All scripts expect credentials in environment variables (see `.env.local`)
- Migration scripts are idempotent (safe to run multiple times)
- Phase 2 ingestion requires ~16GB RAM (use HF Space or Codespace)
- Supabase pooler uses port 6543 (not 5432)
