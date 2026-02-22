# Session State — 22 Fevrier 2026 (Session 39 — FINAL)

> Last updated: 2026-02-22T16:45:00+01:00

## Objectif de session : Relaunch pipelines, fix repo independence, import PME workflows, start ingestion

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

### OPTIMAL PROMPT FOR SESSION 40

> **Read these files FIRST (30+ critical files):**
>
> **Session Memory & State:**
> 1. `directives/session-state.md` — THIS FILE (running processes, blockers, next actions)
> 2. `directives/status.md` — Session summary
> 3. `docs/status.json` — Live metrics
> 4. `docs/data.json` — Dashboard data (all iterations)
> 5. `docs/tested_ids.json` — Dedup tracker (1520 IDs)
> 6. `docs/document-index.md` — Master file index
> 7. `docs/executive-summary.md` — Project overview
>
> **Technical References:**
> 8. `technicals/debug/knowledge-base.md` — PERSISTENT BRAIN (patterns, solutions, APIs)
> 9. `technicals/debug/fixes-library.md` — 24+ documented fixes
> 10. `technicals/debug/diagnostic-flowchart.md` — Debug decision tree
> 11. `technicals/infra/architecture.md` — 4 pipelines + 9 workflows, target 16
> 12. `technicals/infra/stack.md` — Full tech stack
> 13. `technicals/infra/credentials.md` — Service credentials
> 14. `technicals/infra/env-vars-exhaustive.md` — 33 env vars documented
> 15. `technicals/infra/infrastructure-plan.md` — Distributed infra plan
> 16. `technicals/project/team-agentic-process.md` — Multi-agent process
> 17. `technicals/project/phases-overview.md` — 5 phases and gates
> 18. `technicals/project/improvements-roadmap.md` — 50+ improvements roadmap
> 19. `technicals/data/sector-datasets.md` — 1000 document types, 4 sectors
>
> **Directives:**
> 20. `directives/objective.md` — Final objective
> 21. `directives/workflow-process.md` — Iteration loop
> 22. `directives/n8n-endpoints.md` — Webhook paths and API
> 23. `directives/dataset-rationale.md` — 14 benchmarks justification
> 24. `directives/research-methodology.md` — SOTA research directive
> 25. `directives/repos/rag-tests.md` — rag-tests directive
> 26. `directives/repos/rag-website.md` — rag-website directive
> 27. `directives/repos/rag-dashboard.md` — rag-dashboard directive
> 28. `directives/repos/rag-data-ingestion.md` — rag-data-ingestion directive
>
> **Eval & Scripts:**
> 29. `eval/run-eval-parallel.py` — Main eval script
> 30. `eval/quick-test.py` — Quick pipeline test
> 31. `scripts/auto-push.sh` — Auto-commit (PID 1534406 running)
> 32. `scripts/migrate-to-hf-spaces.sh` — HF Space entrypoint (BROKEN — needs fix)
> 33. `scripts/ci_full_setup.py` — CI workflow activation logic
> 34. `scripts/ci_activate_workflows.py` — Workflow activation
>
> **Logs (check):**
> 35. `/tmp/phase2-v13-standard.log` — Last Standard run log
> 36. `/tmp/phase2-v13-orch.log` — Last Orchestrator run log
>
> **30 Rules & Commands Protocol:**
> 1. `source .env.local` before ANY Python script
> 2. Read `session-state.md` FIRST at session start
> 3. Read `knowledge-base.md` Section 0 before webhook tests
> 4. ONE fix per iteration, never multiple nodes
> 5. 5/5 minimum before sync
> 6. Tests SEQUENTIAL (never parallel — 503)
> 7. ZERO credentials in git — pre-push check: `git diff --cached | grep -iE 'sk-or-|pcsk_|jV_zGdx|sbp_|hf_[A-Za-z]{10}'`
> 8. Commit + push after each fix (origin + satellites)
> 9. Update session-state.md after each milestone
> 10. Update fixes-library.md after each fix
> 11. Update knowledge-base.md DURING session (not just end)
> 12. Push every 15-20 minutes minimum
> 13. VM = pilotage ONLY, ZERO workflow modification on VM
> 14. Tests → HF Space (16GB) or Codespaces (8GB), NEVER on VM
> 15. 3 consecutive failures → AUTO-STOP
> 16. Background testing for passing pipelines (nohup)
> 17. Focus on bottlenecks, not what's working
> 18. Session max 2h — at 1h45 finalize + push
> 19. Kill old Claude processes at session start
> 20. Pre-vol checklist before webhook tests
> 21. Compare with `snapshot/good/` references
> 22. `python3 eval/generate_status.py` after tests
> 23. `python3 n8n/sync.py` after workflow fixes
> 24. `bash scripts/check-staleness.sh` — check stale files
> 25. Codespaces = ephemeral — PUSH results before shutdown
> 26. `scripts/codespace-control.sh` for remote Codespace management
> 27. Delegation: Opus analyzes, Sonnet executes, Haiku explores
> 28. Run sub-agents in parallel for independent tasks
> 29. `git config user.email = alexis.moret6@outlook.fr`
> 30. Update `directives/status.md` as LAST action of session
>
> **IMMEDIATE ACTIONS:**
> 1. Fix HF Space entrypoint (workflows not activating — all 404)
> 2. Debug and fix Orchestrator (0% Phase 2)
> 3. Relaunch Standard pipeline (batch-size 5)
> 4. Activate PME workflows + configure Google API credentials
> 5. Set up GitHub CI for PME workflow validation
