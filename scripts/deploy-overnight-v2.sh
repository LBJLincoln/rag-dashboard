#!/bin/bash
# ============================================================
# DEPLOY OVERNIGHT V2 — Self-Healing Pipeline Runner
# ============================================================
# Monitors ALL 16 workflows (9 ON + 7 OFF) across ALL repos.
# When a pipeline dies, calls `claude -p --dangerously-skip-permissions`
# with full error context. Claude (Opus) diagnoses and fixes.
# The script fixes NOTHING itself — only monitors, detects, calls Claude.
#
# Covers all repos:
#   - rag-tests: 4 RAG pipeline evals (Standard, Graph, Quant, Orchestrator)
#   - rag-pme-connectors: PME workflow tests (Gateway, Action Executor)
#   - rag-website: website health checks
#   - rag-dashboard: dashboard data freshness
#   - rag-data-ingestion: ingestion pipeline monitoring
#
# Usage:
#   bash scripts/deploy-overnight-v2.sh                  # Launch ALL
#   bash scripts/deploy-overnight-v2.sh --status         # Check status
#   bash scripts/deploy-overnight-v2.sh --kill           # Kill everything
#
# Last updated: 2026-02-22T22:00:00+01:00
# ============================================================

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# Load env vars
if [ -f .env.local ]; then
    set -a
    . .env.local
    set +a
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories
PID_DIR="/tmp/overnight-pids"
LOG_DIR="/tmp/overnight-logs"
CLAUDE_LOG_DIR="/tmp/overnight-claude-fixes"
mkdir -p "$PID_DIR" "$LOG_DIR" "$CLAUDE_LOG_DIR"

# Config
DATASET="${DATASET:-phase-2}"
N8N_HOST="${N8N_HOST:-https://lbjlincoln-nomos-rag-engine.hf.space}"
LABEL="overnight-$(date +%Y%m%d-%H%M)"
MAX_CLAUDE_RETRIES=3
WATCHDOG_INTERVAL=300  # 5 min
AUTO_PUSH_INTERVAL=900  # 15 min

# ============================================================
# ALL MONITORED WEBHOOKS (9 active on HF Space)
# ============================================================
# RAG Pipeline evals (4) — these get full eval runs
declare -A RAG_WEBHOOKS
RAG_WEBHOOKS[standard]="/webhook/rag-multi-index-v3"
RAG_WEBHOOKS[graph]="/webhook/ff622742-6d71-4e91-af71-b5c666088717"
RAG_WEBHOOKS[quantitative]="/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9"
RAG_WEBHOOKS[orchestrator]="/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0"

# PME Webhooks (2) — health checks only (no eval dataset yet)
declare -A PME_WEBHOOKS
PME_WEBHOOKS[pme-gateway]="/webhook/pme-assistant-gateway"
PME_WEBHOOKS[pme-action]="/webhook/pme-action-executor"

# Support Webhooks (3) — health checks only
declare -A SUPPORT_WEBHOOKS
SUPPORT_WEBHOOKS[dashboard-api]="/webhook/nomos-status"
SUPPORT_WEBHOOKS[benchmark]="/webhook/benchmark-v2"
SUPPORT_WEBHOOKS[sql-exec]="/webhook/benchmark-sql-exec"

# ============================================================
# Parse args
# ============================================================
MODE="deploy"
while [[ $# -gt 0 ]]; do
    case $1 in
        --kill) MODE="kill"; shift;;
        --status) MODE="status"; shift;;
        --dataset) DATASET="$2"; shift 2;;
        *) shift;;
    esac
done

# ============================================================
# KILL MODE
# ============================================================
if [ "$MODE" = "kill" ]; then
    echo -e "${RED}KILLING all overnight processes...${NC}"
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        PID=$(cat "$pidfile")
        NAME=$(basename "$pidfile" .pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null && echo -e "  ${RED}KILLED${NC} $NAME (PID $PID)" || true
        else
            echo -e "  ${YELLOW}DEAD${NC}  $NAME (PID $PID already dead)"
        fi
        rm -f "$pidfile"
    done
    pkill -f "claude.*overnight-fix" 2>/dev/null || true
    echo "Done."
    exit 0
fi

# ============================================================
# STATUS MODE
# ============================================================
if [ "$MODE" = "status" ]; then
    echo "============================================"
    echo "  OVERNIGHT V2 — ALL WORKFLOWS STATUS"
    echo "  $(date)"
    echo "============================================"

    echo ""
    echo "  --- Pipeline Eval Processes ---"
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        PID=$(cat "$pidfile")
        NAME=$(basename "$pidfile" .pid)
        if kill -0 "$PID" 2>/dev/null; then
            LINES=$(wc -l < "$LOG_DIR/$NAME.log" 2>/dev/null || echo 0)
            echo -e "  ${GREEN}ALIVE${NC} $NAME (PID $PID, $LINES lines)"
        else
            echo -e "  ${RED}DEAD${NC}  $NAME (PID $PID)"
        fi
    done

    echo ""
    echo "  --- Webhook Health (HF Space) ---"
    for NAME in standard graph quantitative orchestrator; do
        WH="${RAG_WEBHOOKS[$NAME]}"
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_HOST}${WH}" -H "Content-Type: application/json" -d '{"query":"health","sessionId":"status-check"}' --max-time 10 2>/dev/null || echo "ERR")
        if [ "$HTTP" = "200" ]; then
            echo -e "  ${GREEN}$HTTP${NC} $NAME ($WH)"
        else
            echo -e "  ${RED}$HTTP${NC} $NAME ($WH)"
        fi
    done
    for NAME in pme-gateway pme-action; do
        WH="${PME_WEBHOOKS[$NAME]}"
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_HOST}${WH}" -H "Content-Type: application/json" -d '{"query":"health","sessionId":"status-check"}' --max-time 10 2>/dev/null || echo "ERR")
        if [ "$HTTP" = "200" ]; then
            echo -e "  ${GREEN}$HTTP${NC} $NAME ($WH)"
        else
            echo -e "  ${RED}$HTTP${NC} $NAME ($WH)"
        fi
    done

    echo ""
    echo "  --- Claude Fix History ---"
    FIX_COUNT=$(ls "$CLAUDE_LOG_DIR"/*.log 2>/dev/null | wc -l 2>/dev/null || echo 0)
    echo "  Total fixes attempted: $FIX_COUNT"
    ls -t "$CLAUDE_LOG_DIR"/*.log 2>/dev/null | head -3 | while read f; do
        echo "    $(basename "$f")"
    done

    echo ""
    echo "  --- Tested IDs ---"
    if [ -f "$REPO_ROOT/docs/tested_ids.json" ]; then
        python3 -c "
import json
with open('$REPO_ROOT/docs/tested_ids.json') as f:
    d = json.load(f)
for k, v in d.items():
    print(f'    {k}: {len(v)} questions')
print(f'    TOTAL: {sum(len(v) for v in d.values())}')
" 2>/dev/null || echo "    (error reading)"
    fi

    echo ""
    echo "  --- Vercel Sites ---"
    for site in nomos-ai-pied.vercel.app nomos-pme-connectors-alexis-morets-projects.vercel.app nomos-pme-usecases-alexis-morets-projects.vercel.app nomos-dashboard-alexis-morets-projects.vercel.app; do
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" "https://$site" --max-time 5 2>/dev/null || echo "ERR")
        SHORT=$(echo "$site" | cut -d. -f1 | cut -c1-30)
        if [ "$HTTP" = "200" ]; then
            echo -e "  ${GREEN}$HTTP${NC} $SHORT"
        else
            echo -e "  ${RED}$HTTP${NC} $SHORT"
        fi
    done

    exit 0
fi

# ============================================================
# DEPLOY MODE
# ============================================================
echo "============================================"
echo "  DEPLOY OVERNIGHT V2 — SELF-HEALING"
echo "============================================"
echo "  Dataset: $DATASET"
echo "  N8N Host: $N8N_HOST"
echo "  Label: $LABEL"
echo "  RAG Pipelines: standard, graph, quantitative, orchestrator"
echo "  PME Webhooks: pme-gateway, pme-action"
echo "  Support: dashboard-api, benchmark, sql-exec"
echo "  Watchdog: every ${WATCHDOG_INTERVAL}s + auto Claude on failure"
echo "  Auto-push: every ${AUTO_PUSH_INTERVAL}s"
echo "  Claude: --dangerously-skip-permissions (autonomous fixes)"
echo "============================================"

# Kill existing
echo ""
echo "  Cleaning up..."
for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    PID=$(cat "$pidfile")
    kill -0 "$PID" 2>/dev/null && kill "$PID" 2>/dev/null
    rm -f "$pidfile"
done

# ============================================================
# PREFLIGHT — Check all webhooks
# ============================================================
echo ""
echo "  Preflight webhook checks..."
ALL_OK=true
for NAME in standard graph quantitative orchestrator; do
    WH="${RAG_WEBHOOKS[$NAME]}"
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_HOST}${WH}" -H "Content-Type: application/json" -d '{"query":"preflight","sessionId":"preflight"}' --max-time 30 2>/dev/null || echo "ERR")
    if [ "$HTTP" = "200" ]; then
        echo -e "    ${GREEN}OK${NC} $NAME (HTTP $HTTP)"
    else
        echo -e "    ${RED}FAIL${NC} $NAME (HTTP $HTTP)"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    echo ""
    echo -e "  ${YELLOW}WARNING: Some webhooks failed preflight. Launching anyway — watchdog will handle.${NC}"
fi

# ============================================================
# LAUNCH 4 RAG PIPELINE EVALS (parallel, batch-size=1 for HF Space)
# ============================================================
echo ""
echo "  Launching 4 RAG pipeline evals..."

for PIPELINE in standard graph quantitative orchestrator; do
    LOG_FILE="$LOG_DIR/$PIPELINE.log"
    PID_FILE="$PID_DIR/$PIPELINE.pid"

    # Clear old log for this run
    echo "=== NEW RUN $(date) === LABEL=$LABEL DATASET=$DATASET ===" >> "$LOG_FILE"

    nohup bash -c "
        cd '$REPO_ROOT'
        set -a; . .env.local 2>/dev/null; set +a
        export N8N_HOST='$N8N_HOST'
        python3 eval/run-eval-parallel.py \
            --dataset $DATASET \
            --types $PIPELINE \
            --batch-size 1 \
            --early-stop 15 \
            --delay 2 \
            --all-parallel \
            --label '${LABEL}-${PIPELINE}' \
            --force \
            --workers 1
    " >> "$LOG_FILE" 2>&1 &

    echo $! > "$PID_FILE"
    echo -e "    ${GREEN}LAUNCHED${NC} $PIPELINE (PID $(cat $PID_FILE))"
    sleep 2  # Stagger launches to avoid thundering herd
done

# ============================================================
# AUTO-PUSH (every 15 min)
# ============================================================
echo ""
echo -n "  Launching auto-push..."

nohup bash -c "
    cd '$REPO_ROOT'
    while true; do
        sleep $AUTO_PUSH_INTERVAL

        set -a; . .env.local 2>/dev/null; set +a
        python3 eval/generate_status.py 2>/dev/null || true

        git add docs/ logs/pipeline-results/ website/public/ 2>/dev/null || true
        git commit -m \"auto: overnight push \$(date +%H:%M) — $LABEL\" 2>/dev/null || true
        git push origin main 2>/dev/null || true
        git push rag-dashboard main 2>/dev/null || true

        echo \"[\$(date)] Auto-push done\"
    done
" >> "$LOG_DIR/auto-push.log" 2>&1 &

echo $! > "$PID_DIR/auto-push.pid"
echo -e " ${GREEN}PID $(cat $PID_DIR/auto-push.pid)${NC}"

# ============================================================
# SELF-HEALING WATCHDOG
# Monitors ALL 9 active webhooks (4 RAG + 2 PME + 3 Support)
# Monitors 4 RAG eval PIDs
# Calls Claude on pipeline death with full context
# Follows ALL 40 rules from CLAUDE.md
# ============================================================
echo ""
echo -n "  Launching self-healing watchdog..."

cat > /tmp/overnight-watchdog.sh << 'WATCHDOG_SCRIPT'
#!/bin/bash
REPO_ROOT="__REPO_ROOT__"
PID_DIR="__PID_DIR__"
LOG_DIR="__LOG_DIR__"
CLAUDE_LOG_DIR="__CLAUDE_LOG_DIR__"
N8N_HOST="__N8N_HOST__"
DATASET="__DATASET__"
LABEL="__LABEL__"
MAX_RETRIES=__MAX_RETRIES__
WATCHDOG_INTERVAL=__WATCHDOG_INTERVAL__

cd "$REPO_ROOT"
set -a; . .env.local 2>/dev/null; set +a

# Webhook registry (ALL 9 active)
declare -A ALL_WEBHOOKS
ALL_WEBHOOKS[standard]="/webhook/rag-multi-index-v3"
ALL_WEBHOOKS[graph]="/webhook/ff622742-6d71-4e91-af71-b5c666088717"
ALL_WEBHOOKS[quantitative]="/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9"
ALL_WEBHOOKS[orchestrator]="/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0"
ALL_WEBHOOKS[pme-gateway]="/webhook/pme-assistant-gateway"
ALL_WEBHOOKS[pme-action]="/webhook/pme-action-executor"
ALL_WEBHOOKS[dashboard-api]="/webhook/nomos-status"
ALL_WEBHOOKS[benchmark]="/webhook/benchmark-v2"
ALL_WEBHOOKS[sql-exec]="/webhook/benchmark-sql-exec"

# RAG pipelines that get eval restarts
RAG_PIPELINES="standard graph quantitative orchestrator"

# Claude retry counters
declare -A CLAUDE_CALLS
CYCLE=0

while true; do
    sleep "$WATCHDOG_INTERVAL"
    CYCLE=$((CYCLE+1))
    echo "[$(date)] === Watchdog cycle $CYCLE ==="

    # -----------------------------------------------
    # CHECK 1: All 9 webhook health checks
    # -----------------------------------------------
    DEAD_WEBHOOKS=""
    for NAME in "${!ALL_WEBHOOKS[@]}"; do
        WH="${ALL_WEBHOOKS[$NAME]}"
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_HOST}${WH}" \
            -H "Content-Type: application/json" \
            -d '{"query":"watchdog health check","sessionId":"watchdog-cycle-'$CYCLE'"}' \
            --max-time 15 2>/dev/null || echo "ERR")

        if [ "$HTTP" != "200" ]; then
            echo "[$(date)] WEBHOOK DOWN: $NAME (HTTP $HTTP) path=$WH"
            DEAD_WEBHOOKS="$DEAD_WEBHOOKS $NAME"
        fi
    done

    # If multiple webhooks down = likely HF Space issue → call Claude once
    DEAD_COUNT=$(echo "$DEAD_WEBHOOKS" | wc -w)
    if [ "$DEAD_COUNT" -ge 3 ]; then
        echo "[$(date)] $DEAD_COUNT+ webhooks down — likely HF Space infrastructure issue"

        FIX_LOG="$CLAUDE_LOG_DIR/fix-infra-cycle${CYCLE}-$(date +%H%M%S).log"

        claude -p "You are the OVERNIGHT SELF-HEALING AGENT for Nomos AI.
CRITICAL: Read /home/termius/mon-ipad/CLAUDE.md first. Follow ALL 40 rules.
Read /home/termius/mon-ipad/technicals/debug/fixes-library.md for known fixes.
Read /home/termius/mon-ipad/technicals/debug/knowledge-base.md for patterns.

INFRASTRUCTURE PROBLEM: $DEAD_COUNT webhooks are DOWN on HF Space ($N8N_HOST).
Dead webhooks: $DEAD_WEBHOOKS
This is a CROSS-PIPELINE bottleneck (Rule 36).

YOUR TASK:
1. Check HF Space status: curl -s https://huggingface.co/api/spaces/lbjlincoln/nomos-rag-engine
2. If Space is down, restart it: curl -X POST https://huggingface.co/api/spaces/lbjlincoln/nomos-rag-engine/restart -H 'Authorization: Bearer \$HF_TOKEN'
3. If Space is up but webhooks 404, the workflows need reactivation
4. Verify fix with curl to each webhook
5. Document fix in technicals/debug/knowledge-base.md
6. Commit and push

DO NOT run full evaluations. Just fix infrastructure and verify webhooks respond 200.
Be concise." --dangerously-skip-permissions > "$FIX_LOG" 2>&1 || true

        echo "[$(date)] Claude infra fix done: $(tail -2 "$FIX_LOG" | head -c 200)"
        continue  # Skip individual pipeline checks this cycle
    fi

    # -----------------------------------------------
    # CHECK 2: RAG eval process health (4 PIDs)
    # -----------------------------------------------
    for PIPELINE in $RAG_PIPELINES; do
        PID_FILE="$PID_DIR/$PIPELINE.pid"
        [ -f "$PID_FILE" ] || continue
        PID=$(cat "$PID_FILE")

        if ! kill -0 "$PID" 2>/dev/null; then
            LOG_FILE="$LOG_DIR/$PIPELINE.log"

            # Completed normally?
            if grep -qE "COMPLETED|All.*complete|Pipeline.*finished|Evaluation complete" "$LOG_FILE" 2>/dev/null; then
                echo "[$(date)] $PIPELINE COMPLETED (PID $PID)"
                rm -f "$PID_FILE"
                continue
            fi

            # Early-stopped? (too many failures but not a crash)
            if grep -qE "early.stop|Early.stop|consecutive failures" "$LOG_FILE" 2>/dev/null; then
                echo "[$(date)] $PIPELINE EARLY-STOPPED (PID $PID) — calling Claude"
            else
                echo "[$(date)] $PIPELINE CRASHED (PID $PID) — calling Claude"
            fi

            # Check retry budget
            CALL_COUNT="${CLAUDE_CALLS[$PIPELINE]:-0}"
            if [ "$CALL_COUNT" -ge "$MAX_RETRIES" ]; then
                echo "[$(date)] $PIPELINE: Claude already tried $MAX_RETRIES times. Skipping until reset."
                rm -f "$PID_FILE"
                continue
            fi

            # Collect context
            ERROR_TAIL="$(tail -100 "$LOG_FILE" 2>/dev/null || echo "no logs")"
            TESTED="$(python3 -c "
import json
with open('$REPO_ROOT/docs/tested_ids.json') as f:
    d = json.load(f)
for k, v in d.items(): print(f'{k}: {len(v)}')
" 2>/dev/null || echo "unknown")"

            FIX_LOG="$CLAUDE_LOG_DIR/fix-${PIPELINE}-cycle${CYCLE}-$(date +%H%M%S).log"

            echo "[$(date)] Calling Claude for $PIPELINE (attempt $((CALL_COUNT+1))/$MAX_RETRIES)..."

            claude -p "You are the OVERNIGHT SELF-HEALING AGENT for Nomos AI.
CRITICAL: Read /home/termius/mon-ipad/CLAUDE.md first. Follow ALL 40 rules.
Read /home/termius/mon-ipad/technicals/debug/fixes-library.md for known fixes.
Read /home/termius/mon-ipad/technicals/debug/knowledge-base.md for patterns.

PIPELINE FAILURE: $PIPELINE eval process (PID $PID) died.
N8N_HOST: $N8N_HOST | DATASET: $DATASET

LAST 100 LINES OF LOG:
$ERROR_TAIL

TESTED STATUS:
$TESTED

RULES TO FOLLOW:
- Rule 36: Cross-pipeline bottleneck — does this fix help other pipelines too?
- Rule 37: Low-hanging fruit — is there a quick-win?
- Rule 1: ONE fix at a time
- Rule 11: Consulter knowledge-base.md Section 0 AVANT test webhook
- Rule 21: Document fix in fixes-library.md
- Rule 24: Update knowledge-base.md

YOUR TASK:
1. Diagnose why $PIPELINE died (rate limit? crash? data issue? n8n error?)
2. Check fixes-library.md — is this a known issue?
3. Apply the fix (if possible)
4. Verify with: python3 eval/quick-test.py --questions 1 --pipeline $PIPELINE
5. If fix works, commit and push
6. Write a 1-line summary to stdout

DO NOT modify CLAUDE.md or session-state.md.
DO NOT run full evaluations. Fix, verify 1 question, commit.
If you CANNOT fix it, explain why in knowledge-base.md and exit." --dangerously-skip-permissions > "$FIX_LOG" 2>&1 || true

            echo "[$(date)] Claude done for $PIPELINE: $(tail -3 "$FIX_LOG" | head -c 200)"
            CLAUDE_CALLS[$PIPELINE]=$((CALL_COUNT+1))

            # Verify and restart
            sleep 5
            WH="${ALL_WEBHOOKS[$PIPELINE]}"
            VERIFY=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${N8N_HOST}${WH}" \
                -H "Content-Type: application/json" \
                -d '{"query":"verify fix","sessionId":"watchdog-verify"}' \
                --max-time 30 2>/dev/null || echo "ERR")

            if [ "$VERIFY" = "200" ]; then
                echo "[$(date)] Fix verified ($PIPELINE HTTP 200) — RESTARTING eval"

                echo "=== RESTARTED $(date) by watchdog ===" >> "$LOG_FILE"
                nohup bash -c "
                    cd '$REPO_ROOT'
                    set -a; . .env.local 2>/dev/null; set +a
                    export N8N_HOST='$N8N_HOST'
                    python3 eval/run-eval-parallel.py \
                        --dataset $DATASET \
                        --types $PIPELINE \
                        --batch-size 1 \
                        --early-stop 15 \
                        --delay 2 \
                        --all-parallel \
                        --label '${LABEL}-${PIPELINE}-r$((CALL_COUNT+1))' \
                        --force \
                        --workers 1
                " >> "$LOG_FILE" 2>&1 &

                echo $! > "$PID_FILE"
                echo "[$(date)] $PIPELINE RESTARTED (new PID $(cat "$PID_FILE"))"
                CLAUDE_CALLS[$PIPELINE]=0  # Reset on success
            else
                echo "[$(date)] Fix NOT verified ($PIPELINE HTTP $VERIFY) — retry next cycle"
            fi
        fi
    done

    # -----------------------------------------------
    # CHECK 3: Reset counters every hour
    # -----------------------------------------------
    if [ $((CYCLE % 12)) -eq 0 ]; then
        for k in "${!CLAUDE_CALLS[@]}"; do
            CLAUDE_CALLS[$k]=0
        done
        echo "[$(date)] Reset Claude retry counters (hourly)"
    fi

    # -----------------------------------------------
    # CHECK 4: Vercel sites health (every 6 cycles = 30 min)
    # -----------------------------------------------
    if [ $((CYCLE % 6)) -eq 0 ]; then
        echo "[$(date)] Checking Vercel sites..."
        for site in nomos-ai-pied.vercel.app nomos-pme-connectors-alexis-morets-projects.vercel.app nomos-dashboard-alexis-morets-projects.vercel.app; do
            HTTP=$(curl -s -o /dev/null -w "%{http_code}" "https://$site" --max-time 5 2>/dev/null || echo "ERR")
            [ "$HTTP" = "200" ] && echo "  OK $site" || echo "  DOWN $site (HTTP $HTTP)"
        done
    fi
done
WATCHDOG_SCRIPT

# Replace placeholders
sed -i "s|__REPO_ROOT__|$REPO_ROOT|g" /tmp/overnight-watchdog.sh
sed -i "s|__PID_DIR__|$PID_DIR|g" /tmp/overnight-watchdog.sh
sed -i "s|__LOG_DIR__|$LOG_DIR|g" /tmp/overnight-watchdog.sh
sed -i "s|__CLAUDE_LOG_DIR__|$CLAUDE_LOG_DIR|g" /tmp/overnight-watchdog.sh
sed -i "s|__N8N_HOST__|$N8N_HOST|g" /tmp/overnight-watchdog.sh
sed -i "s|__DATASET__|$DATASET|g" /tmp/overnight-watchdog.sh
sed -i "s|__LABEL__|$LABEL|g" /tmp/overnight-watchdog.sh
sed -i "s|__MAX_RETRIES__|$MAX_CLAUDE_RETRIES|g" /tmp/overnight-watchdog.sh
sed -i "s|__WATCHDOG_INTERVAL__|$WATCHDOG_INTERVAL|g" /tmp/overnight-watchdog.sh
chmod +x /tmp/overnight-watchdog.sh

nohup bash /tmp/overnight-watchdog.sh >> "$LOG_DIR/watchdog.log" 2>&1 &
echo $! > "$PID_DIR/watchdog.pid"
echo -e " ${GREEN}PID $(cat $PID_DIR/watchdog.pid)${NC}"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE — SELF-HEALING V2"
echo "============================================"
echo ""
echo "  Processes:"
for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    NAME=$(basename "$pidfile" .pid)
    PID=$(cat "$pidfile")
    echo "    $NAME: PID $PID"
done
echo ""
echo "  Monitoring:"
echo "    4 RAG pipeline evals (batch=1, early-stop=15)"
echo "    9 webhook health checks every 5 min"
echo "    4 Vercel site checks every 30 min"
echo "    Auto-push to GitHub every 15 min"
echo ""
echo "  Self-healing:"
echo "    Pipeline dies → Claude called automatically"
echo "    Claude reads CLAUDE.md (40 rules) + fixes-library + knowledge-base"
echo "    Claude fixes + verifies + commits"
echo "    Watchdog restarts the pipeline if fix works"
echo "    Max $MAX_CLAUDE_RETRIES retries per pipeline per hour"
echo ""
echo "  Commands:"
echo "    bash scripts/deploy-overnight-v2.sh --status"
echo "    bash scripts/deploy-overnight-v2.sh --kill"
echo "    tail -f $LOG_DIR/watchdog.log"
echo "    tail -f $LOG_DIR/standard.log"
echo "    ls $CLAUDE_LOG_DIR/"
echo ""
echo "  Safe to close terminal now."
echo "============================================"
