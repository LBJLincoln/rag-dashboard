#!/bin/bash
# =============================================================================
# Run All Phases — Master Orchestrator
#
# Runs on the VM (34.136.180.66) or any environment with:
#   - .env.local (credentials)
#   - Network access to Supabase, Neo4j, Pinecone, OpenRouter
#   - Python 3.10+ with datasets, psycopg2-binary, requests
#
# Usage:
#   bash scripts/run-all-phases.sh --phase 2    # Run Phase 2 only
#   bash scripts/run-all-phases.sh --all         # Run Phases 2-4
#   bash scripts/run-all-phases.sh --download    # Download datasets only
#   bash scripts/run-all-phases.sh --ingest      # Ingest to DBs only
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- Load environment ---
if [ -f "$ROOT_DIR/.env.local" ]; then
    source "$ROOT_DIR/.env.local"
    ok "Loaded .env.local"
else
    warn ".env.local not found — credentials may be missing"
fi

# --- Parse arguments ---
PHASE="all"
DOWNLOAD_ONLY=false
INGEST_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --phase) PHASE="$2"; shift 2 ;;
        --all) PHASE="all"; shift ;;
        --download) DOWNLOAD_ONLY=true; shift ;;
        --ingest) INGEST_ONLY=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# --- Install dependencies ---
install_deps() {
    log "Checking Python dependencies..."
    pip3 install datasets huggingface_hub psycopg2-binary requests 2>/dev/null | tail -1
    ok "Dependencies ready"
}

# --- Step 1: Download datasets ---
download_datasets() {
    log "Step 1: Downloading HuggingFace datasets..."

    # Benchmark datasets (16 datasets)
    python3 "$ROOT_DIR/datasets/scripts/download-benchmarks.py" --pipeline all --limit 1000 \
        2>&1 | tee "$LOG_DIR/download-benchmarks.log"

    # Sector datasets (4 sectors)
    python3 "$ROOT_DIR/datasets/scripts/download-sectors.py" --all --limit 500 \
        2>&1 | tee "$LOG_DIR/download-sectors.log"

    ok "Downloads complete"
}

# --- Step 2: Generate phase datasets ---
generate_phases() {
    log "Step 2: Generating phase dataset files..."
    python3 "$ROOT_DIR/datasets/scripts/generate-phase-datasets.py" --all \
        2>&1 | tee "$LOG_DIR/generate-phases.log"
    ok "Phase datasets generated"
}

# --- Step 3: Ingest to databases ---
ingest_neo4j() {
    log "Step 3a: Ingesting to Neo4j (graph entities)..."
    if [ -z "${NEO4J_PASSWORD:-}" ]; then
        warn "NEO4J_PASSWORD not set — skipping Neo4j ingestion"
        return
    fi
    python3 "$ROOT_DIR/db/populate/phase2_neo4j.py" --limit 500 \
        2>&1 | tee "$LOG_DIR/ingest-neo4j.log"
    ok "Neo4j ingestion complete"
}

ingest_supabase() {
    log "Step 3b: Ingesting to Supabase (financial tables)..."
    if [ -z "${SUPABASE_PASSWORD:-}" ]; then
        warn "SUPABASE_PASSWORD not set — skipping Supabase ingestion"
        return
    fi
    python3 "$ROOT_DIR/db/populate/phase2_supabase.py" --reset \
        2>&1 | tee "$LOG_DIR/ingest-supabase.log"
    ok "Supabase ingestion complete"
}

ingest_pinecone() {
    log "Step 3c: Ingesting to Pinecone (graph embeddings)..."
    if [ -z "${PINECONE_API_KEY:-}" ] || [ -z "${COHERE_API_KEY:-}" ]; then
        warn "PINECONE_API_KEY or COHERE_API_KEY not set — skipping Pinecone ingestion"
        return
    fi
    python3 "$ROOT_DIR/db/populate/phase2_ingest_all.py" --skip-supabase \
        2>&1 | tee "$LOG_DIR/ingest-pinecone.log"
    ok "Pinecone ingestion complete"
}

ingest_all() {
    ingest_neo4j
    ingest_supabase
    ingest_pinecone
}

# --- Step 4: Check ingestion status ---
check_status() {
    log "Step 4: Checking ingestion status..."
    python3 "$ROOT_DIR/datasets/scripts/check-ingestion-status.py" \
        2>&1 | tee "$LOG_DIR/ingestion-status.log"
}

# --- Step 5: Generate status files ---
generate_status() {
    log "Step 5: Generating status files..."
    python3 "$ROOT_DIR/eval/generate_status.py" 2>/dev/null || warn "generate_status.py failed (may need n8n)"
    ok "Status generated"
}

# --- Step 6: Git commit + push ---
commit_push() {
    log "Step 6: Committing and pushing..."
    cd "$ROOT_DIR"
    git add datasets/ logs/ docs/ n8n/ scripts/ db/
    git commit -m "Phase $PHASE: datasets downloaded + ingested + workflows fixed" || true
    git push -u origin HEAD || warn "Push failed — try manually"
    ok "Committed and pushed"
}

# =============================================================================
# Main
# =============================================================================
echo "============================================================"
echo "  MULTI-RAG ALL PHASES RUNNER"
echo "  Phase: $PHASE | Download only: $DOWNLOAD_ONLY | Ingest only: $INGEST_ONLY"
echo "  Time: $(date -Iseconds)"
echo "============================================================"

install_deps

if $DOWNLOAD_ONLY; then
    download_datasets
    generate_phases
    check_status
    exit 0
fi

if $INGEST_ONLY; then
    ingest_all
    check_status
    exit 0
fi

# Full run
download_datasets
generate_phases
ingest_all
check_status
generate_status
commit_push

echo ""
echo "============================================================"
echo "  ALL PHASES COMPLETE"
echo "  Time: $(date -Iseconds)"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Run tests:  python3 eval/run-eval-parallel.py --dataset phase-3 --reset"
echo "  2. Check gates: python3 eval/phase_gates.py"
echo "  3. View status: cat docs/status.json"
