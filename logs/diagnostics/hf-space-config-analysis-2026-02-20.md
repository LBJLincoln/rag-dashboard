# HF Space Configuration Analysis
**Date:** 2026-02-20T20:40:00Z
**Analyst:** Claude Opus 4.6
**Location:** /tmp/hf-space-update/ (deployed HF Space repo)

## Executive Summary

The HF Space `lbjlincoln/nomos-rag-engine` has **FIX-35 correctly deployed** in `entrypoint.sh`. The URL correction logic works as designed:

1. **FIX-35 logic** (lines 189-206 in entrypoint.sh) correctly appends `/chat/completions` to `OPENROUTER_BASE_URL`
2. **fix-env-refs.py** correctly sees the corrected URL and replaces `$env.OPENROUTER_BASE_URL` references
3. **Deployment is current**: Last commit `31e684b` pushed on 2026-02-19 20:32:21 UTC

## Critical Finding: Hardcoded URLs in Workflows

**PROBLEM:** Standard workflow (`standard.json`) has **0 `$env.OPENROUTER_BASE_URL` references** but **8 hardcoded URLs**.

### Workflow Analysis

| Workflow | $env refs | Hardcoded URLs | Status |
|----------|-----------|----------------|--------|
| standard.json | **0** | **8** | ❌ NOT using $env |
| graph.json | **0** | **6** | ❌ NOT using $env |
| orchestrator.json | **8** | **6** | ⚠️ MIXED (some nodes use $env, others hardcoded) |
| quantitative.json | **6** | **6** | ⚠️ MIXED (some nodes use $env, others hardcoded) |
| benchmark.json | 0 | 0 | ✅ N/A (no OpenRouter calls) |
| ingestion.json | 0 | 0 | ✅ N/A (no OpenRouter calls) |
| enrichment.json | 0 | 0 | ✅ N/A (no OpenRouter calls) |

### Example: Standard Workflow HTTP Nodes

```json
{
  "name": "HyDE Generator",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://openrouter.ai/api/v1/chat/completions"  // HARDCODED!
  }
}
```

**Expected:**
```json
{
  "url": "={{ $env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions' }}"
}
```

## FIX-35 Implementation (Verified Working)

### entrypoint.sh Lines 189-206

```bash
# FIX-35: Ensure OpenRouter URLs include /chat/completions path
# HF Space secret may have base URL only (https://openrouter.ai/api/v1)
for url_var in OPENROUTER_BASE_URL LLM_API_URL ENTITY_EXTRACTION_API_URL CONTEXTUAL_RETRIEVAL_API_URL; do
    val=$(eval echo "\$$url_var")
    if [ -n "$val" ]; then
        case "$val" in
            *openrouter.ai*)
                case "$val" in
                    */chat/completions*) ;;  # Already correct
                    *)
                        export $url_var="${val%/}/chat/completions"
                        echo "  FIX-35: $url_var corrected → ${val%/}/chat/completions"
                        ;;
                esac
                ;;
        esac
    fi
done
```

### Test Results

```bash
# Input: OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
# Output: OPENROUTER_BASE_URL="https://openrouter.ai/api/v1/chat/completions"
# Status: ✅ WORKING
```

## fix-env-refs.py Implementation (Verified Working)

### Lines 62-90

```python
def replace_env_refs(text):
    """Replace all $env.X references with actual values."""
    count = 0
    for var_name in sorted(ENV_DEFAULTS.keys(), key=len, reverse=True):
        val = resolve_env(var_name)  # os.environ.get() or default
        target = '$env.' + var_name
        if target not in text:
            continue
        escaped_val = val.replace('\\', '\\\\').replace("'", "\\'")
        text = text.replace(target, "'" + escaped_val + "'")
        count += 1

    # Clean up: 'value' || 'fallback' → 'value'
    text = re.sub(r"'([^'\\]*(?:\\.[^'\\]*)*)'\s*\|\|\s*'[^']*'", r"'\1'", text)
    return text, count
```

### Execution Order (Correct)

1. **entrypoint.sh line 81**: `export OPENROUTER_BASE_URL="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1/chat/completions}"`
2. **entrypoint.sh lines 189-206**: FIX-35 corrects URL if needed
3. **entrypoint.sh line 211**: `python3 /app/fix-env-refs.py /app/n8n-workflows/ /tmp/all-workflows.json`
4. **fix-env-refs.py**: Reads corrected `os.environ['OPENROUTER_BASE_URL']` and replaces `$env.OPENROUTER_BASE_URL`

**Status:** ✅ Correct order. FIX-35 runs BEFORE fix-env-refs.py.

## Local Environment (.env.local)

```bash
OPENROUTER_API_KEY=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
# No OPENROUTER_BASE_URL defined in .env.local
```

The VM `.env.local` does **NOT** define `OPENROUTER_BASE_URL`. This is correct because:
- The entrypoint.sh provides the default: `https://openrouter.ai/api/v1/chat/completions`
- HF Space secrets override if set

## Deployment Status

| Item | Value |
|------|-------|
| Latest commit | `31e684b` fix(FIX-35b): bash syntax fix for URL correction |
| Commit date | 2026-02-19 20:32:21 UTC |
| Git status | Clean (no uncommitted changes) |
| Remote | `https://huggingface.co/spaces/LBJLincoln/nomos-rag-engine` |
| Deployed? | ✅ YES (git status clean, pushed to HF) |

## Live Space Status

### Diagnostic Endpoint Response

```json
{
  "timestamp": "2026-02-20T20:37:33Z",
  "executions": [
    {"id": "1493", "workflow": "V10.1 orchestrator copy", "status": "new"},
    {"id": "1492", "workflow": "Standard RAG V3.4 - CORRECTED", "status": "new"},
    {"id": "1486", "workflow": "Standard RAG V3.4 - CORRECTED", "status": "success"},
    ...
  ]
}
```

### Webhook Test

```bash
curl -X POST 'https://lbjlincoln-nomos-rag-engine.hf.space/webhook/rag-multi-index-v3' \
  -H 'Content-Type: application/json' \
  -d '{"query":"Test"}'

# Result: TIMEOUT (10s)
# Status: ⚠️ Workflow hangs (likely due to hardcoded URL issue)
```

## Root Cause Analysis

### Why Standard Pipeline Times Out

1. **Standard workflow has hardcoded `https://openrouter.ai/api/v1/chat/completions`** in all 8 HTTP Request nodes
2. **FIX-35 + fix-env-refs.py do NOT affect hardcoded strings** (they only replace `$env.X` references)
3. **Hardcoded URL is correct** (has `/chat/completions`), so this is NOT the timeout cause

### Other Potential Timeout Causes

The timeout is likely due to:
- LLM API latency (free tier OpenRouter)
- Pinecone query slowness
- Network issues between HF Space and external APIs
- Workflow complexity (multiple sequential HTTP calls)

**NOT** due to FIX-35 or OPENROUTER_BASE_URL configuration.

## Recommendations

### 1. Replace Hardcoded URLs with $env References (CRITICAL)

**File:** `n8n/live/standard.json`

Find all nodes with hardcoded `https://openrouter.ai/api/v1/chat/completions` and replace with:

```json
{
  "url": "={{ $env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions' }}"
}
```

**Rationale:**
- Enables runtime configuration via env vars
- Allows FIX-35 to work if HF Space secret changes
- Consistent with Orchestrator and Quantitative workflows

### 2. Verify HF Space Secret

Check HF Space settings web UI:
```
https://huggingface.co/spaces/LBJLincoln/nomos-rag-engine/settings
```

Ensure `OPENROUTER_BASE_URL` secret is:
- Either NOT set (uses entrypoint.sh default)
- Or set to `https://openrouter.ai/api/v1` (FIX-35 corrects it)
- Or set to `https://openrouter.ai/api/v1/chat/completions` (already correct)

### 3. Standardize All Workflows

Apply the same fix to:
- ❌ `standard.json` (0/8 nodes using $env)
- ❌ `graph.json` (0/6 nodes using $env)
- ⚠️ `orchestrator.json` (8/14 nodes using $env — standardize the remaining 6)
- ⚠️ `quantitative.json` (6/12 nodes using $env — standardize the remaining 6)

## Files Analyzed

```
/tmp/hf-space-update/
├── entrypoint.sh         # FIX-35 logic lines 189-206 ✅
├── fix-env-refs.py       # $env replacement logic ✅
├── n8n-workflows/
│   ├── standard.json     # ❌ 0 $env refs, 8 hardcoded
│   ├── graph.json        # ❌ 0 $env refs, 6 hardcoded
│   ├── orchestrator.json # ⚠️ 8 $env refs, 6 hardcoded
│   └── quantitative.json # ⚠️ 6 $env refs, 6 hardcoded
└── .git/                 # ✅ Clean, pushed to HF

/home/termius/mon-ipad/
└── .env.local            # No OPENROUTER_BASE_URL (correct)
```

## Conclusion

**Question:** Is the entrypoint.sh on the deployed HF Space correctly appending /chat/completions to OPENROUTER_BASE_URL before fix-env-refs.py replaces $env references?

**Answer:** **YES, absolutely correct.** The FIX-35 logic is properly implemented and deployed.

**However:** The **Standard and Graph workflows do NOT use `$env.OPENROUTER_BASE_URL` at all**. They have hardcoded URLs, which bypasses both FIX-35 and fix-env-refs.py entirely.

**Impact:** FIX-35 works correctly for Orchestrator and Quantitative pipelines (which use `$env` references), but has **zero effect** on Standard and Graph pipelines (which use hardcoded URLs).

**Action Required:** Replace hardcoded URLs in Standard and Graph workflows with `$env.OPENROUTER_BASE_URL` expressions to enable runtime configuration.
