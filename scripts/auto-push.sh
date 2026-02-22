#!/bin/bash
# auto-push.sh — Auto-commit and push status files every N minutes
# Usage: nohup bash scripts/auto-push.sh [interval_minutes] > /tmp/auto-push.log 2>&1 &
# Default interval: 20 minutes (Rule 31 + user request)
# Pushes to: origin + rag-dashboard (for live dashboard data)

set -uo pipefail

INTERVAL_MIN="${1:-20}"
INTERVAL_SEC=$((INTERVAL_MIN * 60))
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="/tmp/auto-push.pid"
LOG_FILE="/tmp/auto-push.log"

# Write PID for stop mechanism
echo $$ > "$PID_FILE"

echo "[auto-push] Started at $(date -Iseconds)"
echo "[auto-push] Interval: ${INTERVAL_MIN}m (${INTERVAL_SEC}s)"
echo "[auto-push] PID: $$"
echo "[auto-push] Repos: origin + rag-dashboard"

# Pre-push security check (Rule 3.4)
check_secrets() {
    local diff_output
    diff_output=$(cd "$REPO_ROOT" && git diff --cached 2>/dev/null | grep -iE 'sk-or-|pcsk_|jV_zGdx|sbp_|hf_[A-Za-z]{10}|jina_[a-f0-9]{10}|ghp_' || true)
    if [ -n "$diff_output" ]; then
        echo "[auto-push] SECURITY: Credentials detected in staged changes! Aborting push."
        return 1
    fi
    return 0
}

push_cycle() {
    local timestamp
    timestamp=$(date -Iseconds)
    echo ""
    echo "[auto-push] === Cycle at $timestamp ==="

    cd "$REPO_ROOT"

    # 1. Regenerate status if eval script has generate_status.py
    if [ -f "eval/generate_status.py" ]; then
        source .env.local 2>/dev/null || true
        python3 eval/generate_status.py 2>/dev/null && \
            echo "[auto-push] status.json regenerated" || \
            echo "[auto-push] WARN: generate_status.py failed (non-critical)"
    fi

    # 2. Check if there are changes to commit
    local changes
    changes=$(git status --porcelain docs/status.json docs/data.json website/public/eval-data.json 2>/dev/null)
    if [ -z "$changes" ]; then
        echo "[auto-push] No changes to commit"
        return 0
    fi

    # 3. Stage data files only
    git add docs/status.json docs/data.json website/public/eval-data.json 2>/dev/null || true

    # 4. Security check
    if ! check_secrets; then
        git reset HEAD -- . 2>/dev/null
        return 1
    fi

    # 5. Commit
    git commit -m "auto: push status+data $(date +%H:%M)" --no-verify 2>/dev/null || {
        echo "[auto-push] Nothing to commit"
        return 0
    }

    # 6. Push to origin
    git push origin main 2>/dev/null && \
        echo "[auto-push] Pushed to origin" || \
        echo "[auto-push] WARN: Push to origin failed"

    # 7. Push to rag-dashboard (for live dashboard)
    git push rag-dashboard main 2>/dev/null && \
        echo "[auto-push] Pushed to rag-dashboard" || \
        echo "[auto-push] WARN: Push to rag-dashboard failed (subtree may differ)"

    echo "[auto-push] Cycle complete at $(date -Iseconds)"
}

# Main loop
while true; do
    push_cycle
    echo "[auto-push] Sleeping ${INTERVAL_MIN}m..."
    sleep "$INTERVAL_SEC"
done
