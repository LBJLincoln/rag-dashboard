#!/bin/bash
# rag-dashboard Codespace bootstrap — static dashboard reading status.json
set -euo pipefail

echo "=== Nomos AI — rag-dashboard Setup ==="

# --- 1. Install deps ---
echo "[1/3] Installing dependencies..."
if [ -f "/workspace/website/package.json" ]; then
  cd /workspace/website && npm install --silent 2>/dev/null
  cd /workspace
fi

# --- 2. Check data files ---
echo "[2/3] Checking data sources..."
for f in docs/status.json docs/data.json; do
  if [ -f "/workspace/${f}" ]; then
    echo "  OK: ${f}"
  else
    echo "  MISSING: ${f} — will use API fallback"
  fi
done

# --- 3. Verify VM connectivity ---
echo "[3/3] Checking VM status API..."
STATUS_URL="${STATUS_API_URL:-http://34.136.180.66:5678/webhook/nomos-status}"
if curl -sf --connect-timeout 5 "${STATUS_URL}" > /dev/null 2>&1; then
  echo "  VM status API: reachable"
else
  echo "  VM status API: offline (will use local docs/status.json)"
fi

echo ""
echo "=== Setup complete ==="
echo "  Dashboard: http://localhost:3000/dashboard"
echo "  Data: docs/status.json + docs/data.json"
echo ""
echo "Next: cd website && npm run dev"
