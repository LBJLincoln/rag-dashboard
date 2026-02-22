# Session State — 22 Fevrier 2026 (Session 40)

> Last updated: 2026-02-22T21:50:00+01:00

## Objectif de session : Fix staleness, add bottleneck/low-fruit rules, update all docs, plan self-healing agent

### CRITICAL — Running processes (nohup, survive session)
| Process | PID | Target | Status |
|---------|-----|--------|--------|
| **v13 Standard** | ~~1552227~~ | HF Space | KILLED — HF Space rebuilt, all webhooks 404, was running LOCAL fallback (116/537, 45 successes) |
| **Auto-push** | 1534406 | GitHub API | Every 20 min → origin + rag-dashboard |
| **CS data-ingestion downloads** | 23438 (remote) | Codespace | 3/5 downloaded (squad_v2 5.3MB, triviaqa 633MB, hotpotqa 31.5MB) + keep-alive |

### Phase 2 Cumulative Results
| Pipeline | Tested | Total | Accuracy | Status |
|----------|--------|-------|----------|--------|
| Standard | 463+116 | 1000 | ~36% (HF Space) / ~39% (LOCAL fallback) | STOPPED — HF Space webhooks dead after rebuild |
| Graph | 500 | 500 | 78.0% | COMPLETE |
| Quantitative | 500 | 500 | 92.0% | COMPLETE |
| Orchestrator | 57 | 1000 | 0% (Phase 2) | BROKEN — 404 "Not Found" on every question |
| **PME Gateway** | 0 | — | — | NOT ACTIVATED — HF rebuild didn't activate PME workflows (404) |
| **PME Action Exec** | 0 | — | — | NOT ACTIVATED — needs Google OAuth2 credentials |
| **Data-Ingestion** | 3/5 DL | — | — | squad_v2+triviaqa+hotpotqa downloaded (669MB total) |

### CRITICAL ISSUE: HF Space Wipeout
- **What happened**: HF Space rebuild (triggered by PME workflow push) wiped n8n database → ALL workflow activations lost → ALL webhooks return 404
- **Data lost**: ZERO — all test results are on VM (`docs/tested_ids.json`, `logs/pipeline-results/`)
- **What was lost**: n8n runtime state (workflow activations, credentials, execution history) — reconstructible from git
- **Root cause**: entrypoint.sh activation step failing silently after workflow import
- **Prevention needed**: Add retry logic + verification step in entrypoint.sh, or use persistent storage

### Accomplishments this session (Session 39)

#### 1. Diagnosed all 4 pipeline deaths from Session 38
- All PIDs (1453884, 1533993, 1533994, 1533995) confirmed DEAD
- Root causes: git index.lock conflicts (parallel --push), HF Space overload, Orchestrator timeouts
- Graph and Quant were already 100% tested (SKIPPED)

#### 2. HF Space restarted and verified (then broke again)
- Space was unresponsive → Restarted → Standard webhook worked briefly (~60-90s latency)
- Orchestrator confirmed broken (execution errors)
- Second restart (for PME import) broke everything — all webhooks 404

#### 3. Standard pipeline ran v13 (116/537)
- Started at batch-size 3, early-stop 15
- Got 45 successes before HF Space died, continued on LOCAL fallback
- Killed after HF wipeout confirmed

#### 4. PME workflows imported to HF Space git repo
- 3 workflows pushed (multi-canal-gateway, action-executor, whatsapp-telegram-bridge)
- Credential IDs fixed (OPENROUTER_HEADER_AUTH → LLM_API_CREDENTIAL_ID)
- But: NOT ACTIVATED after rebuild — 404 on all PME webhooks

#### 5. Data-ingestion started
- `datasets` library installed on codespace, 3/5 datasets downloaded (669MB)
- Missing: musique + finqa (deprecated loading script)

#### 6. Repo independence investigation
- pme-connectors: Just a Next.js website, dead mon-ipad code copies, needs own PME test infra
- data-ingestion: Was a keep-alive zombie, now downloading datasets
- Google API key available: AIzaSyBWN3... (can power PME Google connectors)

### Blockers (Session 40 MUST FIX)
1. **HF Space ALL WEBHOOKS 404** — entrypoint.sh activation broken. NO pipelines can run until fixed.
2. **Orchestrator 0% Phase 2** — returns empty/404 on every question. Workflow-level bug.
3. **PME not activated** — workflows imported but never activated on HF Space
4. **PME credentials missing** — Google Calendar, Gmail, Drive (key exists: AIzaSyBWN3...), Telegram, WhatsApp OAuth2
5. **GitHub CI not testing PME** — should use GitHub Actions as quality gate for workflow validity
6. **HF Space wipeout prevention** — need persistent storage or robust activation retry
7. **Standard accuracy low** — ~36% on Phase 2 (vs 85.5% Phase 1). LLM or retrieval degradation.

### Key decisions
1. Graph + Quant are DONE for Phase 2 (500/500 each) — no more to test
2. Standard was sole running RAG pipeline — now stopped
3. PME workflows go on HF Space (same n8n instance)
4. "Independent repos" = own test scripts + own codespace + own result tracking
5. GOOGLE_API_KEY exists in .env.local — use for PME connectors
6. GitHub Actions should validate PME workflows before HF deployment

### Prochaines actions (Session 40) — PRIORITY ORDER
1. **FIX HF SPACE ACTIVATION** — #0 priority. ALL webhooks 404. Debug entrypoint.sh, add retry + verify step. Nothing works until this is fixed.
2. **FIX ORCHESTRATOR** — #1 priority. Returns 0% on Phase 2. Debug intent classifier + sub-pipeline routing.
3. **RELAUNCH STANDARD** — batch-size 5, on fixed HF Space
4. **ACTIVATE PME WORKFLOWS** — configure Google API key as credential, test gateway
5. **GitHub CI for PME** — add workflow validation in GitHub Actions (pme-connectors repo)
6. **Complete data-ingestion downloads** — musique + finqa replacement
7. **Set up actual ingestion pipeline** — chunk → embed → Pinecone/Neo4j/Supabase
8. **Prevent future wipeouts** — persistent volume or robust entrypoint with verification
9. **Clean up repos** — remove dead mon-ipad code from pme-connectors + data-ingestion
10. **Increase Standard batch to 5+** for faster throughput

---

### OPTIMAL PROMPT FOR SESSION 40 — COPY-PASTE THIS TO START

```
Session 40. Read CLAUDE.md first, then read these 36 files before doing ANYTHING:

FILES TO READ (mandatory, in order):
1. directives/session-state.md (THIS — blockers, running processes, next actions)
2. directives/status.md (session 39 summary)
3. docs/status.json (live metrics)
4. docs/data.json (dashboard data, all iterations)
5. docs/tested_ids.json (dedup: Standard 463, Graph 500, Quant 500, Orch 57 = 1520)
6. docs/document-index.md (master file index)
7. docs/executive-summary.md (project overview)
8. technicals/debug/knowledge-base.md (PERSISTENT BRAIN — patterns, solutions, APIs)
9. technicals/debug/fixes-library.md (24+ documented fixes)
10. technicals/debug/diagnostic-flowchart.md (debug decision tree)
11. technicals/infra/architecture.md (4 RAG + 3 PME + ingestion workflows)
12. technicals/infra/stack.md (full tech stack)
13. technicals/infra/credentials.md (service credentials — GOOGLE_API_KEY exists)
14. technicals/infra/env-vars-exhaustive.md (33 env vars)
15. technicals/infra/infrastructure-plan.md (distributed infra)
16. technicals/project/team-agentic-process.md (multi-agent process)
17. technicals/project/phases-overview.md (5 phases and gates)
18. technicals/project/improvements-roadmap.md (50+ improvements)
19. technicals/data/sector-datasets.md (1000 doc types, 4 sectors)
20. directives/objective.md (final objective)
21. directives/workflow-process.md (iteration loop)
22. directives/n8n-endpoints.md (webhook paths)
23. directives/dataset-rationale.md (14 benchmarks)
24. directives/research-methodology.md (SOTA research)
25. directives/repos/rag-tests.md
26. directives/repos/rag-website.md
27. directives/repos/rag-dashboard.md
28. directives/repos/rag-data-ingestion.md
29. eval/run-eval-parallel.py (main eval script)
30. eval/quick-test.py (quick pipeline test)
31. scripts/auto-push.sh (auto-commit, PID 1534406 may still run)
32. scripts/migrate-to-hf-spaces.sh (HF Space entrypoint — BROKEN, needs fix)
33. scripts/ci_full_setup.py (CI workflow activation logic — reference for fix)
34. scripts/ci_activate_workflows.py (workflow activation)
35. n8n/pme-connectors/ (3 PME workflow JSONs)
36. /tmp/phase2-v13-standard.log + /tmp/phase2-v13-orch.log (last run logs)

30 RULES & COMMANDS (follow ALL):
1. source .env.local before ANY Python script
2. Read session-state.md FIRST at session start
3. Read knowledge-base.md Section 0 before webhook tests
4. ONE fix per iteration, never multiple nodes
5. 5/5 minimum before sync
6. Tests SEQUENTIAL per pipeline (never parallel — 503)
7. ZERO credentials in git — pre-push: git diff --cached | grep -iE 'sk-or-|pcsk_|jV_zGdx|sbp_|hf_'
8. Commit + push after each fix (origin + all satellites)
9. Update session-state.md after each milestone
10. Update fixes-library.md after each fix
11. Update knowledge-base.md DURING session (not end)
12. Push every 15-20 min minimum
13. VM = pilotage ONLY, ZERO workflow modification on VM
14. Tests on HF Space (16GB) or Codespaces (8GB), NEVER on VM
15. 3 consecutive failures → AUTO-STOP that pipeline
16. Background testing (nohup) for passing pipelines
17. Focus on bottlenecks first, not what works
18. Session max 2h — at 1h45 finalize + push
19. Kill old Claude processes at session start: ps aux | grep claude
20. Pre-vol checklist before webhook tests
21. Compare with snapshot/good/ references
22. python3 eval/generate_status.py after tests
23. python3 n8n/sync.py after workflow fixes
24. bash scripts/check-staleness.sh for stale files
25. Codespaces = ephemeral — PUSH before shutdown
26. scripts/codespace-control.sh for remote CS management
27. Delegation: Opus analyzes/decides, Sonnet executes, Haiku explores
28. Run sub-agents in parallel for independent tasks
29. git config user.email = alexis.moret6@outlook.fr
30. Update directives/status.md as LAST action of session

CRITICAL BLOCKER — FIX FIRST:
HF Space ALL WEBHOOKS 404. Entrypoint.sh activation broken after rebuild.
NO pipeline can run until this is fixed. Reference: scripts/ci_full_setup.py
has the correct activation logic (cookie auth + REST API activate).

AUTONOMOUS EXECUTION REQUIREMENT:
All pipelines MUST run autonomously WITHOUT Claude Code intervention.
Each pipeline = nohup background process with auto-commit every 15 min.
Only stops on: (a) 3 consecutive failures auto-stop, (b) completion, (c) manual kill.
Minimum 8-10 workflows running simultaneously across HF Space + Codespaces.

TARGET PARALLEL ARCHITECTURE:
┌─ HF Space (16GB) ──────────────────────────────────────────┐
│ Standard RAG    — batch-size 5, parallel questions          │
│ Graph RAG       — DONE 500/500 (skip unless re-eval)       │
│ Quantitative    — DONE 500/500 (skip unless re-eval)       │
│ Orchestrator    — FIX FIRST then batch-size 5              │
│ PME Gateway     — activate + test (Google API key ready)   │
│ PME Action Exec — activate + configure Google OAuth2       │
│ PME WA/TG Bridge— activate + configure Telegram/WA creds  │
└────────────────────────────────────────────────────────────┘
┌─ Codespace: rag-data-ingestion (8GB) ─────────────────────┐
│ Dataset downloads — fix configs (hotpotqa='distractor',    │
│   trivia_qa='rc', skip natural_questions=gated)            │
│ Ingestion pipeline — chunk → embed → Pinecone/Neo4j/Supa  │
│   Target: 1000 doc types, 4 sectors, scale to 1M docs     │
└────────────────────────────────────────────────────────────┘
┌─ Codespace: rag-pme-connectors (8GB) ─────────────────────┐
│ PME test suite — independent from rag-tests                │
│ GitHub Actions CI — validate workflow JSONs before deploy  │
│ Google API integration tests (Calendar, Gmail, Drive)      │
└────────────────────────────────────────────────────────────┘

LAUNCH SEQUENCE (do in order):
1. Fix HF Space entrypoint activation (debug why workflows not activating)
2. Verify all 7 HF webhooks respond (Standard, Graph, Quant, Orch, PME x3)
3. Launch Standard (batch-size 5, early-stop 15, nohup, auto-commit)
4. Launch Orchestrator (batch-size 3, early-stop 10, nohup) — IF fixed
5. Launch PME Gateway tests (nohup) — IF activated
6. Start data-ingestion codespace, fix download configs, launch ingestion
7. Start pme-connectors codespace, set up independent test suite + CI
8. All pipelines running in parallel, each with internal parallel batches
9. Monitor via auto-push (every 15 min) + codespace-control.sh

EACH PIPELINE RUNS LIKE THIS (template):
source .env.local && N8N_HOST="https://lbjlincoln-nomos-rag-engine.hf.space" \
nohup python3 eval/run-eval-parallel.py \
  --dataset phase-2 --types <pipeline> \
  --batch-size 5 --early-stop 15 \
  --label "v14-<pipeline>-phase2" \
  > /tmp/phase2-v14-<pipeline>.log 2>&1 &
echo $! > /tmp/phase2-v14-<pipeline>.pid

AUTO-COMMIT (must be running):
nohup bash scripts/auto-push.sh 15 > /tmp/auto-push.log 2>&1 &

REPORT FORMAT (every 30 min):
| Pipeline | Tested/Total | Accuracy | Batch | Status |
| Standard | X/1000       | X%       | 5     | running/stopped |
| Orch     | X/1000       | X%       | 3     | running/fixed/broken |
| PME GW   | X/—          | —        | 1     | active/404 |
| Ingestion| X docs       | —        | —     | downloading/ingesting |
```
