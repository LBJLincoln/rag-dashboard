#!/bin/bash
# SESSION STARTUP — MANDATORY first command at every Claude Code session
# Reads all required files, checks staleness, prints rule summary
# Usage: bash scripts/session-startup.sh

set -e
cd "$(dirname "$0")/.."

echo "================================================================"
echo "  SESSION STARTUP — MANDATORY CHECKLIST"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================================"

ERRORS=0
WARNINGS=0

# === 1. READ MANDATORY FILES ===
echo ""
echo "  [1/6] Reading session-state.md..."
if [ -f directives/session-state.md ]; then
    head -30 directives/session-state.md
    echo "  ... (truncated)"
else
    echo "  ERROR: directives/session-state.md NOT FOUND"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "  [2/6] Reading status.json..."
if [ -f docs/status.json ]; then
    python3 -c "
import json
with open('docs/status.json') as f:
    d = json.load(f)
p = d.get('phase_gates', d.get('pipelines', {}))
print('  Phase gates:')
for k,v in p.items():
    if isinstance(v, dict):
        acc = v.get('accuracy', v.get('current', '?'))
        target = v.get('target', v.get('target_accuracy', '?'))
        print(f'    {k}: {acc}% (target: {target}%)')
" 2>/dev/null || echo "  (could not parse)"
else
    echo "  ERROR: docs/status.json NOT FOUND"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "  [3/6] Reading status.md..."
if [ -f directives/status.md ]; then
    head -20 directives/status.md
else
    echo "  WARNING: directives/status.md not found"
    WARNINGS=$((WARNINGS+1))
fi

echo ""
echo "  [4/6] Checking knowledge-base.md Section 0..."
if [ -f technicals/debug/knowledge-base.md ]; then
    echo "  OK — $(wc -l < technicals/debug/knowledge-base.md) lines"
else
    echo "  ERROR: knowledge-base.md NOT FOUND"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "  [5/6] Checking fixes-library.md..."
if [ -f technicals/debug/fixes-library.md ]; then
    NFIXES=$(grep -c '^| [0-9]' technicals/debug/fixes-library.md 2>/dev/null || echo 0)
    echo "  OK — $NFIXES fixes documented"
else
    echo "  ERROR: fixes-library.md NOT FOUND"
    ERRORS=$((ERRORS+1))
fi

echo ""
echo "  [6/6] Checking document-index.md..."
if [ -f docs/document-index.md ]; then
    echo "  OK — $(wc -l < docs/document-index.md) lines"
else
    echo "  WARNING: document-index.md not found"
    WARNINGS=$((WARNINGS+1))
fi

# === 2. STALENESS CHECK ===
echo ""
echo "  --- STALENESS CHECK ---"
if [ -f scripts/check-staleness.sh ]; then
    bash scripts/check-staleness.sh 2>/dev/null | head -10
else
    echo "  WARNING: check-staleness.sh not found"
fi

# === 3. RUNNING PROCESSES ===
echo ""
echo "  --- RUNNING PROCESSES ---"
ps aux | grep -E 'python3.*eval|auto-commit|phase' | grep -v grep | grep -v 'http.server' | head -5 || echo "  None"

# === 4. GIT STATUS ===
echo ""
echo "  --- GIT STATUS ---"
git status --short | head -10 || true

# === 5. QUICK RULES REMINDER ===
echo ""
echo "================================================================"
echo "  35 RULES QUICK REMINDER"
echo "================================================================"
echo "  STARTUP:  Read session-state, status.json, status.md, KB, fixes-lib, doc-index"
echo "  DURING:   1 fix per iteration | source .env.local | sequential tests"
echo "  AFTER FIX: 5/5 min | sync n8n | update fixes-library + KB | commit+push"
echo "  PUSH:     Every 15-20min | All repos impacted | ZERO credentials"
echo "  SESSION:  Max 2h | Update session-state after milestones | status.md at end"
echo "  DELEGATE: Opus=analysis | Sonnet=execution | Haiku=exploration"
echo "  INFRA:    VM=piloting only | NO tests on VM | NO workflow mods on VM"
echo "  SAFETY:   Kill old processes | Check RAM | Pre-vol before webhooks"
echo "  EVAL:     Preflight auto-runs | early-stop on failures | background testing"
echo "  BOTTLENECK: Identify → Classify → Prioritize → Isolate → Resolve → Relaunch"
echo "================================================================"

# === 6. SUMMARY ===
echo ""
if [ $ERRORS -gt 0 ]; then
    echo "  STATUS: $ERRORS ERRORS, $WARNINGS warnings — FIX BEFORE PROCEEDING"
    exit 1
else
    echo "  STATUS: READY ($WARNINGS warnings)"
    echo "  Session can proceed."
fi
echo "================================================================"
