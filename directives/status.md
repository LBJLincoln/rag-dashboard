# Status — 19 Fevrier 2026 (Session 25)

> Last updated: 2026-02-19T15:30:00+01:00

## Session 25 = Architecture decisions + Template fix + Datasets sectoriels

Session majeure avec 7 commits, 7 fixes documentes (FIX-21 a FIX-27), decisions architecturales critiques, et telechargement des datasets sectoriels.

### Decisions CRITIQUES prises cette session

1. **VM = pilotage UNIQUEMENT** (Rule 28) — ZERO modification de workflow n8n sur VM
   - Raison : Task Runner cache le code compile meme apres restart complet (Pattern 2.11)
   - VM sert uniquement pour : Claude Code CLI, repo mon-ipad, git push, n8n stockage
   - Modifications de workflows → HF Space (16 GB RAM) ou Codespace (8 GB)
2. **Pre-vol checklist OBLIGATOIRE** (Rule 29) — consulter knowledge-base.md Section 0 avant tout test webhook
3. **Session max 2h** (Rule 26)
4. **MCP servers = negligeable** (~6MB total) — PAS un probleme de RAM

### HF Space nomos-rag-engine — PARTIELLEMENT operationnel

| Element | Etat |
|---------|------|
| URL | https://lbjlincoln-nomos-rag-engine.hf.space |
| Runtime | RUNNING (cpu-basic, 16GB RAM, $0) |
| n8n | 2.8.3 (latest), SQLite, Redis |
| Credentials | 12/12 objets importes |
| Workflows | 9 importes |
| **Standard** | **200 OK** — fonctionne |
| **Graph** | **404** — webhook non enregistre (mauvais path dans import) |
| **Quantitative** | **500** — enregistre mais erreur Supabase |
| **Orchestrator** | **404** — webhook non enregistre |
| REST API | **BROKEN** — FIX-15 (proxy HF strip POST body pour /api/) |
| Keep-alive | Cron VM */30 min |

### Taches accomplies (7)

| # | Tache | Detail |
|---|-------|--------|
| T1 | Datasets sectoriels telecharges | 7,609 items, 4 secteurs (Finance 2250, Juridique 2500, BTP 1844, Industrie 1015) |
| T2 | 7 fixes documentes | FIX-21 (Code node cache), FIX-22 (OpenRouter 429), FIX-23 (HF dataset IDs), FIX-24 (N8N_RUNNERS), FIX-25 (Claude zombies), FIX-26 (pre-vol checklist), FIX-27 (API 401) |
| T3 | Script download-sectors.py corrige | 6 IDs HF corriges, support config, splits |
| T4 | Documentation enrichie | knowledge-base.md Section 0, improvements-roadmap.md, fixes-library 27 fixes, CLAUDE.md rules 25-29 |
| T5 | Template SQL code ecrit | Prepare SQL Request + SQL Validator modifies, prets a deployer |
| T6 | Graph teste avec succes | "Who founded Microsoft?" → "Bill Gates and Paul Allen" (200 OK, VM, correct webhook path) |
| T7 | Architecture VM clarifiee | VM = pilotage only, Rules 25-29, Pattern 2.11 documente |

### Commits session 25 (7)

| Hash | Description |
|------|-------------|
| 391e619 | datasets sectoriels + download-sectors.py |
| c71a39d | knowledge-base.md + fixes-library FIX-21-25 |
| fcc460a | CLAUDE.md enrichi |
| d60f871 | improvements-roadmap.md |
| 5d4d937 | pre-vol checklist + FIX-26/27 |
| f56a17c | workflow template fix + execution archives |
| b945aa3 | architecture decision — VM pilotage only |

## Pipelines RAG — Accuracy (inchangee — retester sur HF Space)

| Pipeline | Score | Target | Status |
|----------|-------|--------|--------|
| Standard | 85.5% | 85% | PASS |
| Graph | 68.7%* | 70% | FAIL (fix bolt→https applique, quick-test 5/5 PASS, besoin full eval 50q) |
| Quantitative | 78.3%* | 85% | FAIL (template SQL pret mais PAS deploye — Task Runner cache) |
| Orchestrator | 80.0% | 70% | PASS |
| **Overall** | **78.1%** | **75%** | **PASS** |

*Accuracy mesuree avant les fixes. Retester sur HF Space pour confirmer.

## Webhook Paths verifies (Session 25 — depuis PostgreSQL webhook_entity)

| Pipeline | Path CORRECT | Field | Methode |
|----------|-------------|-------|---------|
| Standard | `/webhook/rag-multi-index-v3` | query | POST |
| Graph | `/webhook/ff622742-6d71-4e91-af71-b5c666088717` | query | POST |
| Quantitative | `/webhook/3e0f8010-39e0-4bca-9d19-35e5094391a9` | query | POST |
| Orchestrator | `/webhook/92217bb8-ffc8-459a-8331-3f553812c3d0` | query | POST |

**ATTENTION** : Anciens paths incorrects dans CLAUDE.md/docs corriges cette session. Toujours consulter knowledge-base.md Section 0.

## Prochaine session (26)

**Priorite 1** : Deployer workflow Quantitative fixe sur HF Space (template SQL matching)
**Priorite 2** : Importer Graph et Orchestrator sur HF Space avec les bons webhook paths
**Priorite 3** : Full eval Graph 50q sur HF Space pour confirmer >=70%
**Priorite 4** : Full eval Quantitative 50q sur HF Space apres template fix
**Priorite 5** : Si gates passees → Phase 2 (1000q HuggingFace)

## Etat des BDD (inchange)

| BDD | Contenu | Pret Phase 2 |
|-----|---------|--------------|
| Pinecone `sota-rag-jina-1024` | 10,411 vecteurs, 12 ns | Oui |
| Neo4j Aura Free | 19,788 nodes, 76,717 relations | Oui |
| Supabase | 40 tables, ~17K lignes | Partiel (besoin ingestion Phase 2) |

## Problemes non resolus

1. **HF Space API inaccessible** — FIX-15 (proxy strip POST body pour /api/). Impossible de deployer workflows via REST API programmatiquement
2. **Task Runner cache sur VM** — Pattern 2.11. Le code compile dans le Task Runner n'est pas rafraichi meme apres restart complet
3. **Graph + Orchestrator 404 sur HF Space** — Webhooks non enregistres (mauvais paths dans import initial)
4. **~15 fichiers directives/technicals etaient stale** — Mise a jour en cours cette session
