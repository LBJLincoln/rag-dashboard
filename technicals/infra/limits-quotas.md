# Limits & Quotas — Infrastructure Constraints Reference

> Last updated: 2026-02-22T18:00:00+01:00
> Comprehensive reference of ALL hard limits, quotas, and operational constraints across infrastructure.
> **Purpose**: Quick reference for capacity planning and bottleneck identification.

---

## VM Google Cloud (e2-micro, us-central1)

| Resource | Current Usage | Hard Limit | Status | Constraint Impact |
|----------|--------------|------------|--------|-------------------|
| **RAM Total** | ~865 MB used | 969 MB | CRITICAL | Only ~104 MB available |
| **Swap** | ~1084 MB used | 2047 MB | HIGH | VM swaps regularly |
| **CPU** | Variable | 1 vCPU (Intel Xeon @ 2.20GHz) | MEDIUM | Single-threaded bottleneck |
| **Disk** | 12 GB used | 30 GB | OK | 17 GB free (43% full) |
| **Claude Code Process** | ~297 MB | N/A | CRITICAL | Large % of available RAM |
| **MCP Servers Total** | ~6 MB | N/A | NEGLIGIBLE | neo4j 2.5MB, pinecone 1.4MB, HF 0.8MB, jina 0.7MB, cohere 0.6MB |
| **Network (egress)** | Unknown | 1 GB/month (free tier) | UNKNOWN | May throttle after quota |

**Operational Rules**:
- ZERO eval tests on VM (Rule 25) — use HF Space or Codespaces
- ZERO workflow modifications on VM (Rule 28) — Task Runner cache persists
- Maximum 2-3 concurrent Python processes before OOM risk
- Kill old Claude sessions at startup to reclaim RAM

---

## n8n VM (Docker Self-Hosted)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Container Memory** | Unknown | 600 MB limit | MEDIUM | Set in docker-compose.yml |
| **Workers** | 1 (main mode) | 1 | OK | NOT queue mode |
| **Concurrent Webhook Executions** | Variable | ~3-5 before 503 errors | CRITICAL | Sequential testing required (Rule 2) |
| **Workflows Active** | 9 | 16 (target) | OK | 4 pipelines + 5 support |
| **PostgreSQL DB Size** | ~500 KB workflows | Unknown | OK | Workflow definitions negligible |
| **Port** | 5678 | 5678 (fixed) | OK | Exposed externally |
| **Task Runner Cache** | Persistent | N/A | CRITICAL | Code NOT refreshed even after restart (Pattern 2.11) |

**Operational Rules**:
- Tests MUST be sequential, never parallel (causes 503)
- Deactivate/activate workflow to clear Task Runner cache after modifications
- Webhook path changes require full workflow reimport

---

## n8n HF Space (lbjlincoln-nomos-rag-engine.hf.space)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **RAM** | Unknown | 16 GB | EXCELLENT | cpu-basic tier, $0 |
| **Workers** | 1 | 1 | OK | NOT queue mode |
| **Concurrent Executions** | Unknown | Higher than VM | GOOD | More headroom |
| **n8n Version** | 2.8.3 | Latest | OK | SQLite + Redis |
| **Credentials** | 12/12 imported | 12 | OK | postgres x4, redis, neo4j, pinecone x2, openrouter x4 |
| **Workflows** | 9 imported | Unlimited | OK | Standard/Graph/Orch OK, Quant broken |
| **REST API** | BROKEN (FIX-15) | N/A | BROKEN | Proxy strips POST body for /api/ |
| **Webhooks** | Working | Unlimited | OK | Primary execution method |
| **Keep-Alive** | Cron every 30 min | N/A | OK | Prevents sleep |
| **Uptime** | Best-effort | N/A | MEDIUM | May sleep after inactivity |

**Operational Rules**:
- Use ONLY for webhook-based workflow execution (not REST API)
- Workflow modifications should happen here (16 GB RAM vs VM 100 MB)
- Keep-alive cron required to prevent sleep

---

## GitHub (LBJLincoln account)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Private Repos** | 5 | Unlimited (Free) | OK | mon-ipad + 4 satellites |
| **Codespaces Active Hours** | Variable | 60h/month (Free tier) | CRITICAL | Shared across all codespaces |
| **Codespaces Simultaneous** | 0-2 running | 2 running max (tested) | CRITICAL | Can create 3+ but only 2 can run |
| **Codespaces Created** | 2-3 | Unlimited | OK | nomos-rag-tests, nomos-rag-website + 1 to create |
| **GitHub Actions** | Minimal | 2000 min/month (Free) | OK | CI smoke tests only |
| **Storage** | Unknown | 500 MB (Free) | OK | Code only, no large binaries |
| **LFS Bandwidth** | 0 | 1 GB/month (Free) | OK | Not used |

**Operational Rules**:
- 60h/month = ~2h/day average OR 7-8 full days/month
- Always push results to GitHub BEFORE stopping codespaces (Rule 18)
- Only 2 codespaces can run simultaneously (tested limit)
- Track active hours manually to avoid quota exhaustion

---

## GitHub Codespaces (Per Instance)

| Resource | Standard | basicLinux32gb | Hard Limit | Notes |
|----------|----------|----------------|------------|-------|
| **CPU** | 2 cores | 8 cores | 2-8 cores | basicLinux32gb for heavy ingestion |
| **RAM** | 8 GB | 32 GB | 8-32 GB | 8 GB sufficient for 200q tests |
| **Disk** | 32 GB | 128 GB | 32-128 GB | Ephemeral, lost on delete |
| **Active Hours Cost** | 2x multiplier | 8x multiplier | N/A | Against 60h/month quota |
| **Network** | Unlimited | Unlimited | N/A | SSH tunnel to VM works |
| **Docker in Docker** | Enabled | Enabled | N/A | For n8n local instances |
| **Python** | 3.11 | 3.11 | System default | Pre-installed |
| **Node.js** | 20 | 20 | System default | Pre-installed |

**Operational Rules**:
- Standard (2 core, 8 GB) sufficient for rag-tests (200q batches)
- basicLinux32gb (8 core, 32 GB) for rag-data-ingestion (massive HF downloads)
- Codespace active hours counted ONLY when running (not stopped)
- Standard = 2x multiplier (30h real quota), basicLinux32gb = 8x multiplier (7.5h real quota)

---

## OpenRouter (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **API Key** | Active | N/A | OK | sk-or-v1-*** |
| **Models Available** | 3 used | 100+ free models | OK | Llama 70B, Gemma 27B, Trinity |
| **Cost** | $0 | $0 (free tier) | EXCELLENT | All models free |
| **Rate Limits (Llama 70B)** | Unknown | ~20 RPM (typical free tier) | MEDIUM | May cause 429 errors |
| **Rate Limits (Gemma 27B)** | Unknown | ~30 RPM (typical free tier) | MEDIUM | Faster model |
| **Rate Limits (Trinity)** | Unknown | ~20 RPM (typical free tier) | MEDIUM | Extraction model |
| **Concurrent Requests** | Variable | ~3-5 (typical free tier) | MEDIUM | Sequential safer |
| **Context Length (Llama 70B)** | Unknown | 131,072 tokens | OK | Sufficient |
| **Context Length (Gemma 27B)** | Unknown | 8,192 tokens | MEDIUM | Shorter context |

**Operational Rules**:
- 429 errors observed during Quantitative pipeline heavy use (session 27)
- Retry with exponential backoff for 429 errors
- Consider rate limit when testing 50+ questions in parallel
- Switch to faster model (Gemma 27B) for simple operations to preserve Llama quota

**Model Quotas (Estimated)**:
- Llama 70B: ~1,200 calls/hour (20 RPM)
- Gemma 27B: ~1,800 calls/hour (30 RPM)
- Trinity: ~1,200 calls/hour (20 RPM)

---

## Pinecone (Free Tier - Serverless)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Indexes Total** | 3 | 5 (Free tier) | OK | sota-rag-jina-1024, sota-rag-cohere-1024, sota-rag-phase2-graph |
| **Vectors per Index** | 10,411 (2 indexes), 1,296 (1 index) | 100,000 per index | OK | Plenty of headroom |
| **Dimensions** | 1024 | 20,000 | OK | jina-embeddings-v3 standard |
| **Namespaces (sota-rag-jina-1024)** | 12 | 100 (Free tier) | OK | Per-dataset isolation |
| **Namespaces (sota-rag-phase2-graph)** | 1 | 100 | OK | Musique dataset |
| **Query Latency** | ~200-500ms | N/A | OK | Serverless variable |
| **Queries per Second** | Unknown | 100 QPS (Free tier) | OK | Never hit |
| **Upserts per Second** | Unknown | 200 UPS (Free tier) | OK | Ingestion OK |
| **Storage** | ~50 MB | 10 GB (Free tier) | OK | Vectors only |
| **Metadata per Vector** | Variable | 40 KB | OK | document_id, namespace, text, source |

**Operational Rules**:
- Max 100K vectors per index — Phase 2 (1000q) won't exceed
- Create new index if switching embedding model (Jina → Cohere requires new index)
- Namespace isolation for datasets (finqa, musique, hotpotqa, etc.)
- Free tier has NO time limit (unlimited retention)

---

## Neo4j Aura (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Nodes** | 19,788 | 200,000 | OK | 10% used |
| **Relationships** | 76,717 | 400,000 | OK | 19% used |
| **Storage** | Unknown | 50 MB (Free tier) | OK | Graph data only |
| **RAM** | Unknown | 1 GB (Free tier) | OK | Aura managed |
| **Cypher Query Latency** | ~300-800ms | N/A | MEDIUM | HTTPS API slower than Bolt |
| **Concurrent Connections** | Unknown | 10 (Free tier) | OK | n8n pools connections |
| **Queries per Second** | Unknown | ~5 QPS (Free tier) | MEDIUM | Avoid parallel queries |
| **Indexes** | Unknown | Unlimited | OK | Entity name, type, tenant_id |
| **Labels** | Variable | Unlimited | OK | Entity, Document, Community |
| **Properties per Node** | Variable | Unlimited | OK | name, type, description, tenant_id |

**Operational Rules**:
- Must use HTTPS API (not Bolt) for n8n HTTP Request nodes
- Free tier pauses after 3 days inactivity (query to wake)
- Relationship limit sufficient for Phase 2 (~100K rels estimated)
- Query optimization critical (use indexes on tenant_id, name)

**Estimated Phase 2 Impact**:
- Phase 2: +4,884 entities, +21,810 rels → 24,672 nodes, 98,527 rels total (under limits)

---

## Supabase (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Tables** | 40 | Unlimited | OK | public schema |
| **Rows** | ~17,000 | 500 MB storage | OK | Financial + benchmark data |
| **Storage** | Unknown | 500 MB (Free tier) | OK | Estimated <100 MB |
| **Database Size** | Unknown | 500 MB (Free tier) | OK | Plenty of headroom |
| **API Requests** | Unknown | Unlimited (Free tier) | OK | No hard limit |
| **Concurrent Connections** | Unknown | 60 (Pooler) | OK | n8n uses pooler |
| **Query Latency** | ~100-300ms | N/A | OK | Fast REST API |
| **Bandwidth** | Unknown | 5 GB/month (Free tier) | OK | Minimal usage |
| **Row-Level Security** | Disabled | N/A | OK | Internal use only |

**Operational Rules**:
- Use Pooler endpoint (port 6543) for n8n to avoid connection exhaustion
- 500 MB storage sufficient for 1M+ rows of financial data
- exec_sql RPC for dynamic SQL generation (Quantitative pipeline)
- Free tier pauses after 1 week inactivity (query to wake)

**Table Limits (Postgres)**:
- Max columns per table: 1,600 (Postgres limit, never hit)
- Max row size: 1.6 GB (Postgres limit, never hit)
- Max indexes per table: Unlimited (practical limit ~100 per table)

---

## Jina AI (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **API Key** | Active | N/A | OK | jina_*** |
| **Embeddings Quota** | Unknown | 1M tokens/month (Free) | OK | ~20K documents embedded/month |
| **Reranker Quota** | Unknown | Unknown | OK | Included in free tier |
| **Embeddings Model** | jina-embeddings-v3 | N/A | OK | 1024 dimensions |
| **Reranker Model** | jina-reranker-v2-base-multilingual | N/A | OK | Multilingual support |
| **Embedding Latency** | ~200-500ms | N/A | OK | Batch requests faster |
| **Batch Size** | Unknown | 2048 texts (API limit) | OK | n8n batches documents |
| **Max Input Length** | 8,192 tokens | 8,192 tokens | OK | Per text |
| **Rate Limit** | Unknown | ~100 RPM (Free tier estimate) | OK | Never hit |

**Operational Rules**:
- 1M tokens/month = ~20K documents (avg 50 tokens/doc)
- Late chunking enabled (`late_chunking=True`) for better context (session 13)
- Batch requests for ingestion efficiency
- Free tier sufficient for Phase 1+2 (200q + 1000q = ~60K tokens embedded)

**Token Calculation**:
- Phase 1: 200q × 50 tokens avg = 10K tokens
- Phase 2: 1000q × 50 tokens avg = 50K tokens
- Total: 60K tokens (6% of monthly quota)

---

## Cohere (Trial Tier - Nearly Exhausted)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **API Key** | Active | N/A | EXHAUSTED | Trial credits nearly gone |
| **Reranker Quota** | Nearly exhausted | Unknown | CRITICAL | Backup only |
| **Embeddings Quota** | Nearly exhausted | Unknown | CRITICAL | Backup only |
| **Reranker Model** | command-r | N/A | OK | When quota available |
| **Embeddings Model** | embed-english-v3.0 | N/A | OK | Backup index (sota-rag-cohere-1024) |
| **Rate Limit** | Unknown | Unknown | UNKNOWN | Trial tier |

**Operational Rules**:
- Use Jina as primary for embeddings/reranking
- Cohere as BACKUP ONLY when Jina unavailable
- Trial tier has NO renewal (must upgrade to paid for continued use)
- Backup index (sota-rag-cohere-1024) frozen at 10,411 vectors

---

## HuggingFace (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **API Key** | Active | N/A | OK | hf_*** |
| **Hub API Requests** | Unknown | Unlimited (Free) | OK | Datasets, models search |
| **Datasets Download** | Unknown | Unlimited (Free) | OK | Bandwidth throttled after heavy use |
| **Spaces (HF Space)** | 1 (n8n) | 5 (Free tier) | OK | cpu-basic, 16 GB RAM |
| **Spaces Uptime** | Best-effort | N/A | MEDIUM | May sleep after inactivity |
| **Spaces Storage** | Unknown | 50 GB (Free tier) | OK | Persistent storage |
| **Model Inference API** | Not used | Limited (Free tier) | N/A | Not needed |

**Operational Rules**:
- Dataset downloads may throttle after ~10 GB/day (observed)
- Spaces sleep after 48h inactivity (keep-alive required)
- Free tier Spaces restart after crash (automatic recovery)

---

## Vercel (Free Tier)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Projects** | 4 | Unlimited | OK | rag-website, pme-connectors, pme-usecases, dashboard |
| **Deployments** | Auto on push | 100/day (Free tier) | OK | Never hit |
| **Bandwidth** | Unknown | 100 GB/month (Free) | OK | Static sites minimal |
| **Build Minutes** | Minimal | 6000 min/month (Free) | OK | Next.js builds ~2 min each |
| **Serverless Functions** | Not used | 100 GB-hours (Free) | OK | Static only |
| **Edge Network** | Global | Global | OK | CDN included |
| **Custom Domains** | 0 | Unlimited (Free) | OK | Using .vercel.app |

**Operational Rules**:
- Git push triggers auto-deploy (no manual intervention)
- Static sites have near-zero resource consumption
- Free tier sufficient for production traffic (<10K visits/month)

---

## Claude Code (Max Plan)

| Resource | Current Usage | Hard Limit | Status | Notes |
|----------|--------------|------------|--------|-------|
| **Model** | claude-opus-4-6 | N/A | OK | Subscription Max plan |
| **Session Length** | Variable | 2h recommended (Rule 26) | MEDIUM | Efficiency degrades after 2h |
| **RAM Consumption** | ~297 MB | N/A | CRITICAL | 30% of VM RAM |
| **MCP Servers** | 7 active | Unknown | OK | n8n, jina, neo4j, pinecone, supabase, cohere, HF |
| **Concurrent Tasks** | Variable | Unknown | OK | Delegation to Sonnet/Haiku |
| **Context Window** | 200K tokens | 200K tokens | OK | Entire codebase fits |

**Operational Rules**:
- Session max 2h for efficiency (Rule 26)
- Kill old Claude processes to reclaim VM RAM
- Delegate to Sonnet/Haiku for execution-heavy tasks
- Opus for analysis/decisions only

---

## Eval Testing (Observed Limits)

| Metric | VM | HF Space | Codespace (8GB) | Codespace (32GB) | Notes |
|--------|----|----|----|----|-------|
| **Max Questions (Sequential)** | 0 (prohibited) | 50 | 200 | 1000+ | VM: Rule 25 |
| **Max Questions (Parallel)** | 0 (prohibited) | 0 (causes 503) | 0 (causes 503) | 0 (causes 503) | Rule 2 |
| **Workers (n8n)** | 1 | 1 | 3 (rag-tests) | 2 (rag-data-ingestion) | docker-compose config |
| **Batch Size per Pipeline** | N/A | 5 tested | 5 tested | Unknown | Per single run |
| **Concurrent Pipelines** | N/A | 1 safe | 1 safe | 1 safe | Sequential only |
| **Orchestrator Parallel** | N/A | Sequential | Sequential | Sequential | Broadcasts to 3 sub-pipelines |

**Operational Rules**:
- ALL tests MUST be sequential (never parallel) — Rule 2
- Batch size ≤ 5 safe, 10+ risks 503 errors
- Orchestrator counts as 3 concurrent pipeline calls (Standard + Graph + Quantitative)
- Use `codespace-control.sh` for live monitoring during long runs

---

## Data Ingestion (Phase 2 Estimates)

| Dataset | Size | Vectors | Entities | Relations | Notes |
|---------|------|---------|----------|-----------|-------|
| **Phase 1 (Current)** | ~500 MB | 10,411 | 19,788 | 76,717 | Baseline |
| **Phase 2 (Planned)** | ~4 GB HF | +10K | +4,884 | +21,810 | FinQA, HotpotQA, Musique, etc. |
| **Sectors (Planned)** | ~1.4 GB | +20K | +10K | +40K | BTP, Industrie, Finance, Juridique |
| **Total (Post-Ingestion)** | ~6 GB | ~40K | ~35K | ~140K | Under all free tier limits |

**Free Tier Headroom Post-Ingestion**:
- Pinecone: 40K / 100K vectors per index = 40% (OK)
- Neo4j: 35K / 200K nodes = 17.5%, 140K / 400K rels = 35% (OK)
- Supabase: ~200 MB / 500 MB storage = 40% (OK)

---

## Session & Operational Limits

| Limit | Value | Rule | Impact |
|-------|-------|------|--------|
| **Session Max Duration** | 2 hours | Rule 26 | Efficiency degrades after 2h |
| **Commit Frequency** | Every 30 min | Rule 11 | Results never lost |
| **Push Frequency** | Every 30 min | Rule 11 | Sync with GitHub |
| **Consecutive Failures (Auto-Stop)** | 3 | team-agentic-process.md | Prevent infinite loops |
| **Test Parallelization** | NEVER | Rule 2 | n8n 503 errors |
| **Fixes per Iteration** | 1 | Rule 1 | Isolate root cause |
| **Validation Required (5/5)** | 5/5 pass | Rule 6 | Before sync |
| **Regression Threshold (Revert)** | 3+ regressions | Rule 7 | Rollback |

---

## Bottleneck Priority Matrix

| Priority | Type | Examples | Max Effort | SLA |
|----------|------|----------|------------|-----|
| **P0 (Critical)** | Infrastructure | VM OOM, n8n down, Docker crash | 2h | Immediate |
| **P1 (High)** | Pipeline Blocked | Graph RAG broken, rate limit 429 | 4h | Same session |
| **P2 (Medium)** | Data/Code | ID collision, SQL edge case | 8h | Next session |
| **P3 (Low)** | Optimization | Verbose answers, latency >2.5s | 24h+ | Post-Phase 1 |

---

## Summary — Critical Constraints (Top 10)

| # | Constraint | Hard Limit | Current Usage | Headroom | Action When Hit |
|---|------------|------------|---------------|----------|-----------------|
| 1 | **VM RAM** | 969 MB | ~865 MB | ~100 MB | Kill processes, use HF Space/Codespaces |
| 2 | **GitHub Codespaces Hours** | 60h/month | Variable | Unknown | Stop unused codespaces, track hours |
| 3 | **Codespaces Simultaneous** | 2 running | 0-2 | 0-2 | Stop one to start another |
| 4 | **n8n Concurrent Webhooks (VM)** | ~3-5 | Variable | Low | Sequential testing only |
| 5 | **OpenRouter Rate Limit** | ~20 RPM/model | Variable | Low | Retry with backoff, switch models |
| 6 | **Pinecone Vectors/Index** | 100K | 10,411 | 89,589 | Create new index or namespace |
| 7 | **Neo4j Nodes** | 200K | 19,788 | 180,212 | Optimize graph, prune old data |
| 8 | **Jina Embeddings Quota** | 1M tokens/month | ~60K | ~940K | Batch requests, monitor usage |
| 9 | **Cohere Trial Quota** | Exhausted | Nearly 100% | None | Use Jina only, upgrade if needed |
| 10 | **Session Duration** | 2h (recommended) | Variable | N/A | Finalize and restart session |

---

## Monitoring Commands

```bash
# VM Resources
free -h                                    # RAM/Swap usage
df -h                                      # Disk usage
docker stats --no-stream                   # Container resource usage
ps aux --sort=-%mem | head -10            # Top RAM consumers

# GitHub Codespaces
gh codespace list                          # Active codespaces
scripts/codespace-control.sh monitor 30    # Live monitoring

# n8n
curl http://localhost:5678/healthz         # Health check
docker logs n8n-n8n-1 --tail 100          # Recent logs

# Database Sizes
# Pinecone: Check dashboard at app.pinecone.io
# Neo4j: MATCH (n) RETURN count(n) AS nodes
# Supabase: Check dashboard at supabase.com/dashboard
```

---

## Quota Exhaustion Scenarios & Mitigations

| Scenario | Impact | Mitigation | Prevention |
|----------|--------|------------|------------|
| **VM RAM exhausted** | Claude Code OOM, n8n crash | Kill old processes, restart Docker | Monitor `free -h`, Rule 19 |
| **Codespaces 60h quota hit** | No testing capacity | Wait for next month, optimize usage | Track hours manually, stop when idle |
| **OpenRouter 429 errors** | Pipeline failures | Retry with backoff, switch to Gemma 27B | Sequential testing, rate limit awareness |
| **Pinecone 100K vectors** | Ingestion fails | Create new index or namespace | Monitor vector count, plan Phase 2 ingestion |
| **Neo4j 200K nodes** | Graph ingestion fails | Prune old data, optimize schema | Monitor node count, entity deduplication |
| **Jina 1M tokens/month** | Embedding fails | Wait for next month, use backup | Batch requests, monitor token usage |
| **Cohere trial exhausted** | Reranking unavailable | Use Jina reranker only | Already happened, Jina is primary |
| **HF Space sleep** | Pipelines timeout | Keep-alive cron already running | Cron every 30 min |
| **Session >2h** | Reduced efficiency | Finalize, commit, push, restart | Track time, Rule 26 |

---

## Notes

1. **All limits documented are HARD LIMITS** (cannot be exceeded without upgrade/payment).
2. **Free tier limits are permanent** unless explicitly stated as trial.
3. **"Unknown" usage** indicates monitoring not yet implemented (opportunity for improvement).
4. **Headroom percentages** calculated conservatively (Phase 2 estimates included).
5. **This document is the SINGLE SOURCE OF TRUTH** for capacity planning.

**Last Verified**: 2026-02-22 (Session 31)
**Next Review**: After Phase 2 launch (1000q test completion)
