# Session State — 18 Fevrier 2026 (Session 23)

> Last updated: 2026-02-18T23:30:00+01:00

## Objectif de session
Pilotage live Codespaces depuis VM, push websites PME, clarification architecture n8n, création 2 repos PME séparés.

## Session 23 — Taches accomplies

### T1. Systeme de pilotage live Codespaces
- Cree `scripts/codespace-control.sh` (220+ lignes) avec 8 commandes : list/launch/status/logs/stream/stop/results/monitor
- Cree `eval/progress_callback.py` — ProgressReporter ecrit `/tmp/eval-progress.json` apres chaque question
- Integre dans `eval/run-eval-parallel.py` : reporter.start(), reporter.update() par question, reporter.pipeline_done(), reporter.finish()
- Architecture : VM → `gh codespace ssh` → lecture progress.json / kill PID / tail -f logs

### T2. Clarification architecture n8n
- Pas besoin d'un n8n Docker separe pour les 16+ workflows
- Definitions workflows = ~500KB dans PostgreSQL, aucun impact RAM
- VM stocke + expose webhooks, Codespaces executent
- Documente dans CLAUDE.md

### T3. Creation 2 repos PME separes
- `rag-pme-connectors` : 45 fichiers, Next.js, site 12 connecteurs apps
- `rag-pme-usecases` : 46 fichiers, Next.js, catalogue 200 cas d'usage
- Remotes ajoutes dans mon-ipad (total 7 repos)
- Vercel a configurer pour auto-deploy

### T4. Mise a jour CLAUDE.md complete
- Passage de 5 a 7 repos
- Section pilotage live Codespaces (architecture, commandes, callback)
- Section clarification archi n8n
- Tables deployements Vercel mise a jour
- Regles d'or 22 + 23 ajoutees

## Commits session 23
| Hash | Description |
|------|-------------|
| dd2a930 | pilotage live Codespaces + push websites PME |
| 1c5fbf3 | 2 repos PME crees + remotes ajoutes + CLAUDE.md 7 repos |

## Repos impactes
- mon-ipad (T1-T4)
- rag-pme-connectors (T3 — nouveau)
- rag-pme-usecases (T3 — nouveau)

## Decisions prises
1. PAS de n8n Docker separe — VM n8n stocke les definitions, Codespaces executent
2. Repos PME separes (pas dans rag-website) pour deploiement Vercel independant
3. Pilotage live via `gh codespace ssh` — pas de webhook obligatoire
4. Progress callback ecrit en local (/tmp/eval-progress.json), VM lit via SSH

### T5. Configuration Vercel pour 2 repos PME
- Projets Vercel créés via API (prj_SXyOzloroHkQoEOyAB2fbBCsaOMq, prj_XjAAWoZCdF8XulyXtW2rNn22zHeH)
- Région cdg1 (Paris) configurée
- SSO désactivé sur les 4 projets
- 4/4 sites HTTP 200 (ETI + PME Connectors + PME UseCases + Dashboard)

### T6. Analyse migration Codespaces → HuggingFace Spaces
- Vérifié: workflow-process aligné sur tous les repos (4-step loop)
- Bottleneck 150K questions = OpenRouter 20req/min (pas RAM)
- Script migration créé: scripts/migrate-to-hf-spaces.sh
- Architecture cible: VM (pilotage) + HF Space (n8n 16GB + 3 workers)

## Commits session 23
| Hash | Description |
|------|-------------|
| dd2a930 | pilotage live Codespaces + push websites PME |
| 1c5fbf3 | 2 repos PME créés + remotes ajoutés + CLAUDE.md 7 repos |
| c4ccaa1 | session-state MAJ session 23 |
| b8b3ca5 | Vercel configuré — 4 sites live HTTP 200 |

## Prochaine action (Session 24)
1. **Lancer migration HF Spaces** : `source .env.local && bash scripts/migrate-to-hf-spaces.sh`
2. Configurer keep-alive crontab VM
3. Fix Graph 68.7%→70% (via HF Space n8n au lieu de Codespace)
4. Fix Quantitative 78.3%→85%

---

## Session 22 — Taches accomplies (precedente)

### T1. Diagnostic RAM VM
- 83Mi free, 188Mi available (OK pour pilotage)
- Docker: 176Mi (n8n+redis+pg)
- Claude Code: 209Mi
- Verdict: conforme a l'architecture (pilotage only, tests → Codespaces)

### T2. Migration timestamps UTC→Paris (Europe/Paris)
- Cree eval/tz_utils.py (paris_now, paris_iso, paris_strftime)
- Modifie 5 scripts eval: run-eval.py, generate_status.py, live-writer.py, run-eval-parallel.py, iterative-eval.py
- Modifie scripts/check-staleness.sh (regex accepte +01:00 et Z)
- Mis a jour 26 fichiers .md headers vers heure Paris
- 26/26 fichiers passent le check-staleness.sh

### T3. Ajout retry + backoff dans call_rag()
- call_rag() dans eval/run-eval.py: 3 retries avec backoff exponentiel (2s, 5s, 9s)
- Retry sur: 429, 502, 503, 504, timeout, connection errors
- Impact: elimine les faux negatifs dus aux 503 n8n transitoires

### T4. Fix docker-compose rag-data-ingestion workers
- Ajoute API keys completes (OpenRouter, Jina, Pinecone, Neo4j, Supabase) aux 2 workers
- Ajoute LLM models + embedding config
- Ajoute healthchecks + mem_limit 1g par worker
- Workers passent de concurrency implicite a --concurrency=3

### T5. Ajout healthchecks + memory limits docker-compose rag-tests
- n8n-main: healthcheck curl /healthz, mem_limit 2g
- Workers 1-3: healthcheck node, mem_limit 1536m chacun
- Prevents OOM crashes et auto-recovery

### T6. Script inventaire automatise cross-repos
- Cree scripts/inventory-update.sh
- Compte fichiers de chaque repo via git ls-tree
- Resultat: 1418 fichiers (683+344+84+10+297)
- Genere infra/inventory.md automatiquement

### T7. Finalisation 3 sites web PME (EN COURS)
- website/ (ETI 4 secteurs): enrichi session 21
- website-pme-connectors/ (12 connecteurs apps): cree session 21, pas deploye
- website-pme-usecases/ (catalogue 200 cas): cree session 21, pas deploye

## Decisions prises
1. Timestamps heure Paris partout (eval, directives, staleness)
2. Retry 3x avec backoff dans call_rag() (0 faux negatifs 503)
3. Workers ingestion ont les memes API keys que main
4. Memory limits sur tous les containers Codespace

## Analyse architecture 500q parallele
**Status: possible en theorie, pas encore en pratique.**
- Actuel: 3 workers × concurrency=2 = 6 exec paralleles max
- Bottleneck: OpenRouter free tier (~20 req/min)
- Pour 500q/pipeline: besoin asyncio.Semaphore + aiohttp (decrit dans infrastructure-plan.md mais PAS implemente)
- Estimation: 500q × 4 pipelines = 2000q → 5.5-11h sur Codespace
- La VM ne fait QUE du pilotage (correct)

## Commits session 22

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
