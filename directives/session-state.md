# Session State — 22 Fevrier 2026 (Session 37)

> Last updated: 2026-02-22T11:25:00+01:00

## Objectif de session : Batch parallelization, fix dashboard, run all repos, create limits doc

### Accompli cette session

#### 1. v10 COMPLETED overnight (1263 questions)
- Graph: **64.0%** (256/400) — PASS target 60% (+21.4pp from v8)
- Standard: 55.6% (202/363) — early-stopped
- Quantitative: 52.4% (262/500)
- Overall: 57.0%

#### 2. v11 RUNNING (continues from v10 dedup)
- **PID 1453884** — running on VM via HF Space + local LLM
- All 4 pipelines (standard, graph, quantitative, orchestrator)
- `--batch-size 5` (E5 parallelization active)
- `--local-pipelines graph,quantitative` (local LLM for these)
- `--early-stop 15` + `--push`
- Standard at 300/537 at session end — Graph+Quant SKIPPED (already done in v10)
- Orchestrator: waiting (runs after other pipelines)
- **WILL CONTINUE AFTER SESSION ENDS** (nohup)

#### 3. rag-tests Codespace eval RUNNING
- Codespace `nomos-rag-tests-5g6g5q9vjjwjf5g4`
- Standard+Orchestrator, batch=3, 400+ questions done
- **MAY TIMEOUT** — codespace idle timeout could kill it

#### 4. Limits/quotas document CREATED
- `technicals/infra/limits-quotas.md` — 22KB comprehensive
- All services: VM, Codespaces, n8n, OpenRouter, Pinecone, Neo4j, Supabase, Jina, etc.
- TODO: Add to CLAUDE.md mandatory reads (rule 36)

#### 5. Dashboard fix ATTEMPTED but INCOMPLETE
- ROOT CAUSE: dashboard fetches from `raw.githubusercontent.com` → 404 (private repo)
- FIX: Updated index.html in rag-dashboard to use `/docs/status.json` (local)
- Pushed status.json + data.json to rag-dashboard repo
- PROBLEM: Vercel auto-deploy not triggering — token (`vck_...`) invalid for CLI
- GitHub Actions deploy also fails (VERCEL_TOKEN secret set but format wrong)
- **NEXT SESSION**: Need valid Vercel deploy token, or manually redeploy from Vercel dashboard

#### 6. n8n VM recovered
- Was stuck in DB timeout loop (RAM pressure)
- Restarted successfully — all workflows activated
- Still flapping under load (969MB VM too small for n8n + Claude Code)
- Killed 2 old Claude Code sessions (freed ~70MB)

#### 7. Codespaces managed
- rag-tests: Running (eval active)
- pme-connectors (`didactic-invention-wr6rx74vpppw276r`): Created, build passed, currently idle
- data-ingestion: Shutdown (only 2 concurrent codespaces allowed on free tier)
- rag-website: DELETED (freed slot for pme-connectors)

### Commits this session
| Hash | Description |
|------|-------------|
| c3401dc | feat: add --batch-size CLI arg (E5 improvement) |
| d8cfbbc | eval: Phase2 v10 complete — 1263q, 57.0% overall |
| 4a81e8b | update: v10 results + v11 in progress |

### Running processes (will survive session end)
- **v11 eval**: PID 1453884 (Phase2-v11-allpipelines-batch5, batch-size 5)
- rag-tests codespace: eval running (may timeout)

### Key bottlenecks identified
1. **Dashboard**: Vercel deploy broken — need valid token or manual deploy
2. **VM RAM**: 969MB total — n8n + Claude Code barely fit, DB timeouts frequent
3. **Codespace limit**: Only 2 concurrent on free tier (can't run all 3 repos at once)
4. **Standard accuracy**: ~55% at 300q — many NO_MATCH in later questions

### Prochaines actions (Session 38)
1. **FIX DASHBOARD** — Get valid Vercel token or redeploy manually
2. Analyze v11 results (should be complete by then)
3. Run orchestrator (1000 questions) if v11 didn't complete it
4. Investigate Standard pipeline NO_MATCH pattern at questions 500+
5. Add limits-quotas.md to CLAUDE.md mandatory reads
6. Start data-ingestion runs (need to swap codespace slots)
7. Create auto-sync script to push status.json to rag-dashboard on every auto-commit
