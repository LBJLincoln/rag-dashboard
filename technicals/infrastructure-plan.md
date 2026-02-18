# Infrastructure & Test Parallelization Plan — Multi-RAG SOTA 2026

> Last updated: 2026-02-18T14:00:00Z
> Context: Multi-RAG orchestrator running 4 pipelines (Standard, Graph, Quantitative, Orchestrator)
> on a Google Cloud free-tier VM, evaluated against 200+ questions (Phase 1) scaling to 1M+ (Phase 5).

---

## Current State

### VM: Google Cloud e2-micro (free tier)
- **CPU**: 1 vCPU shared, 25% sustained usage baseline (burstable to 100% for short periods)
- **RAM**: 970 MB physical + 2 GB swap = ~3 GB total addressable
- **Disk**: 30 GB standard persistent (HDD-class IOPS)
- **Network**: 1 Gbps egress (with free-tier quotas)
- **IP**: 34.136.180.66 (static external)
- **OS**: Debian Linux 6.1.0-43-cloud-amd64

### Docker Containers (running)
| Container | Base Memory | Role |
|-----------|-------------|------|
| n8n | ~68 MB | Workflow engine (13 workflows, 4 pipelines) |
| PostgreSQL | ~18 MB | n8n internal state, execution history |
| Redis | ~3 MB | Cache layer for embeddings/results |
| **Total** | **~89 MB** | Leaves ~880 MB for OS + overhead |

### Current Test Performance
- Tests run **sequentially** (mandatory: n8n returns 503 when overloaded with concurrent requests)
- 200 questions at ~60s average per question = **3.3 hours per pipeline** sequential
- 4 pipelines tested one-at-a-time = **~13.2 hours** total for full eval
- Current strategy: run all 4 pipelines in a single pass via `run-eval-parallel.py` = **~3.3h** (questions dispatched to pipelines, but sequential execution)
- 932 test runs completed across 42 iterations to date

### Current Accuracy (Phase 1 status.json)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | >= 85% | PASSED |
| Graph | 68.7% | >= 70% | -1.3pp gap |
| Quantitative | 78.3% | >= 85% | -6.7pp gap |
| Orchestrator | 80.0% | >= 70% | PASSED |
| **Overall** | **78.1%** | **>= 75%** | **PASSED** |

### Key Constraints
1. **Memory**: 970 MB total means aggressive memory management is non-negotiable
2. **CPU**: 25% sustained means long-running computations will be throttled
3. **n8n concurrency**: Single-threaded Node.js event loop; concurrent webhooks cause 503s
4. **External API rate limits**: OpenRouter (free tier), Jina (1M tokens/month), Cohere (1000 calls/month)
5. **Disk I/O**: Standard persistent disk is slow (~0.75 IOPS/GB = ~22 IOPS for 30GB)

---

## 1. Cost-Free Optimizations ($0)

### 1.1 Docker Compose Optimizations

Apply explicit memory limits and optimized environment variables to prevent OOM kills
and reduce memory pressure. These changes go into `docker-compose.yml`.

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    mem_limit: 600m
    memswap_limit: 1200m      # Allow up to 600MB swap on top of 600MB RAM
    cpus: 0.9                  # Leave 10% for OS and other containers
    restart: unless-stopped
    environment:
      # --- Memory optimization ---
      - NODE_OPTIONS=--max-old-space-size=384 --max-semi-space-size=16
      # max-old-space-size=384: V8 heap capped at 384MB (leaves room for native allocations)
      # max-semi-space-size=16: Smaller nursery = more frequent but faster GC cycles

      # --- Execution data management ---
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
      # Store binary data on disk, not in PostgreSQL (saves RAM + DB bloat)
      - N8N_BINARY_DATA_TTL=1440
      # Auto-delete binary data after 24h (1440 minutes)
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=48
      # Prune execution history older than 48 hours
      - EXECUTIONS_DATA_PRUNE_MAX_COUNT=500
      # Keep at most 500 executions in DB (prevents PostgreSQL bloat)
      - EXECUTIONS_DATA_SAVE_ON_SUCCESS=none
      # Do NOT save successful execution data (saves massive DB space)
      # Note: We still have eval scripts capturing results externally

      # --- Concurrency control ---
      - N8N_CONCURRENCY_PRODUCTION_LIMIT=2
      # Allow max 2 concurrent workflow executions
      # This prevents 503 errors while allowing minimal parallelism

      # --- Performance ---
      - N8N_DIAGNOSTICS_ENABLED=false
      - N8N_VERSION_NOTIFICATIONS_ENABLED=false
      - N8N_HIRING_BANNER_ENABLED=false
      # Disable telemetry and UI noise to reduce background CPU
    volumes:
      - n8n_data:/home/node/.n8n
      - /tmp/n8n-binary:/tmp/n8n-binary    # Binary data on /tmp for faster I/O
    ports:
      - "5678:5678"

  postgres:
    image: postgres:15-alpine
    mem_limit: 128m
    memswap_limit: 256m
    environment:
      - POSTGRES_SHARED_BUFFERS=32MB        # Default is 128MB, way too much for us
      - POSTGRES_EFFECTIVE_CACHE_SIZE=64MB
      - POSTGRES_WORK_MEM=4MB
      - POSTGRES_MAINTENANCE_WORK_MEM=16MB
    command: >
      postgres
      -c shared_buffers=32MB
      -c effective_cache_size=64MB
      -c work_mem=4MB
      -c maintenance_work_mem=16MB
      -c max_connections=20
      -c checkpoint_completion_target=0.9
      -c wal_buffers=4MB
      -c random_page_cost=4.0
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    mem_limit: 96m
    memswap_limit: 128m
    command: >
      redis-server
      --maxmemory 64mb
      --maxmemory-policy allkeys-lru
      --appendonly no
      --save ""
      --tcp-backlog 128
      --timeout 300
    # maxmemory 64mb: Hard cap on Redis memory usage
    # allkeys-lru: Evict least-recently-used keys when full (good for cache)
    # appendonly no + save "": Disable ALL persistence (pure cache mode)
    # timeout 300: Close idle connections after 5 minutes
    volumes: []    # No volumes needed — pure cache, no persistence

volumes:
  n8n_data:
  postgres_data:
```

**Expected impact**: Prevents OOM kills, reduces PostgreSQL bloat from ~500MB to ~50MB over time,
frees ~200MB RAM for n8n workflow execution.

### 1.2 Linux Kernel Parameters (/etc/sysctl.conf)

These parameters optimize the kernel for a memory-constrained server running a web application.

```bash
# === Memory Management ===
vm.swappiness=10
# Default is 60. Reduce to 10: prefer keeping application pages in RAM,
# only swap when absolutely necessary. On 970MB RAM, swapping is slow death.

vm.vfs_cache_pressure=50
# Default is 100. Reduce to 50: keep filesystem metadata (dentries, inodes) in cache longer.
# n8n reads many small files (workflow JSON); caching metadata helps.

vm.min_free_kbytes=32768
# Reserve 32MB as emergency free memory. Prevents OOM killer from triggering
# during burst allocations (e.g., when n8n processes a complex workflow).

vm.dirty_ratio=10
vm.dirty_background_ratio=5
# Write dirty pages to disk sooner. On slow persistent disk, this prevents
# large write bursts that stall the system.

vm.overcommit_memory=0
vm.overcommit_ratio=80
# Conservative overcommit: allow up to 80% of RAM+swap to be committed.
# Prevents processes from allocating memory they can never use.

# === Network (for webhook handling) ===
net.core.somaxconn=1024
# Increase listen backlog from 128 to 1024. n8n webhook server can queue
# more incoming connections during burst test periods.

net.ipv4.tcp_tw_reuse=1
# Allow reuse of TIME_WAIT sockets for new connections.
# Critical when running 200+ test requests that each open a TCP connection.

net.ipv4.tcp_fin_timeout=15
# Reduce FIN_WAIT timeout from 60s to 15s. Faster socket cleanup
# means more available file descriptors for new connections.

net.ipv4.tcp_keepalive_time=300
net.ipv4.tcp_keepalive_intvl=30
net.ipv4.tcp_keepalive_probes=5
# Detect dead connections faster (5 minutes idle, then probe every 30s, 5 times).

net.core.netdev_max_backlog=2000
# Increase network interface backlog queue. Prevents packet drops during bursts.

# === File descriptors ===
fs.file-max=65536
# Increase max open files system-wide. Docker containers inherit this.
```

**Apply with**:
```bash
sudo sysctl -p /etc/sysctl.conf
```

**Expected impact**: Reduced swap thrashing (~30% fewer swap I/O operations), faster network
handling for webhook tests, prevention of OOM kills during peak usage.

### 1.3 n8n Configuration Recommendations

Beyond the Docker environment variables, these are operational practices:

| Setting | Value | Rationale |
|---------|-------|-----------|
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | `none` | Our eval scripts capture results externally; n8n doesn't need to store them |
| `EXECUTIONS_DATA_PRUNE` | `true` | Automatic cleanup prevents DB growth |
| `EXECUTIONS_DATA_MAX_AGE` | `48` | 2 days of history is sufficient for debugging |
| `N8N_BINARY_DATA_MODE` | `filesystem` | Binary data on disk, not in PostgreSQL |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | `2` | The sweet spot: allows minimal parallelism without 503s |
| `N8N_PAYLOAD_SIZE_MAX` | `16` | Limit payload to 16MB (default is unlimited) |

**Periodic maintenance** (add to crontab):
```bash
# Clean old execution data every 6 hours
0 */6 * * * docker exec n8n-container n8n prune --days=2

# Clean binary data older than 24h
0 4 * * * find /tmp/n8n-binary -mtime +1 -delete 2>/dev/null

# Vacuum PostgreSQL weekly
0 3 * * 0 docker exec postgres-container psql -U n8n -c "VACUUM ANALYZE;"
```

### 1.4 Redis Caching Strategy

Redis serves as a pure in-memory cache with no persistence. The strategy:

| Cache Key Pattern | TTL | Content |
|-------------------|-----|---------|
| `embed:{hash(text)}` | 24h | Embedding vectors (avoid re-calling Jina API) |
| `search:{hash(query+namespace)}` | 1h | Pinecone search results |
| `llm:{hash(prompt+model)}` | 4h | LLM responses for identical prompts |
| `entity:{name}` | 12h | Neo4j entity lookup results |

**Memory budget** (64MB total):
- Embedding cache: ~30MB (~3,000 vectors at 1024-dim float32 = ~12KB each)
- Search results cache: ~15MB
- LLM response cache: ~15MB
- Entity cache: ~4MB

**Eviction**: `allkeys-lru` ensures the least recently used keys are evicted first,
regardless of TTL. This is optimal for a cache workload where recent queries are most
likely to be repeated.

**No persistence**: Since this is a cache, data loss on restart is acceptable. The cache
warms up naturally during test runs. Disabling `AOF` and `RDB` saves both CPU and disk I/O.

---

## 2. Test Parallelization Strategies

### 2.1 Strategy A: Semaphore-based (Recommended for current VM)

**Concept**: Use `asyncio.Semaphore(2)` in Python test scripts to allow up to 2 concurrent
n8n webhook calls, with exponential backoff on 503 errors.

**Implementation** (modify `eval/quick-test.py` and `eval/run-eval-parallel.py`):

```python
import asyncio
import aiohttp
import random

# Global semaphore: max 2 concurrent n8n requests
N8N_SEMAPHORE = asyncio.Semaphore(2)

# Backoff configuration
MAX_RETRIES = 5
BASE_DELAY = 2.0       # seconds
MAX_DELAY = 60.0        # seconds
JITTER_FACTOR = 0.5     # randomize up to 50% of delay

async def call_pipeline_with_backoff(session, url, payload, timeout=120):
    """Call n8n webhook with semaphore and exponential backoff on 503."""
    for attempt in range(MAX_RETRIES):
        async with N8N_SEMAPHORE:
            try:
                async with session.post(url, json=payload, timeout=timeout) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 503:
                        # n8n overloaded — back off
                        delay = min(BASE_DELAY * (2 ** attempt), MAX_DELAY)
                        jitter = delay * JITTER_FACTOR * random.random()
                        wait = delay + jitter
                        print(f"  [503] Attempt {attempt+1}/{MAX_RETRIES}, "
                              f"waiting {wait:.1f}s...")
                        await asyncio.sleep(wait)
                        continue
                    else:
                        print(f"  [HTTP {resp.status}] Unexpected error")
                        return None
            except asyncio.TimeoutError:
                print(f"  [TIMEOUT] Attempt {attempt+1}/{MAX_RETRIES}")
                await asyncio.sleep(BASE_DELAY * (attempt + 1))
                continue
            except aiohttp.ClientError as e:
                print(f"  [ERROR] {e}")
                await asyncio.sleep(BASE_DELAY)
                continue

    print(f"  [FAILED] All {MAX_RETRIES} attempts exhausted")
    return None

async def run_pipeline_tests(questions, pipeline_url):
    """Run all questions for a pipeline with controlled concurrency."""
    async with aiohttp.ClientSession() as session:
        tasks = [
            call_pipeline_with_backoff(session, pipeline_url, q)
            for q in questions
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

**Expected performance**:
| Metric | Sequential (current) | Semaphore(2) |
|--------|---------------------|--------------|
| Throughput | 1 req/60s | ~1.5-1.8 req/60s |
| Time for 200q | ~3.3h | ~1.8-2.2h |
| 503 errors | 0% | <2% (with backoff) |
| Memory overhead | Baseline | +~5MB (async overhead) |

**Speedup**: 1.5-1.8x improvement. Modest but risk-free.

**Why not Semaphore(3) or higher**: With 970MB RAM and n8n already at 68MB baseline, each
concurrent execution adds ~50-100MB for workflow state, LLM API calls in flight, and response
buffering. Semaphore(2) keeps peak n8n memory under ~300MB, safe within our 600MB container limit.

### 2.2 Strategy B: n8n Queue Mode (Requires upgrade)

**Concept**: n8n supports a "queue mode" where a main instance handles the UI and API,
while separate worker instances process executions from a Redis queue.

**Architecture**:
```
                    +-------------------+
                    |   n8n Main (UI)   |
                    |   Port 5678       |
                    |   ~100MB RAM      |
                    +--------+----------+
                             |
                    +--------v----------+
                    |   Redis (broker)  |
                    |   ~64MB RAM       |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v-----+  +-----v------+
     | Worker #1  |  | Worker #2  |  | Worker #3  |
     | ~200MB RAM |  | ~200MB RAM |  | ~200MB RAM |
     +------------+  +------------+  +------------+
```

**Configuration** (in docker-compose):
```yaml
n8n-main:
  environment:
    - EXECUTIONS_MODE=queue
    - QUEUE_BULL_REDIS_HOST=redis
  # Main does NOT execute workflows, only serves UI + API

n8n-worker-1:
  command: worker
  environment:
    - EXECUTIONS_MODE=queue
    - QUEUE_BULL_REDIS_HOST=redis
    - QUEUE_BULL_REDIS_PORT=6379
    - N8N_CONCURRENCY_PRODUCTION_LIMIT=1
```

**Requirements**:
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB (1 main + 1 worker) | 4 GB (1 main + 3 workers) |
| CPU | 1 vCPU sustained | 2 vCPUs |
| Cost | $12.23/mo (e2-small) | $24.46/mo (e2-medium) |

**Verdict**: Not viable on current e2-micro. Requires VM upgrade (see Section 4).

### 2.3 Strategy C: GitHub Codespaces (NEW -- Promising)

**Concept**: Use GitHub's free Codespace tier as an ephemeral testing environment.
Run multiple isolated n8n instances (one per pipeline) for true parallel testing.

**Free tier allowance**:
- 120 core-hours/month (2-core machine)
- 15 GB-months storage
- 8 GB RAM per Codespace

**Architecture**:
```
GitHub Codespace (2 cores, 8GB RAM)
  |
  +-- docker-compose.yml
  |     |
  |     +-- n8n-standard  (port 5678) --> Pinecone (external)
  |     +-- n8n-graph     (port 5679) --> Neo4j (external) + Supabase (external)
  |     +-- n8n-quant     (port 5680) --> Supabase (external)
  |     +-- n8n-orch      (port 5681) --> Routes to 5678/5679/5680
  |     +-- postgres      (port 5432) --> Shared DB for all n8n instances
  |     +-- redis          (port 6379) --> Shared cache
  |
  +-- eval/ scripts (cloned from repo)
  +-- datasets/ (cloned from repo)
```

**Memory budget** (8GB Codespace):
| Component | Memory |
|-----------|--------|
| n8n-standard | 512 MB |
| n8n-graph | 512 MB |
| n8n-quant | 512 MB |
| n8n-orch | 512 MB |
| PostgreSQL | 256 MB |
| Redis | 128 MB |
| OS + overhead | 1 GB |
| **Total** | **~3.4 GB** (well within 8GB) |

**Workflow**:
1. Create Codespace from `mon-ipad` repo (`.devcontainer/devcontainer.json`)
2. Import n8n workflows via API (from `n8n/live/*.json`)
3. Configure credentials via environment variables
4. Run parallel eval: `python3 eval/run-eval-parallel.py --parallel-pipelines`
5. Results sync back to repo via `git push`
6. Stop Codespace when not testing (to conserve hours)

**Time budget**:
- 120 core-hours / 2 cores = 60 hours of Codespace uptime per month
- Each full eval (200q x 4 pipelines) takes ~3.3h with true parallelism
- That's ~18 full evals per month -- more than enough

**Key advantage**: External services (Pinecone, Neo4j Aura, Supabase, OpenRouter, Jina)
are accessible from anywhere. The Codespace only needs to run n8n + PostgreSQL + Redis.
No data migration required.

**Key risk**: Codespace cold start takes 2-5 minutes. n8n workflow import adds 1-2 minutes.
Credentials must be stored as GitHub Codespace secrets (not in repo).

**devcontainer.json** (to add to repo):
```json
{
  "name": "Multi-RAG Test Environment",
  "dockerComposeFile": "docker-compose.test.yml",
  "service": "workspace",
  "forwardPorts": [5678, 5679, 5680, 5681],
  "postCreateCommand": "bash .devcontainer/setup.sh",
  "secrets": {
    "OPENROUTER_API_KEY": { "description": "OpenRouter API key for LLM calls" },
    "JINA_API_KEY": { "description": "Jina AI API key for embeddings" },
    "PINECONE_API_KEY": { "description": "Pinecone API key" },
    "NEO4J_PASSWORD": { "description": "Neo4j Aura password" },
    "SUPABASE_KEY": { "description": "Supabase service role key" }
  }
}
```

### 2.4 Strategy D: Oracle Cloud Always Free (Best free option)

**Concept**: Oracle Cloud Infrastructure (OCI) offers an "Always Free" ARM-based VM
that dwarfs the current GCP e2-micro.

**Specs (Always Free tier)**:
| Resource | Oracle ARM Free | GCP e2-micro (current) | Ratio |
|----------|----------------|----------------------|-------|
| CPU | 4 OCPUs (ARM Ampere A1) | 0.25 vCPU (shared x86) | **16x** |
| RAM | 24 GB | 970 MB | **~24x** |
| Storage | 200 GB block + 40 GB boot = **240 GB** | 30 GB | **8x** |
| Network | 480 Mbps | 1 Gbps (throttled) | Comparable |
| Cost | $0 forever | $0 forever | Same |

**What this enables**:
- n8n queue mode with 3-4 workers (each 512MB-1GB)
- Full parallel testing of all 4 pipelines simultaneously
- Room for additional services (local vector DB, monitoring)
- Comfortable headroom for Phase 3-4 scaling (10K-100K questions)

**Architecture on Oracle ARM**:
```
Oracle Cloud ARM VM (4 OCPU, 24GB RAM)
  |
  +-- n8n Main (UI + API)           512 MB
  +-- n8n Worker 1 (Standard)       1 GB
  +-- n8n Worker 2 (Graph)          1 GB
  +-- n8n Worker 3 (Quant + Orch)   1 GB
  +-- PostgreSQL                     2 GB (proper shared_buffers)
  +-- Redis                          512 MB (real caching)
  +-- Monitoring (Prometheus+Grafana) 512 MB
  +-- OS + headroom                  ~17 GB free
```

**Catch**: Oracle Free Tier ARM instances are subject to availability. In popular regions
(us-ashburn-1, us-phoenix-1), they are frequently "out of capacity." Less popular regions
(ap-melbourne-1, sa-saopaulo-1, eu-marseille-1) tend to have better availability.

**Strategy to claim one**:
1. Create OCI account (free, no credit card for Always Free)
2. Use a less popular region (eu-marseille-1 recommended for latency to external services)
3. If "out of capacity," retry every few hours or use OCI CLI automation:
   ```bash
   # Retry loop to claim ARM instance
   while true; do
     oci compute instance launch \
       --shape VM.Standard.A1.Flex \
       --shape-config '{"ocpus":4,"memoryInGBs":24}' \
       --availability-domain "..." \
       --image-id "..." \
       --subnet-id "..." && break
     sleep 300  # retry every 5 minutes
   done
   ```

**Migration path**: Since all external services (Pinecone, Neo4j, Supabase, OpenRouter, Jina)
are cloud-hosted, migration is just:
1. Provision Oracle ARM VM
2. Install Docker
3. Copy `docker-compose.yml` + workflow JSONs
4. Import workflows via n8n API
5. Update DNS/IP references in eval scripts
6. Run validation tests

---

## 3. RAG Techniques Ranked by Impact/Feasibility

These techniques can improve pipeline accuracy and are ranked by expected impact relative
to implementation effort. All are $0 cost using existing free-tier services.

| Rank | Technique | Expected Impact | Cost | Feasibility | Pipeline | Notes |
|------|-----------|----------------|------|-------------|----------|-------|
| 1 | **Hybrid Search** (sparse + dense) | +10-20% recall | $0 | HIGH | Standard | Pinecone supports sparse vectors natively. Combine BM25-style sparse with Jina dense embeddings. Already have Pinecone `pinecone-sparse-english-v0` model available. |
| 2 | **Reranking** (Jina Reranker v2) | +25-48% precision@k | $0 | HIGH | All | Already configured (`jina-reranker-v2-base-multilingual`). Apply after initial retrieval, before LLM. Proven to dramatically improve answer quality. |
| 3 | **HyDE** (Hypothetical Document Embeddings) | +15-42% recall | $0 | HIGH | Standard, Graph | Generate a hypothetical answer, embed it, search with that embedding. Works especially well for questions where the phrasing differs from the stored documents. Already have `LLM_HYDE_MODEL` configured. |
| 4 | **Late Chunking** (Jina v3 native) | +2-4% recall | $0 | MEDIUM | Standard | Jina embeddings v3 supports late chunking natively. Process full documents through the model, then chunk the embeddings. Preserves cross-chunk context that naive chunking loses. |
| 5 | **Contextual Retrieval** (Anthropic technique) | +10pp accuracy | $0 | MEDIUM | Standard, Graph | Prepend contextual summaries to each chunk before embedding. "This chunk discusses X in the context of Y." Requires re-indexing but dramatically improves retrieval for ambiguous queries. |
| 6 | **Semantic Chunking** | +9% recall | $0 | MEDIUM | Standard | Replace fixed-size chunking with semantic boundary detection. Split at paragraph/section boundaries based on embedding similarity drops. Requires re-ingestion pipeline work. |
| 7 | **CRAG-lite** (Corrective RAG) | Reduces hallucination | $0 | MEDIUM | All | After retrieval, assess relevance of each chunk. If relevance score < threshold, trigger a second retrieval with reformulated query. Adds latency (~2x) but catches retrieval failures. |
| 8 | **Query Decomposition** | Critical for multi-hop | $0 | LOW | Graph, Orchestrator | Break complex questions into sub-questions, retrieve for each, merge results. Essential for multi-hop questions (musique, 2wikimultihopqa). Complex to implement in n8n. |
| 9 | **Adaptive Retrieval** (Self-RAG) | +5-15% overall | $0 | LOW | Orchestrator | Model decides whether to retrieve, and evaluates retrieval quality. Requires fine-tuned judge or careful prompt engineering. Most complex to implement. |

### Implementation Priority Matrix

**Immediate wins** (can implement today in n8n workflows):
1. Reranking -- already have Jina Reranker configured, just wire it into pipelines
2. HyDE -- already have HyDE model configured, add a pre-retrieval step

**Short-term** (1-3 days):
3. Hybrid Search -- enable sparse vectors in Pinecone, dual-encode queries

**Medium-term** (1-2 weeks):
4. Contextual Retrieval -- requires re-indexing with contextual prefixes
5. CRAG-lite -- add relevance scoring + fallback retrieval loop

**Long-term** (Phase 3+):
6. Query Decomposition -- critical for scaling to multi-hop datasets
7. Adaptive Retrieval -- needs evaluation framework to measure self-RAG benefit

---

## 4. VM Upgrade Options

### Comparison Table

| Instance Type | CPU | RAM | Disk | Cost/month | Key Benefit | Notes |
|---------------|-----|-----|------|------------|-------------|-------|
| **e2-micro** (current) | 0.25 vCPU shared | 1 GB | 30 GB | $0 (free tier) | Baseline | Memory-constrained |
| **e2-small** | 0.50 vCPU shared | 2 GB | 30 GB | $12.23 | 2x RAM/CPU | Can run Semaphore(3) safely |
| **e2-medium** | 1.0 vCPU shared | 4 GB | 30 GB | $24.46 | Queue mode possible | 1 main + 2 workers |
| **e2-standard-2** | 2 vCPU dedicated | 8 GB | 30 GB | $48.92 | Full parallelism | 1 main + 4 workers |
| **Oracle ARM Free** | 4 OCPU dedicated | 24 GB | 240 GB | **$0** (forever free) | Massive upgrade | Best free option |
| **GitHub Codespaces** | 2 cores | 8 GB | 32 GB | **$0** (120h/mo) | Ephemeral parallel testing | Complements main VM |

### Cost-Benefit Analysis

**Option 1: Stay on e2-micro + Semaphore(2)** -- $0/month
- 1.5-1.8x speedup on tests
- Sufficient for Phase 1-2 (200-1,200 questions)
- Will struggle at Phase 3+ (10K+ questions)

**Option 2: e2-micro + GitHub Codespaces** -- $0/month
- True parallel testing when needed (spin up Codespace)
- e2-micro handles day-to-day development
- 60 hours/month of parallel testing capacity
- Best of both worlds at zero cost

**Option 3: Oracle ARM Free** -- $0/month
- 24x RAM, 16x CPU -- eliminates all resource constraints
- Can run queue mode, monitoring, everything
- Risk: availability issues, Oracle ecosystem learning curve
- Reward: free forever, no migration needed for external services

**Option 4: GCP e2-small upgrade** -- $12.23/month
- Minimal improvement (2x RAM)
- Not enough for queue mode
- Poor value compared to Oracle Free or Codespaces

**Recommendation**: Start with Option 1 (Semaphore on current VM) immediately, then pursue
Option 2 (Codespaces) for parallel eval runs, and attempt Option 3 (Oracle ARM) as a
strategic long-term move.

---

## 5. Recommended Roadmap

### Phase 1: Immediate ($0, <1 hour)

These changes can be applied right now with zero risk.

**Actions**:
1. Apply sysctl parameters to `/etc/sysctl.conf` and run `sudo sysctl -p`
2. Update `docker-compose.yml` with memory limits and n8n environment variables
3. Set Redis to pure cache mode (no persistence, LRU eviction)
4. Restart Docker stack: `docker compose down && docker compose up -d`
5. Verify: `docker stats` shows containers respecting limits

**Expected results**:
- n8n no longer risks OOM kill
- PostgreSQL execution history auto-pruned
- Redis operates as efficient LRU cache
- ~200MB additional free RAM for n8n workflow processing

**Validation**:
```bash
# Check memory usage after restart
docker stats --no-stream

# Verify n8n is responsive
curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz

# Run smoke test
source .env.local && python3 eval/quick-test.py --questions 1 --pipeline standard
```

### Phase 2: Short-term ($0, 1-3 hours)

**Actions**:
1. Modify `eval/quick-test.py` to use `asyncio.Semaphore(2)` + exponential backoff
2. Modify `eval/run-eval-parallel.py` with same pattern
3. Add retry logic with 503 detection to all webhook callers
4. Test with 10 questions per pipeline to validate stability
5. Wire Jina Reranker into Standard RAG pipeline (n8n workflow modification)
6. Add HyDE pre-retrieval step to Orchestrator pipeline

**Expected results**:
- 1.5-1.8x faster test runs
- Zero 503 errors (backoff handles them gracefully)
- Reranking improves Standard accuracy by 5-15pp
- HyDE improves retrieval recall for ambiguous queries

**Validation**:
```bash
source .env.local
python3 eval/quick-test.py --questions 10 --pipeline standard   # Should show improved accuracy
python3 eval/quick-test.py --questions 10 --pipeline orchestrator  # Should handle concurrent gracefully
```

### Phase 3: Medium-term ($0, 1-2 days)

**Actions**:
1. Enable hybrid search on Pinecone:
   - Create sparse index using `pinecone-sparse-english-v0` model
   - Dual-encode queries (dense via Jina + sparse)
   - Merge results with weighted combination (alpha=0.7 dense, 0.3 sparse)
2. Set up GitHub Codespace configuration:
   - Create `.devcontainer/devcontainer.json`
   - Create `docker-compose.test.yml` for multi-instance n8n
   - Create `.devcontainer/setup.sh` for automated workflow import
   - Test one full parallel eval run in Codespace
3. Implement SSE (Server-Sent Events) for live dashboard:
   - Add Next.js Route Handler at `/api/stream`
   - Stream test results in real-time to `docs/index.html`
4. Add CRAG-lite to Standard pipeline:
   - Score retrieval relevance after Pinecone search
   - If relevance < 0.3, reformulate query and retry

**Expected results**:
- Hybrid search: +10-20% recall on Standard pipeline
- Codespace: ability to run 4 pipelines truly in parallel (3.3h instead of 13.2h)
- Live dashboard: real-time visibility into test progress
- CRAG: fewer hallucinations from irrelevant retrievals

### Phase 4: Strategic ($0, 1-2 weeks)

**Actions**:
1. Attempt Oracle Cloud ARM provisioning:
   - Create OCI account
   - Try eu-marseille-1 or ap-melbourne-1 region
   - If successful, provision 4 OCPU / 24GB ARM instance
   - Migrate Docker stack
   - Enable n8n queue mode with 3 workers
2. **OR** if Oracle unavailable, upgrade GCP to e2-small ($12.23/month):
   - Simple resize in GCP console
   - Enable Semaphore(3) with more RAM headroom
3. Implement Query Decomposition for multi-hop questions:
   - Critical for Phase 2 datasets (musique, 2wikimultihopqa)
   - Break complex questions into sub-questions
   - Parallel sub-retrieval, then merge

**Expected results**:
- Oracle ARM: eliminates all resource constraints, enables queue mode
- Query Decomposition: Graph pipeline accuracy improvement for multi-hop
- Ready for Phase 2 (1,000 questions) and Phase 3 (10K questions)

---

## 6. Sector Pipeline Duplication Plan (Future — Phase 5)

When pipelines reach production readiness (Phase 5), the system must scale to handle
sector-specific queries across multiple domains.

### Duplication Strategy

**Current**: 4 generic pipelines
**Target**: 4 pipelines x N sectors = 4N pipeline instances

**Initial sectors** (4):
| Sector | Data Sources | Database Growth |
|--------|-------------|-----------------|
| Finance | SEC filings, earnings calls, financial reports | +100K vectors, +50K SQL rows |
| Healthcare | PubMed, clinical trials, drug databases | +200K vectors, +10K graph nodes |
| Technology | Patents, documentation, research papers | +150K vectors, +20K graph nodes |
| Legal | Case law, regulations, contracts | +100K vectors, +15K graph nodes |

### Resource Estimates per Sector

Each sector requires:
| Resource | Per Sector | 4 Sectors Total |
|----------|------------|-----------------|
| Pinecone vectors | ~100K-200K | ~400K-800K (free tier: 100K max; need Standard plan) |
| Neo4j nodes | ~10K-50K | ~40K-200K (Aura Free: 50K max; need Professional) |
| Supabase rows | ~50K-100K | ~200K-400K (free tier: 500MB; may suffice) |
| n8n workflows | 4 pipeline + 2 support | 24 pipeline + 8 support |
| n8n workers | 1-2 per sector | 4-8 workers total |

### Infrastructure for Phase 5

**Minimum viable** (4 sectors):
| Component | Spec | Cost/month |
|-----------|------|------------|
| Compute (Oracle ARM or GCP) | 4 OCPU, 24GB RAM | $0 (Oracle) or $48.92 (GCP e2-standard-2) |
| Pinecone Standard | 1M vectors, 1 pod | ~$70 |
| Neo4j Professional | 200K nodes | ~$65 |
| Supabase Pro | 8GB storage | ~$25 |
| **Total** | | **$160-210/month** |

**Recommended approach**:
1. Keep Oracle ARM for compute ($0)
2. Upgrade databases only when free tiers are exhausted
3. Use Pinecone serverless (pay-per-query) instead of pods
4. Implement namespace isolation: each sector in its own Pinecone namespace + Neo4j labels

### n8n Workflow Duplication

Pipelines are duplicated per sector using n8n's API:
```bash
# Clone Standard RAG for Finance sector
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard RAG V3.4 — Finance",
    "nodes": [...],  # Copied from Standard RAG, with namespace changed to "finance-*"
    "settings": { "executionOrder": "v1" }
  }'
```

Each sector-specific pipeline differs only in:
- Pinecone namespace prefix (e.g., `finance-*`, `health-*`)
- Neo4j label filter (e.g., `WHERE n:Finance`)
- Supabase table prefix (e.g., `finance_*`)
- LLM system prompt (sector context)

---

## 7. Live Test Streaming Architecture

### Why SSE over WebSocket

| Feature | SSE (Server-Sent Events) | WebSocket |
|---------|-------------------------|-----------|
| Direction | Server-to-client only | Bidirectional |
| Complexity | Simple HTTP endpoint | Connection management |
| Auto-reconnect | Built-in browser API | Manual implementation |
| Proxy/CDN friendly | Yes (standard HTTP) | Requires upgrade |
| Our need | One-way test results | Overkill |

**Decision**: SSE is the right choice. Our dashboard only needs to receive updates
(test results, pipeline status, metrics). There is no client-to-server data flow.

### Architecture

```
eval/run-eval-parallel.py
  |
  +-- Writes results to status.json (1.5KB) after each question
  |
  +-- POST /api/notify (optional) --> Next.js API route
                                        |
                                        +-- SSE broadcast to connected clients

Browser (docs/index.html)
  |
  +-- EventSource('/api/stream')
  |     |
  |     +-- onmessage: 'test-result'      --> Update results table
  |     +-- onmessage: 'pipeline-status'   --> Update pipeline cards
  |     +-- onmessage: 'metrics'           --> Update accuracy charts
  |
  +-- Fallback: poll /docs/status.json every 10s
```

### Next.js Route Handler

```typescript
// website/app/api/stream/route.ts
import { NextRequest } from 'next/server';

// In-memory event queue (reset on server restart — acceptable for dev)
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send initial state
      const data = `event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',    // Disable nginx buffering
    },
  });
}

// Notify endpoint (called by eval scripts)
export async function POST(request: NextRequest) {
  const event = await request.json();
  const encoded = new TextEncoder().encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
  );

  for (const controller of clients) {
    try {
      controller.enqueue(encoded);
    } catch {
      clients.delete(controller);
    }
  }

  return Response.json({ ok: true, clients: clients.size });
}
```

### Event Types

| Event | Trigger | Payload | Size |
|-------|---------|---------|------|
| `test-result` | After each question evaluated | `{ pipeline, question_id, correct, latency_ms, answer_preview }` | ~200 bytes |
| `pipeline-status` | After pipeline batch completes | `{ pipeline, accuracy, tested, correct, errors }` | ~100 bytes |
| `metrics` | Every 10 questions or 60 seconds | `{ overall_accuracy, progress_pct, elapsed_s, eta_s }` | ~80 bytes |
| `error` | On pipeline error | `{ pipeline, question_id, error_type, message }` | ~150 bytes |
| `complete` | Eval run finished | `{ total_tested, overall_accuracy, duration_s, pipelines: {...} }` | ~300 bytes |

### Dashboard Integration

**Key principle**: Poll `status.json` (1.5KB) for state recovery, use SSE for real-time updates.
Never poll `data.json` (1.26MB) -- it is too large for frequent polling.

```javascript
// Browser-side SSE client
const eventSource = new EventSource('/api/stream');

eventSource.addEventListener('test-result', (e) => {
  const result = JSON.parse(e.data);
  updateResultsTable(result);
  incrementProgressBar();
});

eventSource.addEventListener('pipeline-status', (e) => {
  const status = JSON.parse(e.data);
  updatePipelineCard(status.pipeline, status);
});

eventSource.addEventListener('metrics', (e) => {
  const metrics = JSON.parse(e.data);
  updateAccuracyChart(metrics);
  updateETA(metrics.eta_s);
});

eventSource.addEventListener('error', () => {
  // SSE auto-reconnects. Fall back to polling during disconnection.
  startPollingFallback();
});

function startPollingFallback() {
  const interval = setInterval(async () => {
    try {
      const resp = await fetch('/docs/status.json');
      if (resp.ok) {
        const data = await resp.json();
        updateDashboardFromStatus(data);
      }
    } catch { /* ignore, keep polling */ }
  }, 10000);  // Poll every 10 seconds

  // Stop polling when SSE reconnects
  eventSource.addEventListener('connected', () => clearInterval(interval));
}
```

### Delta Updates for Efficiency

Instead of sending full state on every event, send deltas:

```python
# In eval script: send only changed fields
last_sent = {}

def send_update(event_type, data):
    """Send only fields that changed since last update."""
    global last_sent
    key = event_type

    if key in last_sent:
        delta = {k: v for k, v in data.items() if last_sent[key].get(k) != v}
        if not delta:
            return  # Nothing changed
        delta['_delta'] = True
    else:
        delta = data

    last_sent[key] = data.copy()

    requests.post('http://localhost:3000/api/stream', json={
        'type': event_type,
        'data': delta
    })
```

---

## 8. Monitoring and Alerting (Future)

Once infrastructure scales beyond the current single-VM setup, add:

### Lightweight Monitoring Stack (fits in 512MB)

| Tool | Purpose | Memory |
|------|---------|--------|
| **Prometheus** (or VictoriaMetrics) | Metrics collection | ~200 MB |
| **Grafana** | Dashboards | ~200 MB |
| **Node Exporter** | VM metrics | ~20 MB |
| **cAdvisor** | Container metrics | ~50 MB |

### Key Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| n8n execution duration | n8n API | > 120s (2x normal) |
| n8n 503 error rate | eval scripts | > 5% of requests |
| Container memory usage | cAdvisor | > 90% of limit |
| Swap usage | Node Exporter | > 50% of swap |
| Disk usage | Node Exporter | > 85% |
| Pipeline accuracy regression | eval scripts | > 5pp drop from baseline |
| External API response time | eval scripts | > 10s (Pinecone, Neo4j, etc.) |

### Not recommended for current VM

Monitoring adds ~500MB memory overhead. On e2-micro (970MB total), this would starve n8n.
Deploy monitoring only after migrating to Oracle ARM (24GB) or equivalent.

---

## Appendix A: Quick Reference Commands

```bash
# === Docker Memory Check ===
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}"

# === System Memory Check ===
free -h && cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|SwapTotal|SwapFree'

# === Apply sysctl ===
sudo sysctl -p /etc/sysctl.conf

# === Restart Docker Stack ===
cd /home/termius/mon-ipad && docker compose down && docker compose up -d

# === Verify n8n Health ===
curl -s http://localhost:5678/healthz

# === Check Disk Usage ===
df -h / && du -sh /var/lib/docker/

# === Clean Docker ===
docker system prune -f --volumes  # WARNING: removes unused volumes

# === PostgreSQL execution count ===
docker exec postgres-container psql -U n8n -c "SELECT count(*) FROM execution_entity;"

# === Redis memory usage ===
docker exec redis-container redis-cli INFO memory | grep used_memory_human
```

## 9. Docker Per Repo (Architecture Distribuee)

Chaque repo a sa propre configuration Docker, adaptee a son role.

| Repo | Localisation Docker | Containers | Capacite |
|------|-------------------|------------|----------|
| **mon-ipad** | VM permanent | n8n + postgres + redis | Stockage + pilotage, 0 tests lourds |
| **rag-tests** | Codespace | n8n + 3 workers + pg + redis | ~180-360 q/h (3 workers, rate-limit OpenRouter) |
| **rag-website** | Codespace | n8n + pg | Dev sector pipelines |
| **rag-data-ingestion** | Codespace | n8n + 2 workers + pg + redis | Ingestion parallele |

### Workers et scaling
- Workers multipliables en queue mode Redis (1 worker = 1 execution concurrente)
- Limite RAM Codespace (8GB) → max ~5 workers par Codespace
- Bottleneck reel = OpenRouter free tier (20 req/min)
- Augmenter les workers au-dela de 3 n'ameliore pas le throughput si OpenRouter rate-limite

### Roles Docker par environnement
| Environnement | n8n | Workers | Tests | Ingestion |
|---------------|-----|---------|-------|-----------|
| VM (mon-ipad) | Up (stockage workflows) | 0 | NON (RAM ~100MB) | NON |
| Codespace rag-tests | Up (locale) | 3 | OUI (50-1000q) | NON |
| Codespace rag-website | Up (locale) | 0 | OUI (sectoriels) | OUI (sectoriels) |
| Codespace rag-data-ingestion | Up (locale) | 2 | NON | OUI (massive) |

---

## Appendix B: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-16 | Semaphore(2) as first parallelization step | Zero-risk, immediate 1.5x speedup |
| 2026-02-16 | SSE over WebSocket for dashboard | Simpler, auto-reconnect, one-way sufficient |
| 2026-02-16 | Oracle ARM as strategic target | 24x RAM at $0 vs $24.46/mo for 4x RAM on GCP |
| 2026-02-16 | GitHub Codespaces for parallel eval | Free 120h/mo, 8GB RAM, complements main VM |
| 2026-02-16 | Reranking + HyDE as priority RAG improvements | Highest impact-to-effort ratio |
| 2026-02-16 | Redis as pure cache (no persistence) | 970MB RAM means every MB counts |
| 2026-02-16 | Poll status.json (1.5KB), never data.json (1.26MB) | Bandwidth + CPU efficiency |
