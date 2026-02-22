#!/bin/bash
# session-startup-agents.sh — Launch mandatory startup sub-agents
# Called at the START of every Claude Code session (Rule 41+42)
# Two Sonnet 4.5 agents run in background to improve the next session
#
# Usage: bash scripts/session-startup-agents.sh
# Requires: Claude Code CLI active in Termius terminal

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date -Iseconds)

echo "=== SESSION STARTUP AGENTS ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# ── Agent 1: Session Log Analyzer ──────────────────────────────
# Analyzes the last session log for patterns, rule adherence,
# improvements to CLAUDE.md and library files.
echo "[Agent 1] Session Log Analyzer"
echo "  Purpose: Analyze last session log → improve rules + files"
echo "  Model: Sonnet 4.5 (background)"
echo "  Trigger: At session start"
echo ""

# ── Agent 2: Repo Health Inspector ──────────────────────────────
# Scans mon-ipad + all satellite repos for architecture issues,
# stale files, test protocol improvements.
echo "[Agent 2] Repo Health Inspector"
echo "  Purpose: Scan all repos → improve test protocols + infra"
echo "  Model: Sonnet 4.5 (background)"
echo "  Trigger: At session start"
echo ""

echo "=== AGENTS CONFIGURED ==="
echo "These agents are invoked by Opus 4.6 via Task tool at session start."
echo "See CLAUDE.md Section 'PHASE 0' and technicals/project/team-agentic-process.md"
echo ""
echo "To invoke manually:"
echo "  1. Session Log Analyzer: See CLAUDE.md startup protocol"
echo "  2. Repo Health Inspector: See CLAUDE.md startup protocol"
