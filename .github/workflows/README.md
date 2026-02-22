# GitHub Actions Workflows

> Last updated: 2026-02-22

This directory contains GitHub Actions CI/CD workflows for the Multi-RAG project.

## Active Workflows

### test-phase1.yml — RAG Pipeline CI Tests
**Status**: PASSING (last run: commit 630f81f, Feb 18 2026)
**Trigger**: Manual dispatch (workflow_dispatch)
**Duration**: ~15-20 minutes for all 4 pipelines (5q each)
**Purpose**: Smoke test all 4 RAG pipelines in GitHub Actions environment

**What it does**:
1. Spins up n8n stack (n8n-main + 3 workers + postgres + redis) via docker-compose
2. Initializes n8n DB with CI owner user
3. Imports credentials (OpenRouter, Jina, Pinecone, Neo4j, Supabase) from GitHub Secrets
4. Imports and activates all 4 RAG workflows (Standard, Graph, Quantitative, Orchestrator)
5. Runs quick-test.py with configurable number of questions per pipeline
6. Uploads test logs as artifacts
7. Debugs execution errors on failure

**Inputs**:
- `pipeline` — Which pipeline(s) to test (all, standard, graph, quantitative, orchestrator)
- `questions` — Number of questions per pipeline (default: 5)
- `mode` — Test mode: quick (quick-test.py) or full (iterative-eval.py)

**Required GitHub Secrets**:
- `OPENROUTER_API_KEY`
- `JINA_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_HOST`
- `NEO4J_URI`
- `NEO4J_AUTH`
- `SUPABASE_URL`
- `SUPABASE_API_KEY`
- `SUPABASE_PASSWORD`

**Usage**:
```bash
# Via GitHub UI: Actions > Phase 1 - RAG Pipeline Tests > Run workflow
# Select pipeline: all
# Questions: 5
# Mode: quick
```

**Known Issues**:
- Quantitative pipeline can take >90s per question (timeout set to 90s in webhook smoke test)
- Supabase pooler SSL fails on GitHub Actions runners (uses `sslmode=disable`)
- HF Space REST API broken (workflows use webhooks instead)

**Last successful run**: All 4 pipelines 5/5 PASS (commit 630f81f)

---

### deploy-website.yml — Vercel Auto-Deploy
**Status**: Active
**Trigger**: Push to main with changes in `website/**`
**Duration**: ~2-3 minutes
**Purpose**: Auto-deploy website to Vercel on code changes

**What it does**:
1. Detects changes in `website/` directory
2. Installs Vercel CLI
3. Pulls Vercel environment config
4. Builds Next.js app
5. Deploys to production (nomos-ai-pied.vercel.app)

**Required GitHub Secrets**:
- `VERCEL_TOKEN`

**Production URLs**:
- **ETI Website**: https://nomos-ai-pied.vercel.app (4 secteurs: BTP, Industrie, Finance, Juridique)
- **PME Connectors**: https://nomos-pme-connectors-alexis-morets-projects.vercel.app (15 apps)
- **PME Use Cases**: https://nomos-pme-usecases-alexis-morets-projects.vercel.app (200 cas)
- **Dashboard**: https://nomos-dashboard-alexis-morets-projects.vercel.app (live metrics)

---

## Planned Workflows (Not Yet Implemented)

### test-phase2.yml — Phase 2 Extended Tests
Run 1,000 HuggingFace questions across all pipelines. Requires Codespace or HF Space execution (16GB RAM).

### sync-to-satellites.yml — Auto-Sync to Repos
Push directives and config updates to all 5 satellite repos on commit to main.

### nightly-regression.yml — Nightly Full Test Suite
Run full iterative-eval.py nightly to catch regressions. Archive results to outputs/.

### update-dashboard.yml — Dashboard Data Pipeline
Generate and push eval-data.json to rag-dashboard repo for live dashboard updates.

---

## CI Architecture

```
GitHub Actions Runner (ubuntu-latest)
├── Docker-in-Docker (docker-compose)
│   ├── n8n-main:5678 (main instance + REST API)
│   ├── n8n-worker-1 (Standard + Orchestrator)
│   ├── n8n-worker-2 (Graph)
│   ├── n8n-worker-3 (Quantitative)
│   ├── postgres:5432 (n8n internal DB)
│   └── redis:6379 (queue mode)
├── Python 3.11 (eval scripts)
└── Cloud DBs (Pinecone, Neo4j, Supabase)
```

**Key differences from VM**:
- Fresh n8n instance per run (no state persistence)
- Credentials imported programmatically (ci_full_setup.py)
- N8N_RUNNERS_ENABLED=false (fixes $getWorkflowStaticData in loops)
- Uses rag-tests-docker-compose.yml (copied as docker-compose.yml)

---

## Adding GitHub Secrets

Required secrets must be added to repo settings:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add each secret with exact name (case-sensitive)

**Current secrets configured**:
- ✓ OPENROUTER_API_KEY
- ✓ JINA_API_KEY
- ✓ PINECONE_API_KEY
- ✓ PINECONE_HOST
- ✓ NEO4J_URI
- ✓ NEO4J_AUTH
- ✓ SUPABASE_URL
- ✓ SUPABASE_API_KEY
- ✓ SUPABASE_PASSWORD
- ✓ VERCEL_TOKEN

---

## Debugging Failed Runs

### 1. Check workflow logs
```bash
# Via GitHub UI: Actions > [workflow run] > [job] > [step]
```

### 2. Download artifacts
```bash
# Artifacts are uploaded even on failure
# Actions > [run] > Artifacts > Download phase1-test-logs-*
```

### 3. Check n8n logs in workflow output
```bash
# Scroll to "n8n logs (always)" step
# Shows last 80 lines of n8n-main + 60 lines per worker
```

### 4. Reproduce locally
```bash
# Use same docker-compose as CI
cp rag-tests-docker-compose.yml docker-compose.yml
docker compose up -d

# Run same test
source .env.local
python3 eval/quick-test.py --pipeline standard --questions 5
```

---

## Performance Benchmarks

| Workflow | Duration | Cost | Success Rate |
|----------|----------|------|--------------|
| test-phase1 (all, 5q) | 15-20 min | Free tier | 95%+ (since 630f81f) |
| test-phase1 (single, 5q) | 5-8 min | Free tier | 98%+ |
| deploy-website | 2-3 min | Free tier | 100% |

**GitHub Actions quota**: 2,000 minutes/month (Free tier) — ~100 full test runs available per month.

---

## Maintenance

- Review workflow logs monthly for patterns
- Update n8n version in docker-compose when new releases available
- Keep GitHub Secrets in sync with .env.local (VM)
- Archive old artifacts after 7 days (auto-cleanup)
