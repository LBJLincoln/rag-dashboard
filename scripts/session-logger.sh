#!/bin/bash
# SESSION LOGGER — Logs all commands and outputs during a session
# Creates a timestamped log file that can be analyzed later
#
# Usage at session start:
#   source scripts/session-logger.sh
#
# The log file will be at: logs/sessions/session-YYYY-MM-DD-HH-MM.log
# At session end, commit it: git add logs/sessions/ && git commit -m "session log"

SESSION_LOG_DIR="/home/termius/mon-ipad/logs/sessions"
mkdir -p "$SESSION_LOG_DIR"

SESSION_TIMESTAMP=$(date '+%Y-%m-%d-%H-%M')
export SESSION_LOG_FILE="$SESSION_LOG_DIR/session-$SESSION_TIMESTAMP.log"

# Initialize log
cat > "$SESSION_LOG_FILE" <<HEADER
# Session Log — $SESSION_TIMESTAMP
# VM: $(hostname) | User: $(whoami)
# Git branch: $(git -C /home/termius/mon-ipad branch --show-current 2>/dev/null)
# Last commit: $(git -C /home/termius/mon-ipad log --oneline -1 2>/dev/null)
---
HEADER

# Function to log a command
log_cmd() {
    local cmd="$*"
    echo "" >> "$SESSION_LOG_FILE"
    echo "## $(date '+%H:%M:%S') — COMMAND" >> "$SESSION_LOG_FILE"
    echo '```' >> "$SESSION_LOG_FILE"
    echo "$cmd" >> "$SESSION_LOG_FILE"
    echo '```' >> "$SESSION_LOG_FILE"

    # Execute and capture output
    local output
    output=$($cmd 2>&1)
    local exit_code=$?

    echo "### Output (exit=$exit_code)" >> "$SESSION_LOG_FILE"
    echo '```' >> "$SESSION_LOG_FILE"
    echo "$output" | head -50 >> "$SESSION_LOG_FILE"
    if [ $(echo "$output" | wc -l) -gt 50 ]; then
        echo "... (truncated, $(echo "$output" | wc -l) total lines)" >> "$SESSION_LOG_FILE"
    fi
    echo '```' >> "$SESSION_LOG_FILE"

    # Also output normally
    echo "$output"
    return $exit_code
}

# Function to log an action (no command)
log_action() {
    echo "" >> "$SESSION_LOG_FILE"
    echo "## $(date '+%H:%M:%S') — ACTION: $*" >> "$SESSION_LOG_FILE"
}

# Function to log a decision
log_decision() {
    echo "" >> "$SESSION_LOG_FILE"
    echo "## $(date '+%H:%M:%S') — DECISION: $*" >> "$SESSION_LOG_FILE"
}

echo "Session logger active: $SESSION_LOG_FILE"
echo "Use: log_cmd <command>, log_action <description>, log_decision <description>"
