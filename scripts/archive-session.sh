#!/bin/bash
# archive-session.sh — Archive current session state to outputs/
# Usage: bash scripts/archive-session.sh <session-number>
# Creates: outputs/session-<N>-log.md with session state snapshot
# Rule 6/15: Preserve session logs for future analysis

set -euo pipefail

SESSION_NUM="${1:?Usage: archive-session.sh <session-number>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/outputs"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S%z)
DATE_HUMAN=$(date +"%d %B %Y")
OUTPUT_FILE="$OUTPUT_DIR/session-${SESSION_NUM}-log.md"

if [ -f "$OUTPUT_FILE" ]; then
    echo "WARNING: $OUTPUT_FILE already exists. Appending update."
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "## Update — $TIMESTAMP" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Snapshot session-state.md
if [ -f "$REPO_ROOT/directives/session-state.md" ]; then
    if [ ! -f "$OUTPUT_FILE" ]; then
        cp "$REPO_ROOT/directives/session-state.md" "$OUTPUT_FILE"
        # Prepend archive header
        sed -i "1i\\# Session $SESSION_NUM Log — $DATE_HUMAN\\n\\n> Archived: $TIMESTAMP\\n" "$OUTPUT_FILE"
    else
        echo "### Session State Snapshot" >> "$OUTPUT_FILE"
        cat "$REPO_ROOT/directives/session-state.md" >> "$OUTPUT_FILE"
    fi
fi

# Append key metrics from status.json
if [ -f "$REPO_ROOT/docs/status.json" ]; then
    echo "" >> "$OUTPUT_FILE"
    echo "## Metrics Snapshot" >> "$OUTPUT_FILE"
    echo '```json' >> "$OUTPUT_FILE"
    python3 -c "
import json
with open('$REPO_ROOT/docs/status.json') as f:
    data = json.load(f)
print(json.dumps({
    'overall_accuracy': data.get('overall', {}).get('accuracy'),
    'phase': data.get('phase', {}).get('name'),
    'gates_passed': data.get('phase', {}).get('gates_passed'),
    'last_iteration': data.get('last_iteration', {}).get('label'),
    'total_unique_questions': data.get('totals', {}).get('unique_questions'),
    'total_iterations': data.get('totals', {}).get('iterations'),
}, indent=2))
" >> "$OUTPUT_FILE" 2>/dev/null || echo '  (status.json parse failed)' >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
fi

# Append eval progress if running
if [ -f /tmp/eval-progress.json ]; then
    echo "" >> "$OUTPUT_FILE"
    echo "## Eval Progress (at archive time)" >> "$OUTPUT_FILE"
    echo '```json' >> "$OUTPUT_FILE"
    cat /tmp/eval-progress.json >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
fi

echo "Session $SESSION_NUM archived to $OUTPUT_FILE"
echo "Size: $(wc -c < "$OUTPUT_FILE") bytes"
