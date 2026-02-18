#!/bin/bash
# specialize-repos.sh — Supprime les fichiers non pertinents de chaque repo satellite
# Usage: bash scripts/specialize-repos.sh [repo] [--dry-run]
# Exemple: bash scripts/specialize-repos.sh rag-tests
# Exemple: bash scripts/specialize-repos.sh (tous les repos)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN=false
TARGET_REPO=""

for arg in "$@"; do
    if [[ "$arg" == "--dry-run" ]]; then
        DRY_RUN=true
    elif [[ "$arg" != "" && "$arg" != --* ]]; then
        TARGET_REPO="$arg"
    fi
done

echo "=== specialize-repos.sh ==="
echo "Dry run: $DRY_RUN"
echo ""

specialize_repo() {
    local repo="$1"
    shift
    local to_delete=("$@")
    local tmpdir="/tmp/specialize-$repo"
    local remote_url
    remote_url=$(git -C "$REPO_ROOT" remote get-url "$repo")

    echo "--- Specializing $repo ---"
    echo "  Remote: $remote_url"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "  [DRY RUN] Would delete ${#to_delete[@]} items:"
        for item in "${to_delete[@]}"; do
            echo "    - $item"
        done
        return 0
    fi

    # Clone
    rm -rf "$tmpdir"
    git clone "$remote_url" "$tmpdir" --depth=1 --quiet

    cd "$tmpdir"

    # Configure git
    git config user.email "alexis.moret6@outlook.fr"
    git config user.name "Alexis Moret"

    local deleted_count=0
    for item in "${to_delete[@]}"; do
        if [ -e "$tmpdir/$item" ]; then
            rm -rf "$tmpdir/$item"
            echo "  Deleted: $item"
            deleted_count=$((deleted_count + 1))
        else
            echo "  Skip (not found): $item"
        fi
    done

    if [ "$deleted_count" -eq 0 ]; then
        echo "  Nothing to delete in $repo"
        cd "$REPO_ROOT"
        rm -rf "$tmpdir"
        return 0
    fi

    # Stage all deletions
    git add -A

    # Check if there are changes
    if git diff --cached --quiet; then
        echo "  No changes to commit in $repo"
    else
        git commit -m "chore(specialize): remove non-relevant files for $repo

Specialized repo to only contain files relevant to its role.
Piloted from mon-ipad tour de controle.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
        git push origin main --quiet
        echo "  Pushed specialization to $repo ($deleted_count items removed)"
    fi

    cd "$REPO_ROOT"
    rm -rf "$tmpdir"
}

# === rag-tests ===
# Keep: CLAUDE.md, eval/, scripts/, datasets/, logs/, snapshot/, docs/, technicals/fixes-library.md,
#        technicals/stack.md, rag-tests-docker-compose.yml, .gitignore, .devcontainer/, .github/, .env.example
# Delete everything else
RAG_TESTS_DELETE=(
    "website"
    "mcp"
    "n8n"
    "db"
    "outputs"
    "utilisation"
    "n8n_analysis_results"
    "propositions"
    "package.json"
    "package-lock.json"
    "node_modules"
    "Reprendre"
    "rapide"
    "compo 18"
    # directives — keep workflow-process.md and n8n-endpoints.md only
    "directives/dataset-rationale.md"
    "directives/objective.md"
    "directives/repos"
    "directives/session-state.md"
    "directives/status.md"
    "directives/ux-design-brief.md"
    # technicals — keep fixes-library.md and stack.md only
    "technicals/architecture.md"
    "technicals/credentials.md"
    "technicals/datasets-4-secteurs.md"
    "technicals/datasets-master.md"
    "technicals/env-vars-exhaustive.md"
    "technicals/infrastructure-plan.md"
    "technicals/knowledge-base.json"
    "technicals/n8n-topology.md"
    "technicals/phases-overview.md"
    "technicals/rag-research-2026.md"
    "technicals/sector-datasets.md"
    "technicals/team-agentic-process.md"
    "technicals/website-redesign-plan.md"
)

# === rag-website ===
# Keep: CLAUDE.md, website/, package.json, package-lock.json, .gitignore, vercel.json, docs/
RAG_WEBSITE_DELETE=(
    "eval"
    "scripts"
    "mcp"
    "n8n"
    "db"
    "outputs"
    "utilisation"
    "n8n_analysis_results"
    "propositions"
    "datasets"
    "snapshot"
    "logs"
    "directives"
    "technicals"
    "Reprendre"
    "rapide"
    "compo 18"
    ".devcontainer"
    "rag-tests-docker-compose.yml"
    ".env.example"
)

# === rag-dashboard ===
# Keep: CLAUDE.md, docs/, .gitignore
RAG_DASHBOARD_DELETE=(
    "website"
    "eval"
    "scripts"
    "mcp"
    "n8n"
    "db"
    "datasets"
    "snapshot"
    "logs"
    "outputs"
    "technicals"
    "directives"
    "propositions"
    "utilisation"
    "n8n_analysis_results"
    "package.json"
    "package-lock.json"
    "Reprendre"
    "rapide"
    "compo 18"
    ".devcontainer"
    "rag-tests-docker-compose.yml"
    ".env.example"
)

# === rag-data-ingestion ===
# Keep: CLAUDE.md, scripts/, datasets/, logs/, docs/, n8n/, .gitignore,
#        technicals/fixes-library.md, technicals/sector-datasets.md
RAG_DATA_INGESTION_DELETE=(
    "website"
    "eval"
    "mcp"
    "db"
    "outputs"
    "utilisation"
    "n8n_analysis_results"
    "propositions"
    "snapshot"
    "package.json"
    "package-lock.json"
    "Reprendre"
    "rapide"
    "compo 18"
    "directives"
    ".devcontainer"
    "rag-tests-docker-compose.yml"
    ".env.example"
    # technicals — keep fixes-library.md and sector-datasets.md only
    "technicals/architecture.md"
    "technicals/credentials.md"
    "technicals/datasets-4-secteurs.md"
    "technicals/datasets-master.md"
    "technicals/env-vars-exhaustive.md"
    "technicals/infrastructure-plan.md"
    "technicals/knowledge-base.json"
    "technicals/n8n-topology.md"
    "technicals/phases-overview.md"
    "technicals/rag-research-2026.md"
    "technicals/stack.md"
    "technicals/team-agentic-process.md"
    "technicals/website-redesign-plan.md"
)

# Execution
if [[ -n "$TARGET_REPO" ]]; then
    case "$TARGET_REPO" in
        rag-tests)        specialize_repo "rag-tests" "${RAG_TESTS_DELETE[@]}" ;;
        rag-website)      specialize_repo "rag-website" "${RAG_WEBSITE_DELETE[@]}" ;;
        rag-dashboard)    specialize_repo "rag-dashboard" "${RAG_DASHBOARD_DELETE[@]}" ;;
        rag-data-ingestion) specialize_repo "rag-data-ingestion" "${RAG_DATA_INGESTION_DELETE[@]}" ;;
        *)
            echo "Unknown repo: $TARGET_REPO"
            echo "Available: rag-tests, rag-website, rag-dashboard, rag-data-ingestion"
            exit 1
            ;;
    esac
else
    specialize_repo "rag-tests" "${RAG_TESTS_DELETE[@]}"
    echo ""
    specialize_repo "rag-website" "${RAG_WEBSITE_DELETE[@]}"
    echo ""
    specialize_repo "rag-dashboard" "${RAG_DASHBOARD_DELETE[@]}"
    echo ""
    specialize_repo "rag-data-ingestion" "${RAG_DATA_INGESTION_DELETE[@]}"
fi

echo ""
echo "=== Specialization complete ==="
