#!/bin/bash
# setup-claude-opus.sh
# Configure Claude Code avec Opus 4.6 dans tout Codespace ou repo satellite.
# Lancer UNE FOIS au démarrage de chaque Codespace.
#
# Usage: bash scripts/setup-claude-opus.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_DIR="$REPO_ROOT/.claude"

echo "🔧 Configuration Claude Code → Opus 4.6"
echo "Repo: $REPO_ROOT"

mkdir -p "$CLAUDE_DIR"

# Lire settings existant ou créer vide
if [ -f "$CLAUDE_DIR/settings.json" ]; then
    # Ajouter model au JSON existant
    python3 -c "
import json, sys
with open('$CLAUDE_DIR/settings.json') as f:
    cfg = json.load(f)
cfg['model'] = 'claude-opus-4-6'
with open('$CLAUDE_DIR/settings.json', 'w') as f:
    json.dump(cfg, f, indent=2)
print('✅ model: claude-opus-4-6 ajouté au settings.json existant')
"
else
    # Créer settings minimal
    echo '{"model": "claude-opus-4-6"}' > "$CLAUDE_DIR/settings.json"
    echo "✅ settings.json créé avec model: claude-opus-4-6"
fi

# Ajouter ANTHROPIC_MODEL dans .env.local si présent
if [ -f "$REPO_ROOT/.env.local" ]; then
    grep -q "ANTHROPIC_MODEL" "$REPO_ROOT/.env.local" \
        || echo "ANTHROPIC_MODEL=claude-opus-4-6" >> "$REPO_ROOT/.env.local"
    echo "✅ ANTHROPIC_MODEL=claude-opus-4-6 dans .env.local"
fi

echo ""
echo "✅ Opus 4.6 configuré. Relancer Claude Code pour appliquer."
echo "   claude --model claude-opus-4-6"
