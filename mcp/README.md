# MCP Servers — Status et Configuration

> Derniere mise a jour : 2026-02-15

---

## MCP Configures (`.claude/settings.json` + `~/.claude/settings.json`)

| # | MCP Server | Type | Status | Outils principaux |
|---|------------|------|--------|-------------------|
| 1 | **n8n** | streamableHttp | ACTIF (verifie 15-fev) | search_workflows, execute_workflow, get_workflow_details |
| 2 | **jina-embeddings** | Python stdio | ACTIF (deps OK) | embed, pinecone CRUD, n8n API helpers |
| 3 | **neo4j** | Binary stdio | ACTIF (deps OK) | get-schema, execute-read, execute-write |
| 4 | **pinecone** | Node stdio | ACTIF (deps OK) | list-indexes, search-records, rerank-documents |
| 5 | **supabase** | streamableHttp | ACTIF (PAT Bearer, verifie 15-fev) | list_tables, execute_sql, get_logs |
| 6 | **cohere** | Python stdio | ACTIF (deps OK) | embed, rerank, generate |
| 7 | **huggingface** | Python stdio | ACTIF (deps OK) | search_models, search_datasets |

---

## Diagnostic 15-fev — Pourquoi les MCP ne se chargent pas

### Verification effectuee
1. **n8n MCP** : curl test OK (200 + JSON-RPC initialize). Token Bearer valide.
2. **Python MCPs** (jina, cohere, huggingface) : `mcp` package v1.26.0 installe, imports `mcp.server.Server`, `mcp.server.stdio`, `mcp.types` OK.
3. **neo4j MCP** : binary `/usr/local/bin/neo4j-mcp` present.
4. **pinecone MCP** : module node a `node_modules/@pinecone-database/mcp/dist/index.js` — demarre en stdio.
5. **supabase MCP** : retourne HTTP 401. Necessite un Personal Access Token (PAT) via le dashboard Supabase.

### Cause probable
Les MCP servers sont configures correctement mais ne se chargent pas au demarrage de la session Claude Code. Cela peut etre du a :
- Timeout transitoire au demarrage
- Supabase 401 bloquant le chargement des autres serveurs
- Bug d'initialisation MCP dans Claude Code

### Solution
1. **Redemarrer Claude Code** (`/exit` puis relancer) pour re-initialiser les MCP.
2. **Supabase** : Obtenir un Personal Access Token depuis `https://supabase.com/dashboard/account/tokens` et l'ajouter a la config.

---

## Supabase MCP — RESOLU (15-fev)

Le serveur MCP Supabase necessite un Personal Access Token (PAT) via Bearer header.

- Le `access_token` en query param ne fonctionne **PAS** (401).
- Le `Authorization: Bearer sbp_...` en header **fonctionne**.

**Config correcte** :
```json
"supabase": {
  "type": "streamableHttp",
  "url": "https://mcp.supabase.com/mcp?project_ref=ayqviqmxifzmhphiqfmj",
  "headers": { "Authorization": "Bearer <PAT_sbp_token>" }
}
```

PAT obtenu depuis : Dashboard Supabase > Account > Access Tokens > Generate new token (format `sbp_...`).

---

## Configuration actuelle reelle (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "n8n": {
      "type": "streamableHttp",
      "url": "http://34.136.180.66:5678/mcp-server/http",
      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
    },
    "jina-embeddings": {
      "command": "/home/termius/mon-ipad/.venv/bin/python3",
      "args": ["/home/termius/mon-ipad/mcp/jina-embeddings-server.py"],
      "env": { "JINA_API_KEY": "...", "PINECONE_API_KEY": "...", "N8N_HOST": "...", "N8N_API_KEY": "...", "OPENROUTER_API_KEY": "..." }
    },
    "neo4j": {
      "command": "neo4j-mcp",
      "env": { "NEO4J_URI": "neo4j+s://38c949a2.databases.neo4j.io", "NEO4J_USERNAME": "neo4j", "NEO4J_PASSWORD": "...", "NEO4J_READ_ONLY": "true", "NEO4J_TRANSPORT_MODE": "stdio" }
    },
    "pinecone": {
      "command": "node",
      "args": ["/home/termius/mon-ipad/node_modules/@pinecone-database/mcp/dist/index.js"],
      "env": { "PINECONE_API_KEY": "..." }
    },
    "supabase": {
      "type": "streamableHttp",
      "url": "https://mcp.supabase.com/mcp?project_ref=ayqviqmxifzmhphiqfmj",
      "headers": { "Authorization": "Bearer <PAT_sbp_token>" }
    },
    "cohere": {
      "command": "/home/termius/mon-ipad/.venv/bin/python3",
      "args": ["/home/termius/mcp-servers/custom/cohere-mcp-server.py"],
      "env": { "COHERE_API_KEY": "..." }
    },
    "huggingface": {
      "command": "/home/termius/mon-ipad/.venv/bin/python3",
      "args": ["/home/termius/mcp-servers/custom/huggingface-mcp-server.py"],
      "env": { "HF_TOKEN": "..." }
    }
  }
}
```

**IMPORTANT** : La config est identique dans `~/.claude/settings.json` (global) et `.claude/settings.json` (projet).

---

## Fichiers dans ce dossier

| Fichier | Description |
|---------|-------------|
| `jina-embeddings-server.py` | Serveur MCP custom : embeddings Jina + Pinecone CRUD + n8n API |
| `cohere-mcp-server.py` | Serveur MCP custom : embeddings + reranking Cohere |
| `huggingface-mcp-server.py` | Serveur MCP custom : recherche modeles/datasets HF |
| `setup.md` | Guide d'installation complet des MCP servers |
| `servers-status.md` | Status detaille par serveur |
| `analysis-complete.md` | Analyse MCP vs API directe |
| `termius-setup.md` | Configuration Termius + MCP |
