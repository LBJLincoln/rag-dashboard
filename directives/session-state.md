# Session State — 18 Fevrier 2026 (Session 20)

> Last updated: 2026-02-18T20:00:00Z

## Objectif de session
Nettoyage massif, verification staleness, specialisation des 4 repos satellites, creation dossier infra/, inventaire complet, recherche alternatives cloud gratuites, creation directive recherche internet centralisee.

## Taches accomplies

### T1. Desactivation 4 workflows n8n Docker (API REST)
- Feedback V3.1 (`F70g14jMxIGCZnFz`) → desactive
- Monitoring (`tLNh3wTty7sEprLj`) → desactive
- Orchestrator Tester (`m9jaYzWMSVbBFeSf`) → desactive
- RAG Batch Tester (`y2FUkI5SZfau67dN`) → desactive

### T2. Suppression 4 fichiers workflow n8n/live/
- Supprimes : feedback.json, benchmark-monitoring.json, benchmark-orchestrator-tester.json, benchmark-rag-tester.json
- Resultat : 9 fichiers restants dans n8n/live/

### T3. Correction fichiers outdated
- `technicals/phases-overview.md` : Neo4j 110→19,788, Supabase 88→17,000+, workflows 13→9
- `docs/data.json` : workflow IDs Docker corriges (4 pipelines)
- `CLAUDE.md` : 3 support workflows marques OFF (pret)
- `directives/dataset-rationale.md` : timestamp ajoute

### T4. Anti-staleness complet
- 10 fichiers .md sans timestamp → tous corriges
- 25/25 fichiers passent le check-staleness.sh

### T5. Push directives vers satellites
- `bash scripts/push-directives.sh` execute → 4 repos MAJ

### T6. Specialisation repos satellites (grande suppression)
- Script `scripts/specialize-repos.sh` cree (170 lignes)
- rag-tests : 31 items supprimes (website/, mcp/, n8n/, db/, etc.)
- rag-website : 17 items supprimes (eval/, scripts/, datasets/, etc.)
- rag-dashboard : 22 items supprimes (quasi tout sauf docs/)
- rag-data-ingestion : 30 items supprimes (website/, eval/, etc.)

### T7. Creation dossier infra/
- 8 fichiers : 6 copies depuis technicals/ + inventory.md + cloud-alternatives.md
- Mermaid diagrams architecture 5 repos + infra + workflows

### T8. Inventaire complet (infra/inventory.md)
- mon-ipad : 504 fichiers core
- rag-tests : 326 fichiers (post-specialisation)
- rag-website : 83 fichiers
- rag-dashboard : 9 fichiers
- rag-data-ingestion : 295 fichiers

### T9. Recherche alternatives cloud gratuites (infra/cloud-alternatives.md)
- 20+ providers analyses (HF Spaces, Azure, AWS, Fly.io, Railway, Koyeb, Render, Hetzner)
- **Decouverte majeure** : Hugging Face Spaces = 16 GB RAM, 2 CPU, $0 permanent
- Strategie multi-provider : HF Spaces + Supabase + Codespaces = $0 total, 25 GB RAM distribuee
- Estimation Phase 5 : 1M questions / 1,200 req/h = ~35 jours 24/7

### T10. Directive recherche internet centralisee (directives/research-methodology.md)
- 4 tiers de sources (arXiv → Labs blogs → Docs officielles → Leaderboards)
- Suivi obligatoire : Anthropic, OpenAI, Google DeepMind, xAI, Meta AI
- Contrainte $0 absolue : toute technique payante → chercher alternative gratuite
- Template de documentation avec references verifiables

### T11. Verification fixes-library dans satellites
- rag-tests : OK (technicals/fixes-library.md present)
- rag-data-ingestion : OK (technicals/fixes-library.md present)
- rag-website : N/A (pas de debug pipeline)
- rag-dashboard : N/A (statique)

### T12. Review rag-research-2026.md
- 11 papiers arXiv cites, structure solide
- Garde dans technicals/ (source de verite academique)
- Idees integrees dans cloud-alternatives.md et research-methodology.md

## Decisions prises
1. VM GCloud = pilotage uniquement (RAM non compromise, ~400 MB Docker + Claude Code)
2. HF Spaces = option migration moyen terme (16 GB RAM gratuit)
3. Research-methodology.md = directive centralisee pour TOUS les repos
4. Specialisation repos = chaque repo ne garde que ce qui le concerne

## Commits session 20
| Hash | Description |
|------|-------------|
| 724c596 | nettoyage massif + staleness + specialisation repos |
| 1bc6002 | infra/ dossier + inventaire + alternatives cloud + directive recherche |

## Repos impactes
- mon-ipad (T1-T12)
- rag-tests (T5 directives + T6 specialisation)
- rag-website (T5 directives + T6 specialisation)
- rag-dashboard (T5 directives + T6 specialisation)
- rag-data-ingestion (T5 directives + T6 specialisation)

## Prochaine action (Session 21)
1. **Fix Graph 68.7%→70%** (gap -1.3pp, plus petit gap) dans Codespace rag-tests
2. **Fix Quantitative 78.3%→85%** (CompactRAG + BM25) dans Codespace rag-tests
3. **Si gates passees** : Phase 2 (1000q HuggingFace)
4. **Optionnel** : Deployer n8n sur HF Spaces si besoin plus de RAM

## Accuracy actuelle (inchangee — aucun test cette session)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | 85% | PASS |
| Graph | 68.7% | 70% | FAIL (fix applique, retester) |
| Quantitative | 78.3% | 85% | FAIL (fix applique, retester) |
| Orchestrator | 80.0% | 70% | PASS |
| **Overall** | **78.1%** | **75%** | **PASS** |
