#!/bin/bash
# ============================================================
# DEPLOY OVERNIGHT — Autonomous pipeline runner
# ============================================================
# Launches all pipeline evaluations as nohup background processes.
# Survives Claude Code disconnection, SSH disconnection, terminal close.
# Auto-commits results every 15 minutes.
#
# Usage:
#   bash scripts/deploy-overnight.sh                    # Default: phase-2, all pipelines
#   bash scripts/deploy-overnight.sh --dataset phase-2  # Specific dataset
#   bash scripts/deploy-overnight.sh --kill              # Kill all running pipelines
#   bash scripts/deploy-overnight.sh --status            # Check status of all processes
#
# Last updated: 2026-02-22
# ============================================================

set -e
cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

# Load env vars
if [ -f .env.local ]; then
    source .env.local
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# PID directory
PID_DIR="/tmp/overnight-pids"
LOG_DIR="/tmp/overnight-logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# Default config
DATASET="${DATASET:-phase-2}"
N8N_HOST="${N8N_HOST:-https://lbjlincoln-nomos-rag-engine.hf.space}"
LABEL="${LABEL:-overnight-$(date +%Y%m%d-%H%M)}"

# ============================================================
# KILL MODE
# ============================================================
if [ "$1" = "--kill" ]; then
    echo -e "${RED}KILLING all overnight processes...${NC}"
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        PID=$(cat "$pidfile")
        NAME=$(basename "$pidfile" .pid)
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null && echo -e "  ${RED}KILLED${NC} $NAME (PID $PID)" || true
        else
            echo -e "  ${YELLOW}DEAD${NC}  $NAME (PID $PID was already dead)"
        fi
        rm -f "$pidfile"
    done
    echo "Done."
    exit 0
fi

# ============================================================
# STATUS MODE
# ============================================================
if [ "$1" = "--status" ]; then
    echo "============================================"
    echo "  OVERNIGHT PIPELINE STATUS"
    echo "============================================"
    for pidfile in "$PID_DIR"/*.pid; do
        [ -f "$pidfile" ] || continue
        PID=$(cat "$pidfile")
        NAME=$(basename "$pidfile" .pid)
        if kill -0 "$PID" 2>/dev/null; then
            LINES=$(wc -l < "$LOG_DIR/$NAME.log" 2>/dev/null || echo 0)
            LAST=$(tail -1 "$LOG_DIR/$NAME.log" 2>/dev/null || echo "no output")
            echo -e "  ${GREEN}RUNNING${NC} $NAME (PID $PID, $LINES lines)"
            echo "    Last: $LAST"
        else
            echo -e "  ${RED}DEAD${NC}    $NAME (PID $PID)"
        fi
    done

    # Show tested counts
    if [ -f "$REPO_ROOT/docs/tested_ids.json" ]; then
        echo ""
        echo "  Tested IDs:"
        python3 -c "
import json
with open('$REPO_ROOT/docs/tested_ids.json') as f:
    d = json.load(f)
for k, v in d.items():
    print(f'    {k}: {len(v)} questions')
print(f'    TOTAL: {sum(len(v) for v in d.values())}')
" 2>/dev/null || echo "    (could not parse tested_ids.json)"
    fi
    exit 0
fi

# ============================================================
# DEPLOY MODE (default)
# ============================================================
echo "============================================"
echo "  DEPLOY OVERNIGHT PIPELINE RUNNER"
echo "============================================"
echo "  Dataset: $DATASET"
echo "  N8N Host: $N8N_HOST"
echo "  Label: $LABEL"
echo "  PID dir: $PID_DIR"
echo "  Log dir: $LOG_DIR"
echo "============================================"

# Kill any existing overnight processes first
echo ""
echo "  Cleaning up existing processes..."
for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    PID=$(cat "$pidfile")
    kill -0 "$PID" 2>/dev/null && kill "$PID" 2>/dev/null && echo "    Killed $(basename "$pidfile" .pid) (PID $PID)"
    rm -f "$pidfile"
done

# ============================================================
# LAUNCH PIPELINES
# ============================================================

# Pipeline configs: name, types, batch_size, early_stop
# Each pipeline gets its own nohup process for isolation
declare -A PIPELINE_CONFIGS
PIPELINE_CONFIGS[standard]="--types standard --batch-size 5 --early-stop 15 --delay 0"
PIPELINE_CONFIGS[graph]="--types graph --batch-size 5 --early-stop 15 --delay 0"
PIPELINE_CONFIGS[quantitative]="--types quantitative --batch-size 10 --early-stop 15 --delay 0"
PIPELINE_CONFIGS[orchestrator]="--types orchestrator --batch-size 5 --early-stop 15 --delay 0"

echo ""
echo "  Launching pipelines..."

for PIPELINE in standard graph quantitative orchestrator; do
    CONFIG="${PIPELINE_CONFIGS[$PIPELINE]}"
    LOG_FILE="$LOG_DIR/$PIPELINE.log"
    PID_FILE="$PID_DIR/$PIPELINE.pid"

    echo -n "  Launching $PIPELINE..."

    nohup bash -c "
        cd '$REPO_ROOT'
        source .env.local 2>/dev/null
        export N8N_HOST='$N8N_HOST'
        python3 eval/run-eval-parallel.py \
            --dataset $DATASET \
            $CONFIG \
            --all-parallel \
            --label '${LABEL}-${PIPELINE}' \
            --force \
            --workers 1
    " > "$LOG_FILE" 2>&1 &

    echo $! > "$PID_FILE"
    echo -e " ${GREEN}PID $(cat $PID_FILE)${NC} → $LOG_FILE"
done

# ============================================================
# LAUNCH AUTO-PUSH (commits + pushes every 15 min)
# ============================================================
echo ""
echo -n "  Launching auto-push (every 15 min)..."

AUTO_PUSH_LOG="$LOG_DIR/auto-push.log"
AUTO_PUSH_PID="$PID_DIR/auto-push.pid"

nohup bash -c "
    cd '$REPO_ROOT'
    while true; do
        sleep 900

        # Generate status
        source .env.local 2>/dev/null
        python3 eval/generate_status.py 2>/dev/null || true

        # Commit and push
        git add docs/ logs/pipeline-results/ 2>/dev/null || true
        git commit -m 'auto: overnight push \$(date +%H:%M) — $LABEL' 2>/dev/null || true
        git push origin main 2>/dev/null || true
        git push rag-dashboard main 2>/dev/null || true

        echo '[\$(date)] Auto-push completed'
    done
" > "$AUTO_PUSH_LOG" 2>&1 &

echo $! > "$AUTO_PUSH_PID"
echo -e " ${GREEN}PID $(cat $AUTO_PUSH_PID)${NC}"

# ============================================================
# LAUNCH WATCHDOG (restarts dead pipelines)
# ============================================================
echo ""
echo -n "  Launching watchdog (checks every 5 min)..."

WATCHDOG_LOG="$LOG_DIR/watchdog.log"
WATCHDOG_PID="$PID_DIR/watchdog.pid"

nohup bash -c "
    cd '$REPO_ROOT'
    while true; do
        sleep 300

        for PIPELINE in standard graph quantitative orchestrator; do
            PID_FILE='$PID_DIR/\$PIPELINE.pid'
            [ -f \"\$PID_FILE\" ] || continue
            PID=\$(cat \"\$PID_FILE\")

            if ! kill -0 \"\$PID\" 2>/dev/null; then
                echo \"[\$(date)] \$PIPELINE (PID \$PID) is DEAD — checking if completed\"

                # Check if it completed normally
                LOG_FILE='$LOG_DIR/\$PIPELINE.log'
                if grep -q 'DONE:' \"\$LOG_FILE\" 2>/dev/null; then
                    echo \"[\$(date)] \$PIPELINE completed normally\"
                else
                    echo \"[\$(date)] \$PIPELINE died unexpectedly — NOT restarting (check logs)\"
                fi
            fi
        done
    done
" > "$WATCHDOG_LOG" 2>&1 &

echo $! > "$WATCHDOG_PID"
echo -e " ${GREEN}PID $(cat $WATCHDOG_PID)${NC}"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo "  Processes launched:"
for pidfile in "$PID_DIR"/*.pid; do
    [ -f "$pidfile" ] || continue
    NAME=$(basename "$pidfile" .pid)
    PID=$(cat "$pidfile")
    echo "    $NAME: PID $PID"
done
echo ""
echo "  Commands:"
echo "    bash scripts/deploy-overnight.sh --status   # Check progress"
echo "    bash scripts/deploy-overnight.sh --kill      # Stop everything"
echo "    tail -f $LOG_DIR/standard.log                # Watch standard pipeline"
echo "    tail -f $LOG_DIR/auto-push.log               # Watch auto-push"
echo ""
echo "  ALL processes run as nohup — survive terminal close."
echo "  Auto-push commits every 15 minutes."
echo "  Watchdog monitors every 5 minutes."
echo ""
echo "  Safe to close terminal now."
echo "============================================"
