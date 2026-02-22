# Workflow Snapshots

> Last updated: 2026-02-22

This directory stores snapshots of n8n workflow definitions and execution results for reference and rollback purposes.

## Directory Structure

| Directory | Purpose | When Updated |
|-----------|---------|--------------|
| `good/` | Known-good workflow executions | After 5/5 test pass |
| `current/` | Current active workflows | Via `python3 n8n/sync.py` |
| `workflows/` | Workflow JSON exports | After successful tests |
| `db/` | Database state snapshots | Manual snapshots |
| `pre-jina-migration/` | Pre-Jina embedding migration backup | Feb 16, 2026 |

## Snapshot Types

### good/ — Reference Executions
Contains execution JSON from confirmed working tests (5/5 pass minimum).

Current contents (as of 2026-02-22):
- **execution_19305.json** — Standard pipeline reference (669KB)
- **execution_19323.json** — Graph pipeline reference
- **execution_19326.json** — Quantitative pipeline reference
- **execution_19404.json** — Orchestrator pipeline reference
- **standard-final.json** — Standard pipeline validated workflow
- **graph-final.json** — Graph pipeline validated workflow (missing)
- **quantitative-final.json** — Quantitative pipeline validated workflow
- **orchestrator-final.json** — Orchestrator pipeline validated workflow

### current/ — Active Workflows
Current n8n workflow definitions synced from VM n8n instance.

Current contents:
- **standard.json** — Standard RAG V3.4 (91KB)
- **graph.json** — Graph RAG V3.3 (100KB)
- **quantitative.json** — Quantitative V2.0 (99KB, updated 2026-02-21)
- **orchestrator.json** — Orchestrator V10.1 (570KB)

### workflows/ — Export Archive
Full n8n workflow exports with all nodes, credentials references, and settings.

### db/ — Database Snapshots
Periodic PostgreSQL dumps of n8n's internal database (execution history, credentials, settings).

### pre-jina-migration/ — Historical Backup
Complete backup before migrating from Cohere to Jina embeddings (Feb 16, 2026).

## Usage

### Compare Current vs Good
```bash
# Check if workflows have changed
diff snapshot/good/standard-final.json snapshot/current/standard.json

# See what changed
python3 scripts/diff-workflows.py snapshot/good/standard-final.json snapshot/current/standard.json
```

### Rollback to Good State
```bash
# 1. Copy good workflow to n8n/workflows/live/
cp snapshot/good/standard-final.json n8n/workflows/live/standard.json

# 2. Import to n8n via API
python3 n8n/import.py --workflow standard

# 3. Test
source .env.local
python3 eval/quick-test.py --pipeline standard --questions 5
```

### Create New Snapshot After Fix
```bash
# 1. Test passes 5/5
python3 eval/quick-test.py --pipeline quantitative --questions 5

# 2. Sync from n8n to current/
python3 n8n/sync.py

# 3. Copy to good/ (after validation)
cp snapshot/current/quantitative.json snapshot/good/quantitative-final.json

# 4. Get execution JSON
python3 scripts/fetch-execution.py --execution-id <ID> --output snapshot/good/execution_<ID>.json
```

## Anti-Regression Protocol

Before any workflow modification:

1. **Baseline**: Ensure current snapshot exists in `good/`
2. **Modify**: Make changes via n8n UI or API
3. **Test**: Run quick-test 5/5 minimum
4. **Compare**: `diff snapshot/good/ snapshot/current/`
5. **Validate**: If accuracy drops, REVERT from `good/`
6. **Archive**: If test passes, update `good/` snapshot

## Snapshot Retention

- `good/` — Keep indefinitely (reference)
- `current/` — Overwritten on each sync
- `workflows/` — Keep last 10 exports
- `db/` — Keep weekly snapshots for 1 month
- Historical dirs (pre-jina-migration) — Keep until Phase 2 complete

## Current State Summary

| Pipeline | good/ Snapshot | current/ State | Match |
|----------|----------------|----------------|-------|
| Standard | execution_19305 (669KB) | standard.json (91KB) | ✓ |
| Graph | execution_19323 (71KB) | graph.json (100KB) | ✓ |
| Quantitative | execution_19326 (63KB) | quantitative.json (99KB, 2026-02-21) | Updated |
| Orchestrator | execution_19404 (150KB) | orchestrator.json (570KB) | ✓ |

**Note**: Quantitative pipeline updated on 2026-02-21 (session 37) — new snapshot needed after Phase 2 v11 completes.
