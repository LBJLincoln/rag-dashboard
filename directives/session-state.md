# Session State — 19 Fevrier 2026 (Session 27 suite)

> Last updated: 2026-02-20T00:15:00+01:00

## Objectif de session : Phase 2 pour TOUS les pipelines (bottleneck strategy)

### Etat des 4 pipelines (derniere mise a jour)

| Pipeline | HF Space Status | Bottleneck restant | Fix applique | Status |
|----------|----------------|-------------------|--------------|--------|
| **Standard** | **200 OK** (9-29s) | AUCUN | — | **PASS** |
| **Graph** | **200 OK** (18-44s) | AUCUN | — | **PASS** |
| **Quantitative** | **200 OK** (3-6s) | OpenRouter 429 rate limit | FIX-33+35 infra OK | **PARTIAL** (LLM rate limited) |
| **Orchestrator** | **200 OK** (14-35s) | Degrades under concurrent load | FIX-34 httpRequest | **PASS** (sequential) |

### MILESTONE — 3/4 pipelines fonctionnels, 1/4 rate limited (pas infra)
- Standard, Graph, Orchestrator: fonctionnels, reponses correctes
- Quantitative: infra OK (12 noeuds executent), OpenRouter 429 rate limit (quota)
- FIX-35b: URL OpenRouter corrigee, FIX-33: $env remplaces

### CONCURRENCY TESTING (session 27 suite)

| Config | Pipelines | Concurrency | Standard | Graph | Orchestrator |
|--------|-----------|-------------|----------|-------|--------------|
| Baseline | 3 | 1 | 100% (9s) | 100% (18s) | 100% (14s) |
| Moderate | 3 | 3 | 100% (23s) | 90% (26s) | 70% (35s) |
| Stress | 3 | 5 | 100% (29s) | 90% (44s) | 0% AUTO-STOP |

Key: Standard rock solid at any load. Orchestrator must run sequential.

### DOCUMENTATION CREATED (session 27 suite)
- `technicals/diagnostic-flowchart.md` — 6 decision trees for recurring problems
- `technicals/knowledge-base.md` Section 7.4 — Concurrent load testing results
- `technicals/architecture.md` — Updated HF Space state (3/4 pipelines working)
- `eval/parallel-pipeline-test.py` v2 — concurrent questions support (--concurrency flag)

### Fixes session 27

| Fix | Description | Commits HF |
|-----|-------------|------------|
| FIX-29 | Quant postgres->REST API, Orch bitwiseHash, 16 env vars, JWT key | 68d113a, 5cab714 |
| FIX-30 | PostgreSQL local pour Orchestrator, HTTP v4.3, continueOnFail | 508f594, 918deaa, 11884c6, 8225c6d |
| FIX-31 | Live diagnostic server (diag-server.py) + improved error tracking | 783230d, fc72dba |
| FIX-32 | Quant $env Code nodes + Standard sub-workflow return | 810772e, 94949b2 |
| FIX-33 | $env replace ALL refs at import time (n8n 2.8 blocks ALL) | 90fe71e, 72fb888 |
| FIX-34 | Orchestrator: executeWorkflow -> httpRequest (sub-wf return vide) | 618fc09 |
| FIX-35 | Quantitative: OPENROUTER_BASE_URL manquait /chat/completions | 7d378d9, 31e684b |

### Commits session 27

| Hash | Repo | Description |
|------|------|-------------|
| 01eb2d2 | mon-ipad | feat(session-27): FIX-29 script + bottleneck strategy started |
| 2b039b6 | mon-ipad | fix(session-27): FIX-29 complete — fixes-library + session-state |
| 0dfba3a | mon-ipad | docs: session-state update (FIX-31, FIX-32) |
| c37f706 | mon-ipad | docs: fixes-library FIX-30/31/32 + anti-patterns |
| 22de3f7 | mon-ipad | docs: FIX-33 documentation |
| 3d10e2e | mon-ipad | docs: FIX-33/34 session-state + fixes-library |
| 4723d01 | mon-ipad | docs: FIX-34/35 fixes-library + session-state |
| 9b21b96 | mon-ipad | feat: parallel-pipeline-test.py v1 |
| 5b1c29e | mon-ipad | docs: diagnostic-flowchart + architecture update |
| a45189d | mon-ipad | feat: parallel-pipeline-test.py v2 (concurrent questions) |
| 68d113a | HF Space | fix(FIX-29): Quant REST API + Orch error handler + missing env vars |
| 5cab714 | HF Space | fix(FIX-29b): Orch activeVersion + Init V8 error handling |
| 91b3843 | HF Space | diag(FIX-29c): diagnostic tests in entrypoint |
| 508f594 | HF Space | fix(FIX-30): local PostgreSQL + Quant HTTP v4.3 |
| 918deaa | HF Space | fix(FIX-30b): PostgreSQL path fix + Quant format adaptation |
| 11884c6 | HF Space | fix(FIX-30c): PostgreSQL minimal resources |
| 8225c6d | HF Space | diag(FIX-29d): detailed execution error tracking |
| 783230d | HF Space | fix(FIX-31): live diagnostic server + improved error tracking |
| fc72dba | HF Space | fix(FIX-31b): diag-server list handling + /raw endpoint |
| 810772e | HF Space | fix(FIX-32): Quant $env fix + Standard sub-wf return |
| 94949b2 | HF Space | fix(FIX-32b): patch activeVersion — Quant $env + Standard sub-wf |
| 90fe71e | HF Space | fix(FIX-33): replace ALL $env refs at import time |
| 72fb888 | HF Space | fix(FIX-33b): standalone fix-env-refs.py script |
| 618fc09 | HF Space | feat(FIX-34): executeWorkflow -> httpRequest for sub-wf calls |
| 7d378d9 | HF Space | fix(FIX-35): OPENROUTER_BASE_URL /chat/completions |
| 31e684b | HF Space | fix(FIX-35b): bash case statements for URL fix |

### Prochaines actions
1. Resoudre Quantitative 429 rate limit — tester modele alternatif (Qwen, DeepSeek)
2. Ajouter model fallback dans entrypoint.sh (LLM_SQL_MODEL env var)
3. Lancer eval parallele 20+ questions pour validation complete
4. Documenter concurrency limits dans architecture.md
5. Valider Phase 1 gates
