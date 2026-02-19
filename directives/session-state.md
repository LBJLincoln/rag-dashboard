# Session State — 19 Fevrier 2026 (Session 27 suite)

> Last updated: 2026-02-20T00:30:00+01:00

## Objectif de session : Phase 2 pour TOUS les pipelines (bottleneck strategy)

### Etat des 4 pipelines (derniere mise a jour)

| Pipeline | HF Space Status | Bottleneck restant | Fix applique | Status |
|----------|----------------|-------------------|--------------|--------|
| **Standard** | **200 OK** (9-29s) | AUCUN | — | **PASS** |
| **Graph** | **200 OK** (18-44s) | AUCUN | — | **PASS** |
| **Quantitative** | **200 OK** (3-6s) | OpenRouter 429 rate limit | FIX-33+35 infra OK | **PARTIAL** (LLM rate limited) |
| **Orchestrator** | **200 OK** (14-35s) | Degrades under concurrent load | FIX-34 httpRequest | **PASS** (sequential) |

### MILESTONE — 3/4 pipelines fonctionnels, 1/4 rate limited (pas infra)
- Standard, Graph, Orchestrator: fonctionnels, reponses correctes
- Quantitative: infra OK (12 noeuds executent), OpenRouter 429 rate limit (quota)
- FIX-35b: URL OpenRouter corrigee, FIX-33: $env remplaces

### CONCURRENCY TESTING (session 27 suite)

| Config | Pipelines | Concurrency | Standard | Graph | Orchestrator |
|--------|-----------|-------------|----------|-------|--------------|
| Baseline | 3 | 1 | 100% (9s) | 100% (18s) | 100% (14s) |
| Moderate | 3 | 3 | 100% (23s) | 90% (26s) | 70% (35s) |
| Stress | 3 | 5 | 100% (29s) | 90% (44s) | 0% AUTO-STOP |

Key: Standard rock solid at any load. Orchestrator must run sequential.

### DOCUMENTATION CREATED (session 27 suite)
- `technicals/debug/diagnostic-flowchart.md` — 6 decision trees for recurring problems
- `technicals/debug/knowledge-base.md` Section 7.4 — Concurrent load testing results
- `technicals/infra/architecture.md` — Updated HF Space state (3/4 pipelines working)
- `technicals/infra/llm-models-and-fallbacks.md` — LLM models registry + fallback architecture
- `docs/document-index.md` — INDEX document: topic → source file(s) mapping
- `eval/parallel-pipeline-test.py` v2 — concurrent questions support (--concurrency flag)
- Restructure `technicals/` into 4 subdirectories: `debug/`, `infra/`, `project/`, `data/` (17 files moved)
- Updated `docs/executive-summary.md` with session 27 results

### Fixes session 27

| Fix | Description | Commits HF |
|-----|-------------|------------|
| FIX-29 | Quant postgres->REST API, Orch bitwiseHash, 16 env vars, JWT key | 68d113a, 5cab714 |
| FIX-30 | PostgreSQL local pour Orchestrator, HTTP v4.3, continueOnFail | 508f594, 918deaa, 11884c6, 8225c6d |
| FIX-31 | Live diagnostic server (diag-server.py) + improved error tracking | 783230d, fc72dba |
| FIX-32 | Quant $env Code nodes + Standard sub-workflow return | 810772e, 94949b2 |
| FIX-33 | $env replace ALL refs at import time (n8n 2.8 blocks ALL) | 90fe71e, 72fb888 |
| FIX-34 | Orchestrator: executeWorkflow -> httpRequest (sub-wf return vide) | 618fc09 |
| FIX-35 | Quantitative: OPENROUTER_BASE_URL manquait /chat/completions | 7d378d9, 31e684b |

### Commits session 27

| Hash | Repo | Description |
|------|------|-------------|
| 01eb2d2 | mon-ipad | feat(session-27): FIX-29 script + bottleneck strategy started |
| 2b039b6 | mon-ipad | fix(session-27): FIX-29 complete — fixes-library + session-state |
| 0dfba3a | mon-ipad | docs: session-state update (FIX-31, FIX-32) |
| c37f706 | mon-ipad | docs: fixes-library FIX-30/31/32 + anti-patterns |
| 22de3f7 | mon-ipad | docs: FIX-33 documentation |
| 3d10e2e | mon-ipad | docs: FIX-33/34 session-state + fixes-library |
| 4723d01 | mon-ipad | docs: FIX-34/35 fixes-library + session-state |
| 9b21b96 | mon-ipad | feat: parallel-pipeline-test.py v1 |
| 5b1c29e | mon-ipad | docs: diagnostic-flowchart + architecture update |
| a45189d | mon-ipad | feat: parallel-pipeline-test.py v2 (concurrent questions) |
| 68d113a | HF Space | fix(FIX-29): Quant REST API + Orch error handler + missing env vars |
| 5cab714 | HF Space | fix(FIX-29b): Orch activeVersion + Init V8 error handling |
| 91b3843 | HF Space | diag(FIX-29c): diagnostic tests in entrypoint |
| 508f594 | HF Space | fix(FIX-30): local PostgreSQL + Quant HTTP v4.3 |
| 918deaa | HF Space | fix(FIX-30b): PostgreSQL path fix + Quant format adaptation |
| 11884c6 | HF Space | fix(FIX-30c): PostgreSQL minimal resources |
| 8225c6d | HF Space | diag(FIX-29d): detailed execution error tracking |
| 783230d | HF Space | fix(FIX-31): live diagnostic server + improved error tracking |
| fc72dba | HF Space | fix(FIX-31b): diag-server list handling + /raw endpoint |
| 810772e | HF Space | fix(FIX-32): Quant $env fix + Standard sub-wf return |
| 94949b2 | HF Space | fix(FIX-32b): patch activeVersion — Quant $env + Standard sub-wf |
| 90fe71e | HF Space | fix(FIX-33): replace ALL $env refs at import time |
| 72fb888 | HF Space | fix(FIX-33b): standalone fix-env-refs.py script |
| 618fc09 | HF Space | feat(FIX-34): executeWorkflow -> httpRequest for sub-wf calls |
| 7d378d9 | HF Space | fix(FIX-35): OPENROUTER_BASE_URL /chat/completions |
| 31e684b | HF Space | fix(FIX-35b): bash case statements for URL fix |

### Commits session 27 (continuation — mon-ipad)

| Hash | Description |
|------|-------------|
| c125b34 | feat(session-26): FIX-28 env vars + secrets HF Space + bottleneck strategy |
| 60d33bc | docs(session-26): executive summary — comprehensive project reference document |
| 8f37f25 | docs(session-26): Phase 2 readiness document + status updates |
| e031df3 | feat(session-26): team-agentic multi-model strategy + Graph 10/10 PASS |
| 5b1c29e | docs: diagnostic-flowchart + architecture update |
| a45189d | feat: parallel-pipeline-test.py v2 (concurrent questions) |
| e6c3e1d | refactor: restructure technicals/ into 4 subdirectories |
| 7491a57 | feat: LLM models & fallbacks reference document |
| (pending) | docs: document-index + executive-summary update + session-state |

### Prochaines actions (session 28)
1. ✅ **DONE** — HF Space env vars updated (LLM_SQL_MODEL, LLM_SQL_FALLBACK_MODEL)
2. ❌ **BLOCKED** — SQL generation failing on BOTH VM + HF Space (workflow bug, not model issue)
3. **TODO** — Debug Quantitative workflow SQL generation node (check OpenRouter API call)
4. **TODO** — Fix workflow logic, then test with new models
5. **TODO** — Valider Phase 1 gates (4/4 pipelines + 3 iterations stables)

### Session 28 Progress (2026-02-19)

**Task**: Fix Quantitative 429 rate limit by switching from Llama 70B to Qwen 2.5 Coder 32B

**Actions completed**:
1. ✅ Created HF API scripts: update-hf-space-vars.py, delete-hf-space-secrets.py, restart-hf-space.py, check-hf-space-status-v2.py
2. ✅ Updated HF Space variables via API:
   - `LLM_SQL_MODEL=qwen/qwen-2.5-coder-32b-instruct:free`
   - `LLM_SQL_FALLBACK_MODEL=deepseek/deepseek-chat-v3-0324:free`
3. ✅ Verified HF Space RUNNING with variables set
4. ✅ Tested Quantitative pipeline: **NO MORE 429 errors** (rate limit fixed!)
5. ❌ **NEW ISSUE**: SQL generation failing with "Query must start with SELECT" error
6. ❌ Tested on VM n8n: same failure (times out, workflow bug confirmed)

**Root cause**: The Quantitative workflow has a bug in the SQL generation logic, NOT the LLM model.
The error suggests the workflow is returning a fallback error SQL instead of calling the LLM.

**Evidence**:
- HF Space returns: `"sql_executed": "SELECT 'Query must start with SELECT' as error_message..."`
- This is the FALLBACK error SQL, not a generated query
- Happens even with direct SQL queries (bypassing LLM should work but doesn't)
- VM n8n test times out after 45s (same issue)

**Report created**: `/home/termius/mon-ipad/docs/session-26-hf-space-fix-report.md`

**Next step**: Debug the Quantitative workflow Text-to-SQL Generator node (likely OpenRouter API call is broken)

### Session 28 — Continuation (2026-02-20T00:30:00+01:00)

**CLAUDE.md updated with 3 new rules**:
- Rule 30: Agent Continuation Protocol (5q→10q→50q auto-escalation)
- Rule 31: Push regulier GitHub (15-20 min minimum)
- Rule 32: Consulter document-index au demarrage

**team-agentic-process.md updated**:
- Added Section 3b: Agent Continuation Protocol — Auto-Escalation
- Sous-agents continuent automatiquement apres succes
- Auto-stop sur 3 echecs consecutifs
- Rapport structure a Opus pour analyse

**Pipeline test results (session 28)**:
- Standard: PASS (HF Space, HTTP 200, correct answer)
- Graph: PASS (HF Space, HTTP 200, correct answer)
- Orchestrator: PASS (HF Space, HTTP 200, response generated)
- Quantitative: FAIL (SQL generation broken — workflow bug, not rate limit)

**Dashboard v2**: Deployed to rag-dashboard (commit fb11951) + mon-ipad (commit 4cb138d)

**Agent acaef70** (Quantitative fix): Running — discovered SQL generation is broken at workflow level
**Agent a0cec3b** (5q tests): Completed — timed out (HF Space responses too slow)
**Agent a6dafe4** (Pipeline tests): Completed — Standard/Graph/Orch PASS, Quant FAIL

**Commits session 28**:
| Hash | Description |
|------|-------------|
| 4cb138d | Dashboard v2 — comprehensive monitoring dashboard |
| c5f9aba | HF Space scripts + pipeline test logs + quant fix report |
| (pending) | CLAUDE.md rules 30-32 + team-agentic continuation protocol |
