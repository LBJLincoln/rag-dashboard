# Session 37 Log — 22 Fevrier 2026

> Archived: 2026-02-22T13:00:00+01:00 (by Session 38)
> Duration: ~2h estimated

## Objectif : Batch parallelization, fix dashboard, run all repos, create limits doc

## Accomplissements

### 1. v10 COMPLETED overnight (1263 questions)
- Graph: **64.0%** (256/400) — PASS target 60% (+21.4pp from v8)
- Standard: 55.6% (202/363) — early-stopped
- Quantitative: 52.4% (262/500)
- Overall: 57.0%

### 2. v11 LAUNCHED (continues from v10 dedup)
- PID 1453884 — running on VM via HF Space + local LLM
- All 4 pipelines (standard, graph, quantitative, orchestrator)
- `--batch-size 5` (E5 parallelization active)
- `--local-pipelines graph,quantitative` (local LLM for these)
- `--early-stop 15` + `--push`
- Standard at 300/537 at session end
- **WILL CONTINUE AFTER SESSION ENDS** (nohup)

### 3. rag-tests Codespace eval RUNNING
- Codespace `nomos-rag-tests-5g6g5q9vjjwjf5g4`
- Standard+Orchestrator, batch=3, 400+ questions done
- MAY TIMEOUT — codespace idle timeout could kill it

### 4. Limits/quotas document CREATED
- `technicals/infra/limits-quotas.md` — 22KB comprehensive
- All services: VM, Codespaces, n8n, OpenRouter, Pinecone, Neo4j, Supabase, Jina, etc.

### 5. Dashboard fix ATTEMPTED but INCOMPLETE
- ROOT CAUSE: dashboard fetches from `raw.githubusercontent.com` → 404 (private repo)
- FIX: Updated index.html in rag-dashboard to use `/docs/status.json` (local)
- Pushed status.json + data.json to rag-dashboard repo
- PROBLEM: Vercel auto-deploy not triggering — token invalid
- **CARRIED TO SESSION 38**

### 6. n8n VM recovered
- Was stuck in DB timeout loop (RAM pressure)
- Restarted successfully — all workflows activated

### 7. Codespaces managed
- rag-tests: Running (eval active)
- pme-connectors: Created, build passed, idle
- data-ingestion: Shutdown
- rag-website: DELETED (freed slot)

## Commits
| Hash | Description |
|------|-------------|
| c3401dc | feat: add --batch-size CLI arg (E5 improvement) |
| d8cfbbc | eval: Phase2 v10 complete — 1263q, 57.0% overall |
| 4a81e8b | update: v10 results + v11 in progress |

## Bottlenecks identified
1. Dashboard: Vercel deploy broken
2. VM RAM: 969MB total
3. Codespace limit: Only 2 concurrent on free tier
4. Standard accuracy: ~55% at 300q
