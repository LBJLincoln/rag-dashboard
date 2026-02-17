# rag-data-ingestion — CLAUDE.md

> **Ce repo s'exécute dans un Codespace GitHub éphémère.**
> Tu es un agent Claude Code spécialisé dans l'INGESTION et l'ENRICHISSEMENT des BDD.
> Tu suis le même workflow-process que mon-ipad, adapté à l'amélioration des pipelines d'ingestion.

---

## OBJECTIF DE CE REPO

**Améliorer drastiquement** les 2 workflows d'ingestion via recherche académique 2026,
puis ingérer les datasets sectoriels dans les BDD du projet.

### Les 2 workflows à améliorer
| Workflow | ID n8n | Version actuelle | Objectif |
|----------|--------|-----------------|----------|
| **Ingestion V3.1** | `15sUKy5lGL4rYW0L` | V3.1 | V4.0+ avec techniques SOTA 2026 |
| **Enrichissement V3.1** | `9V2UTVRbf4OJXPto` | V3.1 | V4.0+ avec enrichissement contextuel |

### Cibles de performance
- Qualité d'ingestion : réduire les chunks parasites, améliorer la segmentation
- Qualité des embeddings : meilleure représentation des documents sectoriels FR
- Vitesse : réduire le temps d'ingestion par document
- Couverture : 20+ datasets sectoriels ingérés (voir mon-ipad/technicals/sector-datasets.md)

---

## PHASE 0 : RECHERCHE ACADÉMIQUE (OBLIGATOIRE — FAIRE EN PREMIER)

**Avant tout développement**, effectuer une revue systématique des papiers de recherche 2026.
Les techniques utilisées par Anthropic, OpenAI et la communauté académique pour améliorer le RAG.

### Sources prioritaires (dans l'ordre)
```
1. ArXiv cs.IR + cs.CL (2025-2026) :
   - Rechercher : "RAG ingestion 2026", "chunking strategies SOTA"
   - Rechercher : "contextual retrieval", "late chunking", "semantic chunking"
   - Rechercher : "document enrichment RAG", "metadata augmentation"

2. Anthropic Research Blog (2024-2026) :
   - "Contextual Retrieval" (2024) — technique clé d'enrichissement
   - Prompt caching pour réduire les coûts d'ingestion

3. OpenAI Research + Cookbook :
   - File Search improvements (2025-2026)
   - Embedding fine-tuning techniques

4. Jina AI Research (2024-2026) :
   - "Late Chunking" paper — segmentation après embedding
   - ColPali, ColBERT pour embeddings multi-vecteurs

5. Conférences : SIGIR 2025, ECIR 2026, ACL 2026
```

### Topics de recherche spécifiques
```
CHUNKING :
- Semantic chunking vs fixed-size chunking
- Late chunking (Jina 2024) — avantage pour documents longs
- Hierarchical chunking pour documents structurés (DTU, Eurocodes)
- Sliding window avec overlap adaptatif

ENRICHISSEMENT :
- Contextual retrieval (Anthropic) : ajouter contexte document au chunk
- Hypothetical Document Embeddings (HyDE) — déjà dans nos pipelines, à améliorer
- Summary-enhanced retrieval
- Metadata extraction automatique (date, auteur, section, type doc)

EMBEDDINGS :
- Jina embeddings-v3 vs nouvelles versions 2026
- Multilingual embeddings pour documents FR/EN mixtes
- Domain-specific fine-tuning (finance, juridique)
- Matryoshka embeddings pour compression

GRAPH ENRICHISSEMENT (Neo4j) :
- Entity extraction améliorée (NER fine-tuned sectoriel)
- Relation extraction automatique
- Community detection pour clustering

SQL ENRICHISSEMENT (Supabase) :
- Extraction automatique tableaux depuis PDF
- Normalisation données financières
- Schema inference automatique
```

### Documentation des découvertes
```bash
# Documenter chaque technique découverte
cat >> research/papers-2026.md << EOF
## [Titre du paper]
- Source : ArXiv/Anthropic/OpenAI — [URL]
- Date : [date]
- Technique clé : [description]
- Applicabilité : Ingestion V4 / Enrichissement V4
- Impact estimé : [faible/moyen/fort]
- Priorité : [1/2/3]
EOF
```

---

## INFRASTRUCTURE DE CE CODESPACE

```
Type        : GitHub Codespace (éphémère)
CPU         : 2 cores | RAM : 8 GB | Disque : 32 GB
n8n local   : OUI — docker-compose COMPLET
              n8n + 2 workers (queue mode) + postgres + redis
```

### Containers Docker locaux (démarrés par setup.sh)
```
rag-ingestion-n8n-1      n8nio/n8n:latest     Port 5678 (orchestrator)
rag-ingestion-worker-1   n8nio/n8n:latest     Worker 1 (queue)
rag-ingestion-worker-2   n8nio/n8n:latest     Worker 2 (queue)
rag-ingestion-postgres-1 postgres:15           Port 5432 (interne)
rag-ingestion-redis-1    redis:7-alpine        Port 6379 (queue)
```

**Queue mode** : permet l'ingestion parallèle de multiples documents.

---

## BOUCLE D'ITÉRATION (même que workflow-process.md — adapté ingestion)

### Le "test" ici = mesurer la qualité d'ingestion
La qualité se mesure par la performance RAG APRÈS ingestion.

### Étape 1 : Test 1 document
```bash
source .env.local
# Ingérer 1 document de test
python3 scripts/ingest-one.py --file datasets/sample/btp-dtु-14-001.pdf --pipeline standard
# Vérifier dans Pinecone : bon chunk ? bon embedding ?
python3 scripts/verify-ingestion.py --last 1
```

### Étape 2 : Test retrieval sur document ingéré
```bash
# Question sur le document ingéré
python3 eval/quick-test.py --questions 1 --pipeline standard --filter "last-ingested"
# Double analyse si échec
python3 eval/node-analyzer.py --execution-id <ID>
python3 scripts/analyze_n8n_executions.py --execution-id <ID>
```

### Étape 3 : Test batch (10 documents, 5 questions chacun)
```bash
python3 scripts/ingest-batch.py --sector btp --count 10
python3 eval/quick-test.py --questions 5 --pipeline standard --sector btp
```

### Étape 4 : Ingestion complète d'un dataset sectoriel
```bash
# Télécharger le dataset
python3 scripts/download-dataset.py --name PatronusAI/financebench

# Ingérer via n8n Ingestion workflow
python3 scripts/trigger-ingestion.py --dataset financebench --workers 2

# Vérifier la qualité
python3 scripts/verify-ingestion.py --dataset financebench
python3 eval/run-eval-parallel.py --sector finance --label "financebench-ingest"
```

### Cibles d'amélioration des workflows
| Métrique | V3.1 actuel | Cible V4.0 |
|---------|------------|-----------|
| Chunks utiles / document | ~60% | >= 80% |
| Temps ingestion / doc | variable | < 30s |
| Qualité embedding (retrieval@5) | baseline | +10% |
| Couverture graph entities | partielle | >= 90% |

---

## DATASETS À INGÉRER (depuis mon-ipad/technicals/sector-datasets.md)

### Ordre de priorité
```
1. Finance (impact immédiat sur Quantitative pipeline 78.3% FAIL)
   - PatronusAI/financebench (150 QA expert)
   - TheFinAI/convfinqa (3,800 conversations)

2. Juridique (améliore Graph pipeline 68.7% FAIL)
   - rcds/french_case_law (534,289 décisions)
   - rcds/cold-french-law (droit français)

3. BTP/Construction
   - Datasets identifiés dans sector-datasets.md section 3.1

4. Industrie/Manufacturing
   - Datasets identifiés dans sector-datasets.md section 3.2
```

### Script de téléchargement
```bash
source .env.local
python3 scripts/download-sector-datasets.py --sector finance --max 10000
python3 scripts/download-sector-datasets.py --sector juridique --max 10000
```

---

## AMÉLIORATION DES WORKFLOWS (processus)

### Pour chaque technique découverte en Phase 0
```
1. IMPLÉMENTER dans n8n (workflow local Codespace)
2. TESTER sur 5 documents de référence
3. MESURER la qualité retrieval (avant/après)
4. Si amélioration >= +2% → intégrer
5. SYNC vers GitHub (n8n/sync.py)
6. COMMIT + PUSH
7. SIGNALER à mon-ipad pour déploiement sur VM
```

### Règle : UN fix par itération
- Jamais changer le chunking ET l'enrichissement en même temps
- Baseline claire avant chaque changement
- Comparer avec `snapshot/good/` pour référence

---

## COMMUNICATION AVEC MON-IPAD

Les améliorations validées dans ce Codespace sont déployées sur la VM par mon-ipad :

```bash
# 1. Exporter le workflow amélioré
python3 n8n/sync.py  # exporte vers n8n/live/

# 2. Committer
git add n8n/ research/ docs/
git commit -m "feat(ingestion): V4.0 — late chunking +12% retrieval"
git push origin main

# 3. mon-ipad importe via API REST n8n (sur la VM)
# → Ce déploiement est fait depuis mon-ipad, pas depuis ce Codespace
```

---

## RÈGLES D'OR

1. **Recherche papiers 2026 OBLIGATOIRE** avant tout développement
2. **source .env.local** avant tout script Python
3. **UN fix par itération** — jamais plusieurs changements simultanés
4. **Mesurer AVANT et APRÈS** chaque changement
5. **Double analyse** (node-analyzer + analyze_n8n_executions)
6. **Ne jamais écraser** les indexes Pinecone de mon-ipad (`sota-rag-*`)
7. **Push résultats** avant arrêt du Codespace (éphémère !)
8. **Documenter** chaque technique dans `research/papers-2026.md`
9. **Signaler à mon-ipad** les workflows validés pour déploiement VM

---

## FIN DE SESSION

```bash
# Sync workflows
python3 n8n/sync.py

# Commit
git add n8n/ research/ docs/ logs/
git commit -m "feat(ingestion): [description] — +X% retrieval qualité"
git push origin main
```

---

*Ce CLAUDE.md est géré depuis `mon-ipad/directives/repos/rag-data-ingestion.md`.*
