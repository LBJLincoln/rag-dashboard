# Workflows Website — n8n/website/

> **IMPORTANT** : Ces workflows sont DISTINCTS des workflows `rag-data-ingestion`.
> - `rag-data-ingestion` → ingestion de benchmarks académiques (14 datasets, Supabase/Neo4j/Pinecone general)
> - `n8n/website/` → workflows spécifiques au site business (4 secteurs, demos clientèle)

---

## Architecture

```
n8n/website/
├── RAG Pipelines (copies Phase 1 validées)
│   ├── website-standard-btp.json       ← Standard RAG (85.5% P1) → secteur BTP
│   ├── website-standard-industrie.json ← Standard RAG (85.5% P1) → secteur Industrie
│   ├── website-quantitative-finance.json ← Quantitative RAG (fixé) → secteur Finance
│   ├── website-graph-juridique.json    ← Graph RAG (fixé) → secteur Juridique
│   └── website-orchestrator.json       ← Orchestrateur → route vers les 4 secteurs
│
└── Ingestion (nouveaux — secteurs uniquement)
    ├── website-ingestion-finance.json
    ├── website-ingestion-juridique.json
    ├── website-ingestion-btp.json
    └── website-ingestion-industrie.json
```

## Provenance des RAG Pipelines

| Workflow website | Source Phase 1 | Accuracy Phase 1 | Statut source |
|-----------------|----------------|-----------------|---------------|
| website-standard-btp | standard.json | **85.5%** | PASS ✅ |
| website-standard-industrie | standard.json | **85.5%** | PASS ✅ |
| website-quantitative-finance | quantitative.json | 78.3% → **fixé** | PASS après fix |
| website-graph-juridique | graph.json | 68.7% → **fixé** | PASS après fix |
| website-orchestrator | orchestrator.json | **80.0%** | PASS ✅ |

**Règle** : Un workflow entre dans `n8n/website/` uniquement après avoir passé Phase 1.
Si un pipeline passe Phase 2, la version Phase 2 remplace la version Phase 1.

## Pinecone

| Workflow | Index | Namespace |
|---------|-------|-----------|
| website-standard-btp | website-sectors-jina-1024 | `btp` |
| website-standard-industrie | website-sectors-jina-1024 | `industrie` |
| website-quantitative-finance | website-sectors-jina-1024 | `finance` |
| website-graph-juridique | website-sectors-jina-1024 | `juridique` |

## Ingestion → Pinecone

| Workflow | Datasets HuggingFace | Namespace cible |
|---------|---------------------|----------------|
| website-ingestion-finance | PatronusAI/financebench, czyssrs/ConvFinQA, kasnerz/tatqa | `finance` |
| website-ingestion-juridique | rcds/french_case_law, rcds/cold-french-law, nguha/legalbench | `juridique` |
| website-ingestion-btp | GT4SD/code-accord, rungalileo/ragbench | `btp` |
| website-ingestion-industrie | thesven/manufacturing-qa-gpt4o, rungalileo/ragbench | `industrie` |

## Déploiement (dans Codespace rag-website)

```bash
# 1. Démarrer n8n local
docker compose up -d  # docker-compose.yml du repo rag-website

# 2. Importer tous les workflows website
for f in n8n/website/website-*.json; do
  curl -X POST http://localhost:5678/api/v1/workflows \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    --data @"$f"
  echo "Imported: $f"
done

# 3. Activer les workflows RAG (pas les ingestion)
# → Activer manuellement via UI ou API les 5 workflows RAG
# → Lancer les 4 ingestion manuellement (Manual Trigger)

# 4. Vérifier
curl -s http://localhost:5678/webhook/rag-multi-index-v3 \
  -X POST -H "Content-Type: application/json" \
  -d '{"query": "Quelles sont les exigences RE2020 pour un bâtiment tertiaire ?"}'
```

## Fixes appliqués (vs workflows Phase 1 originaux)

### Graph → website-graph-juridique
- **Fix tenant_id** : `n.tenant_id IN ['default', 'benchmark'] OR n.tenant_id IS NULL`
  (Neo4j a 2 tenant_ids distincts — l'ancien filtre en ratait la moitié)

### Quantitative → website-quantitative-finance
- **Fix Schema Introspection** : Suppression tables inexistantes (`sales_data`, `kpis`, `companies`)
  + Ajout tables réelles (`orders`, `customers`, `departments`, `quarterly_revenue`)
- **Fix SQL Validator** : Injection tenant_id désactivée pour JOINs complexes
- **Fix prompt SQL** : Ajout fallback `tenant_id IS NULL` en règle de sécurité

## Note importante

Les workflows rag-data-ingestion (Ingestion V3.1, Enrichissement V3.1) ne sont PAS utilisés ici.
Ils ingèrent les 14 benchmarks académiques vers Pinecone (sota-rag-jina-1024), Neo4j, Supabase.
Les workflows website-ingestion-* ingèrent uniquement les données sectorielles vers `website-sectors-jina-1024`.
