# Guide Termius - Installation Complète MCP Servers

**Date:** 2026-02-12  
**Pour:** Termius (iPad/SSH)  
**Objectif:** Installer tous les MCP servers sur Termius

---

## 📋 Résumé des Commandes (Copier-Coller)

### ÉTAPE 1: Se connecter au repo
```bash
cd /home/termius/mon-ipad
```

### ÉTAPE 2: Vérifier/installer Node.js
```bash
node --version || (curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)
```

### ÉTAPE 3: Créer répertoire MCP
```bash
mkdir -p ~/mcp-servers && cd ~/mcp-servers
```

### ÉTAPE 4: Installer MCP Neo4j
```bash
VERSION=$(curl -s https://api.github.com/repos/neo4j/mcp/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')
curl -L -o neo4j-mcp.tar.gz "https://github.com/neo4j/mcp/releases/download/v${VERSION}/neo4j-mcp_${VERSION}_linux_amd64.tar.gz"
tar -xzf neo4j-mcp.tar.gz
chmod +x neo4j-mcp
sudo mv neo4j-mcp /usr/local/bin/
rm neo4j-mcp.tar.gz
neo4j-mcp --version
```

### ÉTAPE 5: Installer MCP n8n
```bash
npm install -g @leonardsellem/n8n-mcp-server
which n8n-mcp-server
```

### ÉTAPE 6: Vérifier MCP Pinecone (via npx)
```bash
npx -y @pinecone-database/mcp --help > /dev/null 2>&1 && echo "✅ Pinecone MCP disponible via npx"
```

### ÉTAPE 7: Vérifier MCP Jina (existant)
```bash
test -f /home/termius/mon-ipad/mcp/jina-embeddings-server.py && echo "✅ Jina MCP prêt"
```

### ÉTAPE 8: Configurer les variables d'environnement
```bash
export N8N_HOST="https://amoret.app.n8n.cloud"
export N8N_API_KEY="JWT_REDACTED"
export PINECONE_API_KEY="pcsk_REDACTED"
export PINECONE_HOST="https://sota-rag-cohere-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io"
export OPENROUTER_API_KEY="sk-or-v1-REDACTED"
export COHERE_API_KEY="REDACTED_COHERE_KEY"
export SUPABASE_PASSWORD="udVECdcSnkMCAPiY"
export NEO4J_PASSWORD="REDACTED_NEO4J_PASSWORD"
export JINA_API_KEY="jina_REDACTED"
```

### ÉTAPE 9: Rendre les exports permanents (optionnel)
```bash
cat >> ~/.bashrc << 'EOF'

# SOTA 2026 Environment Variables
export N8N_HOST="https://amoret.app.n8n.cloud"
export N8N_API_KEY="JWT_REDACTED"
export PINECONE_API_KEY="pcsk_REDACTED"
export PINECONE_HOST="https://sota-rag-cohere-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io"
export OPENROUTER_API_KEY="sk-or-v1-REDACTED"
export COHERE_API_KEY="REDACTED_COHERE_KEY"
export SUPABASE_PASSWORD="udVECdcSnkMCAPiY"
export NEO4J_PASSWORD="REDACTED_NEO4J_PASSWORD"
export JINA_API_KEY="jina_REDACTED"
EOF
```

### ÉTAPE 10: Vérifier l'installation
```bash
echo "=== VÉRIFICATION MCP SERVERS ==="
echo -n "Neo4j: " && (neo4j-mcp --version 2>/dev/null || echo "❌ Non installé")
echo -n "n8n: " && (n8n-mcp-server --version 2>/dev/null || echo "❌ Non installé")
echo -n "Pinecone: " && (npx -y @pinecone-database/mcp --help > /dev/null 2>&1 && echo "✅ Disponible via npx" || echo "❌ Non disponible")
echo -n "Jina: " && (test -f /home/termius/mon-ipad/mcp/jina-embeddings-server.py && echo "✅ Prêt" || echo "❌ Non trouvé")
echo "==================================="
```

---

## 📁 Fichier de Configuration Claude

Le fichier `.claude/settings.json` doit contenir :

```json
{
  "mcpServers": {
    "jina-embeddings": {
      "command": "python3",
      "args": ["/home/termius/mon-ipad/mcp/jina-embeddings-server.py"],
      "env": {
        "PINECONE_API_KEY": "pcsk_REDACTED",
        "PINECONE_HOST": "https://sota-rag-cohere-1024-a4mkzmz.svc.aped-4627-b74a.pinecone.io",
        "OPENROUTER_API_KEY": "sk-or-v1-REDACTED",
        "JINA_API_KEY": "jina_REDACTED",
        "N8N_API_KEY": "JWT_REDACTED",
        "N8N_HOST": "https://amoret.app.n8n.cloud"
      }
    },
    "neo4j": {
      "command": "neo4j-mcp",
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USERNAME": "neo4j",
        "NEO4J_PASSWORD": "REDACTED_NEO4J_PASSWORD",
        "NEO4J_DATABASE": "neo4j",
        "NEO4J_READ_ONLY": "true",
        "NEO4J_TELEMETRY": "true",
        "NEO4J_TRANSPORT_MODE": "stdio"
      }
    },
    "pinecone": {
      "command": "npx",
      "args": ["-y", "@pinecone-database/mcp"],
      "env": {
        "PINECONE_API_KEY": "pcsk_REDACTED"
      }
    },
    "n8n": {
      "command": "n8n-mcp-server",
      "env": {
        "N8N_API_URL": "https://amoret.app.n8n.cloud/api/v1",
        "N8N_API_KEY": "JWT_REDACTED",
        "N8N_WEBHOOK_USERNAME": "",
        "N8N_WEBHOOK_PASSWORD": "",
        "DEBUG": "false"
      }
    },
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true&features=database,docs,debugging,development"
    }
  }
}
```

**Note:** Remplacer `YOUR_PROJECT_REF` par le project_ref Supabase réel.

---

## 🔧 Installation Automatique (Alternative)

Si tu préfères utiliser le script automatisé :

```bash
cd /home/termius/mon-ipad
chmod +x scripts/install-mcp-servers.sh
./scripts/install-mcp-servers.sh
```

---

## ✅ Checklist Post-Installation

Vérifier que tout est installé :

```bash
# Test Neo4j
neo4j-mcp --version

# Test n8n
n8n-mcp-server --version

# Test Pinecone (via npx)
npx -y @pinecone-database/mcp --help

# Test Jina
ls -la /home/termius/mon-ipad/mcp/jina-embeddings-server.py

# Vérifier les variables
echo $N8N_API_KEY
echo $PINECONE_API_KEY
echo $COHERE_API_KEY
```

---

## 🚀 Prochaines Étapes après Installation

1. **Relancer Claude Code** pour charger les nouveaux MCP
2. **Vérifier les outils MCP** dans l'interface Claude
3. **Tester une requête** via les MCP

---

## 🐛 Dépannage

### Problème: "command not found: neo4j-mcp"
```bash
# Vérifier que /usr/local/bin est dans le PATH
echo $PATH | grep /usr/local/bin

# Si non, ajouter temporairement:
export PATH="/usr/local/bin:$PATH"
```

### Problème: "npm: command not found"
```bash
# Installer Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Problème: Permission denied
```bash
# Exécuter avec sudo si nécessaire
sudo chmod +x /usr/local/bin/neo4j-mcp
```

---

*Document créé pour Termius - Toutes les commandes sont prêtes à copier-coller*
