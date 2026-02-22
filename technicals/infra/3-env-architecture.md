# 3-Environment Parallel Architecture — HF Space + 2 Codespaces

> Last updated: 2026-02-22T13:45:00+01:00
> Designed: Session 38

---

## Overview

Three independent execution environments run 24/7 in parallel. Each has its own purpose, datasets, tests, and auto-stop rules. The VM (mon-ipad) is the control center — pilotage only, ZERO test execution.

```
                    ┌──────────────────────┐
                    │   VM (mon-ipad)      │
                    │   PILOTAGE ONLY      │
                    │   Analyze + Sync     │
                    │   Dashboard reader   │
                    └──────┬───────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
    ┌─────────▼──┐  ┌──────▼──────┐  ┌──────▼──────────┐
    │  HF Space  │  │ Codespace 1 │  │ Codespace 2     │
    │  (16 GB)   │  │  (8 GB)     │  │  (8 GB)         │
    │            │  │             │  │                 │
    │ n8n 2.8.3  │  │ data-ingest │  │ pme-connectors  │
    │ 4 RAG pipe │  │ ingestion   │  │ PME workflows   │
    │ Phase 2    │  │ datasets    │  │ connector tests │
    └─────┬──────┘  └──────┬──────┘  └──────┬──────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼───────────────┐
                    │  GitHub Dashboard    │
                    │  (GitHub Pages)      │
                    │  lbjlincoln.github   │
                    │  .io/rag-dashboard/  │
                    └──────────────────────┘
```

---

## Environment 1: HF Space (Permanent, 16GB RAM)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Run RAG pipeline evaluations (Phase 2, 3, 4, 5) |
| **URL** | https://lbjlincoln-nomos-rag-engine.hf.space |
| **n8n** | v2.8.3, 9 workflows imported, SQLite + Redis |
| **Datasets** | Phase 2: 1000q HuggingFace (squad, triviaqa, hotpotqa, musique, finqa, etc.) |
| **Tests** | `run-eval-parallel.py` targeting all 4 pipelines via webhooks |
| **Pipeline targets** | Standard (65%), Graph (60%), Quantitative (70%), Orchestrator (65%) |
| **Auto-stop** | `--early-stop 15` (15 consecutive failures) |
| **Launcher** | VM: `nohup python3 eval/run-eval-parallel.py --dataset phase-2 ... &` |
| **Results sync** | `--push` flag auto-commits to GitHub. VM `auto-push.sh` syncs to dashboard. |
| **Keep-alive** | Cron every 30 min from VM |
| **Cost** | $0 (free tier) |
| **Uptime** | 24/7 (with keep-alive) |

### What makes it unique
- ONLY environment with n8n + all 4 RAG pipeline workflows
- Handles all RAG evaluation (the core product)
- Webhook-based execution (REST API broken)
- Phase 2-5 question datasets (HuggingFace benchmarks)

---

## Environment 2: Codespace data-ingestion (Ephemeral, 8GB RAM)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Download HF datasets, ingest into Pinecone/Neo4j/Supabase |
| **Codespace** | `nomos-rag-data-ingestion-pjvj9r67464j27qg6` |
| **Repo** | LBJLincoln/rag-data-ingestion |
| **n8n** | Local docker-compose (2 workers) OR direct API calls |
| **Datasets** | 16 HF benchmarks (15,772 items) + 4 sector datasets (7,609 items) |
| **Tests** | Ingestion validation: vector count, entity count, data quality checks |
| **Targets** | Pinecone: +10K vectors, Neo4j: +5K entities, Supabase: +2K rows |
| **Auto-stop** | 3 consecutive ingestion failures |
| **Launcher** | VM: `gh codespace ssh -- nohup python3 scripts/download_missing_datasets.py &` |
| **Results sync** | Push ingestion stats to GitHub → dashboard reads them |
| **Cost** | 2x hour multiplier against 60h/month quota |
| **Uptime** | Until quota or task completion |

### What makes it unique
- WRITE operations to databases (Pinecone upsert, Neo4j create, Supabase insert)
- Downloads from HuggingFace Hub (bandwidth-intensive)
- Needs `datasets` Python library (not just `requests`)
- Produces data that the RAG pipelines consume (upstream of HF Space)
- Different success metrics: ingestion throughput, data quality, dedup rate

### Datasets unique to this environment
```
HF Benchmarks: squad_v2, triviaqa, popqa, narrativeqa, msmarco, asqa,
               frames, pubmedqa, natural_questions, hotpotqa, musique,
               2wikimultihopqa, finqa, tatqa, convfinqa, wikitablequestions
Sectors:       finance (2K items), juridique (2K), btp (2K), industrie (1.6K)
```

---

## Environment 3: Codespace pme-connectors (Ephemeral, 8GB RAM)

| Aspect | Detail |
|--------|--------|
| **Purpose** | Test PME multi-channel assistant workflows |
| **Codespace** | `didactic-invention-wr6rx74vpppw276r` |
| **Repo** | LBJLincoln/rag-pme-connectors |
| **n8n** | Targets VM or HF Space n8n (no local n8n needed) |
| **Datasets** | PME-specific: connector scenarios, multi-channel messages, action routing |
| **Tests** | `eval/test-pme-connectors.py` — gateway, intent, actions |
| **Targets** | Gateway: 80% pass, Intent: 90% pass, Actions: 75% pass |
| **Auto-stop** | 3 consecutive test failures |
| **Launcher** | VM: `gh codespace ssh -- nohup python3 eval/test-pme-connectors.py &` |
| **Results sync** | Push test results to GitHub → dashboard reads them |
| **Cost** | 2x hour multiplier against 60h/month quota |
| **Uptime** | Until quota or task completion |

### What makes it unique
- Tests DIFFERENT workflows than rag-tests (PME Gateway, Action Executor)
- Multi-channel scenarios (WhatsApp, Telegram, email, API)
- Intent classification accuracy (not RAG accuracy)
- Action routing correctness (calendar, email, file operations)
- User-facing chatbot quality (not benchmark precision)

### Test scenarios unique to this environment
```
Gateway:  Basic RAG query, WhatsApp message, Telegram message, intent routing
Intent:   Classification accuracy across 6+ intent types
Actions:  Calendar booking, email send, file search, CRM lookup
Channels: API, WhatsApp, Telegram, Email, Slack (5 channels)
```

---

## Sync Architecture — Every Repo → Dashboard

```
 ┌─────────────┐     git push      ┌──────────────┐    GitHub Pages   ┌──────────────┐
 │ HF Space    │ ──────────────▶   │   GitHub      │ ─────────────▶   │  Dashboard   │
 │ (eval)      │  docs/data.json   │   Repos       │  auto-deploy     │  (live)      │
 └─────────────┘                   │               │                  │              │
                                   │  mon-ipad     │                  │  status.json │
 ┌─────────────┐     git push      │  rag-tests    │                  │  data.json   │
 │ CS ingestion│ ──────────────▶   │  rag-data-ing │                  │              │
 │ (ingest)    │  ingestion-stats  │  rag-pme-conn │                  │  All 3 envs  │
 └─────────────┘                   │  rag-dashboard │                 │  visible     │
                                   │               │                  │              │
 ┌─────────────┐     git push      └───────┬───────┘                  └──────────────┘
 │ CS pme-conn │ ──────────────▶           │                                 ▲
 │ (pme tests) │  pme-test-results         │                                 │
 └─────────────┘                           │         API update              │
                                           └─────────────────────────────────┘
                                            (auto-push.sh syncs data to
                                             rag-dashboard repo via GitHub API)
```

### Sync mechanism per repo

| Repo | What it pushes | Where | Frequency |
|------|---------------|-------|-----------|
| **mon-ipad** | `docs/status.json`, `docs/data.json` | origin + rag-dashboard (via API) | Every 20 min (auto-push.sh) |
| **rag-tests** | eval results, iteration data | own repo (git push) | After each iteration |
| **rag-data-ingestion** | ingestion stats, vector counts | own repo (git push) | After each batch |
| **rag-pme-connectors** | test results, pass/fail | own repo (git push) | After each test run |

### Dashboard data aggregation
The dashboard at `lbjlincoln.github.io/rag-dashboard/` reads:
- `docs/status.json` — Phase 1/2 pipeline accuracy, gates, overall status
- `docs/data.json` — Full iteration history, per-question results

To include data-ingestion and pme-connectors results, the `auto-push.sh` script on the VM:
1. Pulls latest results from each repo (via `git fetch`)
2. Aggregates into `docs/status.json`
3. Pushes to rag-dashboard via GitHub API

---

## Operational Rules (additions to existing 35 rules)

| # | Rule | Rationale |
|---|------|-----------|
| 36 | Each repo produces results in ITS OWN repo first | Independence — repos don't cross-write |
| 37 | VM aggregates all results into dashboard | Single source of truth for visibility |
| 38 | Codespaces use nohup + auto-stop (3 failures) | Survive session end, prevent infinite loops |
| 39 | Each environment has UNIQUE test datasets | No duplication — different purpose per env |
| 40 | Dashboard sync via GitHub API (not git push) | Avoids merge conflicts on rag-dashboard |

---

## Hard Limits Summary

| Limit | Value | Impact |
|-------|-------|--------|
| Simultaneous Codespaces | **2 max** (free tier) | Can't run 3 Codespaces, but HF Space is free |
| Codespace hours/month | **60h** (2x multiplier = 30h real) | Plan runs carefully |
| HF Space RAM | 16 GB | Plenty for n8n + workflows |
| VM RAM | 969 MB (~135 MB free) | Pilotage only — no tests |
| OpenRouter RPM | ~20 RPM per model | Sequential testing mandatory |
| Pinecone vectors | 100K per index | 40K used after Phase 2 ingestion |
| Neo4j nodes | 200K | 35K after Phase 2 |

### Can limits be increased?
| Service | Free | Paid upgrade | Worth it? |
|---------|------|-------------|-----------|
| Codespaces | 60h/month, 2 simultaneous | Pro ($4/mo): 180h, 4 simultaneous | **YES** — 3x hours |
| Pinecone | 100K vectors | Starter ($70/mo): 1M vectors | Not yet — 40% used |
| Neo4j | 200K nodes | Pro ($65/mo): unlimited | Not yet — 17% used |
| OpenRouter | Free models | N/A (all models free) | N/A |
| HF Space | 16GB cpu-basic | GPU ($0.60/hr): faster inference | Not needed |
| VM | e2-micro (1GB) | e2-small ($15/mo): 2GB | **MAYBE** — eliminates swap |

---

## Launch Commands (from VM)

### Start all 3 environments
```bash
# 1. HF Space eval (already running if keep-alive active)
source .env.local
N8N_HOST="https://lbjlincoln-nomos-rag-engine.hf.space" \
nohup python3 eval/run-eval-parallel.py \
  --dataset phase-2 --types standard,graph,quantitative,orchestrator \
  --batch-size 5 --early-stop 15 --push \
  --label "Phase2-v12" \
  > /tmp/phase2-eval.log 2>&1 &

# 2. Codespace data-ingestion
gh codespace ssh --codespace nomos-rag-data-ingestion-pjvj9r67464j27qg6 -- \
  'cd /workspaces/rag-data-ingestion && source .env.local && \
   nohup python3 scripts/download_missing_datasets.py > /tmp/ingestion.log 2>&1 &'

# 3. Codespace pme-connectors
gh codespace ssh --codespace didactic-invention-wr6rx74vpppw276r -- \
  'cd /workspaces/rag-pme-connectors && source .env.local && \
   export N8N_HOST="https://lbjlincoln-nomos-rag-engine.hf.space" && \
   nohup python3 eval/test-pme-connectors.py > /tmp/pme-test.log 2>&1 &'

# 4. Auto-push dashboard sync (VM)
nohup bash scripts/auto-push.sh 20 > /tmp/auto-push.log 2>&1 &
```

### Monitor all 3 from VM
```bash
# v11/eval progress
cat /tmp/eval-progress.json

# Data-ingestion status
gh codespace ssh --codespace nomos-rag-data-ingestion-pjvj9r67464j27qg6 -- \
  'cat /tmp/eval-progress.json 2>/dev/null'

# PME-connectors status
gh codespace ssh --codespace didactic-invention-wr6rx74vpppw276r -- \
  'cat /tmp/pme-test.log 2>/dev/null | tail -10'

# Dashboard (browser)
# https://lbjlincoln.github.io/rag-dashboard/
```
