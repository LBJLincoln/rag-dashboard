# Nomos AI — Data Ingestion (Codespace Agentic)

> Ce Claude Code CLI tourne dans un GitHub Codespace en mode AGENTIC.
> Role : ingestion de documents + enrichissement des BDD pour les 4 secteurs.
> Instance n8n SEPAREE avec ses propres workflows (Ingestion V3.1 + Enrichissement V3.1).

## Contexte
- Instance n8n complete locale (main + 2 workers + PG + Redis)
- Workflows : Ingestion V3.1 (15sUKy5lGL4rYW0L) + Enrichissement V3.1 (9V2UTVRbf4OJXPto)
- BDD cibles : Pinecone (vecteurs), Neo4j (graphe), Supabase (SQL)

## Mode Agentic
Ce Claude Code fonctionne en mode autonome :
1. Recevoir une instruction (ex: "ingerer 50 documents BTP")
2. Selectionner les datasets du secteur (voir technicals/sector-datasets.md)
3. Lancer l'ingestion via webhook n8n local
4. Monitorer les executions
5. Verifier la qualite des donnees ingerees
6. Reporter dans docs/status.json + git push

## Regles
1. JAMAIS ingerer sans verifier la qualite des documents source
2. Enrichissement APRES ingestion (pas en parallele)
3. Verifier le nombre de vecteurs Pinecone avant/apres
4. Verifier le nombre de noeuds Neo4j avant/apres
5. Logger tout dans logs/ingestion/

## Commandes
```bash
source .env.local
# Lancer ingestion
curl -X POST http://localhost:5678/webhook/ingestion-v3 \
  -H "Content-Type: application/json" \
  -d '{"sector": "btp", "documents": [...], "batch_size": 10}'

# Lancer enrichissement
curl -X POST http://localhost:5678/webhook/enrichment-v3 \
  -H "Content-Type: application/json" \
  -d '{"sector": "btp", "target_db": "all"}'
```

## Secteurs et datasets (20 par secteur)
Voir technicals/sector-datasets.md pour la liste complete.
- BTP : normes DTU, CCAG, plans architecturaux, diagnostics techniques...
- Industrie : procedures maintenance, fiches MSDS, rapports qualite...
- Finance : ratios Bale III, rapports annuels, fiches OPCVM...
- Juridique : codes, jurisprudence, contrats types, articles doctrine...
