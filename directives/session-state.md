# Session State — 19 Fevrier 2026 (Session 25)

> Last updated: 2026-02-19T14:30:00+01:00

## Objectif de session
1. Faire passer Phase 1 (Graph >=70%, Quantitative >=85%) pour debloquer Phase 2
2. Telecharger les datasets sectoriels pour rag-website (4 secteurs)

## Session 25 — Taches accomplies

### T1. Datasets sectoriels telecharges (7,609 items, 4 secteurs)
| Secteur | Fichiers | Items | Taille |
|---------|----------|-------|--------|
| Finance | 6 (financebench, convfinqa, tatqa, sec_qa, tatqa_ragbench, finqa_ragbench) | 2,250 | 6.5MB |
| Juridique | 5 (french_case_law_juri, french_case_law_cetat, cold_french_law, cail2018, hotpotqa_ragbench) | 2,500 | 13MB |
| BTP | 4 (code_accord_entities, code_accord_relations, ragbench_techqa, docie) | 1,844 | 5.7MB |
| Industrie | 3 (manufacturing_qa, ragbench_emanual, additive_manufacturing) | 1,015 | 1.6MB |

### T2. 7 nouveaux fixes documentes (FIX-21 a FIX-27)
| Fix | Probleme | Impact |
|-----|----------|--------|
| FIX-21 | n8n Code node cache — PUT + Activate cycle obligatoire | CRITIQUE |
| FIX-22 | OpenRouter 429 rate-limit — retries + neverError + error serialization | CRITIQUE |
| FIX-23 | HuggingFace dataset IDs incorrects (6/11 faux) | IMPORTANT |
| FIX-24 | N8N_RUNNERS_ENABLED deprecie dans n8n 2.7.4+ | IMPORTANT |
| FIX-25 | Anciennes sessions Claude Code zombies consomment RAM | IMPORTANT |
| FIX-26 | Webhook path/field name incorrects — pre-vol checklist | CRITIQUE |
| FIX-27 | n8n REST API 401 — pas de cle API dans Docker | IMPORTANT |

### T3. Script download-sectors.py corrige
- 6 IDs HuggingFace corriges
- Support `config` ajoute dans load_dataset
- `trust_remote_code` retire (deprecie)
- Splits corriges

### T4. Documentation technique enrichie
- `technicals/knowledge-base.md` : Section 0 QUICK REFERENCE (webhook paths, field names, auth)
- `technicals/improvements-roadmap.md` : 50+ ameliorations categories par priorite
- `technicals/fixes-library.md` : 27 fixes + table PIEGES RECURRENTS + anti-patterns
- CLAUDE.md : Regle 11 (pre-vol checklist)

### T5. Quantitative template matching — code pret (PAS deploye)
- Code template SQL ecrit et valide dans PostgreSQL (nodes 20 + 4)
- PROBLEME : Task Runner cache le code compile meme apres restart complet
- DECISION : Ne plus modifier les workflows sur la VM. Appliquer directement sur HF Space.

## Decisions CRITIQUES prises cette session

1. **VM = pilotage UNIQUEMENT** — ZERO modification de workflow n8n depuis la VM
   - VM ne sert que pour : Claude Code CLI, repo mon-ipad, git push
   - Les workflows doivent etre modifies/testes sur HF Space (16 GB RAM, pas de timeout DB)
2. Fixes library mise a jour IMMEDIATEMENT apres chaque fix
3. Pre-vol checklist (Section 0 knowledge-base.md) OBLIGATOIRE avant tout test
4. Session max 2h pour Claude Code CLI

## Taches en cours

### Graph pipeline (68.7% → cible 70%)
- Quick-test 5/5 PASS (apres FIX-07 session 17)
- Besoin: eval complete 50q sur HF Space pour confirmer >=70%

### Quantitative pipeline (78.3% → cible 85%)
- Template SQL code pret mais PAS deploye (Task Runner cache sur VM)
- Deployer sur HF Space n8n (16GB RAM, pas de cache issue)
- Le LLM free tier retourne 429/400 regulierement → SQL generation echoue

## Prochaine action
1. **Deployer le workflow Quantitative fixe sur HF Space** via REST API HF Space n8n
2. **Tester template matching sur HF Space** (TechVision revenue FY 2023)
3. **Full eval Graph** : 50q sur HF Space pour confirmer >=70%
4. **Full eval Quantitative** : 50q sur HF Space apres template fix

## Commits session 25
| Hash | Description |
|------|-------------|
| 391e619 | datasets sectoriels + download-sectors.py |
| c71a39d | knowledge-base.md + fixes-library FIX-21-25 |
| fcc460a | CLAUDE.md enrichi |
| d60f871 | improvements-roadmap.md |
| 5d4d937 | pre-vol checklist + FIX-26/27 |
| f56a17c | workflow template fix + execution archives |

## Repos impactes
- mon-ipad (datasets, technicals/, CLAUDE.md, directives/)

## Accuracy actuelle (inchangee — retester sur HF Space)
| Pipeline | Accuracy | Target | Status |
|----------|----------|--------|--------|
| Standard | 85.5% | 85% | PASS |
| Graph | 68.7% | 70% | FAIL (fix applique, retester) |
| Quantitative | 78.3% | 85% | FAIL (template pret, deployer) |
| Orchestrator | 80.0% | 70% | PASS |
| **Overall** | **78.1%** | **75%** | **PASS** |
