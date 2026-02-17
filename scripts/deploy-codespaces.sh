#!/bin/bash
# =============================================================================
# Nomos AI — Codespace Orchestrator (run from mon-ipad VM)
# Creates, starts, and manages Codespaces for satellite repos
# =============================================================================
set -euo pipefail

GITHUB_USER="LBJLincoln"
VM_HOST="34.136.180.66"
REPOS=("rag-tests" "rag-website" "rag-data-ingestion" "rag-dashboard")
MACHINE_TYPE="basicLinux32gb"  # 4-core, 16GB (free tier: 60 core-hours/month)

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

usage() {
  echo "Usage: $0 <command> [repo]"
  echo ""
  echo "Commands:"
  echo "  create <repo>     Create a Codespace for the repo"
  echo "  start <repo>      Start an existing Codespace"
  echo "  stop <repo>       Stop a running Codespace"
  echo "  ssh <repo>        SSH into a Codespace"
  echo "  tunnel <repo>     Create SSH tunnel to Codespace"
  echo "  status            Show all Codespaces status"
  echo "  create-all        Create Codespaces for all repos"
  echo "  stop-all          Stop all running Codespaces"
  echo "  push-all          Push current code to all satellite repos"
  echo ""
  echo "Repos: ${REPOS[*]}"
  exit 1
}

check_gh() {
  if ! gh auth status > /dev/null 2>&1; then
    echo -e "${RED}ERROR: gh not authenticated. Run: gh auth login${NC}"
    exit 1
  fi
}

get_codespace_name() {
  local repo="$1"
  gh codespace list --json name,repository -q ".[] | select(.repository == \"${GITHUB_USER}/${repo}\") | .name" 2>/dev/null | head -1
}

cmd_status() {
  echo -e "${BLUE}=== Codespace Status ===${NC}"
  gh codespace list --json name,repository,state,machineName \
    -q '.[] | "\(.state)\t\(.machineName)\t\(.repository)\t\(.name)"' 2>/dev/null | \
    while IFS=$'\t' read -r state machine repo name; do
      case "$state" in
        "Available") color="${GREEN}" ;;
        "Shutdown")  color="${YELLOW}" ;;
        *)           color="${RED}" ;;
      esac
      echo -e "  ${color}${state}${NC}\t${machine}\t${repo}\t${name}"
    done
  echo ""
  echo -e "${BLUE}=== Free Tier Usage ===${NC}"
  echo "  Reminder: 60 core-hours/month (4-core = 15h, 2-core = 30h)"
}

cmd_create() {
  local repo="$1"
  echo -e "${BLUE}Creating Codespace for ${repo}...${NC}"

  # Check for devcontainer config
  local devcontainer_path=".devcontainer/${repo}/devcontainer.json"
  if [ ! -f "${devcontainer_path}" ]; then
    echo -e "${RED}ERROR: ${devcontainer_path} not found${NC}"
    exit 1
  fi

  # Check if already exists
  existing=$(get_codespace_name "$repo")
  if [ -n "$existing" ]; then
    echo -e "${YELLOW}Codespace already exists: ${existing}${NC}"
    echo "  Use '$0 start ${repo}' to start it"
    return
  fi

  # Push latest code first
  echo "  Pushing latest code to ${repo}..."
  git push "${repo}" main 2>/dev/null || true

  # Create Codespace with specific devcontainer
  gh codespace create \
    --repo "${GITHUB_USER}/${repo}" \
    --branch main \
    --machine "${MACHINE_TYPE}" \
    --devcontainer-path ".devcontainer/${repo}/devcontainer.json" \
    --display-name "nomos-${repo}"

  echo -e "${GREEN}Codespace created for ${repo}${NC}"
}

cmd_start() {
  local repo="$1"
  local name=$(get_codespace_name "$repo")
  if [ -z "$name" ]; then
    echo -e "${RED}No Codespace found for ${repo}. Create one first.${NC}"
    exit 1
  fi
  echo -e "${BLUE}Starting ${name}...${NC}"
  gh codespace start -c "$name"
  echo -e "${GREEN}Started: ${name}${NC}"
}

cmd_stop() {
  local repo="$1"
  local name=$(get_codespace_name "$repo")
  if [ -z "$name" ]; then
    echo -e "${YELLOW}No Codespace found for ${repo}${NC}"
    return
  fi
  echo -e "${BLUE}Stopping ${name}...${NC}"
  gh codespace stop -c "$name"
  echo -e "${GREEN}Stopped: ${name}${NC}"
}

cmd_ssh() {
  local repo="$1"
  local name=$(get_codespace_name "$repo")
  if [ -z "$name" ]; then
    echo -e "${RED}No Codespace found for ${repo}${NC}"
    exit 1
  fi
  echo -e "${BLUE}SSH into ${name}...${NC}"
  gh codespace ssh -c "$name"
}

cmd_tunnel() {
  local repo="$1"
  local name=$(get_codespace_name "$repo")
  if [ -z "$name" ]; then
    echo -e "${RED}No Codespace found for ${repo}${NC}"
    exit 1
  fi

  case "$repo" in
    rag-tests)
      # Workers need Redis + PG from VM
      echo -e "${BLUE}Creating tunnel: VM Redis/PG → ${name}${NC}"
      echo "  Redis (6379) and PostgreSQL (5432) forwarded to Codespace"
      gh codespace ssh -c "$name" -- \
        -R 6379:localhost:6379 \
        -R 5432:localhost:5432
      ;;
    rag-website)
      # Website n8n accessible from VM for monitoring
      echo -e "${BLUE}Creating tunnel: Codespace n8n → VM${NC}"
      gh codespace ssh -c "$name" -- \
        -L 5679:localhost:5678
      ;;
    rag-data-ingestion)
      # Ingestion stack is isolated, tunnel for monitoring only
      echo -e "${BLUE}Creating tunnel: Codespace n8n → VM${NC}"
      gh codespace ssh -c "$name" -- \
        -L 5680:localhost:5678
      ;;
    *)
      echo -e "${YELLOW}No tunnel needed for ${repo}${NC}"
      ;;
  esac
}

cmd_create_all() {
  echo -e "${BLUE}=== Creating all Codespaces ===${NC}"
  for repo in "${REPOS[@]}"; do
    cmd_create "$repo" || true
    echo ""
  done
}

cmd_stop_all() {
  echo -e "${BLUE}=== Stopping all Codespaces ===${NC}"
  for repo in "${REPOS[@]}"; do
    cmd_stop "$repo" || true
  done
}

cmd_push_all() {
  echo -e "${BLUE}=== Pushing to all repos ===${NC}"
  for repo in origin "${REPOS[@]}"; do
    echo -n "  ${repo}... "
    if git push "${repo}" main 2>/dev/null; then
      echo -e "${GREEN}OK${NC}"
    else
      echo -e "${RED}FAILED${NC}"
    fi
  done
}

# --- Main ---
check_gh

case "${1:-}" in
  status)      cmd_status ;;
  create)      cmd_create "${2:?Missing repo name}" ;;
  start)       cmd_start "${2:?Missing repo name}" ;;
  stop)        cmd_stop "${2:?Missing repo name}" ;;
  ssh)         cmd_ssh "${2:?Missing repo name}" ;;
  tunnel)      cmd_tunnel "${2:?Missing repo name}" ;;
  create-all)  cmd_create_all ;;
  stop-all)    cmd_stop_all ;;
  push-all)    cmd_push_all ;;
  *)           usage ;;
esac
